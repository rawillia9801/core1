"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBSERVATION_TYPES = new Set(["nursing_observed", "bottle_feeding", "weight_check", "dam_note", "general_note", "watch_note"]);

function logNeonatalFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core neonatal log]", reason, details ?? {});
  }
}

function getActionConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Puppy weight/care log actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development puppy weight/care log action configuration is incomplete.");
  }

  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey };
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
    redirect("/staff/litters?error=unauthorized");
  }

  return staff;
}

function cleanRequiredUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return UUID_PATTERN.test(text) ? { valid: true, value: text } : { valid: false, value: "" };
}

function cleanOptionalDateTime(value: FormDataEntryValue | null) {
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

function cleanBoundedText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();

  if (text.length > maxLength) {
    return { valid: false, value: "" };
  }

  return { valid: true, value: text };
}

function cleanWeightGrams(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!/^\d+$/.test(text)) {
    return { valid: false, value: 0 };
  }

  const weight = Number.parseInt(text, 10);
  return Number.isSafeInteger(weight) && weight >= 1 && weight <= 10000
    ? { valid: true, value: weight }
    : { valid: false, value: 0 };
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
    logNeonatalFailure("neonatal log RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return false;
  }

  return true;
}

export async function recordPuppyWeight(formData: FormData) {
  const staff = await requireOwnerOrAdmin();
  const puppyId = cleanRequiredUuid(formData.get("puppyId"));
  const weightGrams = cleanWeightGrams(formData.get("weightGrams"));
  const measuredAt = cleanOptionalDateTime(formData.get("measuredAt"));
  const notes = cleanBoundedText(formData.get("notes"), 1000);

  if (!puppyId.valid || !weightGrams.valid || !measuredAt.valid || !notes.valid) {
    redirect("/staff/litters?error=invalid");
  }

  const ok = await postRpc("core_record_puppy_weight_log", {
    p_actor_profile_id: staff.id,
    p_puppy_id: puppyId.value,
    p_weight_grams: weightGrams.value,
    p_measured_at: measuredAt.value,
    p_notes: notes.value || null,
  });

  revalidatePath("/staff/litters");
  revalidatePath("/staff/puppies");
  redirect(ok ? "/staff/litters?weight_recorded=1" : "/staff/litters?error=failed");
}

export async function recordPuppyCareObservation(formData: FormData) {
  const staff = await requireOwnerOrAdmin();
  const puppyId = cleanRequiredUuid(formData.get("puppyId"));
  const observedAt = cleanOptionalDateTime(formData.get("observedAt"));
  const observationType = String(formData.get("observationType") ?? "").trim().toLowerCase();
  const note = cleanBoundedText(formData.get("note"), 1000);

  if (!puppyId.valid || !observedAt.valid || !OBSERVATION_TYPES.has(observationType) || !note.valid) {
    redirect("/staff/litters?error=invalid");
  }

  const ok = await postRpc("core_record_puppy_care_observation", {
    p_actor_profile_id: staff.id,
    p_puppy_id: puppyId.value,
    p_observation_type: observationType,
    p_observed_at: observedAt.value,
    p_note: note.value || null,
  });

  revalidatePath("/staff/litters");
  revalidatePath("/staff/puppies");
  redirect(ok ? "/staff/litters?observation_recorded=1" : "/staff/litters?error=failed");
}
