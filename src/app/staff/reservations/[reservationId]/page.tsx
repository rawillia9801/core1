import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { SectionNav, SummaryStrip } from "../../operator-ui";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReadResult<T> = {
  rows: T[];
  warning: string | null;
};

type ReservationSummaryRow = {
  reservation_id: string;
  reservation_status: string | null;
  reserved_at: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  puppy_status: string | null;
  application_id: string | null;
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  posted_ledger_total_cents: number | null;
  balance_due_cents: number | null;
  currency: string | null;
  go_home_planned_at: string | null;
  go_home_method: string | null;
  go_home_status: string | null;
  go_home_detail_id: string | null;
  go_home_group_id: string | null;
  go_home_is_grouped: boolean | null;
  go_home_has_individual_override: boolean | null;
  go_home_source_of_schedule: string | null;
  go_home_window_start: string | null;
  go_home_window_end: string | null;
  go_home_location_text: string | null;
  go_home_detail_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReservationRow = {
  id: string;
  external_reference: string | null;
  sale_type: string | null;
  portal_access_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  email_normalized: string | null;
  phone: string | null;
  phone_normalized: string | null;
  approval_status: string | null;
  notes: string | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
  notes: string | null;
};

type ApplicationRow = {
  id: string;
  external_reference: string | null;
  status: string | null;
  submitted_at: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
  health_status: string | null;
  public_listing_status: string | null;
  notes: string | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
  status: string | null;
};

type DogRow = {
  id: string;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  status: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  posted_ledger_total_cents: number | null;
  balance_due_cents: number | null;
  last_posted_payment_at: string | null;
};

type LedgerRow = {
  id: string;
  entry_type: string | null;
  balance_effect: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  occurred_at: string | null;
  payment_method: string | null;
  external_reference: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
};

type DocumentRow = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  current_version_number: number | null;
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

type DocumentVersionRow = {
  id: string;
  document_id: string | null;
  version_number: number | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: string | null;
  generated_at: string | null;
  signed_at: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

type GoHomeEffectiveRow = {
  go_home_detail_id: string;
  go_home_group_id: string | null;
  is_grouped: boolean | null;
  has_individual_override: boolean | null;
  override_reason: string | null;
  effective_pickup_delivery_type: string | null;
  effective_scheduled_at: string | null;
  effective_window_start: string | null;
  effective_window_end: string | null;
  effective_location_text: string | null;
  effective_contact_phone: string | null;
  effective_status: string | null;
  source_of_schedule: string | null;
  detail_status: string | null;
  checklist_status: string | null;
  balance_cleared_status: string | null;
  contact_notes: string | null;
  individual_notes: string | null;
  group_notes: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

type ChecklistItemRow = {
  id: string;
  item_key: string | null;
  label: string | null;
  status: string | null;
  notes: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  source: string | null;
  related_table: string | null;
  related_id: string | null;
};

type AuditRow = {
  id: string;
  action: string | null;
  entity_table: string | null;
  entity_id: string | null;
  source: string | null;
  actor_identifier: string | null;
  outcome: string | null;
  created_at: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(
  restUrl: string,
  table: string,
  params: Record<string, string>,
) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function readRows<T>(
  table: string,
  params: Record<string, string>,
): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      rows: [],
      warning:
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads.",
    };
  }

  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      rows: [],
      warning: `${table} read failed: ${response.status} ${body}`.trim(),
    };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function buyerName(buyer: BuyerRow | null, fallback: string | null) {
  if (!buyer) return fallback || "Unlinked buyer";
  return (
    buyer.preferred_name ||
    [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") ||
    buyer.email ||
    buyer.email_normalized ||
    fallback ||
    "Unnamed buyer"
  );
}

function puppyName(puppy: PuppyRow | null, fallback: string | null) {
  if (!puppy) return fallback || "Unlinked puppy";
  return puppy.name || puppy.collar_color || puppy.sex || fallback || "Unnamed puppy";
}

function dogName(dog: DogRow | null) {
  if (!dog) return "Not linked";
  return dog.call_name || dog.registered_name || shortId(dog.id);
}

function statusTone(status: string | null | undefined) {
  const value = status?.toLowerCase() ?? "";
  if (
    ["active", "approved", "reserved", "ready", "complete", "completed", "confirmed", "posted", "cleared"].includes(value)
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (["cancelled", "void", "released", "failed", "declined"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }
  if (["pending", "needs_review", "not_cleared", "in_progress"].includes(value)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isCompleteDocumentStatus(status: string | null) {
  return ["signed", "completed", "complete", "filed", "approved"].includes(
    status?.toLowerCase() ?? "",
  );
}

function isChecklistComplete(status: string | null) {
  return ["complete", "not_applicable"].includes(status?.toLowerCase() ?? "");
}

function isGoHomeReady(status: string | null) {
  return ["confirmed", "ready", "completed"].includes(status?.toLowerCase() ?? "");
}

function safeMetadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "No metadata keys recorded";
  const keys = Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("url") &&
        !lowered.includes("path") &&
        !lowered.includes("token") &&
        !lowered.includes("secret") &&
        !lowered.includes("password") &&
        !lowered.includes("signature")
      );
    })
    .slice(0, 6);
  return keys.length > 0 ? `Metadata keys: ${keys.join(", ")}` : "Metadata present, hidden from readiness view";
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}
    >
      {children}
    </span>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function RestrictedPanel({ text }: { text: string }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
        Restricted to owner/admin
      </p>
      <p className="mt-2 text-sm leading-6">{text}</p>
    </section>
  );
}

function NotFoundMessage() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1000px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Not found
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Reservation Not Found
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          No Core reservation row was found for that ID.
        </p>
        <Link
          href="/staff/reservations"
          className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
        >
          Back to Reservations
        </Link>
      </section>
    </main>
  );
}

