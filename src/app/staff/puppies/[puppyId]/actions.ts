"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBSERVATION_TYPES = new Set(["nursing_observed", "bottle_feeding", "weight_check", "dam_note", "general_note", "watch_note"]);
const RESERVATION_STATUSES = new Set(["pending", "reserved"]);

function getActionConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function requireOwnerOrAdmin(path: string) {
  const staff = await requireStaffProfile();
  if (staff.role !== "owner" && staff.role !== "admin") {
    redirect(`${path}?action=unauthorized`);
  }
  return staff;
}

function cleanUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return UUID_PATTERN.test(text) ? { valid: true, value: text } : { valid: false, value: "" };
}

function cleanOptionalUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return { valid: true, value: null as string | null };
  return UUID_PATTERN.test(text) ? { valid: true, value: text } : { valid: false, value: null };
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  return text.length <= maxLength ? { valid: true, value: text } : { valid: false, value: "" };
}

function cleanDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return { valid: true, value: null as string | null };
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? { valid: false, value: null } : { valid: true, value: parsed.toISOString() };
}

function cleanWeight(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return { valid: false, value: 0 };
  const weight = Number.parseInt(text, 10);
  return Number.isSafeInteger(weight) && weight >= 1 && weight <= 10000 ? { valid: true, value: weight } : { valid: false, value: 0 };
}

