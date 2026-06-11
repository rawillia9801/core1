import {
  canViewAuditActivity,
  canViewEventFeed,
  canViewPhoneLookup,
  canViewSensitiveFinancials,
  type StaffProfile,
  type StaffRole,
} from "@/lib/staff-auth";

type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

type DashboardApplication = {
  id: string;
  hasReservationContext: boolean;
  applicant: string;
  email: string;
  status: string;
  source: string;
  submitted: string;
  reference: string;
};

type DashboardAvailablePuppy = {
  id: string;
  label: string;
};

type DashboardApplicationSection = {
  applicationId: string;
  applicationReference: string;
  sectionKey: string;
  sectionLabel: string;
  status: string;
  responses: {
    label: string;
    value: string;
  }[];
};

type DashboardGoHome = {
  puppy: string;
  buyer: string;
  time: string;
  source: string;
  status: string;
};

type DashboardTaskLink = {
  href: string;
  label: string;
};

type DashboardTask = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: string;
  links: DashboardTaskLink[];
};

type DashboardTaskBoard = {
  totalTasks: number;
  newbornPuppyCare: DashboardTask[];
  expectedLitters: DashboardTask[];
  goHomeReadiness: DashboardTask[];
  accountAttention: DashboardTask[];
  kennelMaintenance: DashboardTask[];
};

type DashboardReservation = {
  id: string;
  reservationId: string;
  applicationReference: string;
  puppy: string;
  puppyStatus: string;
  buyer: string;
  buyerEmail: string;
  status: string;
  contractTotal: string;
  depositRequired: string;
  balance: string;
  reservedAt: string;
};

type DashboardPhoneLookup = {
  phone: string;
  result: string;
  detail: string;
  tone: string;
};

type DashboardEvent = {
  summary: string;
  type: string;
  when: string;
};

type DashboardWorkflowActivity = {
  id: string;
  recordType: string;
  type: string;
  summary: string;
  detail: string;
  actor: string;
  source: string;
  entity: string;
  relatedId: string;
  when: string;
  sortTime: number;
};

type DashboardLedgerActivity = {
  id: string;
  type: string;
  category: string;
  balanceEffect: string;
  amount: string;
  reservationId: string;
  buyer: string;
  buyerEmail: string;
  puppy: string;
  externalReference: string;
  description: string;
  relatedLedgerId: string;
  status: string;
  occurredAt: string;
};

type DashboardReadScopes = {
  canViewSensitiveFinancials: boolean;
  canViewAuditActivity: boolean;
  canViewPhoneLookup: boolean;
  canViewEventFeed: boolean;
};

type CountResult = {
  count: number;
};

const DASHBOARD_READ_ROLES = new Set<StaffRole>(["owner", "admin", "staff"]);

