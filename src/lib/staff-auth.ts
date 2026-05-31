import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

const STAFF_ROLES = ["owner", "admin", "staff"] as const;
const STAFF_ROLE_SET = new Set<string>(STAFF_ROLES);
const SENSITIVE_READ_ROLES = new Set<StaffRole>(["owner", "admin"]);

export type StaffRole = (typeof STAFF_ROLES)[number];

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
  role: StaffRole;
  status: "active";
};

type DashboardAction =
  | "approve_application"
  | "create_reservation"
  | "record_reservation_payment"
  | "cancel_reservation"
  | "update_go_home_detail"
  | "upsert_go_home_checklist_item"
  | "create_dog"
  | "create_litter"
  | "create_puppy";

type DashboardActionOptions = {
  releasePuppy?: boolean;
};

function logStaffAuthFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core staff auth]", reason, details ?? {});
  }
}

function staffProfileLookupHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
}

const readStaffProfileByAuthUserId = cache(async (authUserId: string) => {
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
});

export const requireStaffProfile = cache(async (): Promise<StaffProfile> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logStaffAuthFailure("unauthenticated staff route or action attempt");
    redirect("/login?next=/staff");
  }

  const profile = await readStaffProfileByAuthUserId(user.id);
  const role = profile?.role?.toLowerCase() ?? "";
  const status = profile?.status?.toLowerCase() ?? "";

  if (!profile || status !== "active" || !STAFF_ROLE_SET.has(role)) {
    logStaffAuthFailure("missing, inactive, or unauthorized staff profile", {
      authUserId: user.id,
      hasProfile: Boolean(profile),
      status,
      role,
    });
    redirect("/login?error=unauthorized");
  }

  return {
    id: profile.id,
    authUserId: user.id,
    displayName: profile.display_name || user.email || "Core staff",
    email: profile.email || user.email || "No email on profile",
    role: role as StaffRole,
    status: "active",
  };
});

export function canStaffPerformDashboardAction(
  staff: StaffProfile,
  action: DashboardAction,
  options: DashboardActionOptions = {},
) {
  if (staff.role === "owner" || staff.role === "admin") {
    return true;
  }

  if (staff.role !== "staff") {
    return false;
  }

  if (action === "cancel_reservation") {
    return options.releasePuppy !== true;
  }

  if (action === "update_go_home_detail") {
    return false;
  }

  if (action === "create_dog" || action === "create_litter" || action === "create_puppy") {
    return false;
  }

  return (
    action === "approve_application" ||
    action === "create_reservation" ||
    action === "record_reservation_payment" ||
    action === "upsert_go_home_checklist_item"
  );
}

export function canViewSensitiveFinancials(role: StaffRole) {
  return SENSITIVE_READ_ROLES.has(role);
}

export function canViewAuditActivity(role: StaffRole) {
  return SENSITIVE_READ_ROLES.has(role);
}

export function canViewPhoneLookup(role: StaffRole) {
  return SENSITIVE_READ_ROLES.has(role);
}

export function canViewEventFeed(role: StaffRole) {
  return SENSITIVE_READ_ROLES.has(role);
}
