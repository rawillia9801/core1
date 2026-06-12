import Link from "next/link";
import { updateGoHomeDetail } from "../../../application-actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import { upsertGoHomeChecklistItem } from "../actions";
import { SectionNav, SummaryStrip } from "../../operator-ui";
import { ActionPanel } from "../../action-panel";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };

type ReservationSummaryRow = {
  reservation_id: string;
  reservation_status: string | null;
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
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_method: string | null;
  go_home_status: string | null;
  go_home_location_text: string | null;
  created_at: string | null;
};

type GoHomeEffectiveRow = {
  reservation_id: string | null;
  effective_pickup_delivery_type: string | null;
  effective_scheduled_at: string | null;
  effective_window_start: string | null;
  effective_window_end: string | null;
  effective_location_text: string | null;
  effective_contact_phone: string | null;
  effective_status: string | null;
  source_of_schedule: string | null;
  checklist_status: string | null;
  balance_cleared_status: string | null;
  has_individual_override: boolean | null;
  override_reason: string | null;
  updated_at: string | null;
};

type ChecklistItemRow = {
  id: string;
  reservation_id: string | null;
  item_key: string | null;
  label: string | null;
  status: string | null;
  notes: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  balance_due_cents: number | null;
};

type DocumentRow = {
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
};

type HandoffRow = {
  summary: ReservationSummaryRow;
  goHome: GoHomeEffectiveRow | null;
  balance: PaymentBalanceRow | null;
  checklistItems: ChecklistItemRow[];
  documents: DocumentRow[];
  blockers: string[];
  lane: "ready" | "payment" | "documents" | "checklist" | "schedule" | "attention";
};

const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);
const COMPLETE_CHECKLIST_STATUSES = new Set(["complete", "not_applicable"]);
const COMPLETE_DOCUMENT_STATUSES = new Set(["signed", "completed", "complete", "filed", "approved", "accepted", "ready"]);
const READY_GO_HOME_STATUSES = new Set(["confirmed", "ready", "completed"]);
const LOCATION_METHODS = new Set(["pickup", "delivery", "meetup", "transport"]);

const HANDOFF_CHECKLIST_ITEMS = [
  { key: "final_weight_recorded", label: "Final weight recorded" },
  { key: "puppy_photo_updated", label: "Puppy photo updated" },
  { key: "buyer_confirmed", label: "Buyer confirmed" },
  { key: "balance_reviewed", label: "Balance reviewed" },
  { key: "document_packet_reviewed", label: "Document packet reviewed" },
  { key: "health_record_reviewed", label: "Health/vaccine/worming record reviewed" },
  { key: "food_care_instructions", label: "Food and care instructions prepared" },
  { key: "registry_status_reviewed", label: "Microchip/registry status reviewed" },
  { key: "pickup_location_confirmed", label: "Pickup/delivery location confirmed" },
  { key: "transport_fee_reviewed", label: "Transport fee reviewed if applicable" },
  { key: "final_owner_note", label: "Final owner note added" },
] as const;

function getSupabaseRestConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [], warning: "Missing hosted Supabase read configuration." };

  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { rows: [], warning: `${table} unavailable for handoff workspace.` };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function isCompleteChecklist(status: string | null | undefined) {
  return COMPLETE_CHECKLIST_STATUSES.has(normalizeText(status));
}

function isCompleteDocument(status: string | null | undefined) {
  return COMPLETE_DOCUMENT_STATUSES.has(normalizeText(status));
}

function goHomeDate(row: HandoffRow) {
  return row.goHome?.effective_scheduled_at ?? row.goHome?.effective_window_start ?? row.summary.go_home_planned_at ?? null;
}

function goHomeLocation(row: HandoffRow) {
  return row.goHome?.effective_location_text ?? row.summary.go_home_location_text ?? null;
}

function goHomeMethod(row: HandoffRow) {
  return row.goHome?.effective_pickup_delivery_type ?? row.summary.go_home_method;
}

