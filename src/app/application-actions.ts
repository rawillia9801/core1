"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const APPROVABLE_STATUSES = new Set(["received", "needs_review"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ApplicationStatusRow = {
  status: string | null;
};

type ReservationApplicationRow = ApplicationStatusRow & {
  buyer_id: string | null;
  family_id: string | null;
};

type PuppyStatusRow = {
  status: string | null;
};

function logApprovalFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core approval]", reason, details ?? {});
  }
}

function logReservationFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core reservation]", reason, details ?? {});
  }
}

function getLocalApprovalConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Approval actions are disabled outside local/development use.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const actorProfileId = process.env.CORE_APPROVAL_ACTOR_PROFILE_ID;

  if (!supabaseUrl || !serviceRoleKey || !actorProfileId || !UUID_PATTERN.test(actorProfileId)) {
    logApprovalFailure("missing or invalid local approval configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasValidActorProfileId: Boolean(actorProfileId && UUID_PATTERN.test(actorProfileId)),
    });
    throw new Error("Local approval configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
    actorProfileId,
  };
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

export async function approveApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim().slice(0, 1000);
  let outcome = "error";

  if (!UUID_PATTERN.test(applicationId)) {
    logApprovalFailure("invalid application id submitted", { applicationId });
  } else {
    try {
      const { restUrl, serviceRoleKey, actorProfileId } = getLocalApprovalConfig();
      const applicationResponse = await fetch(
        `${restUrl}/core_applications?select=status&id=eq.${applicationId}`,
        {
          headers: serverHeaders(serviceRoleKey),
          cache: "no-store",
        },
      );

      if (!applicationResponse.ok) {
        const responseBody = await applicationResponse.text().catch(() => "");
        logApprovalFailure("application status lookup failed", {
          applicationId,
          httpStatus: applicationResponse.status,
          responseBody,
        });
      } else {
        const applicationRows = (await applicationResponse.json()) as ApplicationStatusRow[];
        const applicationRow = applicationRows[0];
        const status = applicationRow?.status?.toLowerCase();

        if (!applicationRow) {
          logApprovalFailure("application status lookup returned no row", { applicationId });
          outcome = "error";
        } else if (!status || !APPROVABLE_STATUSES.has(status)) {
          logApprovalFailure("application is not eligible for approval", {
            applicationId,
            status: applicationRow.status,
          });
          outcome = "not_eligible";
        } else {
          const approvalResponse = await fetch(`${restUrl}/rpc/core_approve_application`, {
            method: "POST",
            headers: serverHeaders(serviceRoleKey),
            body: JSON.stringify({
              p_application_id: applicationId,
              p_actor_profile_id: actorProfileId,
              p_decision_notes: decisionNotes || null,
              p_queue_notification: false,
            }),
            cache: "no-store",
          });

          if (approvalResponse.ok) {
            revalidatePath("/");
            outcome = "success";
          } else {
            const responseBody = await approvalResponse.text().catch(() => "");
            logApprovalFailure("approval RPC failed", {
              applicationId,
              httpStatus: approvalResponse.status,
              responseBody,
            });
          }
        }
      }
    } catch (error) {
      logApprovalFailure("approval action threw an error", {
        applicationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      outcome = "error";
    }
  }

  redirect(`/?approval=${outcome}`);
}

function parseRequiredPositiveCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const cents = Number.parseInt(text, 10);

  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function parseOptionalNonNegativeCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  if (!/^\d+$/.test(text)) {
    return { valid: false, value: null };
  }

  const cents = Number.parseInt(text, 10);

  if (!Number.isSafeInteger(cents) || cents < 0) {
    return { valid: false, value: null };
  }

  return { valid: true, value: cents };
}