function documentLinkFilter(summary: ReservationSummaryRow) {
  const clauses = [
    `reservation_id.eq.${summary.reservation_id}`,
    summary.buyer_id ? `buyer_id.eq.${summary.buyer_id}` : null,
    summary.family_id ? `family_id.eq.${summary.family_id}` : null,
    summary.puppy_id ? `puppy_id.eq.${summary.puppy_id}` : null,
  ].filter(Boolean);
  return `(${clauses.join(",")})`;
}

function eventLinkFilter(summary: ReservationSummaryRow) {
  const clauses = [
    `reservation_id.eq.${summary.reservation_id}`,
    summary.buyer_id ? `buyer_id.eq.${summary.buyer_id}` : null,
    summary.family_id ? `family_id.eq.${summary.family_id}` : null,
    summary.puppy_id ? `puppy_id.eq.${summary.puppy_id}` : null,
  ].filter(Boolean);
  return `(${clauses.join(",")})`;
}

function buildBlockers({
  summary,
  application,
  balance,
  documents,
  goHome,
  checklistItems,
  canEvaluateSensitive,
}: {
  summary: ReservationSummaryRow;
  application: ApplicationRow | null;
  balance: PaymentBalanceRow | null;
  documents: DocumentRow[];
  goHome: GoHomeEffectiveRow | null;
  checklistItems: ChecklistItemRow[];
  canEvaluateSensitive: boolean;
}) {
  const blockers: string[] = [];
  const reservationStatus = summary.reservation_status?.toLowerCase() ?? "";
  const puppyStatus = summary.puppy_status?.toLowerCase() ?? "";
  const applicationStatus = application?.status?.toLowerCase() ?? "";

  if (!["reserved", "confirmed", "pending"].includes(reservationStatus)) {
    blockers.push("Reservation is not active or confirmed.");
  }

  if (puppyStatus && !["reserved", "hold", "available"].includes(puppyStatus)) {
    blockers.push(`Puppy status needs review: ${formatKey(summary.puppy_status)}.`);
  }

  if (applicationStatus && !["approved", "received", "needs_review"].includes(applicationStatus)) {
    blockers.push(`Linked application status needs review: ${formatKey(application?.status)}.`);
  }

  if (!goHome) {
    blockers.push("Go-home date/details are missing.");
  } else {
    if (!goHome.effective_scheduled_at && !goHome.effective_window_start) {
      blockers.push("Go-home date is missing.");
    }
    if (!isGoHomeReady(goHome.effective_status)) {
      blockers.push("Go-home status is not confirmed, ready, or completed.");
    }
  }

  if (checklistItems.length === 0) {
    blockers.push("Go-home checklist has not been started.");
  } else if (checklistItems.some((item) => !isChecklistComplete(item.status))) {
    blockers.push("Go-home checklist has incomplete items.");
  }

  if (!canEvaluateSensitive) {
    blockers.push("Not enough linked data to evaluate this blocker: owner/admin financial and document readiness are restricted for this role.");
    return blockers;
  }

  if (balance?.balance_due_cents === null || balance?.balance_due_cents === undefined) {
    blockers.push("Not enough linked data to evaluate this blocker: ledger-derived balance is unavailable.");
  } else if (balance.balance_due_cents > 0) {
    blockers.push(`Ledger-derived balance due is ${formatCurrency(balance.balance_due_cents)}.`);
  }

  if (documents.length === 0) {
    blockers.push("Not enough linked data to evaluate this blocker: no related document metadata is linked.");
  } else if (!documents.some((document) => isCompleteDocumentStatus(document.status))) {
    blockers.push("Required document completion cannot be confirmed from linked metadata.");
  }

  return blockers;
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const staff = await requireStaffProfile();
  const { reservationId } = await params;
  const canViewSensitive = staff.role === "owner" || staff.role === "admin";

  if (!UUID_PATTERN.test(reservationId)) {
    return <NotFoundMessage />;
  }

  const summaryResult = await readRows<ReservationSummaryRow>(
    "core_reservation_summary_view",
    {
      select:
        "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,buyer_phone,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,currency,go_home_planned_at,go_home_method,go_home_status,go_home_detail_id,go_home_group_id,go_home_is_grouped,go_home_has_individual_override,go_home_source_of_schedule,go_home_window_start,go_home_window_end,go_home_location_text,go_home_detail_status,go_home_checklist_status,go_home_balance_cleared_status,created_at,updated_at",
      reservation_id: `eq.${reservationId}`,
      limit: "1",
    },
  );
  const summary = summaryResult.rows[0] ?? null;

  if (!summary) {
    return <NotFoundMessage />;
  }

  const [
    reservationResult,
    buyerResult,
    familyResult,
    applicationResult,
    puppyResult,
    balanceResult,
    ledgerResult,
    documentResult,
    goHomeResult,
    checklistResult,
    eventResult,
    auditResult,
  ] = await Promise.all([
    readRows<ReservationRow>("core_reservations", {
      select:
        "id,external_reference,sale_type,portal_access_status,notes,metadata",
      id: `eq.${reservationId}`,
      limit: "1",
    }),
    summary.buyer_id
      ? readRows<BuyerRow>("core_buyers", {
          select:
            "id,first_name,last_name,preferred_name,email,email_normalized,phone,phone_normalized,approval_status,notes",
          id: `eq.${summary.buyer_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as BuyerRow[], warning: null }),
    summary.family_id
      ? readRows<FamilyRow>("core_families", {
          select: "id,name,status,notes",
          id: `eq.${summary.family_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as FamilyRow[], warning: null }),
    summary.application_id
      ? readRows<ApplicationRow>("core_applications", {
          select: "id,external_reference,status,submitted_at",
          id: `eq.${summary.application_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as ApplicationRow[], warning: null }),
    summary.puppy_id
      ? readRows<PuppyRow>("core_puppies", {
          select:
            "id,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,notes",
          id: `eq.${summary.puppy_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as PuppyRow[], warning: null }),
    canViewSensitive
      ? readRows<PaymentBalanceRow>("core_payment_balance_view", {
          select:
            "reservation_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,last_posted_payment_at",
          reservation_id: `eq.${reservationId}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as PaymentBalanceRow[], warning: null }),
    canViewSensitive
      ? readRows<LedgerRow>("core_financial_ledger", {
          select:
            "id,entry_type,balance_effect,status,amount_cents,currency,occurred_at,payment_method,external_reference,description,metadata",
          reservation_id: `eq.${reservationId}`,
          order: "occurred_at.desc",
          limit: "80",
        })
      : Promise.resolve({ rows: [] as LedgerRow[], warning: null }),
    canViewSensitive
      ? readRows<DocumentRow>("core_documents", {
          select:
            "id,document_type,title,status,current_version_number,reservation_id,buyer_id,family_id,puppy_id,metadata,updated_at",
          or: documentLinkFilter(summary),
          order: "updated_at.desc",
          limit: "80",
        })
      : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", {
      select:
        "go_home_detail_id,go_home_group_id,is_grouped,has_individual_override,override_reason,effective_pickup_delivery_type,effective_scheduled_at,effective_window_start,effective_window_end,effective_location_text,effective_contact_phone,effective_status,source_of_schedule,detail_status,checklist_status,balance_cleared_status,contact_notes,individual_notes,group_notes,completed_at,updated_at",
      reservation_id: `eq.${reservationId}`,
      order: "effective_scheduled_at.asc.nullslast,updated_at.desc",
      limit: "1",
    }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", {
      select: "id,item_key,label,status,notes,completed_at,updated_at",
      reservation_id: `eq.${reservationId}`,
      order: "updated_at.desc",
      limit: "80",
    }),
    canViewSensitive
      ? readRows<EventRow>("core_events", {
          select:
            "id,event_type,event_at,summary,source,related_table,related_id",
          or: eventLinkFilter(summary),
          order: "event_at.desc",
          limit: "30",
        })
      : Promise.resolve({ rows: [] as EventRow[], warning: null }),
    canViewSensitive
      ? readRows<AuditRow>("core_audit_log", {
          select:
            "id,action,entity_table,entity_id,source,actor_identifier,outcome,created_at",
          or: `(entity_id.eq.${reservationId},entity_id.eq.${summary.puppy_id ?? reservationId},entity_id.eq.${summary.buyer_id ?? reservationId})`,
          order: "created_at.desc",
          limit: "30",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const reservation = reservationResult.rows[0] ?? null;
  const buyer = buyerResult.rows[0] ?? null;
  const family = familyResult.rows[0] ?? null;
  const application = applicationResult.rows[0] ?? null;
  const puppy = puppyResult.rows[0] ?? null;
  const balance = balanceResult.rows[0] ?? null;
  const goHome = goHomeResult.rows[0] ?? null;

  const litterResult = puppy?.litter_id
    ? await readRows<LitterRow>("core_litters", {
        select:
          "id,litter_name,dam_id,sire_id,birth_at,expected_birth_at,status",
        id: `eq.${puppy.litter_id}`,
        limit: "1",
      })
    : { rows: [] as LitterRow[], warning: null };
  const litter = litterResult.rows[0] ?? null;
  const parentIds = [litter?.dam_id, litter?.sire_id].filter(Boolean) as string[];
  const dogResult =
    parentIds.length > 0
      ? await readRows<DogRow>("core_dogs", {
          select: "id,registered_name,call_name,sex,status",
          id: `in.(${parentIds.join(",")})`,
        })
      : { rows: [] as DogRow[], warning: null };
  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));

  const documentIds = documentResult.rows.map((document) => document.id);
  const versionResult =
    canViewSensitive && documentIds.length > 0
      ? await readRows<DocumentVersionRow>("core_document_versions", {
          select:
            "id,document_id,version_number,file_name,mime_type,file_size_bytes,status,generated_at,signed_at,metadata,updated_at",
          document_id: `in.(${documentIds.join(",")})`,
          order: "updated_at.desc",
          limit: "160",
        })
      : { rows: [] as DocumentVersionRow[], warning: null };
  const versionsByDocument = new Map<string, DocumentVersionRow[]>();
  versionResult.rows.forEach((version) => {
    if (!version.document_id) return;
    versionsByDocument.set(version.document_id, [
      ...(versionsByDocument.get(version.document_id) ?? []),
      version,
    ]);
  });

  const warning =
    summaryResult.warning ??
    reservationResult.warning ??
    buyerResult.warning ??
    familyResult.warning ??
    applicationResult.warning ??
    puppyResult.warning ??
    balanceResult.warning ??
    ledgerResult.warning ??
    documentResult.warning ??
    goHomeResult.warning ??
    checklistResult.warning ??
    eventResult.warning ??
    auditResult.warning ??
    litterResult.warning ??
    dogResult.warning ??
    versionResult.warning;

  const blockers = buildBlockers({
    summary,
    application,
    balance,
    documents: documentResult.rows,
    goHome,
    checklistItems: checklistResult.rows,
    canEvaluateSensitive: canViewSensitive,
  });
  const completeChecklistCount = checklistResult.rows.filter((item) =>
    isChecklistComplete(item.status),
  ).length;
  const reservationReference =
    reservation?.external_reference || shortId(summary.reservation_id);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Reservation Readiness
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {puppyName(puppy, summary.puppy_name)}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {buyerName(buyer, summary.buyer_name)} / {display(family?.name || summary.family_name)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={statusTone(summary.reservation_status)}>
                  {formatKey(summary.reservation_status)}
                </Badge>
                <Badge>Ref {reservationReference}</Badge>
                <Badge>Reserved {formatDateTime(summary.reserved_at)}</Badge>
                <Badge>Go-home {formatDateTime(summary.go_home_planned_at)}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/reservations" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/payments" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Payments
              </Link>
              <Link href="/staff/go-home" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Go-Home
              </Link>
              <Link href="/staff/documents" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Documents
              </Link>
            </div>
          </div>
        </section>
        <SummaryStrip
          items={[
            { label: "Status", value: formatKey(summary.reservation_status), note: `Ref ${reservationReference}` },
            { label: "Balance", value: canViewSensitive ? formatCurrency(balance?.balance_due_cents ?? summary.balance_due_cents) : "Restricted", note: "ledger-derived" },
            { label: "Go-home", value: formatDateTime(summary.go_home_planned_at), note: formatKey(goHome?.effective_status ?? summary.go_home_status) },
            { label: "Checklist", value: `${completeChecklistCount} / ${checklistResult.rows.length}`, note: "complete or not applicable" },
            { label: "Blockers", value: blockers.length, note: "deterministic readiness" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            { href: "#people-puppy", label: "Buyer / Puppy" },
            { href: "#financials", label: "Payments" },
            { href: "#documents", label: "Documents" },
            { href: "#go-home", label: "Go-Home" },
            { href: "#blockers", label: "Blockers", count: blockers.length },
            { href: "#related", label: "Related Records" },
            { href: "#activity", label: "Activity" },
          ]}
        />


        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page shows internal Core reservation readiness only. It does not send email, SMS, payment requests, document links, customer portal messages, public listing changes, or external provider calls.
          </p>
        </section>

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {warning}
          </section>
        ) : null}

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <InfoItem label="Reservation" value={reservationReference} />
          <InfoItem label="Created" value={formatDateTime(summary.created_at)} />
          <InfoItem label="Reserved" value={formatDateTime(summary.reserved_at)} />
          <InfoItem label="Go-Home Date" value={formatDateTime(summary.go_home_planned_at)} />
          <InfoItem label="Blockers" value={blockers.length} />
        </section>

        <section id="people-puppy" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Buyer / Family Context</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem label="Buyer" value={buyerName(buyer, summary.buyer_name)} />
              <InfoItem label="Email" value={display(buyer?.email || buyer?.email_normalized || summary.buyer_email)} />
              <InfoItem label="Phone" value={display(buyer?.phone || buyer?.phone_normalized || summary.buyer_phone)} />
              <InfoItem label="Buyer Status" value={formatKey(buyer?.approval_status)} />
              <InfoItem label="Family" value={family?.name || summary.family_name || "Not linked"} />
              <InfoItem label="Family Status" value={formatKey(family?.status)} />
              <InfoItem label="Application" value={application?.external_reference || shortId(summary.application_id)} />
              <InfoItem label="Application Status" value={formatKey(application?.status)} />
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {family?.notes || buyer?.notes || "No buyer or family notes recorded."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Buyers</Link>
              <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Families</Link>
              {summary.application_id ? (
                <Link href={`/staff/applications/${summary.application_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Application</Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Puppy / Litter Context</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Puppy" value={puppyName(puppy, summary.puppy_name)} />
              <InfoItem label="Puppy Status" value={formatKey(puppy?.status || summary.puppy_status)} />
              <InfoItem label="Sex / Color" value={`${formatKey(puppy?.sex)} / ${display(puppy?.color)}`} />
              <InfoItem label="Coat" value={display(puppy?.coat_type)} />
              <InfoItem label="Registry" value="Not recorded" />
              <InfoItem label="Public Listing" value={formatKey(puppy?.public_listing_status)} />
              <InfoItem label="Litter" value={litter?.litter_name || shortId(litter?.id)} />
              <InfoItem label="Litter Date" value={formatDateTime(litter?.birth_at ?? litter?.expected_birth_at)} />
              <InfoItem label="Contract Total" value={formatCurrency(summary.contract_total_cents)} />
              <InfoItem label="Dam" value={dogName(litter?.dam_id ? dogsById.get(litter.dam_id) ?? null : null)} />
              <InfoItem label="Sire" value={dogName(litter?.sire_id ? dogsById.get(litter.sire_id) ?? null : null)} />
              <InfoItem label="Sale Type" value={formatKey(reservation?.sale_type)} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Puppies</Link>
              {puppy?.id ? (
                <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Puppy Record</Link>
              ) : null}
              {litter?.id ? (
                <Link href={`/staff/litters/${litter.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Litter</Link>
              ) : null}
            </div>
          </section>
        </section>

        {canViewSensitive ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 id="financials" className="text-xl font-bold tracking-tight">Financial Truth</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Balances are read from `core_payment_balance_view`; transaction direction comes from ledger `balance_effect`.
                </p>
              </div>
              <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Payments Workspace</Link>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <InfoItem label="Contract Total" value={formatCurrency(balance?.contract_total_cents ?? summary.contract_total_cents)} />
              <InfoItem label="Deposit Required" value={formatCurrency(balance?.deposit_required_cents ?? summary.deposit_required_cents)} />
              <InfoItem label="Posted Activity" value={formatCurrency(balance?.posted_ledger_total_cents ?? summary.posted_ledger_total_cents)} />
              <InfoItem label="Balance Due" value={formatCurrency(balance?.balance_due_cents ?? summary.balance_due_cents)} />
              <InfoItem label="Last Payment" value={formatDateTime(balance?.last_posted_payment_at)} />
            </dl>
            <div className="mt-5 space-y-3">
              {ledgerResult.rows.length > 0 ? (
                ledgerResult.rows.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">
                          {formatKey(entry.entry_type)} / {formatCurrency(entry.amount_cents)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {display(entry.payment_method)} / {formatDateTime(entry.occurred_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatKey(entry.balance_effect)}</Badge>
                        <Badge tone={statusTone(entry.status)}>{formatKey(entry.status)}</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {entry.description || "No description recorded."}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Reference {display(entry.external_reference, "None")} / {safeMetadataSummary(entry.metadata)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState text="No ledger rows are recorded for this reservation." />
              )}
            </div>
          </section>
        ) : (
          <RestrictedPanel text="Financial totals and ledger rows are restricted to owner/admin. Sensitive financial rows were not fetched for this profile." />
        )}

        {canViewSensitive ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 id="documents" className="text-xl font-bold tracking-tight">Document Readiness Metadata</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Metadata only. This page does not generate, upload, sign, expose, or send documents.
                </p>
              </div>
              <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Documents Workspace</Link>
            </div>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Related documents are matched by reservation, buyer, family, or puppy ID when available.
            </p>
            <div className="mt-5 space-y-3">
              {documentResult.rows.length > 0 ? (
                documentResult.rows.map((document) => {
                  const versions = versionsByDocument.get(document.id) ?? [];
                  const latestVersion = versions[0] ?? null;
                  return (
                    <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{document.title || formatKey(document.document_type)}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Current version {document.current_version_number ?? "not recorded"} / Updated {formatDateTime(document.updated_at)}
                          </p>
                        </div>
                        <Badge tone={statusTone(document.status)}>{formatKey(document.status)}</Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoItem label="Versions" value={versions.length} />
                        <InfoItem label="Latest Version" value={latestVersion?.version_number ?? "Not recorded"} />
                        <InfoItem label="Latest Status" value={formatKey(latestVersion?.status)} />
                        <InfoItem label="Signed At" value={formatDateTime(latestVersion?.signed_at)} />
                      </dl>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {safeMetadataSummary(document.metadata)}
                      </p>
                    </article>
                  );
                })
              ) : (
                <EmptyState text="No related document metadata was found for this reservation, buyer, family, or puppy." />
              )}
            </div>
          </section>
        ) : (
          <RestrictedPanel text="Document metadata is restricted to owner/admin while document visibility, storage, signature, and portal rules remain unfinished." />
        )}

        <section id="go-home" className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Go-Home Readiness</h2>
            {goHome ? (
              <>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Scheduled" value={formatDateTime(goHome.effective_scheduled_at ?? goHome.effective_window_start)} />
                  <InfoItem label="Window End" value={formatDateTime(goHome.effective_window_end)} />
                  <InfoItem label="Method" value={formatKey(goHome.effective_pickup_delivery_type)} />
                  <InfoItem label="Location" value={display(goHome.effective_location_text)} />
                  <InfoItem label="Contact Phone" value={display(goHome.effective_contact_phone)} />
                  <InfoItem label="Status" value={formatKey(goHome.effective_status)} />
                  <InfoItem label="Schedule Source" value={formatKey(goHome.source_of_schedule)} />
                  <InfoItem label="Checklist Status" value={formatKey(goHome.checklist_status)} />
                  <InfoItem label="Balance Marker" value={formatKey(goHome.balance_cleared_status)} />
                  <InfoItem label="Completed" value={formatDateTime(goHome.completed_at)} />
                </dl>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {goHome.individual_notes || goHome.group_notes || goHome.contact_notes || "No go-home notes recorded."}
                </p>
                {goHome.has_individual_override ? (
                  <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
                    Individual override: {display(goHome.override_reason)}
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyState text="No effective go-home detail row exists for this reservation." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Checklist Items</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {completeChecklistCount} of {checklistResult.rows.length} item(s) complete or not applicable.
            </p>
            <div className="mt-5 space-y-3">
              {checklistResult.rows.length > 0 ? (
                checklistResult.rows.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-bold text-slate-950">{item.label || formatKey(item.item_key)}</p>
                      <Badge tone={statusTone(item.status)}>{formatKey(item.status)}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.notes || "No notes recorded."}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Completed {formatDateTime(item.completed_at)} / Updated {formatDateTime(item.updated_at)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState text="No go-home checklist items are recorded for this reservation." />
              )}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="blockers" className="text-xl font-bold tracking-tight">Blockers</h2>
          {blockers.length > 0 ? (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {blockers.map((blocker) => (
                <li key={blocker} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  {blocker}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-950">
              No deterministic Core readiness blockers were found from the current read models.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="related" className="text-xl font-bold tracking-tight">Internal Links</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Payments</Link>
            <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Go-Home</Link>
            <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Documents</Link>
            <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Buyer List</Link>
            <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Family List</Link>
            {summary.application_id ? (
              <Link href={`/staff/applications/${summary.application_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Application</Link>
            ) : null}
            {puppy?.id ? (
              <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Puppy</Link>
            ) : null}
          </div>
        </section>

        {canViewSensitive ? (
          <section id="activity" className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Event History</h2>
              <div className="mt-5 space-y-3">
                {eventResult.rows.length > 0 ? (
                  eventResult.rows.map((event) => (
                    <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold text-slate-950">{formatKey(event.event_type)}</p>
                        <span className="text-sm font-semibold text-slate-500">{formatDateTime(event.event_at)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {event.summary || "Core event recorded."}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {event.source || "core_events"} / {event.related_table || "core_events"} / {shortId(event.related_id ?? event.id)}
                      </p>
                    </article>
                  ))
                ) : (
                  <EmptyState text="No related reservation, buyer, family, or puppy event rows are recorded." />
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Audit History</h2>
              <div className="mt-5 space-y-3">
                {auditResult.rows.length > 0 ? (
                  auditResult.rows.map((audit) => (
                    <article key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold text-slate-950">{formatKey(audit.action)}</p>
                        <Badge tone={statusTone(audit.outcome)}>{formatKey(audit.outcome)}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {audit.actor_identifier || "Actor not recorded"}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {audit.source || "core_audit_log"} / {audit.entity_table || "entity"} / {formatDateTime(audit.created_at)}
                      </p>
                    </article>
                  ))
                ) : (
                  <EmptyState text="No related reservation, puppy, or buyer audit rows are recorded." />
                )}
              </div>
            </section>
          </section>
        ) : (
          <RestrictedPanel text="Event and audit history are restricted to owner/admin. Sensitive history rows were not fetched for this profile." />
        )}
      </div>
    </main>
  );
}