function goHomeStatus(row: HandoffRow) {
  return row.goHome?.effective_status ?? row.summary.go_home_status;
}

function isActiveReservation(row: ReservationSummaryRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalizeText(row.reservation_status));
}

function isUpcomingWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now() && date.getTime() <= Date.now() + days * 24 * 60 * 60 * 1000;
}

function isPastDate(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function linkedDocuments(summary: ReservationSummaryRow, documents: DocumentRow[]) {
  return documents.filter((document) => {
    if (document.reservation_id && document.reservation_id === summary.reservation_id) return true;
    if (document.buyer_id && document.buyer_id === summary.buyer_id) return true;
    if (document.family_id && document.family_id === summary.family_id) return true;
    if (document.puppy_id && document.puppy_id === summary.puppy_id) return true;
    return false;
  });
}

function buildBlockers(row: Omit<HandoffRow, "blockers" | "lane">) {
  const blockers: string[] = [];
  const method = normalizeText(goHomeMethod({ ...row, blockers: [], lane: "attention" }));
  const status = normalizeText(goHomeStatus({ ...row, blockers: [], lane: "attention" }));
  const scheduledAt = goHomeDate({ ...row, blockers: [], lane: "attention" });
  const location = goHomeLocation({ ...row, blockers: [], lane: "attention" });
  const incompleteChecklist = row.checklistItems.length === 0 || row.checklistItems.some((item) => !isCompleteChecklist(item.status));
  const incompleteDocuments = row.documents.length === 0 || row.documents.some((document) => !isCompleteDocument(document.status));

  if (!scheduledAt) blockers.push("Pickup/delivery date is missing.");
  if (method && LOCATION_METHODS.has(method) && !location) blockers.push("Pickup, delivery, meetup, or transport location is missing.");
  if (status && !READY_GO_HOME_STATUSES.has(status)) blockers.push("Go-home status is not confirmed, ready, or completed.");
  if ((row.balance?.balance_due_cents ?? row.summary.balance_due_cents ?? 0) > 0) blockers.push(`Ledger-derived balance due is ${formatCurrency(row.balance?.balance_due_cents ?? row.summary.balance_due_cents)}.`);
  if (incompleteDocuments) blockers.push("Document metadata is missing or not marked complete/ready.");
  if (incompleteChecklist) blockers.push("Handoff checklist is missing or incomplete.");
  if (!row.summary.puppy_id) blockers.push("Reservation is not linked to a puppy.");
  if (!row.summary.buyer_id && !row.summary.family_id) blockers.push("Reservation is not linked to a buyer or family.");
  if (normalizeText(row.summary.puppy_status) && !["reserved", "hold", "available"].includes(normalizeText(row.summary.puppy_status))) blockers.push(`Puppy status needs review: ${formatKey(row.summary.puppy_status)}.`);

  return blockers;
}

function laneFor(row: Omit<HandoffRow, "lane">): HandoffRow["lane"] {
  const method = normalizeText(goHomeMethod({ ...row, lane: "attention" }));
  const missingSchedule = !goHomeDate({ ...row, lane: "attention" }) || (method && LOCATION_METHODS.has(method) && !goHomeLocation({ ...row, lane: "attention" }));
  if (missingSchedule) return "schedule";
  if ((row.balance?.balance_due_cents ?? row.summary.balance_due_cents ?? 0) > 0) return "payment";
  if (row.documents.length === 0 || row.documents.some((document) => !isCompleteDocument(document.status))) return "documents";
  if (row.checklistItems.length === 0 || row.checklistItems.some((item) => !isCompleteChecklist(item.status))) return "checklist";
  if (row.blockers.length > 0) return "attention";
  return "ready";
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{children}</span>;
}

function StatCard({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function HandoffCard({ row }: { row: HandoffRow }) {
  const checklistComplete = row.checklistItems.filter((item) => isCompleteChecklist(item.status)).length;
  const documentComplete = row.documents.filter((document) => isCompleteDocument(document.status)).length;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-lg font-bold text-slate-950">{display(row.summary.puppy_name || row.summary.puppy_collar_color, "Unlinked puppy")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{display(row.summary.buyer_name || row.summary.buyer_email, "Unlinked buyer")} / {display(row.summary.family_name, "Unlinked family")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{row.blockers.length} blocker(s)</Badge>
            <Badge>{formatCurrency(row.balance?.balance_due_cents ?? row.summary.balance_due_cents)}</Badge>
            <Badge>{documentComplete} of {row.documents.length} documents</Badge>
            <Badge>{checklistComplete} of {row.checklistItems.length} checklist</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/staff/reservations/${row.summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Reservation</Link>
          {row.summary.puppy_id ? <Link href={`/staff/puppies/${row.summary.puppy_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Puppy</Link> : null}
          {row.summary.buyer_id ? <Link href={`/staff/buyers/${row.summary.buyer_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Buyer</Link> : null}
          {row.summary.family_id ? <Link href={`/staff/families/${row.summary.family_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Family</Link> : null}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(goHomeDate(row))}</dd></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Method</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatKey(goHomeMethod(row))}</dd></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{display(goHomeLocation(row))}</dd></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatKey(goHomeStatus(row))}</dd></div>
      </dl>

      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-950">Blockers / owner attention</p>
        {row.blockers.length > 0 ? <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">{row.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-emerald-700">No deterministic handoff blockers were found.</p>}
      </div>
    </article>
  );
}

export default async function StaffGoHomeHandoffPage() {
  const staff = await requireStaffProfile();
  const canViewSensitive = staff.role === "owner" || staff.role === "admin";

  const [summaryResult, goHomeResult, checklistResult, balanceResult, documentResult] = await Promise.all([
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,buyer_phone,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,balance_due_cents,go_home_planned_at,go_home_method,go_home_status,go_home_location_text,created_at",
      order: "go_home_planned_at.asc.nullslast,created_at.desc",
      limit: "250",
    }),
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", {
      select: "reservation_id,effective_pickup_delivery_type,effective_scheduled_at,effective_window_start,effective_window_end,effective_location_text,effective_contact_phone,effective_status,source_of_schedule,checklist_status,balance_cleared_status,has_individual_override,override_reason,updated_at",
      order: "effective_scheduled_at.asc.nullslast,updated_at.desc",
      limit: "250",
    }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", { select: "id,reservation_id,item_key,label,status,notes,completed_at,updated_at", order: "updated_at.desc", limit: "500" }),
    canViewSensitive ? readRows<PaymentBalanceRow>("core_payment_balance_view", { select: "reservation_id,balance_due_cents", limit: "250" }) : Promise.resolve({ rows: [] as PaymentBalanceRow[], warning: null }),
    canViewSensitive ? readRows<DocumentRow>("core_documents", { select: "reservation_id,buyer_id,family_id,puppy_id,document_type,title,status", order: "updated_at.desc", limit: "500" }) : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
  ]);

  const activeReservations = summaryResult.rows.filter(isActiveReservation);
  const goHomeByReservation = new Map(goHomeResult.rows.filter((row) => row.reservation_id).map((row) => [row.reservation_id as string, row]));
  const balanceByReservation = new Map(balanceResult.rows.map((row) => [row.reservation_id, row]));
  const checklistByReservation = new Map<string, ChecklistItemRow[]>();
  for (const item of checklistResult.rows) {
    if (!item.reservation_id) continue;
    checklistByReservation.set(item.reservation_id, [...(checklistByReservation.get(item.reservation_id) ?? []), item]);
  }

  const rows = activeReservations.map((summary) => {
    const base = {
      summary,
      goHome: goHomeByReservation.get(summary.reservation_id) ?? null,
      balance: balanceByReservation.get(summary.reservation_id) ?? null,
      checklistItems: checklistByReservation.get(summary.reservation_id) ?? [],
      documents: linkedDocuments(summary, documentResult.rows),
    };
    const blockers = buildBlockers(base);
    return { ...base, blockers, lane: laneFor({ ...base, blockers }) };
  });

  const lanes = [
    { key: "ready", label: "Ready", rows: rows.filter((row) => row.lane === "ready") },
    { key: "payment", label: "Needs Payment Review", rows: rows.filter((row) => row.lane === "payment") },
    { key: "documents", label: "Needs Documents", rows: rows.filter((row) => row.lane === "documents") },
    { key: "checklist", label: "Needs Checklist", rows: rows.filter((row) => row.lane === "checklist") },
    { key: "schedule", label: "Needs Schedule / Location", rows: rows.filter((row) => row.lane === "schedule") },
    { key: "attention", label: "Needs Owner Attention", rows: rows.filter((row) => row.lane === "attention") },
  ];

  const warnings = [summaryResult, goHomeResult, checklistResult, balanceResult, documentResult].map((result) => result.warning).filter(Boolean) as string[];
  const upcomingSevenDays = rows.filter((row) => isUpcomingWithinDays(goHomeDate(row), 7)).length;
  const overdue = rows.filter((row) => isPastDate(goHomeDate(row)) && row.lane !== "ready").length;
  const balanceDue = rows.filter((row) => (row.balance?.balance_due_cents ?? row.summary.balance_due_cents ?? 0) > 0).length;
  const missingSchedule = rows.filter((row) => row.lane === "schedule").length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Go-Home</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Go-Home Handoff Command</h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">Internal owner/operator planner for pickup, delivery, payment readiness, document readiness, checklist progress, and puppy handoff blockers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Go-Home Main</Link>
              <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservations</Link>
              <Link href="/staff/command" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Command Center</Link>
            </div>
          </div>
        </section>
        <SummaryStrip items={[
          { label: "Active handoffs", value: rows.length, note: "reservations reviewed" },
          { label: "Ready", value: lanes.find((lane) => lane.key === "ready")?.rows.length ?? 0, note: "clear blockers" },
          { label: "Payment", value: lanes.find((lane) => lane.key === "payment")?.rows.length ?? 0, note: "balance due" },
          { label: "Documents", value: lanes.find((lane) => lane.key === "documents")?.rows.length ?? 0, note: "metadata blockers" },
          { label: "Checklist", value: lanes.find((lane) => lane.key === "checklist")?.rows.length ?? 0, note: "incomplete tasks" },
        ]} />

        <ActionPanel
          nextAction={missingSchedule > 0 ? "Review missing schedule or handoff location" : "Review handoff blockers"}
          blockers={rows.filter((row) => row.blockers.length > 0).length}
          mode={canViewSensitive ? "available" : "review-only"}
          href="/staff/actions#go-home"
          detail="Handoff actions use existing go-home detail and checklist controls only; no payment, document, customer portal, or provider side effects are added."
        />

        <SectionNav items={[
          { href: "#overview", label: "Overview" },
          { href: "#lane-ready", label: "Ready" },
          { href: "#lane-payment", label: "Payments" },
          { href: "#lane-documents", label: "Documents" },
          { href: "#lane-checklist", label: "Checklist" },
          { href: "#lane-schedule", label: "Schedule" },
          { href: "#lane-attention", label: "Blockers" },
        ]} />


        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">This workspace is an internal owner/operator go-home handoff planner only. It does not send messages, process payments, generate documents, release registration papers, publish puppies, update the customer portal, or call external providers.</p>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read warnings</p>
            <ul className="mt-3 space-y-2 text-sm leading-6">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </section>
        ) : null}

        <section id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Active handoffs" value={rows.length} note="Active reservation rows reviewed" />
          <StatCard label="Ready" value={lanes.find((lane) => lane.key === "ready")?.rows.length ?? 0} note="No deterministic blocker found" />
          <StatCard label="Upcoming 7 days" value={upcomingSevenDays} note="Scheduled soon from current metadata" />
          <StatCard label="Overdue" value={overdue} note="Past scheduled date and not ready" />
          <StatCard label="Balance due" value={canViewSensitive ? balanceDue : "Restricted"} note={`${missingSchedule} missing schedule/location`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          {lanes.map((lane) => (
            <section key={lane.key} id={`lane-${lane.key}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">{lane.label}</h2>
                <Badge>{lane.rows.length}</Badge>
              </div>
              <div className="space-y-4">
                {lane.rows.length > 0 ? lane.rows.map((row) => <HandoffCard key={row.summary.reservation_id} row={row} />) : <EmptyState text={`No handoffs in ${lane.label.toLowerCase()}.`} />}
              </div>
            </section>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Pickup / Delivery Planning</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Uses the existing Core go-home detail update path. It records internal schedule/location metadata only.</p>
            {canViewSensitive && activeReservations.length > 0 ? (
              <form action={updateGoHomeDetail} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">Reservation<select name="reservationId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select reservation</option>{activeReservations.map((reservation) => <option key={reservation.reservation_id} value={reservation.reservation_id}>{display(reservation.puppy_name || reservation.puppy_collar_color, "Puppy")} / {display(reservation.buyer_name || reservation.buyer_email, "Buyer")} / {formatKey(reservation.reservation_status)}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Method<select name="method" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Not set</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="meetup">Meetup</option><option value="transport">Transport</option></select></label>
                  <label className="block text-sm font-medium text-slate-700">Go-home date/time<input type="datetime-local" name="plannedAt" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Location<input type="text" name="location" maxLength={500} placeholder="Meeting place, pickup address, or delivery notes" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-medium text-slate-700">Status<select name="status" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="ready">Ready</option><option value="completed">Completed</option><option value="delayed">Delayed</option><option value="cancelled">Cancelled</option></select></label>
                  <label className="block text-sm font-medium text-slate-700">Checklist<select name="checklistStatus" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Not set</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_review">Needs review</option><option value="complete">Complete</option></select></label>
                  <label className="block text-sm font-medium text-slate-700">Balance marker<select name="balanceClearedStatus" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Not set</option><option value="unknown">Unknown</option><option value="not_cleared">Not cleared</option><option value="pending_review">Pending review</option><option value="cleared">Cleared</option></select></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Contact notes<textarea name="contactNotes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                <label className="block text-sm font-medium text-slate-700">Puppy/reservation notes<textarea name="individualNotes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Handoff Detail</button>
              </form>
            ) : <EmptyState text="No active reservations are available for pickup/delivery planning, or this role cannot update go-home details." />}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Handoff Checklist</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Uses existing go-home checklist upsert behavior with expanded owner/operator handoff items.</p>
            {activeReservations.length > 0 ? (
              <form action={upsertGoHomeChecklistItem} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">Reservation<select name="reservationId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select reservation</option>{activeReservations.map((reservation) => <option key={reservation.reservation_id} value={reservation.reservation_id}>{display(reservation.puppy_name || reservation.puppy_collar_color, "Puppy")} / {display(reservation.buyer_name || reservation.buyer_email, "Buyer")}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Checklist item<select name="itemKey" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select item</option>{HANDOFF_CHECKLIST_ITEMS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                  <label className="block text-sm font-medium text-slate-700">Status<select name="status" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_review">Needs review</option><option value="complete">Complete</option><option value="not_applicable">Not applicable</option></select></label>
                </div>
                <label className="block text-sm font-medium text-slate-700">Custom label override<input type="text" name="customLabel" maxLength={120} placeholder="Optional custom label" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                <label className="block text-sm font-medium text-slate-700">Notes<textarea name="notes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Handoff Checklist Item</button>
              </form>
            ) : <EmptyState text="No active reservations are available for checklist updates." />}
          </section>
        </section>
      </div>
    </main>
  );
}


