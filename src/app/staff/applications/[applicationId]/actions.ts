"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReviewOutcome =
  | "approved"
  | "declined"
  | "needs_info"
  | "note_added"
  | "unauthorized"
  | "failed";

function logApplicationDetailFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core application detail]", reason, details ?? {});
  }
}

function getReviewConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Application review detail actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development application review configuration is incomplete.");
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

function cleanUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return UUID_PATTERN.test(text) ? text : null;
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLength) {
    return null;
  }
  return text;
}

async function requireOwnerOrAdmin() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    logApplicationDetailFailure("staff profile is not authorized for application detail review", {
      staffProfileId: staff.id,
      staffRole: staff.role,
    });
    return null;
  }

  return staff;
}

async function postRpc(functionName: string, body: Record<string, unknown>) {
  const { restUrl, serviceRoleKey } = getReviewConfig();
  const response = await fetch(`${restUrl}/rpc/${functionName}`, {
    method: "POST",
    headers: serverHeaders(serviceRoleKey),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    logApplicationDetailFailure("application review RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return false;
  }

  return true;
}

function revalidateApplicationSurfaces(applicationId: string) {
  revalidatePath("/staff");
  revalidatePath("/staff/applications");
  revalidatePath(`/staff/applications/${applicationId}`);
}

function redirectToDetail(applicationId: string, outcome: ReviewOutcome): never {
  const param =
    outcome === "failed" || outcome === "unauthorized"
      ? `error=${outcome}`
      : `${outcome}=1`;
  redirect(`/staff/applications/${applicationId}?${param}`);
}

export async function approveApplicationFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim().slice(0, 1000);

  if (!applicationId) {
    redirect("/staff/applications?approval=error");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  const ok = await postRpc("core_approve_application", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_decision_notes: decisionNotes || null,
    p_queue_notification: false,
  });

  if (ok) {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "approved");
  }

  redirectToDetail(applicationId, "failed");
}

export async function declineApplicationFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = cleanText(formData.get("decisionNotes"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=error");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!decisionNotes) {
    redirectToDetail(applicationId, "failed");
  }

  const ok = await postRpc("core_decline_application", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_decision_notes: decisionNotes,
  });

  if (ok) {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "declined");
  }

  redirectToDetail(applicationId, "failed");
}

export async function markApplicationNeedsInfoFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = cleanText(formData.get("decisionNotes"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=error");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!decisionNotes) {
    redirectToDetail(applicationId, "failed");
  }

  const ok = await postRpc("core_mark_application_needs_info", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_decision_notes: decisionNotes,
  });

  if (ok) {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "needs_info");
  }

  redirectToDetail(applicationId, "failed");
}

export async function addApplicationReviewNoteFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const reviewNote = cleanText(formData.get("reviewNote"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=error");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!reviewNote) {
    redirectToDetail(applicationId, "failed");
  }

  const ok = await postRpc("core_add_application_review_note", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_review_note: reviewNote,
  });

  if (ok) {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "note_added");
  }

  redirectToDetail(applicationId, "failed");
}
