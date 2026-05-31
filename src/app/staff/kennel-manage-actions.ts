"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEX_VALUES = new Set(["", "female", "male", "unknown"]);
const DOG_STATUSES = new Set(["active", "inactive", "retired", "hold", "deceased"]);
const LITTER_STATUSES = new Set(["planned", "expected", "born", "active", "closed", "archived"]);
const PUPPY_STATUSES = new Set(["unavailable", "available", "hold", "reserved", "placed", "kept", "deceased"]);
const PUBLIC_LISTING_STATUSES = new Set(["private", "public", "hidden", "coming_soon"]);

type KennelTable = "core_dogs" | "core_litters" | "core_puppies";

type KennelPath = "/staff/dogs" | "/staff/litters" | "/staff/puppies";

function logKennelManageFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core kennel manage]", reason, details ?? {});
  }
}

function getActionConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Kennel edit/delete actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development kennel edit/delete configuration is incomplete.");
  }

  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey };
}

function serverHeaders(serviceRoleKey: string, prefer?: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function requireOwnerOrAdmin(path: KennelPath, key: string) {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    redirect(`${path}?${key}=unauthorized`);
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

function cleanRequiredUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!UUID_PATTERN.test(text)) {
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

async function patchRow(table: KennelTable, id: string, payload: Record<string, unknown>) {
  const { restUrl, serviceRoleKey } = getActionConfig();
  const url = new URL(`${restUrl}/${table}`);
  url.searchParams.set("id", `eq.${id}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: serverHeaders(serviceRoleKey, "return=minimal"),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logKennelManageFailure("kennel row patch failed", { table, id, status: response.status, body });
    return false;
  }

  return true;
}

export async function updateDog(formData: FormData) {
  await requireOwnerOrAdmin("/staff/dogs", "dog");

  const dogId = cleanRequiredUuid(formData.get("dogId"));
  const callName = cleanText(formData.get("callName"), 120);
  const registeredName = cleanText(formData.get("registeredName"), 180);
  const sex = String(formData.get("sex") ?? "").trim().toLowerCase();
  const color = cleanText(formData.get("color"), 120);
  const coatType = cleanText(formData.get("coatType"), 80);
  const birthAt = cleanOptionalDate(formData.get("birthAt"));
  const status = String(formData.get("status") ?? "active").trim().toLowerCase();
  const externalReference = cleanText(formData.get("externalReference"), 160);
  const notes = cleanText(formData.get("notes"), 1000);

  if (!dogId.valid || !callName.valid || !registeredName.valid || !color.valid || !coatType.valid || !birthAt.valid || !externalReference.valid || !notes.valid) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  if (!callName.value && !registeredName.value) {
    redirect("/staff/dogs?dog=missing_name");
  }

  if (!SEX_VALUES.has(sex) || !DOG_STATUSES.has(status)) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  const ok = await patchRow("core_dogs", dogId.value, {
    call_name: callName.value || null,
    registered_name: registeredName.value || null,
    sex: sex || null,
    color: color.value || null,
    coat_type: coatType.value || null,
    birth_at: birthAt.value,
    status,
    external_reference: externalReference.value || null,
    notes: notes.value || null,
  });

  revalidatePath("/staff/dogs");
  revalidatePath("/staff/litters");
  redirect(`/staff/dogs?dog=${ok ? "updated" : "error"}`);
}

export async function archiveDog(formData: FormData) {
  await requireOwnerOrAdmin("/staff/dogs", "dog");
  const dogId = cleanRequiredUuid(formData.get("dogId"));

  if (!dogId.valid) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  const ok = await patchRow("core_dogs", dogId.value, { status: "inactive" });
  revalidatePath("/staff/dogs");
  revalidatePath("/staff/litters");
  redirect(`/staff/dogs?dog=${ok ? "deleted" : "error"}`);
}

export async function updateLitter(formData: FormData) {
  await requireOwnerOrAdmin("/staff/litters", "litter");

  const litterId = cleanRequiredUuid(formData.get("litterId"));
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

  if (!litterId.valid || !litterName.valid || !damId.valid || !sireId.valid || !expectedBirthAt.valid || !birthAt.valid || !totalPuppies.valid || !femaleCount.valid || !maleCount.valid || !externalReference.valid || !notes.valid) {
    redirect("/staff/litters?litter=invalid_input");
  }

  if (!LITTER_STATUSES.has(status)) {
    redirect("/staff/litters?litter=invalid_input");
  }

  if (damId.value && sireId.value && damId.value === sireId.value) {
    redirect("/staff/litters?litter=same_parents");
  }

  if (totalPuppies.value !== null && (femaleCount.value ?? 0) + (maleCount.value ?? 0) > totalPuppies.value) {
    redirect("/staff/litters?litter=invalid_counts");
  }

  const ok = await patchRow("core_litters", litterId.value, {
    litter_name: litterName.value || null,
    dam_id: damId.value,
    sire_id: sireId.value,
    expected_birth_at: expectedBirthAt.value,
    birth_at: birthAt.value,
    total_puppies: totalPuppies.value,
    female_count: femaleCount.value,
    male_count: maleCount.value,
    status,
    details_pending: detailsPending,
    external_reference: externalReference.value || null,
    notes: notes.value || null,
  });

  revalidatePath("/staff/litters");
  revalidatePath("/staff/puppies");
  redirect(`/staff/litters?litter=${ok ? "updated" : "error"}`);
}

export async function archiveLitter(formData: FormData) {
  await requireOwnerOrAdmin("/staff/litters", "litter");
  const litterId = cleanRequiredUuid(formData.get("litterId"));

  if (!litterId.valid) {
    redirect("/staff/litters?litter=invalid_input");
  }

  const ok = await patchRow("core_litters", litterId.value, { status: "archived" });
  revalidatePath("/staff/litters");
  revalidatePath("/staff/puppies");
  redirect(`/staff/litters?litter=${ok ? "deleted" : "error"}`);
}

export async function updatePuppy(formData: FormData) {
  await requireOwnerOrAdmin("/staff/puppies", "puppy");

  const puppyId = cleanRequiredUuid(formData.get("puppyId"));
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

  if (!puppyId.valid || !litterId.valid || !name.valid || !collarColor.valid || !color.valid || !coatType.valid || !birthAt.valid || !healthStatus.valid || !externalReference.valid || !notes.valid) {
    redirect("/staff/puppies?puppy=invalid_input");
  }

  if (!name.value && !collarColor.value && !externalReference.value) {
    redirect("/staff/puppies?puppy=missing_identifier");
  }

  if (!SEX_VALUES.has(sex) || !PUPPY_STATUSES.has(status) || !PUBLIC_LISTING_STATUSES.has(publicListingStatus)) {
    redirect("/staff/puppies?puppy=invalid_input");
  }

  const ok = await patchRow("core_puppies", puppyId.value, {
    litter_id: litterId.value,
    name: name.value || null,
    collar_color: collarColor.value || null,
    sex: sex || null,
    color: color.value || null,
    coat_type: coatType.value || null,
    birth_at: birthAt.value,
    status,
    health_status: healthStatus.value || null,
    public_listing_status: publicListingStatus,
    external_reference: externalReference.value || null,
    notes: notes.value || null,
  });

  revalidatePath("/staff/puppies");
  revalidatePath("/staff/litters");
  redirect(`/staff/puppies?puppy=${ok ? "updated" : "error"}`);
}

export async function archivePuppy(formData: FormData) {
  await requireOwnerOrAdmin("/staff/puppies", "puppy");
  const puppyId = cleanRequiredUuid(formData.get("puppyId"));

  if (!puppyId.valid) {
    redirect("/staff/puppies?puppy=invalid_input");
  }

  const ok = await patchRow("core_puppies", puppyId.value, {
    status: "unavailable",
    public_listing_status: "hidden",
  });
  revalidatePath("/staff/puppies");
  revalidatePath("/staff/litters");
  redirect(`/staff/puppies?puppy=${ok ? "deleted" : "error"}`);
}
