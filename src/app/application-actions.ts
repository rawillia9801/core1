"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canStaffPerformDashboardAction,
  requireStaffProfile,
  type StaffProfile,
} from "@/lib/staff-auth";

const APPROVABLE_STATUSES = new Set(["received", "needs_review"]);
const CANCELLABLE_RESERVATION_STATUSES = new Set(["reserved", "pending"]);
const GO_HOME_INELIGIBLE_RESERVATION_STATUSES = new Set(["cancelled", "void", "released"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GO_HOME_METHODS = new Set(["pickup", "delivery", "meetup", "transport"]);
const GO_HOME_STATUSES = new Set(["pending", "scheduled", "confirmed", "ready", "completed", "delayed", "cancelled"]);
const GO_HOME_CHECKLIST_STATUSES = new Set(["not_started", "in_progress", "needs_review", "complete"]);
const GO_HOME_BALANCE_STATUSES = new Set(["unknown", "not_cleared", "pending_review", "cleared"]);

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

function logCancellationFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core cancellation]", reason, details ?? {});
  }
}

function logGoHomeFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core go-home]", reason, details ?? {});
  }
}

function getDashboardActionConfig(
  actionLabel: string,
  logFailure: (reason: string, details?: Record<string, unknown>) => void,
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${actionLabel} actions are disabled until staging/production authorization is approved.`);
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    logFailure("missing local/development dashboard action configuration", {
      actionLabel,
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    throw new Error("Local/development dashboard action configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function requireAuthorizedDashboardStaff(
  action: Parameters<typeof canStaffPerformDashboardAction>[1],
  logFailure: (reason: string, details?: Record<string, unknown>) => void,
  options: Parameters<typeof canStaffPerformDashboardAction>[2] = {},
) {
  const staff = await requireStaffProfile();

  if (!canStaffPerformDashboardAction(staff, action, options)) {
    logFailure("staff profile is not authorized for dashboard action", {
      action,
      staffProfileId: staff.id,
      staffRole: staff.role,
      ...options,
    });
    return null;
  }

  return staff;
}

export async function approveApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim().slice(0, 1000);
  let outcome = "error";
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedDashboardStaff("approve_application", logApprovalFailure);
  } catch (error) {
    logApprovalFailure("approval staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff?approval=unauthorized");
  }

  if (!UUID_PATTERN.test(applicationId)) {
    logApprovalFailure("invalid application id submitted", { applicationId });
  } else {
    try {
      const { restUrl, serviceRoleKey } = getDashboardActionConfig("Approval", logApprovalFailure);
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
              p_actor_profile_id: staff.id,
              p_decision_notes: decisionNotes || null,
              p_queue_notification: false,
            }),
            cache: "no-store",
          });

          if (approvalResponse.ok) {
            revalidatePath("/staff");
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

  redirect(`/staff?approval=${outcome}`);
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

function parseOptionalLocalDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, value: null };
  }

  return { valid: true, value: parsed.toISOString() };
}

export async function createReservation(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const puppyId = String(formData.get("puppyId") ?? "").trim();
  const contractTotalCents = parseRequiredPositiveDollars(formData.get("contractTotalDollars"));
  const deposit = parseOptionalNonNegativeDollars(formData.get("depositRequiredDollars"));
  const saleType = String(formData.get("saleType") ?? "").trim().slice(0, 100);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  let outcome = "error";
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedDashboardStaff("create_reservation", logReservationFailure);
  } catch (error) {
    logReservationFailure("reservation staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff?reservation=unauthorized");
  }

  if (!UUID_PATTERN.test(applicationId) || !UUID_PATTERN.test(puppyId)) {
    logReservationFailure("invalid application or puppy id submitted", {
      hasValidApplicationId: UUID_PATTERN.test(applicationId),
      hasValidPuppyId: UUID_PATTERN.test(puppyId),
    });
    redirect("/staff?reservation=error");
  }

  if (!contractTotalCents || !deposit.valid) {
    logReservationFailure("invalid dollar amount submitted for reservation", {
      applicationId,
      hasValidContractTotalDollars: Boolean(contractTotalCents),
      hasValidDepositRequiredDollars: deposit.valid,
    });
    redirect("/staff?reservation=invalid_money");
  }

  if (deposit.value !== null && deposit.value > contractTotalCents) {
    logReservationFailure("deposit required exceeds contract total", {
      applicationId,
      contractTotalCents,
      depositRequiredCents: deposit.value,
    });
    redirect("/staff?reservation=invalid_amounts");
  }

  try {
    const { restUrl, serviceRoleKey } = getDashboardActionConfig("Reservation", logReservationFailure);
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
                    p_actor_profile_id: staff.id,
                    p_contract_total_cents: contractTotalCents,
                    p_deposit_required_cents: deposit.value,
                    p_sale_type: saleType || null,
                    p_notes: notes || null,
                  }),
                  cache: "no-store",
                });

                if (rpcResponse.ok) {
                  revalidatePath("/staff");
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

  redirect(`/staff?reservation=${outcome}`);
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
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedDashboardStaff("record_reservation_payment", logPaymentFailure);
  } catch (error) {
    logPaymentFailure("payment staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff?payment=unauthorized");
  }

  if (!UUID_PATTERN.test(reservationId)) {
    logPaymentFailure("invalid reservation id submitted", {
      hasValidReservationId: false,
    });
    redirect("/staff?payment=invalid_input");
  }

  if (!["deposit", "payment"].includes(entryType)) {
    logPaymentFailure("invalid payment entry type submitted", {
      reservationId,
      entryType,
    });
    redirect("/staff?payment=invalid_input");
  }

  if (!amountCents) {
    logPaymentFailure("invalid dollar amount submitted for payment", {
      reservationId,
      hasValidAmountDollars: false,
    });
    redirect("/staff?payment=invalid_money");
  }

  if (paymentMethod.length > 100 || externalReference.length > 255 || notes.length > 1000) {
    logPaymentFailure("bounded payment input exceeded maximum length", {
      reservationId,
      paymentMethodTooLong: paymentMethod.length > 100,
      externalReferenceTooLong: externalReference.length > 255,
      notesTooLong: notes.length > 1000,
    });
    redirect("/staff?payment=invalid_input");
  }

  try {
    const { restUrl, serviceRoleKey } = getDashboardActionConfig("Payment recording", logPaymentFailure);
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
            p_actor_profile_id: staff.id,
            p_entry_type: entryType,
            p_amount_cents: amountCents,
            p_payment_method: paymentMethod || null,
            p_external_reference: externalReference || null,
            p_notes: notes || null,
          }),
          cache: "no-store",
        });

        if (rpcResponse.ok) {
          revalidatePath("/staff");
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

  redirect(`/staff?payment=${outcome}`);
}

export async function cancelReservation(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const releasePuppy = formData.get("releasePuppy") === "on";
  const releasedPuppyStatus = String(formData.get("releasedPuppyStatus") ?? "available").trim().toLowerCase();
  let outcome = "error";
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedDashboardStaff("cancel_reservation", logCancellationFailure, {
      releasePuppy,
    });
  } catch (error) {
    logCancellationFailure("cancellation staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff?cancellation=unauthorized");
  }

  if (!UUID_PATTERN.test(reservationId)) {
    logCancellationFailure("invalid reservation id submitted", {
      hasValidReservationId: false,
    });
    redirect("/staff?cancellation=invalid_input");
  }

  if (!cancellationReason || cancellationReason.length > 1000) {
    logCancellationFailure("invalid cancellation reason submitted", {
      reservationId,
      hasReason: Boolean(cancellationReason),
      reasonTooLong: cancellationReason.length > 1000,
    });
    redirect("/staff?cancellation=invalid_reason");
  }

  if (notes.length > 1000 || !["available", "unavailable", "hold"].includes(releasedPuppyStatus)) {
    logCancellationFailure("bounded cancellation input exceeded maximum length or invalid release status", {
      reservationId,
      notesTooLong: notes.length > 1000,
      releasedPuppyStatus,
    });
    redirect("/staff?cancellation=invalid_input");
  }

  try {
    const { restUrl, serviceRoleKey } = getDashboardActionConfig("Cancellation", logCancellationFailure);
    const headers = serverHeaders(serviceRoleKey);
    const reservationResponse = await fetch(
      `${restUrl}/core_reservations?select=status&id=eq.${reservationId}`,
      { headers, cache: "no-store" },
    );

    if (!reservationResponse.ok) {
      const responseBody = await reservationResponse.text().catch(() => "");
      logCancellationFailure("reservation lookup failed", {
        reservationId,
        httpStatus: reservationResponse.status,
        responseBody,
      });
    } else {
      const rows = (await reservationResponse.json()) as ReservationStatusRow[];
      const reservation = rows[0];
      const status = reservation?.status?.toLowerCase();

      if (!reservation) {
        logCancellationFailure("reservation lookup returned no row", { reservationId });
        outcome = "not_found";
      } else if (!status || !CANCELLABLE_RESERVATION_STATUSES.has(status)) {
        logCancellationFailure("reservation is not eligible for cancellation", {
          reservationId,
          status: reservation.status,
        });
        outcome = "not_eligible";
      } else {
        const rpcResponse = await fetch(`${restUrl}/rpc/core_cancel_reservation`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_reservation_id: reservationId,
            p_actor_profile_id: staff.id,
            p_cancellation_reason: cancellationReason,
            p_release_puppy: releasePuppy,
            p_released_puppy_status: releasedPuppyStatus,
            p_notes: notes || null,
          }),
          cache: "no-store",
        });

        if (rpcResponse.ok) {
          revalidatePath("/staff");
          outcome = "success";
        } else {
          const responseBody = await rpcResponse.text().catch(() => "");
          logCancellationFailure("cancellation RPC failed", {
            reservationId,
            httpStatus: rpcResponse.status,
            responseBody,
          });
        }
      }
    }
  } catch (error) {
    logCancellationFailure("cancellation action threw an error", {
      reservationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect(`/staff?cancellation=${outcome}`);
}

export async function updateGoHomeDetail(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const method = String(formData.get("method") ?? "").trim().toLowerCase();
  const plannedAt = parseOptionalLocalDateTime(formData.get("plannedAt"));
  const location = String(formData.get("location") ?? "").trim();
  const status = String(formData.get("status") ?? "pending").trim().toLowerCase();
  const checklistStatus = String(formData.get("checklistStatus") ?? "").trim().toLowerCase();
  const balanceClearedStatus = String(formData.get("balanceClearedStatus") ?? "").trim().toLowerCase();
  const contactNotes = String(formData.get("contactNotes") ?? "").trim();
  const individualNotes = String(formData.get("individualNotes") ?? "").trim();
  let outcome = "error";
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedDashboardStaff("update_go_home_detail", logGoHomeFailure);
  } catch (error) {
    logGoHomeFailure("go-home staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff/go-home?goHome=unauthorized");
  }

  if (!UUID_PATTERN.test(reservationId)) {
    logGoHomeFailure("invalid reservation id submitted", { reservationId });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  if (method && !GO_HOME_METHODS.has(method)) {
    logGoHomeFailure("invalid go-home method submitted", { reservationId, method });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  if (!plannedAt.valid) {
    logGoHomeFailure("invalid go-home date/time submitted", { reservationId });
    redirect("/staff/go-home?goHome=invalid_datetime");
  }

  if (!status || !GO_HOME_STATUSES.has(status)) {
    logGoHomeFailure("invalid go-home status submitted", { reservationId, status });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  if (checklistStatus && !GO_HOME_CHECKLIST_STATUSES.has(checklistStatus)) {
    logGoHomeFailure("invalid checklist status submitted", { reservationId, checklistStatus });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  if (balanceClearedStatus && !GO_HOME_BALANCE_STATUSES.has(balanceClearedStatus)) {
    logGoHomeFailure("invalid balance cleared status submitted", { reservationId, balanceClearedStatus });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  if (location.length > 500 || contactNotes.length > 1000 || individualNotes.length > 1000) {
    logGoHomeFailure("bounded go-home input exceeded maximum length", {
      reservationId,
      locationTooLong: location.length > 500,
      contactNotesTooLong: contactNotes.length > 1000,
      individualNotesTooLong: individualNotes.length > 1000,
    });
    redirect("/staff/go-home?goHome=invalid_input");
  }

  try {
    const { restUrl, serviceRoleKey } = getDashboardActionConfig("Go-home update", logGoHomeFailure);
    const headers = serverHeaders(serviceRoleKey);
    const reservationResponse = await fetch(
      `${restUrl}/core_reservations?select=status&id=eq.${reservationId}`,
      { headers, cache: "no-store" },
    );

    if (!reservationResponse.ok) {
      const responseBody = await reservationResponse.text().catch(() => "");
      logGoHomeFailure("reservation lookup failed", {
        reservationId,
        httpStatus: reservationResponse.status,
        responseBody,
      });
    } else {
      const rows = (await reservationResponse.json()) as ReservationStatusRow[];
      const reservation = rows[0];
      const reservationStatus = reservation?.status?.toLowerCase();

      if (!reservation) {
        logGoHomeFailure("reservation lookup returned no row", { reservationId });
        outcome = "not_found";
      } else if (!reservationStatus || GO_HOME_INELIGIBLE_RESERVATION_STATUSES.has(reservationStatus)) {
        logGoHomeFailure("reservation is not eligible for go-home update", {
          reservationId,
          status: reservation.status,
        });
        outcome = "not_eligible";
      } else {
        const rpcResponse = await fetch(`${restUrl}/rpc/core_update_go_home_detail`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_reservation_id: reservationId,
            p_actor_profile_id: staff.id,
            p_method: method || null,
            p_planned_at: plannedAt.value,
            p_location: location || null,
            p_status: status,
            p_checklist_status: checklistStatus || null,
            p_balance_cleared_status: balanceClearedStatus || null,
            p_contact_notes: contactNotes || null,
            p_individual_notes: individualNotes || null,
          }),
          cache: "no-store",
        });

        if (rpcResponse.ok) {
          revalidatePath("/staff");
          revalidatePath("/staff/go-home");
          outcome = "success";
        } else {
          const responseBody = await rpcResponse.text().catch(() => "");
          logGoHomeFailure("go-home RPC failed", {
            reservationId,
            httpStatus: rpcResponse.status,
            responseBody,
          });
        }
      }
    }
  } catch (error) {
    logGoHomeFailure("go-home action threw an error", {
      reservationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect(`/staff/go-home?goHome=${outcome}`);
}
