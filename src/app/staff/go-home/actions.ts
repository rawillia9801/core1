"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canStaffPerformDashboardAction,
  requireStaffProfile,
  type StaffProfile,
} from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECKLIST_STATUSES = new Set([
  "not_started",
  "in_progress",
  "needs_review",
  "complete",
  "not_applicable",
]);

const CHECKLIST_LABELS: Record<string, string> = {
  food_sample: "Pack food sample",
  care_sheet: "Prepare care sheet",
  health_record: "Prepare health record",
  document_packet: "Prepare document packet",
  payment_review: "Review payment/balance status",
  pickup_confirmed: "Confirm pickup or delivery details",
  go_home_bag: "Prepare go-home bag",
  photo_update: "Send or prepare final photo update",
};

type ReservationStatusRow = {
  status: string | null;
};

function logGoHomeChecklistFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core go-home checklist]", reason, details ?? {});
  }
}

function getActionConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Go-home checklist actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    logGoHomeChecklistFailure("missing local/development action configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    throw new Error("Local/development go-home checklist action configuration is incomplete.");
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

async function requireAuthorizedChecklistStaff() {
  const staff = await requireStaffProfile();

  if (!canStaffPerformDashboardAction(staff, "upsert_go_home_checklist_item")) {
    logGoHomeChecklistFailure("staff profile is not authorized for checklist action", {
      staffProfileId: staff.id,
      staffRole: staff.role,
    });
    return null;
  }

  return staff;
}

function cleanBoundedText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();

  if (text.length > maxLength) {
    return { valid: false, value: "" };
  }

  return { valid: true, value: text };
}

function getChecklistLabel(itemKey: string, customLabel: string) {
  return customLabel || CHECKLIST_LABELS[itemKey] || itemKey.replaceAll("_", " ");
}

export async function upsertGoHomeChecklistItem(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const itemKey = String(formData.get("itemKey") ?? "").trim().toLowerCase();
  const customLabel = cleanBoundedText(formData.get("customLabel"), 120);
  const status = String(formData.get("status") ?? "").trim().toLowerCase();
  const notes = cleanBoundedText(formData.get("notes"), 1000);
  let outcome = "error";
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedChecklistStaff();
  } catch (error) {
    logGoHomeChecklistFailure("checklist staff auth check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  if (!staff) {
    redirect("/staff/go-home?checklist=unauthorized");
  }

  if (!UUID_PATTERN.test(reservationId)) {
    logGoHomeChecklistFailure("invalid reservation id submitted", { reservationId });
    redirect("/staff/go-home?checklist=invalid_input");
  }

  if (!itemKey || itemKey.length > 80 || !/^[a-z0-9_]+$/.test(itemKey)) {
    logGoHomeChecklistFailure("invalid checklist item key submitted", { reservationId, itemKey });
    redirect("/staff/go-home?checklist=invalid_input");
  }

  if (!CHECKLIST_STATUSES.has(status)) {
    logGoHomeChecklistFailure("invalid checklist status submitted", { reservationId, status });
    redirect("/staff/go-home?checklist=invalid_input");
  }

  if (!customLabel.valid || !notes.valid) {
    logGoHomeChecklistFailure("bounded checklist input exceeded maximum length", {
      reservationId,
      customLabelTooLong: !customLabel.valid,
      notesTooLong: !notes.valid,
    });
    redirect("/staff/go-home?checklist=invalid_input");
  }

  try {
    const { restUrl, serviceRoleKey } = getActionConfig();
    const headers = serverHeaders(serviceRoleKey);
    const reservationResponse = await fetch(
      `${restUrl}/core_reservations?select=status&id=eq.${reservationId}`,
      { headers, cache: "no-store" },
    );

    if (!reservationResponse.ok) {
      const responseBody = await reservationResponse.text().catch(() => "");
      logGoHomeChecklistFailure("reservation lookup failed", {
        reservationId,
        httpStatus: reservationResponse.status,
        responseBody,
      });
    } else {
      const rows = (await reservationResponse.json()) as ReservationStatusRow[];
      const reservation = rows[0];
      const reservationStatus = reservation?.status?.toLowerCase();

      if (!reservation) {
        outcome = "not_found";
      } else if (!reservationStatus || ["cancelled", "void", "released"].includes(reservationStatus)) {
        outcome = "not_eligible";
      } else {
        const rpcResponse = await fetch(`${restUrl}/rpc/core_upsert_go_home_checklist_item`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_reservation_id: reservationId,
            p_actor_profile_id: staff.id,
            p_item_key: itemKey,
            p_label: getChecklistLabel(itemKey, customLabel.value),
            p_status: status,
            p_notes: notes.value || null,
          }),
          cache: "no-store",
        });

        if (rpcResponse.ok) {
          revalidatePath("/staff");
          revalidatePath("/staff/go-home");
          outcome = "success";
        } else {
          const responseBody = await rpcResponse.text().catch(() => "");
          logGoHomeChecklistFailure("checklist RPC failed", {
            reservationId,
            itemKey,
            httpStatus: rpcResponse.status,
            responseBody,
          });
        }
      }
    }
  } catch (error) {
    logGoHomeChecklistFailure("checklist action threw an error", {
      reservationId,
      itemKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  redirect(`/staff/go-home?checklist=${outcome}`);
}
