"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUYER_STATUSES = new Set(["pending", "approved", "declined", "inactive", "needs_review"]);
const FAMILY_STATUSES = new Set(["active", "inactive", "pending", "archived"]);

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

async function requireOwnerOrAdmin(path: string, key: string) {
  const staff = await requireStaffProfile();
  if (staff.role !== "owner" && staff.role !== "admin") {
    redirect(`${path}?${key}=unauthorized`);
  }
  return staff;
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  return text.length <= maxLength ? { valid: true, value: text } : { valid: false, value: "" };
}

function cleanUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return UUID_PATTERN.test(text) ? { valid: true, value: text } : { valid: false, value: "" };
}

function cleanOptionalUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return { valid: true, value: "" };
  return UUID_PATTERN.test(text) ? { valid: true, value: text } : { valid: false, value: "" };
}

async function postRpc(functionName: string, body: Record<string, unknown>) {
  const config = getActionConfig();
  if (!config) return { ok: false, id: null as string | null, code: "configuration" };

  try {
    const response = await fetch(`${config.restUrl}/rpc/${functionName}`, {
      method: "POST",
      headers: serverHeaders(config.serviceRoleKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const isMissingRpc =
        response.status === 404 &&
        (bodyText.includes("PGRST202") || bodyText.includes(`/${functionName}`) || bodyText.includes(functionName));
      return {
        ok: false,
        id: null,
        code: isMissingRpc ? "migration_missing" : response.status === 409 ? "duplicate" : "failed",
      };
    }

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    return { ok: true, id: typeof parsed === "string" ? parsed : null, code: "success" };
  } catch {
    return { ok: false, id: null, code: "failed" };
  }
}

function revalidateRelationshipPaths() {
  revalidatePath("/staff/buyers");
  revalidatePath("/staff/families");
  revalidatePath("/staff/puppies");
  revalidatePath("/staff/reservations");
  revalidatePath("/staff/command");
}

export async function createManualBuyer(formData: FormData) {
  const staff = await requireOwnerOrAdmin("/staff/buyers/new", "buyer");
  const firstName = cleanText(formData.get("firstName"), 120);
  const lastName = cleanText(formData.get("lastName"), 120);
  const preferredName = cleanText(formData.get("preferredName"), 120);
  const email = cleanText(formData.get("email"), 180);
  const phone = cleanText(formData.get("phone"), 80);
  const alternatePhone = cleanText(formData.get("alternatePhone"), 80);
  const streetAddress = cleanText(formData.get("streetAddress"), 240);
  const city = cleanText(formData.get("city"), 120);
  const state = cleanText(formData.get("state"), 80);
  const postalCode = cleanText(formData.get("postalCode"), 40);
  const notes = cleanText(formData.get("notes"), 1000);
  const approvalStatus = String(formData.get("approvalStatus") ?? "pending").trim().toLowerCase();
  const familyId = cleanOptionalUuid(formData.get("familyId"));

  if (![firstName, lastName, preferredName, email, phone, alternatePhone, streetAddress, city, state, postalCode, notes, familyId].every((item) => item.valid) || !BUYER_STATUSES.has(approvalStatus)) {
    redirect("/staff/buyers/new?buyer=invalid");
  }

  const result = await postRpc("core_create_manual_buyer", {
    p_actor_profile_id: staff.id,
    p_first_name: firstName.value || null,
    p_last_name: lastName.value || null,
    p_preferred_name: preferredName.value || null,
    p_email: email.value || null,
    p_phone: phone.value || null,
    p_alternate_phone: alternatePhone.value || null,
    p_street_address: streetAddress.value || null,
    p_city: city.value || null,
    p_state: state.value || null,
    p_postal_code: postalCode.value || null,
    p_approval_status: approvalStatus,
    p_notes: notes.value || null,
  });

  if (result.ok && result.id && familyId.value) {
    await postRpc("core_link_buyer_family_member", {
      p_actor_profile_id: staff.id,
      p_family_id: familyId.value,
      p_buyer_id: result.id,
      p_relationship: "primary_contact",
      p_is_primary_contact: true,
    });
  }

  revalidateRelationshipPaths();
  redirect(result.ok && result.id ? `/staff/buyers/${result.id}?buyer=created` : `/staff/buyers/new?buyer=${result.code}`);
}

export async function updateBuyer(formData: FormData) {
  const buyerId = cleanUuid(formData.get("buyerId"));
  const staff = await requireOwnerOrAdmin(buyerId.valid ? `/staff/buyers/${buyerId.value}/edit` : "/staff/buyers", "buyer");
  const firstName = cleanText(formData.get("firstName"), 120);
  const lastName = cleanText(formData.get("lastName"), 120);
  const preferredName = cleanText(formData.get("preferredName"), 120);
  const email = cleanText(formData.get("email"), 180);
  const phone = cleanText(formData.get("phone"), 80);
  const alternatePhone = cleanText(formData.get("alternatePhone"), 80);
  const streetAddress = cleanText(formData.get("streetAddress"), 240);
  const city = cleanText(formData.get("city"), 120);
  const state = cleanText(formData.get("state"), 80);
  const postalCode = cleanText(formData.get("postalCode"), 40);
  const notes = cleanText(formData.get("notes"), 1000);
  const approvalStatus = String(formData.get("approvalStatus") ?? "pending").trim().toLowerCase();

  if (!buyerId.valid || ![firstName, lastName, preferredName, email, phone, alternatePhone, streetAddress, city, state, postalCode, notes].every((item) => item.valid) || !BUYER_STATUSES.has(approvalStatus)) {
    redirect("/staff/buyers?buyer=invalid");
  }

  const result = await postRpc("core_update_buyer", {
    p_buyer_id: buyerId.value,
    p_actor_profile_id: staff.id,
    p_first_name: firstName.value || null,
    p_last_name: lastName.value || null,
    p_preferred_name: preferredName.value || null,
    p_email: email.value || null,
    p_phone: phone.value || null,
    p_alternate_phone: alternatePhone.value || null,
    p_street_address: streetAddress.value || null,
    p_city: city.value || null,
    p_state: state.value || null,
    p_postal_code: postalCode.value || null,
    p_approval_status: approvalStatus,
    p_notes: notes.value || null,
  });

  revalidateRelationshipPaths();
  revalidatePath(`/staff/buyers/${buyerId.value}`);
  redirect(
    result.ok
      ? `/staff/buyers/${buyerId.value}?buyer=${result.code}`
      : `/staff/buyers/${buyerId.value}/edit?buyer=${result.code}`,
  );
}

export async function createFamily(formData: FormData) {
  const staff = await requireOwnerOrAdmin("/staff/families/new", "family");
  const name = cleanText(formData.get("name"), 160);
  const notes = cleanText(formData.get("notes"), 1000);
  const buyerId = cleanOptionalUuid(formData.get("buyerId"));
  const status = String(formData.get("status") ?? "active").trim().toLowerCase();

  if (!name.valid || !notes.valid || !buyerId.valid || !FAMILY_STATUSES.has(status)) {
    redirect("/staff/families/new?family=invalid");
  }

  const result = await postRpc("core_create_family", {
    p_actor_profile_id: staff.id,
    p_name: name.value || null,
    p_status: status,
    p_notes: notes.value || null,
  });

  if (result.ok && result.id && buyerId.value) {
    await postRpc("core_link_buyer_family_member", {
      p_actor_profile_id: staff.id,
      p_family_id: result.id,
      p_buyer_id: buyerId.value,
      p_relationship: "primary_contact",
      p_is_primary_contact: true,
    });
  }

  revalidateRelationshipPaths();
  redirect(result.ok && result.id ? `/staff/families/${result.id}?family=created` : `/staff/families/new?family=${result.code}`);
}

export async function updateFamily(formData: FormData) {
  const familyId = cleanUuid(formData.get("familyId"));
  const staff = await requireOwnerOrAdmin(familyId.valid ? `/staff/families/${familyId.value}/edit` : "/staff/families", "family");
  const name = cleanText(formData.get("name"), 160);
  const notes = cleanText(formData.get("notes"), 1000);
  const status = String(formData.get("status") ?? "active").trim().toLowerCase();

  if (!familyId.valid || !name.valid || !notes.valid || !FAMILY_STATUSES.has(status)) {
    redirect("/staff/families?family=invalid");
  }

  const result = await postRpc("core_update_family", {
    p_family_id: familyId.value,
    p_actor_profile_id: staff.id,
    p_name: name.value || null,
    p_status: status,
    p_notes: notes.value || null,
  });

  revalidateRelationshipPaths();
  revalidatePath(`/staff/families/${familyId.value}`);
  redirect(
    result.ok
      ? `/staff/families/${familyId.value}?family=${result.code}`
      : `/staff/families/${familyId.value}/edit?family=${result.code}`,
  );
}

export async function linkBuyerFamilyMember(formData: FormData) {
  const familyId = cleanUuid(formData.get("familyId"));
  const buyerId = cleanUuid(formData.get("buyerId"));
  const staff = await requireOwnerOrAdmin(familyId.valid ? `/staff/families/${familyId.value}` : "/staff/families", "family");
  const relationship = cleanText(formData.get("relationship"), 80);
  const isPrimary = formData.get("isPrimaryContact") === "on";

  if (!familyId.valid || !buyerId.valid || !relationship.valid) {
    redirect("/staff/families?family=invalid");
  }

  const result = await postRpc("core_link_buyer_family_member", {
    p_actor_profile_id: staff.id,
    p_family_id: familyId.value,
    p_buyer_id: buyerId.value,
    p_relationship: relationship.value || "member",
    p_is_primary_contact: isPrimary,
  });

  revalidateRelationshipPaths();
  revalidatePath(`/staff/families/${familyId.value}`);
  revalidatePath(`/staff/buyers/${buyerId.value}`);
  redirect(`/staff/families/${familyId.value}?family=${result.code}`);
}
