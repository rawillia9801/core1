import { createClient } from "@supabase/supabase-js";

const KENNEL_MEDIA_BUCKET = "kennel-media";

export type KennelMediaRow = {
  id: string;
  entity_type: string;
  dog_id: string | null;
  puppy_id: string | null;
  title: string | null;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  is_primary: boolean;
  visibility: string;
  notes: string | null;
  uploaded_at: string | null;
  uploaded_by_profile_id: string | null;
};

export type KennelMediaPreview = KennelMediaRow & {
  signedUrl: string | null;
};

function getStorageClient() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function withKennelMediaSignedUrls(rows: KennelMediaRow[], expiresInSeconds = 300): Promise<KennelMediaPreview[]> {
  const storage = getStorageClient();

  if (!storage) {
    return rows.map((row) => ({ ...row, signedUrl: null }));
  }

  return Promise.all(
    rows.map(async (row) => {
      if (row.storage_bucket !== KENNEL_MEDIA_BUCKET || row.visibility !== "internal") {
        return { ...row, signedUrl: null };
      }

      const result = await storage.storage.from(KENNEL_MEDIA_BUCKET).createSignedUrl(row.storage_path, expiresInSeconds);
      return { ...row, signedUrl: result.data?.signedUrl ?? null };
    }),
  );
}
