"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canStaffPerformDashboardAction,
  requireStaffProfile,
  type StaffProfile,
} from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEX_VALUES = new Set(["", "female", "male", "unknown"]);
const DOG_STATUSES = new Set(["active", "inactive", "retired", "hold", "deceased"]);
const LITTER_STATUSES = new Set(["planned", "expected", "born", "active", "closed", "archived"]);
const PUPPY_STATUSES = new Set(["unavailable", "available", "hold", "reserved", "placed", "kept", "deceased"]);
const PUBLIC_LISTING_STATUSES = new Set(["private", "public", "hidden", "coming_soon"]);

function logKennelFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core kennel]", reason, details ?? {});
  }
}

function getActionConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Kennel create actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    logKennelFailure("missing local/development action configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    throw new Error("Local/development kennel action configuration is incomplete.");
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

async function requireAuthorizedKennelStaff(action: "create_dog" | "create_litter" | "create_puppy") {
  const staff = await requireStaffProfile();

  if (!canStaffPerformDashboardAction(staff, action)) {
    logKennelFailure("staff profile is not authorized for kennel create action", {
      action,
      staffProfileId: staff.id,
      staffRole: staff.role,
    });
    return null;
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

function cleanOptionalDate(value: FormDataEntryValue | null) {
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

function cleanOptionalInteger(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  if (!/^\d+$/.test(text)) {
    return { valid: false, value: null };
  }

  const numberValue = Number.parseInt(text, 10);

  if (!Number.isSafeInteger(numberValue)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: numberValue };
}

function redirectWith(path: string, key: string, outcome: string) {
  redirect(`${path}?${key}=${outcome}`);
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
    logKennelFailure("kennel create RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return false;
  }

  return true;
}

export async function createDog(formData: FormData) {
  const callName = cleanText(formData.get("callName"), 120);
  const registeredName = cleanText(formData.get("registeredName"), 180);
  const sex = String(formData.get("sex") ?? "").trim().toLowerCase();
  const color = cleanText(formData.get("color"), 120);
  const coatType = cleanText(formData.get("coatType"), 80);
  const birthAt = cleanOptionalDate(formData.get("birthAt"));
  const status = String(formData.get("status") ?? "active").trim().toLowerCase();
  const externalReference = cleanText(formData.get("externalReference"), 160);
  const notes = cleanText(formData.get("notes"), 1000);
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedKennelStaff("create_dog");
  } catch (error) {
    logKennelFailure("dog create staff auth failed", { error: error instanceof Error ? error.message : "Unknown error" });
    throw error;
  }

  if (!staff) redirectWith("/staff/dogs", "dog", "unauthorized");

  if (!callName.valid || !registeredName.valid || !color.valid || !coatType.valid || !externalReference.valid || !notes.valid || !birthAt.valid) {
    redirectWith("/staff/dogs", "dog", "invalid_input");
  }

  if (!callName.value && !registeredName.value) {
    redirectWith("/staff/dogs", "dog", "missing_name");
  }

  if (!SEX_VALUES.has(sex) || !DOG_STATUSES.has(status)) {
    redirectWith("/staff/dogs", "dog", "invalid_input");
  }

  const ok = await postRpc("core_create_dog", {
    p_actor_profile_id: staff.id,
    p_call_name: callName.value || null,
    p_registered_name: registeredName.value || null,
    p_sex: sex || null,
    p_color: color.value || null,
    p_coat_type: coatType.value || null,
    p_birth_at: birthAt.value,
    p_status: status,
    p_external_reference: externalReference.value || null,
    p_notes: notes.value || null,
  });

  if (ok) {
    revalidatePath("/staff/dogs");
    revalidatePath("/staff/litters");
    redirectWith("/staff/dogs", "dog", "success");
  }

  redirectWith("/staff/dogs", "dog", "error");
}

export async function createLitter(formData: FormData) {
  const litterName = cleanText(formData.get("litterName"), 160);
  const damId = cleanOptionalUuid(formData.get("damId"));
  const sireId = cleanOptionalUuid(formData.get("sireId"));
  const expectedBirthAt = cleanOptionalDate(formData.get("expectedBirthAt"));
  const birthAt = cleanOptionalDate(formData.get("birthAt"));
  const totalPuppies = cleanOptionalInteger(formData.get("totalPuppies"));
  const femaleCount = cleanOptionalInteger(formData.get("femaleCount"));
  const maleCount = cleanOptionalInteger(formData.get("maleCount"));
  const status = String(formData.get("status") ?? "planned").trim().toLowerCase();
  const detailsPending = formData.get("detailsPending") === "on";
  const externalReference = cleanText(formData.get("externalReference"), 160);
  const notes = cleanText(formData.get("notes"), 1000);
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedKennelStaff("create_litter");
  } catch (error) {
    logKennelFailure("litter create staff auth failed", { error: error instanceof Error ? error.message : "Unknown error" });
    throw error;
  }

  if (!staff) redirectWith("/staff/litters", "litter", "unauthorized");

  if (!litterName.valid || !damId.valid || !sireId.valid || !expectedBirthAt.valid || !birthAt.valid || !totalPuppies.valid || !femaleCount.valid || !maleCount.valid || !externalReference.valid || !notes.valid) {
    redirectWith("/staff/litters", "litter", "invalid_input");
  }

  if (!LITTER_STATUSES.has(status)) {
    redirectWith("/staff/litters", "litter", "invalid_input");
  }

  if (damId.value && sireId.value && damId.value === sireId.value) {
    redirectWith("/staff/litters", "litter", "same_parents");
  }

  if (totalPuppies.value !== null && (femaleCount.value ?? 0) + (maleCount.value ?? 0) > totalPuppies.value) {
    redirectWith("/staff/litters", "litter", "invalid_counts");
  }

  const ok = await postRpc("core_create_litter", {
    p_actor_profile_id: staff.id,
    p_litter_name: litterName.value || null,
    p_dam_id: damId.value,
    p_sire_id: sireId.value,
    p_expected_birth_at: expectedBirthAt.value,
    p_birth_at: birthAt.value,
    p_total_puppies: totalPuppies.value,
    p_female_count: femaleCount.value,
    p_male_count: maleCount.value,
    p_status: status,
    p_details_pending: detailsPending,
    p_external_reference: externalReference.value || null,
    p_notes: notes.value || null,
  });

  if (ok) {
    revalidatePath("/staff/litters");
    revalidatePath("/staff/puppies");
    redirectWith("/staff/litters", "litter", "success");
  }

  redirectWith("/staff/litters", "litter", "error");
}

export async function createPuppy(formData: FormData) {
  const litterId = cleanOptionalUuid(formData.get("litterId"));
  const name = cleanText(formData.get("name"), 120);
  const collarColor = cleanText(formData.get("collarColor"), 80);
  const sex = String(formData.get("sex") ?? "").trim().toLowerCase();
  const color = cleanText(formData.get("color"), 120);
  const coatType = cleanText(formData.get("coatType"), 80);
  const birthAt = cleanOptionalDate(formData.get("birthAt"));
  const status = String(formData.get("status") ?? "unavailable").trim().toLowerCase();
  const healthStatus = cleanText(formData.get("healthStatus"), 160);
  const publicListingStatus = String(formData.get("publicListingStatus") ?? "private").trim().toLowerCase();
  const externalReference = cleanText(formData.get("externalReference"), 160);
  const notes = cleanText(formData.get("notes"), 1000);
  let staff: StaffProfile | null = null;

  try {
    staff = await requireAuthorizedKennelStaff("create_puppy");
  } catch (error) {
    logKennelFailure("puppy create staff auth failed", { error: error instanceof Error ? error.message : "Unknown error" });
    throw error;
  }

  if (!staff) redirectWith("/staff/puppies", "puppy", "unauthorized");

  if (!litterId.valid || !name.valid || !collarColor.valid || !color.valid || !coatType.valid || !birthAt.valid || !healthStatus.valid || !externalReference.valid || !notes.valid) {
    redirectWith("/staff/puppies", "puppy", "invalid_input");
  }

  if (!name.value && !collarColor.value && !externalReference.value) {
    redirectWith("/staff/puppies", "puppy", "missing_identifier");
  }

  if (!SEX_VALUES.has(sex) || !PUPPY_STATUSES.has(status) || !PUBLIC_LISTING_STATUSES.has(publicListingStatus)) {
    redirectWith("/staff/puppies", "puppy", "invalid_input");
  }

  const ok = await postRpc("core_create_puppy", {
    p_actor_profile_id: staff.id,
    p_litter_id: litterId.value,
    p_name: name.value || null,
    p_collar_color: collarColor.value || null,
    p_sex: sex || null,
    p_color: color.value || null,
    p_coat_type: coatType.value || null,
    p_birth_at: birthAt.value,
    p_status: status,
    p_health_status: healthStatus.value || null,
    p_public_listing_status: publicListingStatus,
    p_external_reference: externalReference.value || null,
    p_notes: notes.value || null,
  });

  if (ok) {
    revalidatePath("/staff/puppies");
    revalidatePath("/staff/litters");
    redirectWith("/staff/puppies", "puppy", "success");
  }

  redirectWith("/staff/puppies", "puppy", "error");
}