export async function createReservation(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const puppyId = String(formData.get("puppyId") ?? "").trim();
  const contractTotalCents = parseRequiredPositiveCents(formData.get("contractTotalCents"));
  const deposit = parseOptionalNonNegativeCents(formData.get("depositRequiredCents"));
  const saleType = String(formData.get("saleType") ?? "").trim().slice(0, 100);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  let outcome = "error";

  if (!UUID_PATTERN.test(applicationId) || !UUID_PATTERN.test(puppyId)) {
    logReservationFailure("invalid application or puppy id submitted", {
      hasValidApplicationId: UUID_PATTERN.test(applicationId),
      hasValidPuppyId: UUID_PATTERN.test(puppyId),
    });
    redirect("/?reservation=error");
  }

  if (!contractTotalCents || !deposit.valid) {
    logReservationFailure("invalid reservation amount submitted", {
      applicationId,
      hasValidContractTotalCents: Boolean(contractTotalCents),
      hasValidDepositRequiredCents: deposit.valid,
    });
    redirect("/?reservation=error");
  }

  try {
    const { restUrl, serviceRoleKey, actorProfileId } = getLocalApprovalConfig();
    const headers = serverHeaders(serviceRoleKey);
    const applicationResponse = await fetch(
      `${restUrl}/core_applications?select=status,buyer_id,family_id&id=eq.${applicationId}`,
      { headers, cache: "no-store" },
    );

    if (!applicationResponse.ok) {
      const responseBody = await applicationResponse.text().catch(() => "");
      logReservationFailure("application lookup failed", {
        applicationId,
        httpStatus: applicationResponse.status,
        responseBody,
      });
    } else {
      const rows = (await applicationResponse.json()) as ReservationApplicationRow[];
      const application = rows[0];

      if (!application) {
        logReservationFailure("application lookup returned no row", { applicationId });
      } else if (application.status?.toLowerCase() !== "approved") {
        logReservationFailure("application is not approved", {
          applicationId,
          status: application.status,
        });
        outcome = "not_approved";
      } else if (!application.buyer_id || !application.family_id) {
        logReservationFailure("approved application lacks buyer or family linkage", {
          applicationId,
          hasBuyerId: Boolean(application.buyer_id),
          hasFamilyId: Boolean(application.family_id),
        });
        outcome = "missing_links";
      } else {
        const puppyResponse = await fetch(
          `${restUrl}/core_puppies?select=status&id=eq.${puppyId}`,
          { headers, cache: "no-store" },
        );

        if (!puppyResponse.ok) {
          const responseBody = await puppyResponse.text().catch(() => "");
          logReservationFailure("puppy lookup failed", {
            puppyId,
            httpStatus: puppyResponse.status,
            responseBody,
          });
        } else {
          const puppyRows = (await puppyResponse.json()) as PuppyStatusRow[];
          const puppy = puppyRows[0];

          if (!puppy || puppy.status?.toLowerCase() !== "available") {
            logReservationFailure("selected puppy is not available", {
              puppyId,
              status: puppy?.status ?? null,
            });
            outcome = "puppy_unavailable";
          } else {
            const activeReservationResponse = await fetch(
              `${restUrl}/core_reservations?select=id&puppy_id=eq.${puppyId}&status=not.in.(cancelled,void,released)&limit=1`,
              { headers, cache: "no-store" },
            );

            if (!activeReservationResponse.ok) {
              const responseBody = await activeReservationResponse.text().catch(() => "");
              logReservationFailure("active reservation lookup failed", {
                puppyId,
                httpStatus: activeReservationResponse.status,
                responseBody,
              });
            } else {
              const activeReservations = (await activeReservationResponse.json()) as unknown[];

              if (activeReservations.length > 0) {
                logReservationFailure("selected puppy already has active reservation", {
                  puppyId,
                });
                outcome = "puppy_unavailable";
              } else {
                const rpcResponse = await fetch(`${restUrl}/rpc/core_create_reservation`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    p_buyer_id: application.buyer_id,
                    p_family_id: application.family_id,
                    p_puppy_id: puppyId,
                    p_application_id: applicationId,
                    p_actor_profile_id: actorProfileId,
                    p_contract_total_cents: contractTotalCents,
                    p_deposit_required_cents: deposit.value,
                    p_sale_type: saleType || null,
                    p_notes: notes || null,
                  }),
                  cache: "no-store",
                });

                if (rpcResponse.ok) {
                  revalidatePath("/");
                  outcome = "success";
                } else {
                  const responseBody = await rpcResponse.text().catch(() => "");
                  logReservationFailure("reservation RPC failed", {
                    applicationId,
                    puppyId,
                    httpStatus: rpcResponse.status,
                    responseBody,
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    logReservationFailure("reservation action threw an error", {
      applicationId,
      puppyId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect(`/?reservation=${outcome}`);
}
