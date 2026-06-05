"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOG_DOCUMENT_BUCKET = "dog-documents";
const DOG_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const PROFILE_ROLES = new Set(["", "dam", "sire", "active", "retired", "breeding_candidate", "other"]);
const HEALTH_EVENT_TYPES = new Set(["vet_visit", "vaccine", "surgery", "birth_complication", "reproductive", "medication", "injury", "general_health_note", "other"]);
const HEALTH_SEVERITIES = new Set(["", "low", "watch", "moderate", "high", "emergency", "unknown"]);
const DOG_DOCUMENT_TYPES = new Set(["genetic_test", "embark_report", "pedigree", "akc_registration", "ckc_registration", "aca_registration", "dual_registration", "vaccine_record", "health_certificate", "surgery_record", "emergency_vet_record", "acquisition_record", "microchip_record", "other"]);
const DOG_DOCUMENT_STATUSES = new Set(["metadata_only", "pending", "active", "expired", "archived", "review_needed"]);
const DOG_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv"]);
const DOG_DOCUMENT_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt", "csv"]);

function logDogProfileFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core dog profile]", reason, details ?? {});
  }
}

function getActionConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dog profile write actions are disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development dog profile action configuration is incomplete.");
  }

  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey };
}

function getStorageClient() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Local/development storage action configuration is incomplete.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function requireOwnerOrAdmin(dogId: string, resultKey: string) {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    redirect(`/staff/dogs/${dogId}?dog=${resultKey}_unauthorized`);
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
  return { valid: UUID_PATTERN.test(text), value: text };
}

function cleanOptionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? { valid: false, value: null }
    : { valid: true, value: parsed.toISOString() };
}

function cleanOptionalCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { valid: false, value: null };
  }

  const cents = Math.round(Number.parseFloat(text) * 100);
  return Number.isSafeInteger(cents) ? { valid: true, value: cents } : { valid: false, value: null };
}

function cleanOptionalInteger(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return { valid: true, value: null };
  }

  if (!/^\d+$/.test(text)) {
    return { valid: false, value: null };
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isSafeInteger(parsed) ? { valid: true, value: parsed } : { valid: false, value: null };
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
    logDogProfileFailure("dog profile RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody,
    });
    return false;
  }

  return true;
}

async function readOne<T>(table: string, params: Record<string, string>) {
  const { restUrl, serviceRoleKey } = getActionConfig();
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    logDogProfileFailure("dog profile read failed", {
      table,
      httpStatus: response.status,
      responseBody: await response.text().catch(() => ""),
    });
    return null;
  }

  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
}

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 160);

  return cleaned || "dog-document-file";
}

function fileExtension(value: string) {
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index + 1).toLowerCase() : "";
}

function isAllowedDogDocumentFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = fileExtension(file.name);

  return DOG_DOCUMENT_MIME_TYPES.has(mimeType) && DOG_DOCUMENT_EXTENSIONS.has(extension);
}

export async function updateDogProfileMetadata(formData: FormData) {
  const dogId = cleanRequiredUuid(formData.get("dogId"));

  if (!dogId.valid) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  const staff = await requireOwnerOrAdmin(dogId.value, "profile");
  const role = String(formData.get("role") ?? "").trim().toLowerCase();
  const acquiredFromName = cleanText(formData.get("acquiredFromName"), 180);
  const acquiredFromState = cleanText(formData.get("acquiredFromState"), 80);
  const acquiredFromContact = cleanText(formData.get("acquiredFromContact"), 240);
  const acquisitionDate = cleanOptionalDate(formData.get("acquisitionDate"));
  const acquisitionPrice = cleanOptionalCents(formData.get("acquisitionPrice"));
  const acquisitionNotes = cleanText(formData.get("acquisitionNotes"), 1000);
  const primaryRegistry = cleanText(formData.get("primaryRegistry"), 80);
  const secondaryRegistry = cleanText(formData.get("secondaryRegistry"), 80);
  const registrationNumber = cleanText(formData.get("registrationNumber"), 120);
  const secondaryRegistrationNumber = cleanText(formData.get("secondaryRegistrationNumber"), 120);
  const microchipNumber = cleanText(formData.get("microchipNumber"), 120);
  const geneticTestingSummary = cleanText(formData.get("geneticTestingSummary"), 1000);
  const colorCoatGeneticsNotes = cleanText(formData.get("colorCoatGeneticsNotes"), 1000);
  const coiNotes = cleanText(formData.get("coiNotes"), 1000);
  const certificateNotes = cleanText(formData.get("certificateNotes"), 1000);

  if (!PROFILE_ROLES.has(role) || !acquiredFromName.valid || !acquiredFromState.valid || !acquiredFromContact.valid || !acquisitionDate.valid || !acquisitionPrice.valid || !acquisitionNotes.valid || !primaryRegistry.valid || !secondaryRegistry.valid || !registrationNumber.valid || !secondaryRegistrationNumber.valid || !microchipNumber.valid || !geneticTestingSummary.valid || !colorCoatGeneticsNotes.valid || !coiNotes.valid || !certificateNotes.valid) {
    redirect(`/staff/dogs/${dogId.value}?dog=profile_invalid_input`);
  }

  const ok = await postRpc("core_update_dog_profile_metadata", {
    p_actor_profile_id: staff.id,
    p_dog_id: dogId.value,
    p_role: role || null,
    p_acquired_from_name: acquiredFromName.value || null,
    p_acquired_from_state: acquiredFromState.value || null,
    p_acquired_from_contact: acquiredFromContact.value || null,
    p_acquisition_date: acquisitionDate.value,
    p_acquisition_price_cents: acquisitionPrice.value,
    p_acquisition_notes: acquisitionNotes.value || null,
    p_primary_registry: primaryRegistry.value || null,
    p_secondary_registry: secondaryRegistry.value || null,
    p_registration_number: registrationNumber.value || null,
    p_secondary_registration_number: secondaryRegistrationNumber.value || null,
    p_microchip_number: microchipNumber.value || null,
    p_genetic_testing_summary: geneticTestingSummary.value || null,
    p_color_coat_genetics_notes: colorCoatGeneticsNotes.value || null,
    p_coi_notes: coiNotes.value || null,
    p_certificate_notes: certificateNotes.value || null,
  });

  revalidatePath(`/staff/dogs/${dogId.value}`);
  revalidatePath("/staff/dogs");
  redirect(`/staff/dogs/${dogId.value}?dog=${ok ? "profile_updated" : "profile_error"}`);
}

