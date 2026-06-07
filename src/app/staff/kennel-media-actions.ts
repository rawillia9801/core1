"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireStaffProfile } from "@/lib/staff-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KENNEL_MEDIA_BUCKET = "kennel-media";
const KENNEL_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
const KENNEL_MEDIA_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const KENNEL_MEDIA_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function logKennelMediaFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core kennel media]", reason, details ?? {});
  }
}

function getActionConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey, supabaseUrl };
}

function getStorageClient() {
  const config = getActionConfig();

  if (!config) {
    return null;
  }

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanRequiredUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return { valid: UUID_PATTERN.test(text), value: text };
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  return { valid: text.length <= maxLength, value: text };
}

async function requireOwnerOrAdmin(entityType: string, entityId: string, resultKey: string) {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    redirect(`/staff/${entityType === "dog" ? "dogs" : "puppies"}/${entityId}?media=${resultKey}_unauthorized`);
  }

  return staff;
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function postRpc(functionName: string, body: Record<string, unknown>) {
  const config = getActionConfig();

  if (!config) {
    logKennelMediaFailure("kennel media action configuration missing", { functionName });
    return "configuration";
  }

  let response: Response;
  try {
    response = await fetch(`${config.restUrl}/rpc/${functionName}`, {
      method: "POST",
      headers: serverHeaders(config.serviceRoleKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    logKennelMediaFailure("kennel media RPC crashed", {
      functionName,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }

  if (!response.ok) {
    logKennelMediaFailure("kennel media RPC failed", {
      functionName,
      httpStatus: response.status,
      responseBody: await response.text().catch(() => ""),
    });
    return "failed";
  }

  return "success";
}

async function deleteStorageObject(storagePath: string) {
  const storage = getStorageClient();

  if (!storage) {
    return "configuration";
  }

  const result = await storage.storage
    .from(KENNEL_MEDIA_BUCKET)
    .remove([storagePath])
    .catch((error: unknown) => {
      logKennelMediaFailure("private kennel media storage delete crashed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: { message: "storage delete crashed" } };
    });

  if (result.error) {
    logKennelMediaFailure("private kennel media storage delete failed", {
      storagePath,
      error: result.error.message,
    });
    return "failed";
  }

  return "success";
}

async function readOne<T>(table: string, params: Record<string, string>) {
  const config = getActionConfig();

  if (!config) {
    logKennelMediaFailure("kennel media read configuration missing", { table });
    return null;
  }

  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    logKennelMediaFailure("kennel media read failed", {
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

  return cleaned || "kennel-photo";
}

function fileExtension(value: string) {
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index + 1).toLowerCase() : "";
}

function isAllowedKennelMediaFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = fileExtension(file.name);
  return KENNEL_MEDIA_MIME_TYPES.has(mimeType) && KENNEL_MEDIA_EXTENSIONS.has(extension);
}

export async function uploadKennelMediaFile(formData: FormData) {
  const entityType = String(formData.get("entityType") ?? "").trim().toLowerCase();
  const entityId = cleanRequiredUuid(formData.get("entityId"));
  const title = cleanText(formData.get("title"), 160);
  const notes = cleanText(formData.get("notes"), 600);
  const isPrimary = String(formData.get("isPrimary") ?? "") === "on";

  if ((entityType !== "dog" && entityType !== "puppy") || !entityId.valid || !title.valid || !notes.valid) {
    redirect("/staff?media=invalid_input");
  }

  const pathPrefix = entityType === "dog" ? "dogs" : "puppies";
  const staff = await requireOwnerOrAdmin(entityType, entityId.value, "upload");
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File) || fileValue.size <= 0) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_missing_file`);
  }

  if (fileValue.size > KENNEL_MEDIA_MAX_BYTES || !isAllowedKennelMediaFile(fileValue)) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_invalid_file`);
  }

  const record = await readOne<{ id: string }>(entityType === "dog" ? "core_dogs" : "core_puppies", {
    select: "id",
    id: `eq.${entityId.value}`,
    limit: "1",
  });

  if (!record) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_not_found`);
  }

  const storage = getStorageClient();
  if (!storage) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_configuration`);
  }
  const cleanedName = safeFileName(fileValue.name);
  const storagePath = `${pathPrefix}/${entityId.value}/photos/${crypto.randomUUID()}-${cleanedName}`;
  const uploadResult = await storage.storage
    .from(KENNEL_MEDIA_BUCKET)
    .upload(storagePath, fileValue, {
      contentType: fileValue.type,
      upsert: false,
    })
    .catch((error: unknown) => {
      logKennelMediaFailure("private kennel media upload crashed", {
        entityType,
        entityId: entityId.value,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: { message: "storage upload crashed" } };
    });

  if (uploadResult.error) {
    logKennelMediaFailure("private kennel media upload failed", {
      entityType,
      entityId: entityId.value,
      error: uploadResult.error.message,
    });
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_storage_error`);
  }

  const ok = await postRpc("core_record_kennel_media_metadata", {
    p_actor_profile_id: staff.id,
    p_entity_type: entityType,
    p_dog_id: entityType === "dog" ? entityId.value : null,
    p_puppy_id: entityType === "puppy" ? entityId.value : null,
    p_storage_bucket: KENNEL_MEDIA_BUCKET,
    p_storage_path: storagePath,
    p_file_name: cleanedName,
    p_file_mime_type: fileValue.type.toLowerCase(),
    p_file_size_bytes: fileValue.size,
    p_title: title.value || null,
    p_notes: notes.value || null,
    p_is_primary: isPrimary,
  });

  if (ok !== "success") {
    await storage.storage.from(KENNEL_MEDIA_BUCKET).remove([storagePath]).catch(() => null);
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_metadata_error`);
  }

  revalidatePath(`/staff/${pathPrefix}/${entityId.value}`);
  revalidatePath(`/staff/${pathPrefix}`);
  redirect(`/staff/${pathPrefix}/${entityId.value}?media=upload_success`);
}

