import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

const STAFF_ROLES = new Set(["owner", "admin", "staff"]);

type CoreProfileRow = {
  id: string;
  auth_user_id: string | null;
  display_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

export type StaffProfile = {
  id: string;
  authUserId: string;
  displayName: string;
  email: string;
  role: string;
};

function staffProfileLookupHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function readStaffProfileByAuthUserId(authUserId: string) {
  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Staff profile lookup requires server-side Supabase URL and service role configuration until RLS policies are implemented.",
    );
  }

  const url = new URL(`${supabaseUrl}/rest/v1/core_profiles`);
  url.searchParams.set(
    "select",
    "id,auth_user_id,display_name,email,role,status",
  );
  url.searchParams.set("auth_user_id", `eq.${authUserId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: staffProfileLookupHeaders(serviceRoleKey),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Staff profile lookup failed: ${response.status} ${body}`.trim(),
    );
  }

  const rows = (await response.json()) as CoreProfileRow[];

  return rows[0] ?? null;
}

export async function requireStaffProfile(): Promise<StaffProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/staff");
  }

  const profile = await readStaffProfileByAuthUserId(user.id);
  const role = profile?.role?.toLowerCase() ?? "";
  const status = profile?.status?.toLowerCase() ?? "";

  if (!profile || status !== "active" || !STAFF_ROLES.has(role)) {
    redirect("/login?error=unauthorized");
  }

  return {
    id: profile.id,
    authUserId: user.id,
    displayName: profile.display_name || user.email || "Core staff",
    email: profile.email || user.email || "No email on profile",
    role,
  };
}