export async function recordDogHealthEvent(formData: FormData) {
  const dogId = cleanRequiredUuid(formData.get("dogId"));

  if (!dogId.valid) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  const staff = await requireOwnerOrAdmin(dogId.value, "health");
  const eventType = String(formData.get("eventType") ?? "").trim().toLowerCase();
  const eventDate = cleanOptionalDate(formData.get("eventDate"));
  const title = cleanText(formData.get("title"), 180);
  const description = cleanText(formData.get("description"), 1600);
  const veterinarianOrClinic = cleanText(formData.get("veterinarianOrClinic"), 180);
  const cost = cleanOptionalCents(formData.get("cost"));
  const followUpDate = cleanOptionalDate(formData.get("followUpDate"));
  const severity = String(formData.get("severity") ?? "").trim().toLowerCase();

  if (!HEALTH_EVENT_TYPES.has(eventType) || !eventDate.valid || !eventDate.value || !title.valid || !title.value || !description.valid || !veterinarianOrClinic.valid || !cost.valid || !followUpDate.valid || !HEALTH_SEVERITIES.has(severity)) {
    redirect(`/staff/dogs/${dogId.value}?dog=health_invalid_input`);
  }

  const ok = await postRpc("core_record_dog_health_event", {
    p_actor_profile_id: staff.id,
    p_dog_id: dogId.value,
    p_event_type: eventType,
    p_event_date: eventDate.value,
    p_title: title.value,
    p_description: description.value || null,
    p_veterinarian_or_clinic: veterinarianOrClinic.value || null,
    p_cost_cents: cost.value,
    p_follow_up_date: followUpDate.value,
    p_severity: severity || null,
    p_document_id: null,
  });

  revalidatePath(`/staff/dogs/${dogId.value}`);
  revalidatePath("/staff/dogs");
  redirect(`/staff/dogs/${dogId.value}?dog=${ok ? "health_recorded" : "health_error"}`);
}

export async function recordDogDocumentMetadata(formData: FormData) {
  const dogId = cleanRequiredUuid(formData.get("dogId"));

  if (!dogId.valid) {
    redirect("/staff/dogs?dog=invalid_input");
  }

  const staff = await requireOwnerOrAdmin(dogId.value, "document");
  const documentType = String(formData.get("documentType") ?? "").trim().toLowerCase();
  const title = cleanText(formData.get("title"), 180);
  const registry = cleanText(formData.get("registry"), 80);
  const status = String(formData.get("documentStatus") ?? "metadata_only").trim().toLowerCase();
  const reportSource = cleanText(formData.get("reportSource"), 120);
  const issuedAt = cleanOptionalDate(formData.get("issuedAt"));
  const expiresAt = cleanOptionalDate(formData.get("expiresAt"));
  const fileName = cleanText(formData.get("fileName"), 240);
  const fileMimeType = cleanText(formData.get("fileMimeType"), 120);
  const fileSizeBytes = cleanOptionalInteger(formData.get("fileSizeBytes"));
  const notes = cleanText(formData.get("notes"), 1000);

  if (!DOG_DOCUMENT_TYPES.has(documentType) || !title.valid || !title.value || !registry.valid || !DOG_DOCUMENT_STATUSES.has(status) || !reportSource.valid || !issuedAt.valid || !expiresAt.valid || !fileName.valid || !fileMimeType.valid || !fileSizeBytes.valid || !notes.valid) {
    redirect(`/staff/dogs/${dogId.value}?dog=document_invalid_input`);
  }

  const ok = await postRpc("core_record_dog_document_metadata", {
    p_actor_profile_id: staff.id,
    p_dog_id: dogId.value,
    p_document_type: documentType,
    p_title: title.value,
    p_registry: registry.value || null,
    p_document_status: status,
    p_report_source: reportSource.value || null,
    p_issued_at: issuedAt.value,
    p_expires_at: expiresAt.value,
    p_file_name: fileName.value || null,
    p_file_mime_type: fileMimeType.value || null,
    p_file_size_bytes: fileSizeBytes.value,
    p_notes: notes.value || null,
  });

  revalidatePath(`/staff/dogs/${dogId.value}`);
  revalidatePath("/staff/dogs");
  redirect(`/staff/dogs/${dogId.value}?dog=${ok ? "document_recorded" : "document_error"}`);
}