export async function deleteKennelMediaFile(formData: FormData) {
  const entityType = String(formData.get("entityType") ?? "").trim().toLowerCase();
  const entityId = cleanRequiredUuid(formData.get("entityId"));
  const mediaId = cleanRequiredUuid(formData.get("mediaId"));

  if ((entityType !== "dog" && entityType !== "puppy") || !entityId.valid || !mediaId.valid) {
    redirect("/staff?media=delete_invalid_input");
  }

  const pathPrefix = entityType === "dog" ? "dogs" : "puppies";
  const staff = await requireOwnerOrAdmin(entityType, entityId.value, "delete");
  const media = await readOne<{
    id: string;
    entity_type: string;
    dog_id: string | null;
    puppy_id: string | null;
    storage_bucket: string;
    storage_path: string;
  }>("core_kennel_media", {
    select: "id,entity_type,dog_id,puppy_id,storage_bucket,storage_path",
    id: `eq.${mediaId.value}`,
    limit: "1",
  });

  if (!media || media.entity_type !== entityType) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=delete_not_found`);
  }

  const relatedId = entityType === "dog" ? media.dog_id : media.puppy_id;
  if (relatedId !== entityId.value || media.storage_bucket !== KENNEL_MEDIA_BUCKET || !media.storage_path) {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=delete_invalid_input`);
  }

  const ok = await postRpc("core_delete_kennel_media", {
    p_media_id: mediaId.value,
    p_actor_profile_id: staff.id,
  });

  if (ok !== "success") {
    redirect(`/staff/${pathPrefix}/${entityId.value}?media=delete_metadata_error`);
  }

  const storageResult = await deleteStorageObject(media.storage_path);

  revalidatePath(`/staff/${pathPrefix}/${entityId.value}`);
  revalidatePath(`/staff/${pathPrefix}`);
  redirect(`/staff/${pathPrefix}/${entityId.value}?media=${storageResult === "success" ? "delete_success" : "delete_storage_warning"}`);
}