type ApplicationRow = {
  id: string;
  buyer_id: string | null;
  family_id: string | null;
  external_reference: string | null;
  status: string | null;
  source: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type ApplicationSectionRow = {
  application_id: string | null;
  section_key: string | null;
  section_label: string | null;
  status: string | null;
  responses: Record<string, unknown> | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email_normalized: string | null;
};

type PuppyRow = {
  id: string;
  litter_id?: string | null;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  color?: string | null;
  coat_type?: string | null;
  birth_at?: string | null;
  status?: string | null;
  health_status?: string | null;
  public_listing_status?: string | null;
  notes?: string | null;
};

type AvailablePuppyRow = PuppyRow & {
  status: string | null;
};

type DogRow = {
  id: string;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  expected_birth_at: string | null;
  birth_at: string | null;
  total_puppies: number | null;
  female_count: number | null;
  male_count: number | null;
  status: string | null;
  details_pending: boolean | null;
  notes: string | null;
};

type WeightLogRow = {
  id: string;
  puppy_id: string | null;
  measured_at: string | null;
  weight_grams: number | null;
};

type PuppyEventRow = {
  id: string;
  puppy_id: string | null;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
};

type ReservationRow = {
  id: string;
  status: string | null;
  reserved_at: string | null;
  buyer_id: string | null;
  puppy_id: string | null;
};

type ReservationSummaryRow = {
  reservation_id: string;
  reservation_status: string | null;
  reserved_at: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  puppy_status: string | null;
  application_id: string | null;
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  balance_due_cents: number | null;
  go_home_planned_at?: string | null;
  go_home_status?: string | null;
  go_home_detail_status?: string | null;
  go_home_checklist_status?: string | null;
  go_home_balance_cleared_status?: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  balance_due_cents: number | null;
};

type LedgerRow = {
  id: string;
  reservation_id: string | null;
  buyer_id: string | null;
  external_reference: string | null;
  entry_type: string | null;
  balance_effect: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  occurred_at: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
};

type GoHomeRow = {
  reservation_id: string | null;
  buyer_id: string | null;
  puppy_id: string | null;
  effective_scheduled_at: string | null;
  effective_window_start: string | null;
  effective_status: string | null;
  source_of_schedule: string | null;
  has_individual_override: boolean | null;
};

type ChecklistItemRow = {
  id: string;
  reservation_id: string | null;
  item_key: string | null;
  label: string | null;
  status: string | null;
};

type DocumentRow = {
  id: string;
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
};

type NotificationRow = {
  id: string;
  notification_type: string | null;
  channel: string | null;
  status: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

type PhoneLookupRow = {
  normalized_phone: string | null;
  match_count: number | null;
  is_ambiguous: boolean | null;
  safe_display_name: string | null;
  verification_required: boolean | null;
  staff_routing_recommended: boolean | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  application_id?: string | null;
  buyer_id?: string | null;
  puppy_id?: string | null;
  reservation_id?: string | null;
  related_table?: string | null;
  related_id?: string | null;
  source?: string | null;
  created_by_profile_id?: string | null;
  details?: Record<string, unknown> | null;
};

type AuditLogRow = {
  id: string;
  action: string | null;
  entity_table: string | null;
  entity_id: string | null;
  source: string | null;
  actor_identifier: string | null;
  outcome: string | null;
  created_at: string | null;
  request_context?: Record<string, unknown> | null;
};

export type DashboardData = {
  stats: DashboardStat[];
  foundationChecks: readonly string[];
  navigation: readonly string[];
  applications: DashboardApplication[];
  applicationSections: DashboardApplicationSection[];
  availablePuppies: DashboardAvailablePuppy[];
  goHomes: DashboardGoHome[];
  reservations: DashboardReservation[];
  phoneLookups: DashboardPhoneLookup[];
  kennelNotes: string[];
  emptyStates: readonly {
    title: string;
    text: string;
  }[];
  events: DashboardEvent[];
  workflowActivity: DashboardWorkflowActivity[];
  ledgerActivity: DashboardLedgerActivity[];
  taskBoard: DashboardTaskBoard;
  readScopes: DashboardReadScopes;
  dataSourceLabel: string;
  dataWarning: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const ledgerCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const NEONATAL_WINDOW_DAYS = 21;
const EXPECTED_LITTER_WINDOW_DAYS = 21;
const GO_HOME_WINDOW_DAYS = 14;
const ATTENTION_TERMS = ["weak", "watch", "fading", "not nursing", "cold", "losing", "loss", "risk", "concern"];

export const foundationChecks = [
  "Migrations apply locally",
  "Core smoke test passes",
  "Go-home effective view passes",
  "Lint passes",
] as const;

export const navigation = [
  "Dashboard",
  "Applications",
  "Buyers",
  "Families",
  "Dogs",
  "Litters",
  "Puppies",
  "Reservations",
  "Payments",
  "Go-Home",
  "Documents",
  "Messages",
  "Phone Lookup",
  "Kennel Logs",
  "Events",
] as const;

export const emptyStates = [
  {
    title: "Documents",
    text: "Template-driven generation, signatures, and customer visibility are planned but not connected.",
  },
  {
    title: "Customer Portal",
    text: "Portal screens wait for RLS, document visibility rules, and verified family access.",
  },
  {
    title: "Integrations",
    text: "Zoho, Twilio, email, payments, Home Assistant, cameras, and smart mirror remain off.",
  },
] as const;

function formatCurrencyFromCents(value: number | null | undefined) {
  return currencyFormatter.format((value ?? 0) / 100);
}

function formatOptionalCurrencyFromCents(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : formatCurrencyFromCents(value);
}

function formatLedgerCurrencyFromCents(value: number | null | undefined) {
  return ledgerCurrencyFormatter.format((value ?? 0) / 100);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return dateTimeFormatter.format(parsed);
}

function formatScheduledDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  return formatDateTime(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return dateFormatter.format(parsed);
}

function sortTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  return Math.round((startOfDate - startOfToday) / 86_400_000);
}

function isSameLocalDay(value: string | null | undefined, comparison = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() === comparison.getFullYear() && parsed.getMonth() === comparison.getMonth() && parsed.getDate() === comparison.getDate();
}

function isWithinFutureDays(value: string | null | undefined, days: number) {
  const until = daysUntil(value);
  return until !== null && until >= 0 && until <= days;
}

function hasAttentionText(...values: Array<string | null | undefined>) {
  const text = normalizeText(values.filter(Boolean).join(" "));
  return ATTENTION_TERMS.some((term) => text.includes(term));
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) {
    return "Unassigned buyer";
  }

  const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");

  return buyer.preferred_name || fullName || buyer.email_normalized || "Unnamed buyer";
}

function buyerEmail(buyer: BuyerRow | undefined) {
  return buyer?.email_normalized || "No email on file";
}

function puppyName(puppy: PuppyRow | undefined) {
  if (!puppy) {
    return "Unassigned puppy";
  }

  return puppy.name || puppy.collar_color || puppy.sex || "Unnamed puppy";
}

function formatResponseLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatResponseValue(item)).join(", ");
  }

  return JSON.stringify(value);
}

function dogName(dog: DogRow | undefined) {
  if (!dog) {
    return "Unnamed dog";
  }

  return dog.call_name || dog.registered_name || `Dog ${shortId(dog.id)}`;
}

function litterName(litter: LitterRow | undefined) {
  if (!litter) {
    return "Unlinked litter";
  }

  return litter.litter_name || `Litter ${shortId(litter.id)}`;
}

function weightLabel(weight: WeightLogRow | null | undefined) {
  if (!weight || typeof weight.weight_grams !== "number") {
    return "No weight recorded";
  }

  return `${weight.weight_grams} g`;
}

function latestWeight(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => sortTime(b.measured_at) - sortTime(a.measured_at))[0] ?? null;
}

function isNewbornLitter(litter: LitterRow) {
  const age = daysSince(litter.birth_at);
  const status = normalizeText(litter.status);
  return (age !== null && age >= 0 && age <= NEONATAL_WINDOW_DAYS) || ["born", "active", "newborn", "neonatal"].includes(status);
}

function isExpectedLitterTask(litter: LitterRow) {
  const status = normalizeText(litter.status);
  return !litter.birth_at && (isWithinFutureDays(litter.expected_birth_at, EXPECTED_LITTER_WINDOW_DAYS) || ["planned", "expected", "pending"].includes(status));
}