export async function uploadDogDocumentFile(formData: FormData) {
  const dogId = cleanRequiredUuid(formData.get("dogId"));
  const documentId = cleanRequiredUuid(formData.get("dogDocumentId"));

  if (!dogId.valid || !documentId.valid) {
    redirect("/staff/dogs?dog=upload_invalid_input");
  }

  const staff = await requireOwnerOrAdmin(dogId.value, "upload");
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File) || fileValue.size <= 0) {
    redirect(`/staff/dogs/${dogId.value}?dog=upload_missing_file`);
  }

  if (fileValue.size > DOG_DOCUMENT_MAX_BYTES || !isAllowedDogDocumentFile(fileValue)) {
    redirect(`/staff/dogs/${dogId.value}?dog=upload_invalid_file`);
  }

  const dog = await readOne<{ id: string }>("core_dogs", {
    select: "id",
    id: `eq.${dogId.value}`,
    limit: "1",
  });
  const document = await readOne<{ id: string; dog_id: string }>("core_dog_documents", {
    select: "id,dog_id",
    id: `eq.${documentId.value}`,
    dog_id: `eq.${dogId.value}`,
    limit: "1",
  });

  if (!dog || !document) {
    redirect(`/staff/dogs/${dogId.value}?dog=upload_not_found`);
  }

  const storage = getStorageClient();
  const cleanedName = safeFileName(fileValue.name);
  const storagePath = `dogs/${dogId.value}/documents/${documentId.value}/${crypto.randomUUID()}-${cleanedName}`;
  const uploadResult = await storage.storage
    .from(DOG_DOCUMENT_BUCKET)
    .upload(storagePath, fileValue, {
      contentType: fileValue.type,
      upsert: false,
    });

  if (uploadResult.error) {
    logDogProfileFailure("private dog document upload failed", {
      dogId: dogId.value,
      documentId: documentId.value,
      error: uploadResult.error.message,
    });
    redirect(`/staff/dogs/${dogId.value}?dog=upload_storage_error`);
  }

  const ok = await postRpc("core_attach_dog_document_file_metadata", {
    p_actor_profile_id: staff.id,
    p_dog_document_id: documentId.value,
    p_storage_bucket: DOG_DOCUMENT_BUCKET,
    p_storage_path: storagePath,
    p_file_name: cleanedName,
    p_file_mime_type: fileValue.type.toLowerCase(),
    p_file_size_bytes: fileValue.size,
  });

  if (!ok) {
    await storage.storage.from(DOG_DOCUMENT_BUCKET).remove([storagePath]);
    redirect(`/staff/dogs/${dogId.value}?dog=upload_metadata_error`);
  }

  revalidatePath(`/staff/dogs/${dogId.value}`);
  revalidatePath("/staff/dogs");
  redirect(`/staff/dogs/${dogId.value}?dog=upload_success`);
}

export async function openPrivateDogDocumentFile(formData: FormData) {
  const dogId = cleanRequiredUuid(formData.get("dogId"));
  const documentId = cleanRequiredUuid(formData.get("dogDocumentId"));

  if (!dogId.valid || !documentId.valid) {
    redirect("/staff/dogs?dog=download_invalid_input");
  }

  await requireOwnerOrAdmin(dogId.value, "download");
  const document = await readOne<{
    id: string;
    dog_id: string;
    storage_bucket: string | null;
    storage_path: string | null;
  }>("core_dog_documents", {
    select: "id,dog_id,storage_bucket,storage_path",
    id: `eq.${documentId.value}`,
    dog_id: `eq.${dogId.value}`,
    limit: "1",
  });

  if (!document || document.storage_bucket !== DOG_DOCUMENT_BUCKET || !document.storage_path) {
    redirect(`/staff/dogs/${dogId.value}?dog=download_not_found`);
  }

  const storage = getStorageClient();
  const signedUrlResult = await storage.storage
    .from(DOG_DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    logDogProfileFailure("private dog document signed URL failed", {
      dogId: dogId.value,
      documentId: documentId.value,
      error: signedUrlResult.error?.message,
    });
    redirect(`/staff/dogs/${dogId.value}?dog=download_error`);
  }

  redirect(signedUrlResult.data.signedUrl);
}
