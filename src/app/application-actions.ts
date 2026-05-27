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

type ReservationStatusRow = {
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

function logPaymentFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core payment]", reason, details ?? {});
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

function getLocalPaymentConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Payment recording actions are disabled outside local/development use.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const actorProfileId = process.env.CORE_APPROVAL_ACTOR_PROFILE_ID;

  if (!supabaseUrl || !serviceRoleKey || !actorProfileId || !UUID_PATTERN.test(actorProfileId)) {
    logPaymentFailure("missing or invalid local payment configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasValidActorProfileId: Boolean(actorProfileId && UUID_PATTERN.test(actorProfileId)),
    });
    throw new Error("Local payment recording configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
    actorProfileId,
  };
}

function parseDollarAmountToCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const [dollars, fraction = ""] = text.split(".");
  const cents = Number.parseInt(dollars, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0") || "0", 10);

  return Number.isSafeInteger(cents) ? cents : null;
}

function parseRequiredPositiveDollars(value: FormDataEntryValue | null) {
  const cents = parseDollarAmountToCents(value);

  return cents !== null && cents > 0 ? cents : null;
}

function parseOptionalNonNegativeDollars(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  const cents = parseDollarAmountToCents(text);

  if (cents === null || cents < 0) {
    return { valid: false, value: null };
  }

  return { valid: true, value: cents };
}

export async function createReservation(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const puppyId = String(formData.get("puppyId") ?? "").trim();
  const contractTotalCents = parseRequiredPositiveDollars(formData.get("contractTotalDollars"));
  const deposit = parseOptionalNonNegativeDollars(formData.get("depositRequiredDollars"));
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
    logReservationFailure("invalid dollar amount submitted for reservation", {
      applicationId,
      hasValidContractTotalDollars: Boolean(contractTotalCents),
      hasValidDepositRequiredDollars: deposit.valid,
    });
    redirect("/?reservation=invalid_money");
  }

  if (deposit.value !== null && deposit.value > contractTotalCents) {
    logReservationFailure("deposit required exceeds contract total", {
      applicationId,
      contractTotalCents,
      depositRequiredCents: deposit.value,
    });
    redirect("/?reservation=invalid_amounts");
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

export async function recordReservationPayment(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const entryType = String(formData.get("entryType") ?? "").trim().toLowerCase();
  const amountCents = parseRequiredPositiveDollars(formData.get("amountDollars"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const ineligibleStatuses = new Set(["cancelled", "void", "released"]);
  let outcome = "error";

  if (!UUID_PATTERN.test(reservationId)) {
    logPaymentFailure("invalid reservation id submitted", {
      hasValidReservationId: false,
    });
    redirect("/?payment=invalid_input");
  }

  if (!["deposit", "payment"].includes(entryType)) {
    logPaymentFailure("invalid payment entry type submitted", {
      reservationId,
      entryType,
    });
    redirect("/?payment=invalid_input");
  }

  if (!amountCents) {
    logPaymentFailure("invalid dollar amount submitted for payment", {
      reservationId,
      hasValidAmountDollars: false,
    });
    redirect("/?payment=invalid_money");
  }

  if (paymentMethod.length > 100 || externalReference.length > 255 || notes.length > 1000) {
    logPaymentFailure("bounded payment input exceeded maximum length", {
      reservationId,
      paymentMethodTooLong: paymentMethod.length > 100,
      externalReferenceTooLong: externalReference.length > 255,
      notesTooLong: notes.length > 1000,
    });
    redirect("/?payment=invalid_input");
  }

  try {
    const { restUrl, serviceRoleKey, actorProfileId } = getLocalPaymentConfig();
    const headers = serverHeaders(serviceRoleKey);
    const reservationResponse = await fetch(
      `${restUrl}/core_reservations?select=status&id=eq.${reservationId}`,
      { headers, cache: "no-store" },
    );

    if (!reservationResponse.ok) {
      const responseBody = await reservationResponse.text().catch(() => "");
      logPaymentFailure("reservation lookup failed", {
        reservationId,
        httpStatus: reservationResponse.status,
        responseBody,
      });
    } else {
      const rows = (await reservationResponse.json()) as ReservationStatusRow[];
      const reservation = rows[0];
      const status = reservation?.status?.toLowerCase();

      if (!reservation) {
        logPaymentFailure("reservation lookup returned no row", { reservationId });
        outcome = "not_found";
      } else if (!status || ineligibleStatuses.has(status)) {
        logPaymentFailure("reservation is not eligible for payment recording", {
          reservationId,
          status: reservation.status,
        });
        outcome = "not_eligible";
      } else {
        const rpcResponse = await fetch(`${restUrl}/rpc/core_record_reservation_payment`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_reservation_id: reservationId,
            p_actor_profile_id: actorProfileId,
            p_entry_type: entryType,
            p_amount_cents: amountCents,
            p_payment_method: paymentMethod || null,
            p_external_reference: externalReference || null,
            p_notes: notes || null,
          }),
          cache: "no-store",
        });

        if (rpcResponse.ok) {
          revalidatePath("/");
          outcome = "success";
        } else {
          const responseBody = await rpcResponse.text().catch(() => "");
          logPaymentFailure("payment RPC failed", {
            reservationId,
            entryType,
            httpStatus: rpcResponse.status,
            responseBody,
          });
        }
      }
    }
  } catch (error) {
    logPaymentFailure("payment action threw an error", {
      reservationId,
      entryType,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect(`/?payment=${outcome}`);
}