function taskTone(kind: "amber" | "blue" | "emerald" | "rose" | "slate") {
  if (kind === "amber") return "border-amber-200 bg-amber-50 text-amber-950";
  if (kind === "blue") return "border-blue-200 bg-blue-50 text-blue-950";
  if (kind === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (kind === "rose") return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function safeTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeBooleanLabel(value: unknown) {
  return typeof value === "boolean" ? (value ? "yes" : "no") : null;
}

function workflowDetail(values: (string | null)[]) {
  return values.filter(Boolean).join(" | ") || "No extra safe detail recorded.";
}

function ledgerCategory(entryType: string | null | undefined, balanceEffect: string | null | undefined) {
  if (entryType === "deposit" || entryType === "payment") {
    return "Money received";
  }

  if (entryType === "credit") {
    return "Balance-reducing credit";
  }

  if (entryType === "adjustment" || balanceEffect === "neutral") {
    return "Neutral adjustment";
  }

  if (["refund", "chargeback"].includes(entryType ?? "")) {
    return "Internal ledger exception";
  }

  if (balanceEffect === "increase") {
    return "Balance-increasing charge";
  }

  if (balanceEffect === "decrease") {
    return "Balance decrease";
  }

  return "Ledger activity";
}

function fallbackDashboardData(dataWarning: string | null = null): DashboardData {
  return {
    stats: [
      {
        label: "Applications",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-blue-50 text-blue-700 ring-blue-100",
      },
      {
        label: "Reserved Puppies",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-violet-50 text-violet-700 ring-violet-100",
      },
      {
        label: "Balance Due",
        value: "$0",
        helper: "Supabase not configured",
        tone: "bg-amber-50 text-amber-700 ring-amber-100",
      },
      {
        label: "Events",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      },
    ],
    foundationChecks,
    navigation,
    applications: [],
    applicationSections: [],
    availablePuppies: [],
    goHomes: [],
    reservations: [],
    phoneLookups: [],
    kennelNotes: [
      "Supabase environment variables are not configured for this server render.",
      "No AI write actions are enabled.",
    ],
    emptyStates,
    events: [],
    workflowActivity: [],
    ledgerActivity: [],
    taskBoard: {
      totalTasks: 0,
      newbornPuppyCare: [],
      expectedLitters: [],
      goHomeReadiness: [],
      accountAttention: [],
      kennelMaintenance: [],
    },
    readScopes: {
      canViewSensitiveFinancials: false,
      canViewAuditActivity: false,
      canViewPhoneLookup: false,
      canViewEventFeed: false,
    },
    dataSourceLabel: "Not connected",
    dataWarning:
      dataWarning ??
      "Core read configuration is not available for server-side operational reads.",
  };
}

function dashboardReadScopesFor(staff: StaffProfile): DashboardReadScopes {
  return {
    canViewSensitiveFinancials: canViewSensitiveFinancials(staff.role),
    canViewAuditActivity: canViewAuditActivity(staff.role),
    canViewPhoneLookup: canViewPhoneLookup(staff.role),
    canViewEventFeed: canViewEventFeed(staff.role),
  };
}

function hasAuthorizedStaffReadContext(staff: StaffProfile | null | undefined) {
  return Boolean(
    staff?.id &&
      staff.authUserId &&
      staff.status === "active" &&
      DASHBOARD_READ_ROLES.has(staff.role),
  );
}

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
}

async function readRows<T>(
  restUrl: string,
  serviceRoleKey: string,
  table: string,
  params: Record<string, string>,
) {
  const response = await fetch(buildUrl(restUrl, table, params), {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} read failed: ${response.status} ${body}`.trim());
  }

  return (await response.json()) as T[];
}

async function readCount(
  restUrl: string,
  serviceRoleKey: string,
  table: string,
  extraParams: Record<string, string> = {},
): Promise<CountResult> {
  const response = await fetch(
    buildUrl(restUrl, table, {
      select: "id",
      ...extraParams,
    }),
    {
      method: "HEAD",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        prefer: "count=exact",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} count failed: ${response.status} ${body}`.trim());
  }

  const contentRange = response.headers.get("content-range") ?? "*/0";
  const countText = contentRange.split("/").at(-1) ?? "0";
  const count = Number.parseInt(countText, 10);

  return {
    count: Number.isFinite(count) ? count : 0,
  };
}

