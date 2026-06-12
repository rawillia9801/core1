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
  | "invalid_input"
  | "rpc_failed"
  | "config_missing"
  | "save_failed";

function logApplicationDetailFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core application detail]", reason, details ?? {});
  }
}

function getReviewConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Application review configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function classifyReviewException(error: unknown): ReviewOutcome {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("configuration") || message.includes("supabase") || message.includes("service")
    ? "config_missing"
    : "save_failed";
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
  let response: Response;

  try {
    const { restUrl, serviceRoleKey } = getReviewConfig();
    response = await fetch(`${restUrl}/rpc/${functionName}`, {
      method: "POST",
      headers: serverHeaders(serviceRoleKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    logApplicationDetailFailure("application review RPC threw before response", {
      functionName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return classifyReviewException(error);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    logApplicationDetailFailure("application review RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return "rpc_failed";
  }

  return "success";
}

function revalidateApplicationSurfaces(applicationId: string) {
  revalidatePath("/staff");
  revalidatePath("/staff/applications");
  revalidatePath(`/staff/applications/${applicationId}`);
}

function redirectToDetail(applicationId: string, outcome: ReviewOutcome): never {
  const param =
    ["unauthorized", "invalid_input", "rpc_failed", "config_missing", "save_failed"].includes(outcome)
      ? `error=${outcome}`
      : `${outcome}=1`;
  redirect(`/staff/applications/${applicationId}?${param}`);
}

export async function approveApplicationFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim().slice(0, 1000);

  if (!applicationId) {
    redirect("/staff/applications?approval=invalid_input");
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

  if (ok === "success") {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "approved");
  }

  redirectToDetail(applicationId, ok);
}

export async function declineApplicationFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = cleanText(formData.get("decisionNotes"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=invalid_input");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!decisionNotes) {
    redirectToDetail(applicationId, "invalid_input");
  }

  const ok = await postRpc("core_decline_application", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_decision_notes: decisionNotes,
  });

  if (ok === "success") {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "declined");
  }

  redirectToDetail(applicationId, ok);
}

export async function markApplicationNeedsInfoFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const decisionNotes = cleanText(formData.get("decisionNotes"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=invalid_input");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!decisionNotes) {
    redirectToDetail(applicationId, "invalid_input");
  }

  const ok = await postRpc("core_mark_application_needs_info", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_decision_notes: decisionNotes,
  });

  if (ok === "success") {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "needs_info");
  }

  redirectToDetail(applicationId, ok);
}

export async function addApplicationReviewNoteFromDetail(formData: FormData) {
  const applicationId = cleanUuid(formData.get("applicationId"));
  const reviewNote = cleanText(formData.get("reviewNote"), 2000);

  if (!applicationId) {
    redirect("/staff/applications?approval=invalid_input");
  }

  const staff = await requireOwnerOrAdmin();
  if (!staff) {
    redirectToDetail(applicationId, "unauthorized");
  }

  if (!reviewNote) {
    redirectToDetail(applicationId, "invalid_input");
  }

  const ok = await postRpc("core_add_application_review_note", {
    p_application_id: applicationId,
    p_actor_profile_id: staff.id,
    p_review_note: reviewNote,
  });

  if (ok === "success") {
    revalidateApplicationSurfaces(applicationId);
    redirectToDetail(applicationId, "note_added");
  }

  redirectToDetail(applicationId, ok);
}
