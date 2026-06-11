import Link from "next/link";
import type { ReactNode } from "react";
import { updateGoHomeDetail } from "../../application-actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import { upsertGoHomeChecklistItem } from "./actions";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };

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
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_method: string | null;
  go_home_status: string | null;
  go_home_detail_id: string | null;
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
  sale_type: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type ApplicationRow = {
  id: string;
  external_reference: string | null;
  status: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  color: string | null;
  coat_type: string | null;
  status: string | null;
  health_status: string | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
  status: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  balance_due_cents: number | null;
  last_posted_payment_at: string | null;
};

type LedgerRow = {
  id: string;
  reservation_id: string | null;
  entry_type: string | null;
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

type GoHomeEffectiveRow = {
  go_home_detail_id: string;
  reservation_id: string | null;
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
  checklist_status: string | null;
  balance_cleared_status: string | null;
  completed_at: string | null;
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

type RequirementState = {
  label: string;
  status: "ready" | "missing" | "incomplete" | "not_required" | "unknown";
  note: string;
};

type ReadinessRow = {
  summary: ReservationSummaryRow;
  application: ApplicationRow | null;
  puppy: PuppyRow | null;
  litter: LitterRow | null;
  goHome: GoHomeEffectiveRow | null;
  balance: PaymentBalanceRow | null;
  ledgerRows: LedgerRow[];
  documents: DocumentRow[];
  checklistItems: ChecklistItemRow[];
  requirements: RequirementState[];
  blockers: string[];
  state: "ready" | "blocked" | "setup";
};

const DEFAULT_CHECKLIST_ITEMS = [
  { key: "food_sample", label: "Pack food sample" },
  { key: "care_sheet", label: "Prepare care sheet" },
  { key: "health_record", label: "Prepare health record" },
  { key: "document_packet", label: "Prepare document packet" },
  { key: "payment_review", label: "Review payment/balance status" },
  { key: "pickup_confirmed", label: "Confirm pickup or delivery details" },
  { key: "go_home_bag", label: "Prepare go-home bag" },
  { key: "photo_update", label: "Prepare final photo update" },
] as const;

const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);
const COMPLETE_CHECKLIST_STATUSES = new Set(["complete", "not_applicable"]);
const COMPLETE_DOCUMENT_STATUSES = new Set(["signed", "completed", "complete", "filed", "approved", "accepted", "ready"]);
const READY_GO_HOME_STATUSES = new Set(["confirmed", "ready", "completed"]);
const LOCATION_METHODS = new Set(["pickup", "delivery", "meetup", "transport"]);

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();
  if (!config) {
    return { rows: [], warning: "Core read configuration is not available for server-side operational reads." };
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
    return { rows: [], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function statusTone(status: string | null | undefined) {
  const value = normalizeText(status);
  if (["active", "approved", "reserved", "ready", "complete", "completed", "confirmed", "posted", "cleared", "accepted", "signed"].includes(value)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (["cancelled", "void", "released", "failed", "declined", "chargeback", "refund", "missing", "blocked"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }
  if (["pending", "needs review", "needs_review", "not cleared", "not_cleared", "in progress", "in_progress", "draft", "unknown"].includes(value)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{children}</span>;
}

function StatCard({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function ResultMessage({ type, outcome }: { type: "goHome" | "checklist"; outcome: string | undefined }) {
  if (!outcome) return null;
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {type === "goHome"
          ? "Go-home detail saved in Core. No customer message, document, payment, portal, listing, or external system was triggered."
          : "Go-home checklist item saved in Core. No customer message, document, payment, portal, listing, or external system was triggered."}
      </p>
    );
  }
  if (outcome === "unauthorized") return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Your staff role cannot complete that action.</p>;
  if (outcome === "invalid_datetime") return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Enter a valid go-home date/time or leave it blank.</p>;
  if (outcome === "invalid_input") return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Check the selected reservation, status, checklist item, and note lengths.</p>;
  if (outcome === "not_found" || outcome === "not_eligible") return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">The selected reservation cannot receive that update.</p>;
  return <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">The action failed. Review the server action log for details.</p>;
}

function isActiveReservation(summary: ReservationSummaryRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalizeText(summary.reservation_status));
}

function isCompleteChecklist(status: string | null) {
  return COMPLETE_CHECKLIST_STATUSES.has(normalizeText(status));
}

function isCompleteDocument(status: string | null) {
  return COMPLETE_DOCUMENT_STATUSES.has(normalizeText(status));
}

function goHomeDate(row: ReadinessRow) {
  return row.goHome?.effective_scheduled_at ?? row.goHome?.effective_window_start ?? row.summary.go_home_planned_at ?? null;
}

function goHomeLocation(row: ReadinessRow) {
  return row.goHome?.effective_location_text ?? row.summary.go_home_location_text ?? null;
}

function goHomeMethod(row: ReadinessRow) {
  return row.goHome?.effective_pickup_delivery_type ?? row.summary.go_home_method;
}

function goHomeStatus(row: ReadinessRow) {
  return row.goHome?.effective_status ?? row.summary.go_home_status ?? row.summary.go_home_detail_status;
}

function isUpcomingWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now() && date.getTime() <= Date.now() + days * 24 * 60 * 60 * 1000;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function metadataText(metadata: Record<string, unknown> | null) {
  return metadata ? normalizeText(JSON.stringify(metadata)) : "";
}

function hasKnownFinancing(reservation: ReservationRow | null) {
  const text = normalizeText(`${reservation?.sale_type ?? ""} ${reservation?.notes ?? ""} ${metadataText(reservation?.metadata ?? null)}`);
  if (!text) return null;
  if (includesAny(text, ["finance", "financing", "payment plan", "installment"])) return true;
  if (includesAny(text, ["cash", "paid in full", "standard"])) return false;
  return null;
}

function hasKnownTransport(summary: ReservationSummaryRow, goHome: GoHomeEffectiveRow | null) {
  const text = normalizeText(`${goHome?.effective_pickup_delivery_type ?? summary.go_home_method ?? ""} ${goHome?.effective_status ?? summary.go_home_status ?? ""}`);
  if (!text) return null;
  if (includesAny(text, ["transport", "delivery", "deliver", "meetup", "ship"])) return true;
  if (includesAny(text, ["pickup", "pick up"])) return false;
  return null;
}

function documentSearchText(document: DocumentRow) {
  return normalizeText(`${document.document_type ?? ""} ${document.title ?? ""}`);
}

function matchesRequirement(document: DocumentRow, label: string) {
  const text = documentSearchText(document);
  const normalizedLabel = normalizeText(label);
  if (normalizedLabel === "deposit agreement") return includesAny(text, ["deposit agreement", "deposit contract", "reservation agreement"]);
  if (normalizedLabel === "bill of sale") return includesAny(text, ["bill of sale", "sale agreement"]);
  if (normalizedLabel === "health guarantee") return includesAny(text, ["health guarantee", "health warranty"]);
  if (normalizedLabel === "financing addendum") return includesAny(text, ["financing addendum", "finance addendum", "payment plan", "financing agreement"]);
  if (normalizedLabel === "transport agreement") return includesAny(text, ["transport agreement", "delivery agreement", "transport addendum"]);
  if (normalizedLabel === "application copy") return includesAny(text, ["application copy", "application"]);
  return text.includes(normalizedLabel);
}

function buildRequirement(label: string, required: boolean | null, documents: DocumentRow[], unknownNote: string): RequirementState {
  if (required === null) return { label, status: "unknown", note: unknownNote };
  if (!required) return { label, status: "not_required", note: "Not required from available metadata." };
  const document = documents.find((candidate) => matchesRequirement(candidate, label)) ?? null;
  const complete = Boolean(document && isCompleteDocument(document.status));
  return {
    label,
    status: !document ? "missing" : complete ? "ready" : "incomplete",
    note: !document
      ? `${label} is missing from linked document metadata.`
      : complete
        ? `${label} appears ready from metadata status.`
        : `${label} exists but status is ${formatKey(document.status)}.`,
  };
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

function buildRequirements(summary: ReservationSummaryRow, reservation: ReservationRow | null, goHome: GoHomeEffectiveRow | null, documents: DocumentRow[]) {
  return [
    buildRequirement("Deposit Agreement", (summary.deposit_required_cents ?? 0) > 0, documents, ""),
    buildRequirement("Bill of Sale", true, documents, ""),
    buildRequirement("Health Guarantee", true, documents, ""),
    buildRequirement("Financing Addendum", hasKnownFinancing(reservation), documents, "Not enough linked data to evaluate this blocker: financing requirement cannot be confirmed."),
    buildRequirement("Transport Agreement", hasKnownTransport(summary, goHome), documents, "Not enough linked data to evaluate this blocker: transport requirement cannot be confirmed."),
    buildRequirement("Application Copy", Boolean(summary.application_id), documents, ""),
  ];
}

function buildBlockers(row: Omit<ReadinessRow, "blockers" | "state">, canEvaluateSensitive: boolean) {
  const blockers: string[] = [];
  const reservationStatus = normalizeText(row.summary.reservation_status);
  const puppyStatus = normalizeText(row.summary.puppy_status ?? row.puppy?.status);
  const applicationStatus = normalizeText(row.application?.status);
  const method = normalizeText(goHomeMethod({ ...row, blockers: [], state: "setup" }));
  const status = normalizeText(goHomeStatus({ ...row, blockers: [], state: "setup" }));
  const location = goHomeLocation({ ...row, blockers: [], state: "setup" });
  const scheduledAt = goHomeDate({ ...row, blockers: [], state: "setup" });

  if (!["reserved", "confirmed", "active", "pending"].includes(reservationStatus)) blockers.push("Reservation is not active or confirmed.");
  if (puppyStatus && !["reserved", "hold", "available"].includes(puppyStatus)) blockers.push(`Puppy status needs review: ${formatKey(row.summary.puppy_status ?? row.puppy?.status)}.`);
  if (applicationStatus && !["approved", "received", "needs review", "needs_review"].includes(applicationStatus)) blockers.push(`Linked application status needs review: ${formatKey(row.application?.status)}.`);
  if (!row.goHome && !row.summary.go_home_detail_id) blockers.push("Go-home date/details are missing.");
  if (!scheduledAt) blockers.push("Go-home date is missing.");
  if (method && LOCATION_METHODS.has(method) && !location) blockers.push("Pickup, delivery, meetup, or transport location is missing.");
  if (status && !READY_GO_HOME_STATUSES.has(status)) blockers.push("Go-home status is not confirmed, ready, or completed.");
  if (row.checklistItems.length === 0) blockers.push("Go-home checklist has not been started.");
  if (row.checklistItems.some((item) => !isCompleteChecklist(item.status))) blockers.push("Go-home checklist has incomplete items.");

  if (!canEvaluateSensitive) {
    blockers.push("Not enough linked data to evaluate this blocker: owner/admin financial and document readiness are restricted for this role.");
    return blockers;
  }

  if (row.balance?.balance_due_cents === null || row.balance?.balance_due_cents === undefined) blockers.push("Not enough linked data to evaluate this blocker: ledger-derived balance is unavailable.");
  if ((row.balance?.balance_due_cents ?? 0) > 0) blockers.push(`Ledger-derived balance due is ${formatCurrency(row.balance?.balance_due_cents)}.`);
  if (row.ledgerRows.some((entry) => normalizeText(entry.status) === "posted" && ["refund", "chargeback"].includes(normalizeText(entry.entry_type)))) blockers.push("Posted refund or chargeback ledger row requires owner review.");

  for (const requirement of row.requirements) {
    if (requirement.status === "missing") blockers.push(`Missing ${requirement.label.toLowerCase()}.`);
    if (requirement.status === "incomplete") blockers.push(`${requirement.label} status is incomplete.`);
    if (requirement.status === "unknown") blockers.push(requirement.note);
  }

  return blockers;
}

function withState(row: Omit<ReadinessRow, "state">): ReadinessRow {
  const synthetic = { ...row, state: "setup" as const };
  if (row.blockers.length === 0) return { ...row, state: "ready" };
  if (!goHomeDate(synthetic) || row.checklistItems.length === 0) return { ...row, state: "setup" };
  return { ...row, state: "blocked" };
}

function stateLabel(state: ReadinessRow["state"]) {
  if (state === "ready") return "Ready";
  if (state === "blocked") return "Blocked";
  return "Needs setup";
}

function stateTone(state: ReadinessRow["state"]) {
  if (state === "ready") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (state === "blocked") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

function rowPuppyName(row: ReadinessRow) {
  return display(row.puppy?.name || row.summary.puppy_name || row.summary.puppy_collar_color || row.puppy?.collar_color, "Unlinked puppy");
}

function checklistCompleteCount(items: ChecklistItemRow[]) {
  return items.filter((item) => isCompleteChecklist(item.status)).length;
}

export default async function StaffGoHomePage({ searchParams }: { searchParams: Promise<{ goHome?: string; checklist?: string }> }) {
  const staff = await requireStaffProfile();
  const { goHome, checklist } = await searchParams;
  const canViewSensitive = staff.role === "owner" || staff.role === "admin";

  const [
    summaryResult,
    reservationResult,
    applicationResult,
    puppyResult,
    litterResult,
    goHomeResult,
    checklistResult,
    balanceResult,
    ledgerResult,
    documentResult,
  ] = await Promise.all([
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select: "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,buyer_phone,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,balance_due_cents,go_home_planned_at,go_home_method,go_home_status,go_home_detail_id,go_home_source_of_schedule,go_home_window_start,go_home_window_end,go_home_location_text,go_home_detail_status,go_home_checklist_status,go_home_balance_cleared_status,created_at,updated_at",
      order: "reserved_at.desc.nullslast,created_at.desc",
      limit: "250",
    }),
    readRows<ReservationRow>("core_reservations", { select: "id,sale_type,notes,metadata", order: "updated_at.desc", limit: "250" }),
    readRows<ApplicationRow>("core_applications", { select: "id,external_reference,status", order: "updated_at.desc", limit: "250" }),
    readRows<PuppyRow>("core_puppies", { select: "id,litter_id,name,collar_color,color,coat_type,status,health_status", order: "updated_at.desc", limit: "250" }),
    readRows<LitterRow>("core_litters", { select: "id,litter_name,birth_at,expected_birth_at,status", order: "updated_at.desc", limit: "250" }),
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", {
      select: "go_home_detail_id,reservation_id,is_grouped,has_individual_override,override_reason,effective_pickup_delivery_type,effective_scheduled_at,effective_window_start,effective_window_end,effective_location_text,effective_contact_phone,effective_status,source_of_schedule,checklist_status,balance_cleared_status,completed_at,updated_at",
      order: "effective_scheduled_at.asc.nullslast,updated_at.desc",
      limit: "250",
    }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", { select: "id,reservation_id,item_key,label,status,notes,completed_at,updated_at", order: "updated_at.desc", limit: "500" }),
    canViewSensitive ? readRows<PaymentBalanceRow>("core_payment_balance_view", { select: "reservation_id,balance_due_cents,last_posted_payment_at", limit: "250" }) : Promise.resolve({ rows: [] as PaymentBalanceRow[], warning: null }),
    canViewSensitive ? readRows<LedgerRow>("core_financial_ledger", { select: "id,reservation_id,entry_type,status", order: "occurred_at.desc.nullslast,created_at.desc", limit: "500" }) : Promise.resolve({ rows: [] as LedgerRow[], warning: null }),
    canViewSensitive ? readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status", order: "updated_at.desc", limit: "500" }) : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
  ]);

  const activeReservations = summaryResult.rows.filter(isActiveReservation);
  const reservationById = new Map(reservationResult.rows.map((row) => [row.id, row]));
  const applicationById = new Map(applicationResult.rows.map((row) => [row.id, row]));
  const puppyById = new Map(puppyResult.rows.map((row) => [row.id, row]));
  const litterById = new Map(litterResult.rows.map((row) => [row.id, row]));
  const goHomeByReservation = new Map(goHomeResult.rows.filter((row) => row.reservation_id).map((row) => [row.reservation_id as string, row]));
  const balanceByReservation = new Map(balanceResult.rows.map((row) => [row.reservation_id, row]));
  const checklistByReservation = new Map<string, ChecklistItemRow[]>();
  const ledgerByReservation = new Map<string, LedgerRow[]>();

  for (const item of checklistResult.rows) {
    if (!item.reservation_id) continue;
    checklistByReservation.set(item.reservation_id, [...(checklistByReservation.get(item.reservation_id) ?? []), item]);
  }
  for (const entry of ledgerResult.rows) {
    if (!entry.reservation_id) continue;
    ledgerByReservation.set(entry.reservation_id, [...(ledgerByReservation.get(entry.reservation_id) ?? []), entry]);
  }

  const readinessRows = activeReservations.map((summary) => {
    const reservation = reservationById.get(summary.reservation_id) ?? null;
    const goHomeRow = goHomeByReservation.get(summary.reservation_id) ?? null;
    const puppy = summary.puppy_id ? puppyById.get(summary.puppy_id) ?? null : null;
    const documents = linkedDocuments(summary, documentResult.rows);
    const base = {
      summary,
      application: summary.application_id ? applicationById.get(summary.application_id) ?? null : null,
      puppy,
      litter: puppy?.litter_id ? litterById.get(puppy.litter_id) ?? null : null,
      goHome: goHomeRow,
      balance: balanceByReservation.get(summary.reservation_id) ?? null,
      ledgerRows: ledgerByReservation.get(summary.reservation_id) ?? [],
      documents,
      checklistItems: checklistByReservation.get(summary.reservation_id) ?? [],
      requirements: buildRequirements(summary, reservation, goHomeRow, documents),
    };
    const blockers = buildBlockers(base, canViewSensitive);
    return withState({ ...base, blockers });
  });

  const warnings = [summaryResult, reservationResult, applicationResult, puppyResult, litterResult, goHomeResult, checklistResult, balanceResult, ledgerResult, documentResult].map((result) => result.warning).filter(Boolean) as string[];
  const readyCount = readinessRows.filter((row) => row.state === "ready").length;
  const blockedCount = readinessRows.filter((row) => row.state === "blocked").length;
  const setupCount = readinessRows.filter((row) => row.state === "setup").length;
  const missingPaymentCount = readinessRows.filter((row) => (row.balance?.balance_due_cents ?? 0) > 0).length;
  const missingDocumentCount = readinessRows.filter((row) => row.requirements.some((requirement) => ["missing", "incomplete", "unknown"].includes(requirement.status))).length;
  const incompleteChecklistCount = readinessRows.filter((row) => row.checklistItems.length === 0 || row.checklistItems.some((item) => !isCompleteChecklist(item.status))).length;
  const missingDetailCount = readinessRows.filter((row) => !goHomeDate(row) || (LOCATION_METHODS.has(normalizeText(goHomeMethod(row))) && !goHomeLocation(row))).length;
  const upcomingSevenDayCount = readinessRows.filter((row) => isUpcomingWithinDays(goHomeDate(row), 7)).length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Go-Home"
          title="Go-Home Command & Completion Readiness"
          summary="Internal command view for reservation go-home readiness, ledger-derived payment status, document metadata, checklist completion, schedule details, and deterministic blockers."
          status={`${readyCount} ready / ${blockedCount} blocked`}
          blockers={`${missingPaymentCount + missingDocumentCount + incompleteChecklistCount + missingDetailCount} readiness issue(s)`}
          nextAction="Resolve schedule, payment, document, and checklist blockers before handoff."
          links={[
            { href: "/staff/go-home/handoff", label: "Handoff" },
            { href: "/staff/reservations", label: "Reservations" },
            { href: "/staff/payments", label: "Payments" },
            { href: "/staff/documents", label: "Documents" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Records", value: goHomeResult.rows.length, note: `${activeReservations.length} active checked` },
            { label: "Ready", value: readyCount, note: "no deterministic blocker" },
            { label: "Needs setup", value: setupCount, note: "missing date/details" },
            { label: "Payment", value: canViewSensitive ? missingPaymentCount : "Restricted", note: "balance due markers" },
            { label: "Documents", value: canViewSensitive ? missingDocumentCount : "Restricted", note: "missing/incomplete" },
            { label: "Checklist", value: incompleteChecklistCount, note: "incomplete items" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            { href: "#schedule", label: "Schedule" },
            { href: "#checklist", label: "Checklist" },
            { href: "#payments", label: "Payments" },
            { href: "#documents", label: "Documents" },
            { href: "#blockers", label: "Blockers", count: blockedCount },
            { href: "#related", label: "Related Records" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">This workspace shows internal Core go-home readiness only. It does not send messages, process payments, generate documents, update the customer portal, release registration papers, change public listings, or call external providers.</p>
        </section>

        <ResultMessage type="goHome" outcome={goHome} />
        <ResultMessage type="checklist" outcome={checklist} />

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read warnings</p>
            <ul className="mt-3 space-y-2 text-sm leading-6">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </section>
        ) : null}

        <section id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Go-home records" value={goHomeResult.rows.length} note={`${activeReservations.length} active reservation(s) checked`} />
          <StatCard label="Ready" value={readyCount} note="No deterministic blocker from current metadata" />
          <StatCard label="Blocked" value={blockedCount} note="Has blocker after schedule/checklist exists" />
          <StatCard label="Needs setup" value={setupCount} note="Missing date/details or checklist start" />
          <StatCard label="Missing payment" value={canViewSensitive ? missingPaymentCount : "Restricted"} note="Ledger-derived balance due count" />
          <StatCard label="Missing document" value={canViewSensitive ? missingDocumentCount : "Restricted"} note="Required metadata missing, incomplete, or unknown" />
          <StatCard label="Checklist incomplete" value={incompleteChecklistCount} note="No checklist or incomplete item exists" />
          <StatCard label="Upcoming 7 days" value={upcomingSevenDayCount} note={`${missingDetailCount} missing date/location detail`} />
        </section>

        <section id="schedule" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Completion Readiness List</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">One row per active reservation, using existing Core read models and linked metadata only.</p>
            </div>
            {readinessRows.length > 0 ? (
              <div className="space-y-5">
                {readinessRows.map((row) => (
                  <article key={row.summary.reservation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{rowPuppyName(row)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{display(row.summary.buyer_name || row.summary.buyer_email, "Unlinked buyer")} / {display(row.summary.family_name, "Unlinked family")}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone={stateTone(row.state)}>{stateLabel(row.state)}</Badge>
                          <Badge tone={statusTone(row.summary.reservation_status)}>{formatKey(row.summary.reservation_status)}</Badge>
                          <Badge>{row.blockers.length} blocker(s)</Badge>
                          <Badge>{row.documents.length} document(s)</Badge>
                          <Badge>{checklistCompleteCount(row.checklistItems)} of {row.checklistItems.length} checklist</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/staff/reservations/${row.summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservation readiness</Link>
                        {row.summary.application_id ? <Link href={`/staff/applications/${row.summary.application_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Application</Link> : null}
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <InfoItem label="Go-home date" value={formatDateTime(goHomeDate(row))} />
                      <InfoItem label="Window end" value={formatDateTime(row.goHome?.effective_window_end ?? row.summary.go_home_window_end)} />
                      <InfoItem label="Method" value={formatKey(goHomeMethod(row))} />
                      <InfoItem label="Location" value={display(goHomeLocation(row))} />
                      <InfoItem label="Go-home status" value={formatKey(goHomeStatus(row))} />
                      <InfoItem label="Schedule source" value={formatKey(row.goHome?.source_of_schedule ?? row.summary.go_home_source_of_schedule)} />
                      <span id="payments" className="sr-only">Payments</span><InfoItem label="Payment readiness" value={canViewSensitive ? formatCurrency(row.balance?.balance_due_cents ?? row.summary.balance_due_cents) : "Restricted"} />
                      <InfoItem label="Document readiness" value={canViewSensitive ? `${row.requirements.filter((requirement) => requirement.status === "ready" || requirement.status === "not_required").length} of ${row.requirements.length} clear` : "Restricted"} />
                      <InfoItem label="Puppy / litter" value={`${display(row.puppy?.color || row.puppy?.coat_type || row.summary.puppy_collar_color)} / ${display(row.litter?.litter_name, shortId(row.puppy?.litter_id))}`} />
                      <InfoItem label="Application" value={`${row.application?.external_reference || shortId(row.summary.application_id)} / ${formatKey(row.application?.status)}`} />
                      <InfoItem label="Balance marker" value={formatKey(row.goHome?.balance_cleared_status ?? row.summary.go_home_balance_cleared_status)} />
                      <InfoItem label="Contact phone" value={display(row.goHome?.effective_contact_phone ?? row.summary.buyer_phone)} />
                    </dl>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p id="blockers" className="text-sm font-bold text-slate-950">Blockers</p>
                        {row.blockers.length > 0 ? <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950">{row.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-emerald-700">No deterministic Core blockers were found.</p>}
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p id="documents" className="text-sm font-bold text-slate-950">Required documents</p>
                        <div className="mt-3 space-y-2">
                          {canViewSensitive ? row.requirements.map((requirement) => (
                            <div key={requirement.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                              <span className="font-semibold text-slate-800">{requirement.label}</span>
                              <Badge tone={statusTone(requirement.status)}>{formatKey(requirement.status)}</Badge>
                            </div>
                          )) : <p className="text-sm leading-6 text-slate-600">Owner/admin role required for document readiness metadata.</p>}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-sm font-bold text-slate-950">Related links</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Payments</Link>
                          <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Documents</Link>
                          <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Buyers</Link>
                          <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Families</Link>
                          {row.summary.puppy_id ? <Link href={`/staff/puppies/${row.summary.puppy_id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Puppy</Link> : null}
                          {row.puppy?.litter_id ? <Link href={`/staff/litters/${row.puppy.litter_id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Litter</Link> : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{row.goHome?.has_individual_override ? `Individual override: ${display(row.goHome.override_reason)}` : row.goHome?.is_grouped ? "Uses grouped go-home schedule." : "Uses reservation-level go-home detail when present."}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No active reservation rows are available for go-home completion readiness." />}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Set Go-Home Detail</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Owner/admin Core update for the current ungrouped go-home detail.</p>
              </div>
              {canViewSensitive ? (
                activeReservations.length > 0 ? (
                  <form action={updateGoHomeDetail} className="space-y-4">
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
                    <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Go-Home Detail</button>
                  </form>
                ) : <EmptyState text="No active reservations are available for go-home scheduling." />
              ) : <EmptyState text="Go-home schedule updates are owner/admin only. Staff can help with checklist items after records exist." />}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 id="checklist" className="text-lg font-semibold text-slate-950">Go-Home Checklist</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Internal handoff tasks for one active reservation.</p>
              </div>
              {activeReservations.length > 0 ? (
                <form action={upsertGoHomeChecklistItem} className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">Reservation<select name="reservationId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select reservation</option>{activeReservations.map((reservation) => <option key={reservation.reservation_id} value={reservation.reservation_id}>{display(reservation.puppy_name || reservation.puppy_collar_color, "Puppy")} / {display(reservation.buyer_name || reservation.buyer_email, "Buyer")} / {formatKey(reservation.reservation_status)}</option>)}</select></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">Checklist item<select name="itemKey" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select item</option>{DEFAULT_CHECKLIST_ITEMS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                    <label className="block text-sm font-medium text-slate-700">Status<select name="status" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_review">Needs review</option><option value="complete">Complete</option><option value="not_applicable">Not applicable</option></select></label>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">Custom label override<input type="text" name="customLabel" maxLength={120} placeholder="Optional custom label" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                  <label className="block text-sm font-medium text-slate-700">Notes<textarea name="notes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Checklist Item</button>
                </form>
              ) : <EmptyState text="No active reservations are available for checklist updates." />}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 id="related" className="text-lg font-semibold text-slate-950">Readiness Boundary</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">`core_go_home_effective_view` remains the schedule read source.</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">Financial truth remains ledger-derived from `core_payment_balance_view`.</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">Document readiness reads metadata only and creates no files or customer visibility.</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">Checklist items are operational markers and do not authorize external actions.</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}