export async function getDashboardData(staff: StaffProfile): Promise<DashboardData> {
  if (!hasAuthorizedStaffReadContext(staff)) {
    console.error("[core dashboard reads] missing or unauthorized staff context", {
      hasStaffProfile: Boolean(staff),
      staffProfileId: staff?.id ?? null,
      staffRole: staff?.role ?? null,
      staffStatus: staff?.status ?? null,
    });

    return fallbackDashboardData(
      "Dashboard reads require an authenticated active staff profile before service-role data access can run.",
    );
  }

  const config = getSupabaseRestConfig();
  const readScopes = dashboardReadScopesFor(staff);

  if (!config) {
    return fallbackDashboardData();
  }

  try {
    const { restUrl, serviceRoleKey } = config;

    const [
      applicationsCount,
      receivedApplicationsCount,
      applications,
      availablePuppies,
      activePuppyReservations,
      reservationsCount,
      reservations,
      balances,
      goHomes,
      phoneLookups,
      events,
      workflowEvents,
      auditLogs,
      ledgerRows,
      dogsForTasks,
      littersForTasks,
      puppiesForTasks,
      weightsForTasks,
      puppyEventsForTasks,
      checklistItemsForTasks,
      documentsForTasks,
      notificationsForTasks,
    ] = await Promise.all([
      readCount(restUrl, serviceRoleKey, "core_applications"),
      readCount(restUrl, serviceRoleKey, "core_applications", {
        status: "eq.received",
      }),
      readRows<ApplicationRow>(restUrl, serviceRoleKey, "core_applications", {
        select: "id,buyer_id,family_id,external_reference,status,source,submitted_at,created_at",
        order: "created_at.desc",
        limit: "6",
      }),
      readRows<AvailablePuppyRow>(restUrl, serviceRoleKey, "core_puppies", {
        select: "id,name,collar_color,sex,status",
        status: "eq.available",
        order: "name.asc.nullslast,collar_color.asc.nullslast",
        limit: "100",
      }),
      readRows<Pick<ReservationRow, "puppy_id">>(restUrl, serviceRoleKey, "core_reservations", {
        select: "puppy_id",
        status: "not.in.(cancelled,void,released)",
        limit: "1000",
      }),
      readCount(restUrl, serviceRoleKey, "core_reservations"),
      readRows<ReservationSummaryRow>(restUrl, serviceRoleKey, "core_reservation_summary_view", {
        select:
          "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,puppy_id,puppy_name,puppy_status,application_id,contract_total_cents,deposit_required_cents,balance_due_cents,go_home_planned_at,go_home_status,go_home_detail_status,go_home_checklist_status,go_home_balance_cleared_status",
        order: "reserved_at.desc.nullslast",
        limit: "100",
      }),
      readRows<PaymentBalanceRow>(restUrl, serviceRoleKey, "core_payment_balance_view", {
        select: "reservation_id,balance_due_cents",
        limit: "1000",
      }),
      readRows<GoHomeRow>(restUrl, serviceRoleKey, "core_go_home_effective_view", {
        select:
          "reservation_id,buyer_id,puppy_id,effective_scheduled_at,effective_window_start,effective_status,source_of_schedule,has_individual_override",
        order: "effective_scheduled_at.asc.nullslast",
        limit: "5",
      }),
      readScopes.canViewPhoneLookup
        ? readRows<PhoneLookupRow>(restUrl, serviceRoleKey, "core_phone_lookup_summary_view", {
            select:
              "normalized_phone,match_count,is_ambiguous,safe_display_name,verification_required,staff_routing_recommended",
            limit: "5",
          })
        : Promise.resolve([]),
      readScopes.canViewEventFeed
        ? readRows<EventRow>(restUrl, serviceRoleKey, "core_events", {
            select: "id,event_type,event_at,summary",
            order: "event_at.desc",
            limit: "6",
          })
        : Promise.resolve([]),
      readScopes.canViewAuditActivity
        ? readRows<EventRow>(restUrl, serviceRoleKey, "core_events", {
            select:
              "id,event_type,event_at,summary,application_id,buyer_id,puppy_id,reservation_id,related_table,related_id,source,created_by_profile_id,details",
            event_type:
              "in.(application_approved,reservation_created,reservation_payment_recorded,reservation_cancelled,puppy_released,local_workflow_seeded)",
            order: "event_at.desc",
            limit: "15",
          })
        : Promise.resolve([]),
      readScopes.canViewAuditActivity
        ? readRows<AuditLogRow>(restUrl, serviceRoleKey, "core_audit_log", {
            select:
              "id,action,entity_table,entity_id,source,actor_identifier,outcome,created_at,request_context",
            action:
              "in.(approve_application,create_reservation,record_reservation_payment,cancel_reservation,release_puppy_from_cancelled_reservation,seed_local_core_workflow,seed_reservation_example)",
            order: "created_at.desc",
            limit: "15",
          })
        : Promise.resolve([]),
      readScopes.canViewSensitiveFinancials
        ? readRows<LedgerRow>(restUrl, serviceRoleKey, "core_financial_ledger", {
            select:
              "id,reservation_id,buyer_id,external_reference,entry_type,balance_effect,status,amount_cents,currency,occurred_at,description,metadata",
            entry_type:
              "in.(deposit,payment,credit,refund,chargeback,fee,admin_fee,transport_fee,finance_charge,adjustment)",
            order: "occurred_at.desc",
            limit: "15",
          })
        : Promise.resolve([]),
      readRows<DogRow>(restUrl, serviceRoleKey, "core_dogs", {
        select: "id,registered_name,call_name,sex,color,coat_type,birth_at,status",
        order: "updated_at.desc",
        limit: "250",
      }),
      readRows<LitterRow>(restUrl, serviceRoleKey, "core_litters", {
        select: "id,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes",
        order: "updated_at.desc",
        limit: "250",
      }),
      readRows<PuppyRow>(restUrl, serviceRoleKey, "core_puppies", {
        select: "id,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,notes",
        order: "updated_at.desc",
        limit: "500",
      }),
      readRows<WeightLogRow>(restUrl, serviceRoleKey, "core_weight_logs", {
        select: "id,puppy_id,measured_at,weight_grams",
        order: "measured_at.desc",
        limit: "1000",
      }),
      readRows<PuppyEventRow>(restUrl, serviceRoleKey, "core_puppy_events", {
        select: "id,puppy_id,event_type,event_at,summary,details",
        order: "event_at.desc",
        limit: "500",
      }),
      readRows<ChecklistItemRow>(restUrl, serviceRoleKey, "core_go_home_checklist_items", {
        select: "id,reservation_id,item_key,label,status",
        order: "updated_at.desc",
        limit: "500",
      }),
      readScopes.canViewSensitiveFinancials
        ? readRows<DocumentRow>(restUrl, serviceRoleKey, "core_documents", {
            select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status",
            order: "updated_at.desc",
            limit: "500",
          })
        : Promise.resolve([]),
      readScopes.canViewAuditActivity
        ? readRows<NotificationRow>(restUrl, serviceRoleKey, "core_notifications", {
            select: "id,notification_type,channel,status,payload,created_at",
            order: "created_at.desc",
            limit: "100",
          })
        : Promise.resolve([]),
    ]);

    const latestApplicationId = applications[0]?.id;
    const applicationSections = latestApplicationId
      ? await readRows<ApplicationSectionRow>(restUrl, serviceRoleKey, "core_application_sections", {
          select: "application_id,section_key,section_label,status,responses",
          application_id: `eq.${latestApplicationId}`,
          order: "section_label.asc.nullslast,section_key.asc.nullslast",
        })
      : [];
    const ledgerReservationIds = Array.from(
      new Set(ledgerRows.map((ledger) => ledger.reservation_id).filter(Boolean) as string[]),
    );
    const ledgerReservationSummaries =
      ledgerReservationIds.length > 0
        ? await readRows<ReservationSummaryRow>(restUrl, serviceRoleKey, "core_reservation_summary_view", {
            select:
              "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,puppy_id,puppy_name,puppy_status,application_id,contract_total_cents,deposit_required_cents,balance_due_cents",
            reservation_id: `in.(${ledgerReservationIds.join(",")})`,
          })
        : [];

    const buyerIds = Array.from(
      new Set(
        [
          ...applications.map((application) => application.buyer_id),
          ...reservations.map((reservation) => reservation.buyer_id),
          ...ledgerReservationSummaries.map((reservation) => reservation.buyer_id),
          ...ledgerRows.map((ledger) => ledger.buyer_id),
          ...goHomes.map((goHome) => goHome.buyer_id),
        ].filter(Boolean) as string[],
      ),
    );
    const puppyIds = Array.from(
      new Set(
        [
          ...reservations.map((reservation) => reservation.puppy_id),
          ...ledgerReservationSummaries.map((reservation) => reservation.puppy_id),
          ...goHomes.map((goHome) => goHome.puppy_id),
        ].filter(Boolean) as string[],
      ),
    );
    const reservationApplicationIds = Array.from(
      new Set(reservations.map((reservation) => reservation.application_id).filter(Boolean) as string[]),
    );

    const [buyers, puppies, reservationApplications] = await Promise.all([
      buyerIds.length > 0
        ? readRows<BuyerRow>(restUrl, serviceRoleKey, "core_buyers", {
            select: "id,first_name,last_name,preferred_name,email_normalized",
            id: `in.(${buyerIds.join(",")})`,
          })
        : Promise.resolve([]),
      puppyIds.length > 0
        ? readRows<PuppyRow>(restUrl, serviceRoleKey, "core_puppies", {
            select: "id,name,collar_color,sex",
            id: `in.(${puppyIds.join(",")})`,
          })
        : Promise.resolve([]),
      reservationApplicationIds.length > 0
        ? readRows<Pick<ApplicationRow, "id" | "external_reference">>(
            restUrl,
            serviceRoleKey,
            "core_applications",
            {
              select: "id,external_reference",
              id: `in.(${reservationApplicationIds.join(",")})`,
            },
          )
        : Promise.resolve([]),
    ]);

    const buyersById = new Map(buyers.map((buyer) => [buyer.id, buyer]));
    const puppiesById = new Map(puppies.map((puppy) => [puppy.id, puppy]));
    const taskLittersById = new Map(littersForTasks.map((litter) => [litter.id, litter]));
    const taskWeightsByPuppy = new Map<string, WeightLogRow[]>();
    const taskEventsByPuppy = new Map<string, PuppyEventRow[]>();
    const taskChecklistByReservation = new Map<string, ChecklistItemRow[]>();
    const taskDocumentsByReservation = new Map<string, DocumentRow[]>();

    for (const weight of weightsForTasks) {
      if (!weight.puppy_id) continue;
      taskWeightsByPuppy.set(weight.puppy_id, [...(taskWeightsByPuppy.get(weight.puppy_id) ?? []), weight]);
    }

    for (const event of puppyEventsForTasks) {
      if (!event.puppy_id) continue;
      taskEventsByPuppy.set(event.puppy_id, [...(taskEventsByPuppy.get(event.puppy_id) ?? []), event]);
    }

    for (const checklistItem of checklistItemsForTasks) {
      if (!checklistItem.reservation_id) continue;
      taskChecklistByReservation.set(checklistItem.reservation_id, [
        ...(taskChecklistByReservation.get(checklistItem.reservation_id) ?? []),
        checklistItem,
      ]);
    }

    for (const document of documentsForTasks) {
      if (!document.reservation_id) continue;
      taskDocumentsByReservation.set(document.reservation_id, [
        ...(taskDocumentsByReservation.get(document.reservation_id) ?? []),
        document,
      ]);
    }

    const applicationsById = new Map(applications.map((application) => [application.id, application]));
    const reservationApplicationsById = new Map(
      reservationApplications.map((application) => [application.id, application]),
    );
    const reservationContextById = new Map(
      [...reservations, ...ledgerReservationSummaries].map((reservation) => [
        reservation.reservation_id,
        reservation,
      ]),
    );
    const activelyReservedPuppyIds = new Set(
      activePuppyReservations
        .map((reservation) => reservation.puppy_id)
        .filter(Boolean) as string[],
    );

    const totalBalanceDueCents = balances.reduce(
      (sum, balance) => sum + Math.max(balance.balance_due_cents ?? 0, 0),
      0,
    );
    const activeReservations = reservations.filter((reservation) => !["cancelled", "void", "released"].includes(normalizeText(reservation.reservation_status)));
    const newbornPuppyCare: DashboardTask[] = puppiesForTasks
      .filter((puppy) => {
        const litter = puppy.litter_id ? taskLittersById.get(puppy.litter_id) : undefined;
        const age = daysSince(puppy.birth_at ?? litter?.birth_at);
        return (litter && isNewbornLitter(litter)) || (age !== null && age >= 0 && age <= NEONATAL_WINDOW_DAYS);
      })
      .flatMap((puppy) => {
        const litter = puppy.litter_id ? taskLittersById.get(puppy.litter_id) : undefined;
        const weights = taskWeightsByPuppy.get(puppy.id) ?? [];
        const eventsForPuppy = taskEventsByPuppy.get(puppy.id) ?? [];
        const latest = latestWeight(weights);
        const signals = [
          weights.length === 0 ? "No weight history recorded." : null,
          !weights.some((weight) => isSameLocalDay(weight.measured_at)) ? "Missing weight today." : null,
          hasAttentionText(puppy.health_status, puppy.notes) ? "Health marker or notes include watch terms." : null,
          eventsForPuppy.some((event) => hasAttentionText(event.event_type, event.summary, JSON.stringify(event.details ?? {})))
            ? "Care history includes watch terms."
            : null,
          ["watch", "at risk", "at_risk", "deceased", "unavailable"].includes(normalizeText(puppy.status))
            ? `Status is ${puppy.status ?? "unknown"}.`
            : null,
        ].filter(Boolean) as string[];

        if (signals.length === 0) return [];

        return [{
          id: `puppy-care-${puppy.id}`,
          title: puppyName(puppy),
          detail: signals.join(" "),
          meta: `${litterName(litter)} / latest weight ${weightLabel(latest)}`,
          tone: taskTone(signals.some((signal) => signal.toLowerCase().includes("watch") || signal.includes("Status")) ? "amber" : "blue"),
          links: [
            { href: `/staff/puppies/${puppy.id}`, label: "Open timeline" },
            { href: "/staff/litters", label: "Litter command" },
          ],
        }];
      })
      .slice(0, 8);
    const expectedLitters: DashboardTask[] = littersForTasks
      .filter(isExpectedLitterTask)
      .map((litter) => {
        const until = daysUntil(litter.expected_birth_at);
        const flags = [
          !litter.expected_birth_at ? "Expected birth date is missing." : null,
          !litter.dam_id ? "Dam is not linked." : null,
          !litter.sire_id ? "Sire is not linked." : null,
          !litter.status ? "Status is missing." : null,
          litter.details_pending ? "Details are marked pending." : null,
        ].filter(Boolean) as string[];

        return {
          id: `expected-litter-${litter.id}`,
          title: litterName(litter),
          detail: flags.length > 0 ? flags.join(" ") : "Expected litter is inside the upcoming prep window.",
          meta: until === null ? `Expected date ${formatDate(litter.expected_birth_at)}` : until === 0 ? "Expected today" : `${until} day${until === 1 ? "" : "s"} until expected birth`,
          tone: taskTone(flags.length > 0 ? "amber" : "blue"),
          links: [
            { href: "/staff/litters", label: "Litters page" },
            { href: `/staff/litters/${litter.id}/edit`, label: "Edit litter" },
          ],
        };
      })
      .slice(0, 8);
    const goHomeReadiness: DashboardTask[] = activeReservations
      .filter((reservation) => {
        const isUpcoming = isWithinFutureDays(reservation.go_home_planned_at, GO_HOME_WINDOW_DAYS);
        const hasBlocker =
          (reservation.balance_due_cents ?? 0) > 0 ||
          !reservation.go_home_planned_at ||
          !["ready", "complete", "completed"].includes(normalizeText(reservation.go_home_detail_status)) ||
          !["ready", "complete", "completed"].includes(normalizeText(reservation.go_home_checklist_status)) ||
          !["cleared", "ready", "complete", "completed"].includes(normalizeText(reservation.go_home_balance_cleared_status));
        return isUpcoming || hasBlocker;
      })
      .map((reservation) => {
        const checklistItems = taskChecklistByReservation.get(reservation.reservation_id) ?? [];
        const incompleteChecklist = checklistItems.filter((item) => !["complete", "completed", "done"].includes(normalizeText(item.status))).length;
        const blockers = [
          (reservation.balance_due_cents ?? 0) > 0 ? `Balance due ${formatOptionalCurrencyFromCents(reservation.balance_due_cents)}.` : null,
          !reservation.go_home_planned_at ? "Go-home time is not scheduled." : null,
          incompleteChecklist > 0 ? `${incompleteChecklist} checklist item${incompleteChecklist === 1 ? "" : "s"} not complete.` : null,
          normalizeText(reservation.go_home_detail_status) && !["ready", "complete", "completed"].includes(normalizeText(reservation.go_home_detail_status))
            ? `Detail status is ${reservation.go_home_detail_status}.`
            : null,
        ].filter(Boolean) as string[];

        return {
          id: `go-home-${reservation.reservation_id}`,
          title: reservation.puppy_name || `Reservation ${shortId(reservation.reservation_id)}`,
          detail: blockers.length > 0 ? blockers.join(" ") : "Upcoming go-home record needs routine owner review.",
          meta: `${reservation.buyer_name || "Unassigned buyer"} / ${formatScheduledDateTime(reservation.go_home_planned_at)}`,
          tone: taskTone(blockers.length > 0 ? "amber" : "blue"),
          links: [
            { href: "/staff/go-home", label: "Go-home board" },
            { href: `/staff/reservations/${reservation.reservation_id}`, label: "Reservation readiness" },
          ],
        };
      })
      .slice(0, 8);
    const accountAttention: DashboardTask[] = [
      ...activeReservations
        .filter((reservation) => readScopes.canViewSensitiveFinancials && (reservation.balance_due_cents ?? 0) > 0)
        .map((reservation) => ({
          id: `balance-${reservation.reservation_id}`,
          title: reservation.buyer_name || `Reservation ${shortId(reservation.reservation_id)}`,
          detail: `Ledger-derived balance due is ${formatOptionalCurrencyFromCents(reservation.balance_due_cents)}.`,
          meta: reservation.puppy_name || "Unassigned puppy",
          tone: taskTone("amber"),
          links: [
            { href: "/staff/payments", label: "Payments" },
            { href: `/staff/reservations/${reservation.reservation_id}`, label: "Reservation" },
          ],
        })),
      ...activeReservations
        .filter((reservation) => readScopes.canViewSensitiveFinancials && (taskDocumentsByReservation.get(reservation.reservation_id) ?? []).length === 0)
        .map((reservation) => ({
          id: `documents-${reservation.reservation_id}`,
          title: reservation.puppy_name || `Reservation ${shortId(reservation.reservation_id)}`,
          detail: "No document metadata is linked to this reservation yet.",
          meta: reservation.buyer_name || "Unassigned buyer",
          tone: taskTone("blue"),
          links: [
            { href: "/staff/documents", label: "Documents" },
            { href: `/staff/reservations/${reservation.reservation_id}`, label: "Reservation" },
          ],
        })),
      ...notificationsForTasks
        .filter((notification) => ["queued", "blocked", "failed", "preview", "previewed"].includes(normalizeText(notification.status)))
        .map((notification) => ({
          id: `notification-${notification.id}`,
          title: safeTextValue(notification.payload?.subject_preview) || safeTextValue(notification.payload?.subject) || notification.notification_type || `Notification ${shortId(notification.id)}`,
          detail: `Preview/queue status is ${notification.status ?? "unknown"}. No sending is connected.`,
          meta: safeTextValue(notification.payload?.recipient_email) || notification.channel || "No recipient recorded",
          tone: taskTone(normalizeText(notification.status) === "failed" ? "rose" : "blue"),
          links: [
            { href: "/staff/messages", label: "Messages" },
            { href: "/staff/notifications", label: "Notifications" },
          ],
        })),
    ].slice(0, 10);
    const kennelMaintenance: DashboardTask[] = [
      ...puppiesForTasks
        .filter((puppy) => !puppy.litter_id || !puppy.sex || !puppy.color || !puppy.coat_type || !puppy.birth_at || !puppy.status)
        .map((puppy) => ({
          id: `puppy-maintenance-${puppy.id}`,
          title: puppyName(puppy),
          detail: "Basic puppy metadata is incomplete.",
          meta: [!puppy.litter_id ? "missing litter" : null, !puppy.sex ? "missing sex" : null, !puppy.color ? "missing color" : null, !puppy.birth_at ? "missing birth date" : null].filter(Boolean).join(" / "),
          tone: taskTone("slate"),
          links: [
            { href: `/staff/puppies/${puppy.id}`, label: "Open timeline" },
            { href: `/staff/puppies/${puppy.id}/edit`, label: "Edit puppy" },
          ],
        })),
      ...littersForTasks
        .filter((litter) => !litter.dam_id || !litter.sire_id || (!litter.expected_birth_at && !litter.birth_at) || !litter.status)
        .map((litter) => ({
          id: `litter-maintenance-${litter.id}`,
          title: litterName(litter),
          detail: "Basic litter setup metadata is incomplete.",
          meta: [!litter.dam_id ? "missing dam" : null, !litter.sire_id ? "missing sire" : null, !litter.expected_birth_at && !litter.birth_at ? "missing date" : null].filter(Boolean).join(" / "),
          tone: taskTone("slate"),
          links: [
            { href: "/staff/litters", label: "Litters" },
            { href: `/staff/litters/${litter.id}/edit`, label: "Edit litter" },
          ],
        })),
      ...dogsForTasks
        .filter((dog) => (!dog.call_name && !dog.registered_name) || !dog.sex || !dog.status)
        .map((dog) => ({
          id: `dog-maintenance-${dog.id}`,
          title: dogName(dog),
          detail: "Basic dog metadata is incomplete.",
          meta: [!dog.call_name && !dog.registered_name ? "missing name" : null, !dog.sex ? "missing sex" : null, !dog.status ? "missing status" : null].filter(Boolean).join(" / "),
          tone: taskTone("slate"),
          links: [
            { href: "/staff/dogs", label: "Dogs" },
            { href: `/staff/dogs/${dog.id}/edit`, label: "Edit dog" },
          ],
        })),
    ].slice(0, 10);
    const taskBoard = {
      totalTasks: newbornPuppyCare.length + expectedLitters.length + goHomeReadiness.length + accountAttention.length + kennelMaintenance.length,
      newbornPuppyCare,
      expectedLitters,
      goHomeReadiness,
      accountAttention,
      kennelMaintenance,
    };
    const workflowActivity = [
      ...workflowEvents.map((event) => {
        const details = event.details ?? {};

        return {
          id: `event-${event.id}`,
          recordType: "Event",
          type: event.event_type || "event",
          summary: event.summary || "Core workflow event recorded",
          detail: workflowDetail([
            safeTextValue(details.cancellation_reason)
              ? `Reason: ${safeTextValue(details.cancellation_reason)}`
              : null,
            safeBooleanLabel(details.release_puppy_requested)
              ? `Release requested: ${safeBooleanLabel(details.release_puppy_requested)}`
              : null,
            safeTextValue(details.released_puppy_status_requested)
              ? `Requested puppy status: ${safeTextValue(details.released_puppy_status_requested)}`
              : null,
            safeTextValue(details.from_status) && safeTextValue(details.to_status)
              ? `Puppy status: ${safeTextValue(details.from_status)} to ${safeTextValue(details.to_status)}`
              : null,
          ]),
          actor: event.created_by_profile_id ? `Profile ${shortId(event.created_by_profile_id)}` : "System or not linked",
          source: event.source || "core_events",
          entity: event.related_table || "core_events",
          relatedId: shortId(event.reservation_id ?? event.application_id ?? event.puppy_id ?? event.buyer_id ?? event.related_id),
          when: formatDateTime(event.event_at),
          sortTime: sortTime(event.event_at),
        };
      }),
      ...auditLogs.map((audit) => {
        const requestContext = audit.request_context ?? {};

        return {
          id: `audit-${audit.id}`,
          recordType: "Audit",
          type: audit.action || "audit",
          summary: `${audit.action || "Workflow write"} recorded with ${audit.outcome || "unknown"} outcome`,
          detail: workflowDetail([
            safeTextValue(requestContext.cancellation_reason)
              ? `Reason: ${safeTextValue(requestContext.cancellation_reason)}`
              : null,
            safeBooleanLabel(requestContext.release_puppy_requested)
              ? `Release requested: ${safeBooleanLabel(requestContext.release_puppy_requested)}`
              : null,
            safeTextValue(requestContext.released_puppy_status_requested)
              ? `Requested puppy status: ${safeTextValue(requestContext.released_puppy_status_requested)}`
              : null,
            safeTextValue(requestContext.released_puppy_status)
              ? `Puppy status: ${safeTextValue(requestContext.released_puppy_status)}`
              : null,
          ]),
          actor: audit.actor_identifier || "Actor not recorded",
          source: audit.source || "core_audit_log",
          entity: audit.entity_table || "Unknown entity",
          relatedId: shortId(audit.entity_id),
          when: formatDateTime(audit.created_at),
          sortTime: sortTime(audit.created_at),
        };
      }),
    ]
      .sort((left, right) => right.sortTime - left.sortTime)
      .slice(0, 15);

    return {
      stats: [
        {
          label: "Applications",
          value: String(applicationsCount.count),
          helper: `${receivedApplicationsCount.count} received/pending`,
          tone: "bg-blue-50 text-blue-700 ring-blue-100",
        },
        {
          label: "Reserved Puppies",
          value: String(reservationsCount.count),
          helper: "active reservation records",
          tone: "bg-violet-50 text-violet-700 ring-violet-100",
        },
        {
          label: "Balance Due",
          value: formatCurrencyFromCents(totalBalanceDueCents),
          helper: "ledger-derived total",
          tone: "bg-amber-50 text-amber-700 ring-amber-100",
        },
        {
          label: "Events",
          value: String(events.length),
          helper: "latest feed items",
          tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        },
      ],
      foundationChecks,
      navigation,
      applications: applications.map((application) => {
        const buyer = application.buyer_id
          ? buyersById.get(application.buyer_id)
          : undefined;

        return {
          id: application.id,
          hasReservationContext: Boolean(application.buyer_id && application.family_id),
          applicant: buyerName(buyer),
          email: buyerEmail(buyer),
          status: application.status || "Unknown",
          source: application.source || "Unknown source",
          submitted: formatDateTime(application.submitted_at ?? application.created_at),
          reference: application.external_reference || application.id.slice(0, 8),
        };
      }),
      applicationSections: applicationSections.map((section) => {
        const application = section.application_id
          ? applicationsById.get(section.application_id)
          : undefined;
        const responses = section.responses ?? {};

        return {
          applicationId: section.application_id || "",
          applicationReference:
            application?.external_reference || section.application_id?.slice(0, 8) || "Latest application",
          sectionKey: section.section_key || "section",
          sectionLabel:
            section.section_label || formatResponseLabel(section.section_key || "application section"),
          status: section.status || "received",
          responses: Object.entries(responses).map(([key, value]) => ({
            label: formatResponseLabel(key),
            value: formatResponseValue(value),
          })),
        };
      }),
      availablePuppies: availablePuppies
        .filter((puppy) => !activelyReservedPuppyIds.has(puppy.id))
        .map((puppy) => ({
          id: puppy.id,
          label: puppyName(puppy),
        })),
      goHomes: goHomes.map((goHome) => ({
        puppy: puppyName(goHome.puppy_id ? puppiesById.get(goHome.puppy_id) : undefined),
        buyer: buyerName(goHome.buyer_id ? buyersById.get(goHome.buyer_id) : undefined),
        time: formatScheduledDateTime(
          goHome.effective_scheduled_at ?? goHome.effective_window_start,
        ),
        source:
          goHome.source_of_schedule ||
          (goHome.has_individual_override ? "Individual override" : "Group/default"),
        status: goHome.effective_status || "Pending",
      })),
      reservations: reservations.map((reservation) => {
        const application = reservation.application_id
          ? reservationApplicationsById.get(reservation.application_id)
          : undefined;

        return {
          id: reservation.reservation_id.slice(0, 8),
          reservationId: reservation.reservation_id,
          applicationReference: application?.external_reference || "No application reference",
          puppy: reservation.puppy_name || "Unassigned puppy",
          puppyStatus: reservation.puppy_status || "Unknown",
          buyer: reservation.buyer_name || "Unassigned buyer",
          buyerEmail: reservation.buyer_email || "No email on file",
          status: reservation.reservation_status || "Unknown",
          contractTotal: formatOptionalCurrencyFromCents(reservation.contract_total_cents),
          depositRequired: formatOptionalCurrencyFromCents(reservation.deposit_required_cents),
          balance: formatOptionalCurrencyFromCents(reservation.balance_due_cents),
          reservedAt: formatDateTime(reservation.reserved_at),
        };
      }),
      phoneLookups: phoneLookups.map((lookup) => ({
        phone: lookup.normalized_phone || "Unknown phone",
        result: lookup.is_ambiguous ? "Ambiguous match" : "Unambiguous match",
        detail: lookup.is_ambiguous
          ? "Sensitive details redacted; route to staff"
          : lookup.safe_display_name || `${lookup.match_count ?? 0} safe match`,
        tone: lookup.is_ambiguous
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      })),
      kennelNotes: [
        "Dashboard reads Core operational data server-side.",
        "No browser-side Supabase client is enabled.",
        "No dashboard write actions are enabled.",
        "Live Zoho, Twilio, payments, documents, and customer portal remain off.",
      ],
      emptyStates,
      events: events.map((event) => ({
        summary: event.summary || "Core event recorded",
        type: event.event_type || "event",
        when: formatDateTime(event.event_at),
      })),
      workflowActivity,
      ledgerActivity: ledgerRows.map((ledger) => {
        const reservation = ledger.reservation_id ? reservationContextById.get(ledger.reservation_id) : undefined;
        const buyer = ledger.buyer_id ? buyersById.get(ledger.buyer_id) : undefined;
        const relatedLedgerId = safeTextValue(ledger.metadata?.related_ledger_id);
        const processorNotice =
          ledger.entry_type === "refund" || ledger.entry_type === "chargeback"
            ? "Internal ledger record only; no processor money movement."
            : null;

        return {
          id: ledger.id,
          type: ledger.entry_type || "ledger",
          category: ledgerCategory(ledger.entry_type, ledger.balance_effect),
          balanceEffect: ledger.balance_effect || "unknown",
          amount: formatLedgerCurrencyFromCents(ledger.amount_cents),
          reservationId: shortId(ledger.reservation_id),
          buyer: reservation?.buyer_name || buyerName(buyer),
          buyerEmail: reservation?.buyer_email || buyerEmail(buyer),
          puppy: reservation?.puppy_name || "Unassigned puppy",
          externalReference: ledger.external_reference || "None",
          description: workflowDetail([
            ledger.description || null,
            safeTextValue(ledger.metadata?.reason) ? `Reason: ${safeTextValue(ledger.metadata?.reason)}` : null,
            processorNotice,
          ]),
          relatedLedgerId: shortId(relatedLedgerId),
          status: ledger.status || "unknown",
          occurredAt: formatDateTime(ledger.occurred_at),
        };
      }),
      taskBoard,
      readScopes,
      dataSourceLabel: "Local Supabase read-only",
      dataWarning: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase read error";

    return fallbackDashboardData(message);
  }
}

