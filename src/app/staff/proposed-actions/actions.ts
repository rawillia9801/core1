"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile, type StaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DOMAINS = new Set([
  "business",
  "kennel",
  "puppies",
  "buyers_families",
  "payments",
  "documents",
  "messages",
  "personal_family",
  "grocery_list",
  "smart_home",
  "monitoring_alerts",
  "voice_command",
  "system",
  "unknown",
]);

const PERMISSION_TIERS = new Set([
  "read_only",
  "immediate_safe_action",
  "confirmation_required",
  "owner_admin_approval_required",
  "blocked_until_configured",
]);

const RISK_LEVELS = new Set(["low", "medium", "high", "blocked"]);

function logProposedActionFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core proposed actions]", reason, details ?? {});
  }
}

function getActionConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development proposed action configuration is incomplete.");
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

async function requireOwnerOrAdmin() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    logProposedActionFailure("staff profile is not authorized for proposal review", {
      staffProfileId: staff.id,
      staffRole: staff.role,
    });
    redirect("/staff/proposed-actions?error=unauthorized");
  }

  return staff;
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();

  if (text.length > maxLength) {
    return { valid: false, value: "" };
  }

  return { valid: true, value: text };
}

function cleanOptionalUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  if (!UUID_PATTERN.test(text)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: text };
}

function optionalSelect(value: FormDataEntryValue | null, allowed: Set<string>, fallback: string) {
  const text = String(value ?? fallback).trim().toLowerCase();
  return allowed.has(text) ? text : fallback;
}

function parseProposedChange(value: string) {
  const text = value.trim();

  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Plain text summaries are accepted below.
  }

  return { proposed_change_summary: text };
}

async function postRpc(functionName: string, body: Record<string, unknown>) {
  const { restUrl, serviceRoleKey } = getActionConfig();
  const response = await fetch(`${restUrl}/rpc/${functionName}`, {
    method: "POST",
    headers: serverHeaders(serviceRoleKey),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    logProposedActionFailure("proposed action RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return false;
  }

  return true;
}

function revalidateProposedActionSurfaces() {
  revalidatePath("/staff/proposed-actions");
  revalidatePath("/staff/command");
}

export async function createProposedAction(formData: FormData) {
  let staff: StaffProfile;

  try {
    staff = await requireOwnerOrAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    logProposedActionFailure("proposal create staff auth failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    redirect("/staff/proposed-actions?error=failed");
  }

  const title = cleanText(formData.get("title"), 200);
  const summary = cleanText(formData.get("summary"), 2000);
  const actionType = cleanText(formData.get("action_type"), 100);
  const targetTable = cleanText(formData.get("target_table"), 100);
  const targetId = cleanOptionalUuid(formData.get("target_id"));
  const proposedChangeSummary = cleanText(formData.get("proposed_change_summary"), 4000);
  const domain = optionalSelect(formData.get("domain"), DOMAINS, "unknown");
  const permissionTier = optionalSelect(
    formData.get("permission_tier"),
    PERMISSION_TIERS,
    "owner_admin_approval_required",
  );
  const riskLevel = optionalSelect(formData.get("risk_level"), RISK_LEVELS, "low");

  if (
    !title.valid ||
    !summary.valid ||
    !actionType.valid ||
    !targetTable.valid ||
    !targetId.valid ||
    !proposedChangeSummary.valid ||
    !title.value ||
    !actionType.value
  ) {
    redirect("/staff/proposed-actions?error=failed");
  }

  const proposedChange = {
    ...parseProposedChange(proposedChangeSummary.value),
    domain,
    permission_tier: permissionTier,
    proposal_only: true,
    business_action_executed: false,
    external_side_effects: false,
  };

  const ok = await postRpc("core_create_proposed_action", {
    p_actor_profile_id: staff.id,
    p_action_type: actionType.value,
    p_title: title.value,
    p_summary: summary.value || null,
    p_risk_level: riskLevel,
    p_target_table: targetTable.value || null,
    p_target_id: targetId.value,
    p_before_snapshot: {},
    p_proposed_change: proposedChange,
    p_source: "staff_manual",
    p_expires_at: null,
  });

  if (ok) {
    revalidateProposedActionSurfaces();
    redirect("/staff/proposed-actions?created=1");
  }

  redirect("/staff/proposed-actions?error=failed");
}

export async function approveProposedAction(formData: FormData) {
  const proposedActionId = cleanOptionalUuid(formData.get("proposed_action_id"));

  if (!proposedActionId.valid || !proposedActionId.value) {
    redirect("/staff/proposed-actions?error=failed");
  }

  let staff: StaffProfile;

  try {
    staff = await requireOwnerOrAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    logProposedActionFailure("proposal approve staff auth failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    redirect("/staff/proposed-actions?error=failed");
  }

  const ok = await postRpc("core_approve_proposed_action", {
    p_proposed_action_id: proposedActionId.value,
    p_actor_profile_id: staff.id,
  });

  if (ok) {
    revalidateProposedActionSurfaces();
    redirect("/staff/proposed-actions?approved=1");
  }

  redirect("/staff/proposed-actions?error=failed");
}

export async function rejectProposedAction(formData: FormData) {
  const proposedActionId = cleanOptionalUuid(formData.get("proposed_action_id"));
  const rejectionReason = cleanText(formData.get("rejection_reason"), 1000);

  if (!proposedActionId.valid || !proposedActionId.value || !rejectionReason.valid) {
    redirect("/staff/proposed-actions?error=failed");
  }

  let staff: StaffProfile;

  try {
    staff = await requireOwnerOrAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    logProposedActionFailure("proposal reject staff auth failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    redirect("/staff/proposed-actions?error=failed");
  }

  const ok = await postRpc("core_reject_proposed_action", {
    p_proposed_action_id: proposedActionId.value,
    p_actor_profile_id: staff.id,
    p_rejection_reason: rejectionReason.value || null,
  });

  if (ok) {
    revalidateProposedActionSurfaces();
    redirect("/staff/proposed-actions?rejected=1");
  }

  redirect("/staff/proposed-actions?error=failed");
}