function cleanMoney(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { valid: false, value: 0 };
  const cents = Math.round(Number.parseFloat(text) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? { valid: true, value: cents } : { valid: false, value: 0 };
}

function cleanOptionalMoney(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return { valid: true, value: null as number | null };
  const parsed = cleanMoney(value);
  return parsed.valid ? { valid: true, value: parsed.value } : { valid: false, value: null };
}

async function postRpc(functionName: string, body: Record<string, unknown>) {
  const config = getActionConfig();
  if (!config) return { ok: false, code: "configuration" };
  try {
    const response = await fetch(`${config.restUrl}/rpc/${functionName}`, {
      method: "POST",
      headers: serverHeaders(config.serviceRoleKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return { ok: response.ok, code: response.ok ? "success" : "failed" };
  } catch {
    return { ok: false, code: "failed" };
  }
}

function revalidatePuppyPaths(puppyId: string) {
  revalidatePath("/staff/puppies");
  revalidatePath(`/staff/puppies/${puppyId}`);
  revalidatePath(`/staff/puppies/${puppyId}/edit`);
  revalidatePath("/staff/litters");
  revalidatePath("/staff/reservations");
  revalidatePath("/staff/command");
}

export async function recordPuppyWeightFromDetail(formData: FormData) {
  const puppyId = cleanUuid(formData.get("puppyId"));
  const staff = await requireOwnerOrAdmin(puppyId.valid ? `/staff/puppies/${puppyId.value}` : "/staff/puppies");
  const weightGrams = cleanWeight(formData.get("weightGrams"));
  const measuredAt = cleanDateTime(formData.get("measuredAt"));
  const notes = cleanText(formData.get("notes"), 1000);

  if (!puppyId.valid || !weightGrams.valid || !measuredAt.valid || !notes.valid) {
    redirect("/staff/puppies?action=invalid");
  }

  const result = await postRpc("core_record_puppy_weight_log", {
    p_actor_profile_id: staff.id,
    p_puppy_id: puppyId.value,
    p_weight_grams: weightGrams.value,
    p_measured_at: measuredAt.value,
    p_notes: notes.value || null,
  });

  revalidatePuppyPaths(puppyId.value);
  redirect(`/staff/puppies/${puppyId.value}?weight=${result.code}`);
}

export async function updatePuppyWeightLog(formData: FormData) {
  const puppyId = cleanUuid(formData.get("puppyId"));
  const weightLogId = cleanUuid(formData.get("weightLogId"));
  const staff = await requireOwnerOrAdmin(puppyId.valid ? `/staff/puppies/${puppyId.value}` : "/staff/puppies");
  const weightGrams = cleanWeight(formData.get("weightGrams"));
  const measuredAt = cleanDateTime(formData.get("measuredAt"));
  const notes = cleanText(formData.get("notes"), 1000);

  if (!puppyId.valid || !weightLogId.valid || !weightGrams.valid || !measuredAt.valid || !notes.valid) {
    redirect("/staff/puppies?action=invalid");
  }

  const result = await postRpc("core_update_puppy_weight_log", {
    p_weight_log_id: weightLogId.value,
    p_actor_profile_id: staff.id,
    p_measured_at: measuredAt.value,
    p_weight_grams: weightGrams.value,
    p_notes: notes.value || null,
  });

  revalidatePuppyPaths(puppyId.value);
  redirect(`/staff/puppies/${puppyId.value}?weight=${result.code}`);
}

export async function recordPuppyCareObservationFromDetail(formData: FormData) {
  const puppyId = cleanUuid(formData.get("puppyId"));
  const staff = await requireOwnerOrAdmin(puppyId.valid ? `/staff/puppies/${puppyId.value}` : "/staff/puppies");
  const observedAt = cleanDateTime(formData.get("observedAt"));
  const observationType = String(formData.get("observationType") ?? "").trim().toLowerCase();
  const note = cleanText(formData.get("note"), 1000);

  if (!puppyId.valid || !observedAt.valid || !OBSERVATION_TYPES.has(observationType) || !note.valid) {
    redirect("/staff/puppies?action=invalid");
  }

  const result = await postRpc("core_record_puppy_care_observation", {
    p_actor_profile_id: staff.id,
    p_puppy_id: puppyId.value,
    p_observation_type: observationType,
    p_observed_at: observedAt.value,
    p_note: note.value || null,
  });

  revalidatePuppyPaths(puppyId.value);
  redirect(`/staff/puppies/${puppyId.value}?care=${result.code}`);
}

export async function createPuppyReservationAssignment(formData: FormData) {
  const puppyId = cleanUuid(formData.get("puppyId"));
  const staff = await requireOwnerOrAdmin(puppyId.valid ? `/staff/puppies/${puppyId.value}` : "/staff/puppies");
  const buyerId = cleanUuid(formData.get("buyerId"));
  const familyId = cleanUuid(formData.get("familyId"));
  const applicationId = cleanOptionalUuid(formData.get("applicationId"));
  const reservationStatus = String(formData.get("reservationStatus") ?? "reserved").trim().toLowerCase();
  const contractTotal = cleanMoney(formData.get("contractTotalDollars"));
  const depositRequired = cleanOptionalMoney(formData.get("depositRequiredDollars"));
  const saleType = cleanText(formData.get("saleType"), 100);
  const notes = cleanText(formData.get("notes"), 1000);

  if (!puppyId.valid || !buyerId.valid || !familyId.valid || !applicationId.valid || !RESERVATION_STATUSES.has(reservationStatus) || !contractTotal.valid || !depositRequired.valid || !saleType.valid || !notes.valid) {
    redirect(puppyId.valid ? `/staff/puppies/${puppyId.value}?assignment=invalid` : "/staff/puppies?assignment=invalid");
  }

  const result = await postRpc("core_create_reservation", {
    p_buyer_id: buyerId.value,
    p_family_id: familyId.value,
    p_puppy_id: puppyId.value,
    p_application_id: applicationId.value,
    p_actor_profile_id: staff.id,
    p_contract_total_cents: contractTotal.value,
    p_deposit_required_cents: depositRequired.value,
    p_sale_type: saleType.value || `manual_${reservationStatus}`,
    p_notes: notes.value || null,
  });

  revalidatePuppyPaths(puppyId.value);
  revalidatePath(`/staff/buyers/${buyerId.value}`);
  revalidatePath(`/staff/families/${familyId.value}`);
  redirect(`/staff/puppies/${puppyId.value}?assignment=${result.code}`);
}
