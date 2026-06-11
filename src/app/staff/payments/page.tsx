import Link from "next/link";
import type { ReactNode } from "react";
import { recordReservationPayment } from "../../application-actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";

export const dynamic = "force-dynamic";

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
  go_home_detail_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  reservation_id: string | null;
  buyer_id: string | null;
  external_reference: string | null;
  entry_type: string | null;
  balance_effect: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  occurred_at: string | null;
  payment_method: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
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
  updated_at: string | null;
};

type GoHomeEffectiveRow = {
  go_home_detail_id: string;
  reservation_id: string | null;
  effective_scheduled_at: string | null;
  effective_window_start: string | null;
  effective_window_end: string | null;
  effective_pickup_delivery_type: string | null;
  effective_status: string | null;
  detail_status: string | null;
  checklist_status: string | null;
  balance_cleared_status: string | null;
  source_of_schedule: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  source: string | null;
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
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

type AccountReadiness = {
  summary: ReservationSummaryRow;
  balance: PaymentBalanceRow | null;
  ledgerRows: LedgerRow[];
  documents: DocumentRow[];
  goHome: GoHomeEffectiveRow | null;
  postedPaymentsDepositsCents: number;
  postedCreditsCents: number;
  postedFeesRefundsChargebacksCents: number;
  balanceDueCents: number | null;
  lastTransactionAt: string | null;
  blockers: string[];
  group: string;
};

const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);
const PAYMENT_TYPES = new Set(["deposit", "payment"]);
const CREDIT_TYPES = new Set(["credit"]);
const REVIEW_TYPES = new Set(["refund", "chargeback"]);
const FEE_TYPES = new Set(["fee", "admin_fee", "transport_fee", "finance_charge"]);
const COMPLETE_DOCUMENT_STATUSES = new Set([
  "signed",
  "completed",
  "complete",
  "filed",
  "approved",
  "accepted",
  "ready",
]);

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
        "Core read configuration is not available for server-side operational reads.",
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

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function cents(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available from current schema";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
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

function statusTone(status: string | null | undefined) {
  const value = normalizeText(status);
  if (
    ["active", "approved", "reserved", "ready", "complete", "completed", "confirmed", "posted", "cleared"].includes(value)
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (["cancelled", "void", "released", "failed", "declined", "chargeback", "refund"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }
  if (["pending", "needs review", "not cleared", "in progress", "draft"].includes(value)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
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

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
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

function PaymentResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Deposit/payment recorded in Core. Balance due has been refreshed from the ledger.
      </p>
    );
  }

  if (outcome === "invalid_money") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Enter an amount received in dollars using numbers with up to two decimal places, such as 500.00.
      </p>
    );
  }

  if (outcome === "invalid_input") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Payment entry must be a deposit or payment with valid optional details.
      </p>
    );
  }

  if (outcome === "not_found" || outcome === "not_eligible") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        The selected reservation cannot accept a recorded deposit/payment.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot record deposits or payments.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Deposit/payment recording failed. Review the server action log for details.
      </p>
    );
  }

  return null;
}

function isActiveReservation(summary: ReservationSummaryRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalizeText(summary.reservation_status));
}

function isPosted(entry: LedgerRow) {
  return normalizeText(entry.status) === "posted";
}

function ledgerAmountForTypes(ledgerRows: LedgerRow[], types: Set<string>) {
  return ledgerRows
    .filter((entry) => isPosted(entry) && types.has(normalizeText(entry.entry_type)))
    .reduce((total, entry) => total + cents(entry.amount_cents), 0);
}

function ledgerIncreases(ledgerRows: LedgerRow[]) {
  return ledgerRows
    .filter((entry) => isPosted(entry) && normalizeText(entry.balance_effect) === "increase")
    .reduce((total, entry) => total + cents(entry.amount_cents), 0);
}

function ledgerDecreases(ledgerRows: LedgerRow[]) {
  return ledgerRows
    .filter((entry) => isPosted(entry) && normalizeText(entry.balance_effect) === "decrease")
    .reduce((total, entry) => total + cents(entry.amount_cents), 0);
}

function latestLedgerDate(ledgerRows: LedgerRow[]) {
  return (
    ledgerRows
      .map((entry) => entry.occurred_at ?? entry.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
  );
}

function isCompleteDocument(document: DocumentRow) {
  return COMPLETE_DOCUMENT_STATUSES.has(normalizeText(document.status));
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

function goHomeDate(goHome: GoHomeEffectiveRow | null, summary: ReservationSummaryRow) {
  return (
    goHome?.effective_scheduled_at ??
    goHome?.effective_window_start ??
    summary.go_home_planned_at ??
    null
  );
}

function isUpcoming(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return date.getTime() >= now && date.getTime() <= now + fourteenDays;
}

function accountName(summary: ReservationSummaryRow) {
  const buyer = display(summary.buyer_name || summary.buyer_email, "Unlinked buyer");
  const family = display(summary.family_name, "Unlinked family");
  return `${buyer} / ${family}`;
}

function puppyLabel(summary: ReservationSummaryRow) {
  return display(summary.puppy_name || summary.puppy_collar_color, "Unlinked puppy");
}

function buildAccountBlockers({
  summary,
  balance,
  ledgerRows,
  documents,
  goHome,
  balanceDueCents,
}: {
  summary: ReservationSummaryRow;
  balance: PaymentBalanceRow | null;
  ledgerRows: LedgerRow[];
  documents: DocumentRow[];
  goHome: GoHomeEffectiveRow | null;
  balanceDueCents: number | null;
}) {
  const blockers: string[] = [];
  const postedPaymentDepositCents = ledgerAmountForTypes(ledgerRows, PAYMENT_TYPES);
  const hasChargeback = ledgerRows.some(
    (entry) => isPosted(entry) && normalizeText(entry.entry_type) === "chargeback",
  );
  const hasRefund = ledgerRows.some(
    (entry) => isPosted(entry) && normalizeText(entry.entry_type) === "refund",
  );
  const hasFee = ledgerRows.some(
    (entry) => isPosted(entry) && FEE_TYPES.has(normalizeText(entry.entry_type)),
  );
  const scheduledGoHome = goHomeDate(goHome, summary);

  if (balanceDueCents === null) {
    blockers.push("Not enough financial metadata to evaluate ledger-derived balance.");
  } else if (balanceDueCents > 0) {
    blockers.push(`Ledger-derived balance due is ${formatCurrency(balanceDueCents)}.`);
  }

  if (hasChargeback) {
    blockers.push("Posted chargeback ledger row requires owner review.");
  }

  if (hasRefund) {
    blockers.push("Posted refund ledger row is internal ledger history and requires review before handoff.");
  }

  if (hasFee && (balanceDueCents ?? 0) > 0) {
    blockers.push("Fee or finance-charge row exists while balance remains due.");
  }

  if (
    isActiveReservation(summary) &&
    cents(balance?.deposit_required_cents ?? summary.deposit_required_cents) > 0 &&
    postedPaymentDepositCents === 0
  ) {
    blockers.push("Active reservation has no posted deposit/payment row.");
  }

  if (isUpcoming(scheduledGoHome) && (balanceDueCents ?? 0) > 0) {
    blockers.push("Go-home is upcoming within 14 days and balance remains due.");
  }

  if (documents.length === 0) {
    blockers.push("Not enough financial metadata to evaluate document/payment relationship.");
  } else if (documents.some(isCompleteDocument) && (balanceDueCents ?? 0) > 0) {
    blockers.push("Document metadata includes a complete/ready document while balance remains due.");
  }

  return blockers;
}

function accountGroup(account: AccountReadiness) {
  const hasReviewEntry = account.ledgerRows.some((entry) =>
    REVIEW_TYPES.has(normalizeText(entry.entry_type)),
  );

  if (!account.summary.reservation_id || !account.summary.buyer_id || !account.summary.puppy_id) {
    return "unlinked";
  }

  if (hasReviewEntry) {
    return "review";
  }

  if (account.blockers.length > 0) {
    return "attention";
  }

  if (account.ledgerRows.length === 0) {
    return "no_ledger";
  }

  if ((account.balanceDueCents ?? 0) > 0) {
    return "balance_due";
  }

  return "paid_full";
}

function groupLabel(group: string) {
  if (group === "paid_full") return "Paid in full";
  if (group === "balance_due") return "Balance due";
  if (group === "attention") return "Attention needed";
  if (group === "review") return "Disputed / refund review";
  if (group === "no_ledger") return "No ledger activity";
  return "Unlinked / unknown";
}

function ledgerContext(
  entry: LedgerRow,
  summariesByReservationId: Map<string, ReservationSummaryRow>,
) {
  const summary = entry.reservation_id
    ? summariesByReservationId.get(entry.reservation_id)
    : null;

  if (summary) {
    return `${display(summary.buyer_name || summary.buyer_email, "Unlinked buyer")} / ${puppyLabel(summary)}`;
  }

  return entry.buyer_id ? `Buyer ${shortId(entry.buyer_id)}` : "No reservation or buyer link";
}

function ledgerSource(entry: LedgerRow) {
  const method = display(entry.payment_method, "");
  const reference = display(entry.external_reference, "");
  const parts = [method, reference].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "No source/reference recorded";
}

function safeMetadataKeys(metadata: Record<string, unknown> | null) {
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
        !lowered.includes("signature") &&
        !lowered.includes("hash") &&
        !lowered.includes("payload")
      );
    })
    .slice(0, 6);

  return keys.length > 0
    ? `Metadata keys: ${keys.join(", ")}`
    : "Metadata present, hidden from readiness view";
}

export default async function StaffPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const { payment } = await searchParams;
  const canViewFinancials = staff.role === "owner" || staff.role === "admin";

  const [
    reservationResult,
    balanceResult,
    ledgerResult,
    documentResult,
    goHomeResult,
    eventResult,
    auditResult,
  ] = await Promise.all([
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select:
        "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,currency,go_home_planned_at,go_home_method,go_home_status,go_home_detail_status,go_home_checklist_status,go_home_balance_cleared_status,created_at,updated_at",
      order: "reserved_at.desc.nullslast,created_at.desc",
      limit: "250",
    }),
    canViewFinancials
      ? readRows<PaymentBalanceRow>("core_payment_balance_view", {
          select:
            "reservation_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,last_posted_payment_at",
          order: "last_posted_payment_at.desc.nullslast",
          limit: "250",
        })
      : Promise.resolve({ rows: [] as PaymentBalanceRow[], warning: null }),
    canViewFinancials
      ? readRows<LedgerRow>("core_financial_ledger", {
          select:
            "id,reservation_id,buyer_id,external_reference,entry_type,balance_effect,status,amount_cents,currency,occurred_at,payment_method,description,metadata,created_at",
          order: "occurred_at.desc,created_at.desc",
          limit: "500",
        })
      : Promise.resolve({ rows: [] as LedgerRow[], warning: null }),
    canViewFinancials
      ? readRows<DocumentRow>("core_documents", {
          select:
            "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at",
          order: "updated_at.desc",
          limit: "250",
        })
      : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", {
      select:
        "go_home_detail_id,reservation_id,effective_scheduled_at,effective_window_start,effective_window_end,effective_pickup_delivery_type,effective_status,detail_status,checklist_status,balance_cleared_status,source_of_schedule,updated_at",
      order: "effective_scheduled_at.asc.nullslast,updated_at.desc",
      limit: "250",
    }),
    canViewFinancials
      ? readRows<EventRow>("core_events", {
          select:
            "id,event_type,event_at,summary,source,reservation_id,buyer_id,family_id,puppy_id,related_table,related_id",
          event_type: "in.(reservation_payment_recorded,financial_adjustment_recorded,reservation_cancelled)",
          order: "event_at.desc",
          limit: "25",
        })
      : Promise.resolve({ rows: [] as EventRow[], warning: null }),
    canViewFinancials
      ? readRows<AuditRow>("core_audit_log", {
          select:
            "id,action,entity_table,entity_id,source,actor_identifier,outcome,created_at",
          source: "in.(core_record_reservation_payment,core_record_financial_adjustment,core_cancel_reservation)",
          order: "created_at.desc",
          limit: "25",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const warnings = [
    reservationResult.warning,
    balanceResult.warning,
    ledgerResult.warning,
    documentResult.warning,
    goHomeResult.warning,
    eventResult.warning,
    auditResult.warning,
  ].filter(Boolean);

  const balancesByReservationId = new Map(
    balanceResult.rows.map((balance) => [balance.reservation_id, balance]),
  );
  const summariesByReservationId = new Map(
    reservationResult.rows.map((summary) => [summary.reservation_id, summary]),
  );
  const goHomesByReservationId = new Map<string, GoHomeEffectiveRow>();
  const ledgerByReservationId = new Map<string, LedgerRow[]>();
  const activeReservations = reservationResult.rows.filter(isActiveReservation);

  for (const goHome of goHomeResult.rows) {
    if (!goHome.reservation_id || goHomesByReservationId.has(goHome.reservation_id)) {
      continue;
    }
    goHomesByReservationId.set(goHome.reservation_id, goHome);
  }

  for (const entry of ledgerResult.rows) {
    if (!entry.reservation_id) continue;
    ledgerByReservationId.set(entry.reservation_id, [
      ...(ledgerByReservationId.get(entry.reservation_id) ?? []),
      entry,
    ]);
  }

  const accounts: AccountReadiness[] = reservationResult.rows.map((summary) => {
    const balance = balancesByReservationId.get(summary.reservation_id) ?? null;
    const ledgerRows = ledgerByReservationId.get(summary.reservation_id) ?? [];
    const documents = linkedDocuments(summary, documentResult.rows);
    const goHome = goHomesByReservationId.get(summary.reservation_id) ?? null;
    const balanceDueCents =
      balance?.balance_due_cents ?? summary.balance_due_cents ?? null;
    const blockers = buildAccountBlockers({
      summary,
      balance,
      ledgerRows,
      documents,
      goHome,
      balanceDueCents,
    });
    const account = {
      summary,
      balance,
      ledgerRows,
      documents,
      goHome,
      postedPaymentsDepositsCents: ledgerAmountForTypes(ledgerRows, PAYMENT_TYPES),
      postedCreditsCents: ledgerAmountForTypes(ledgerRows, CREDIT_TYPES),
      postedFeesRefundsChargebacksCents: ledgerIncreases(ledgerRows),
      balanceDueCents,
      lastTransactionAt:
        balance?.last_posted_payment_at ?? latestLedgerDate(ledgerRows),
      blockers,
      group: "unlinked",
    };

    return { ...account, group: accountGroup(account) };
  });

  const totalContractValue = accounts.reduce(
    (total, account) =>
      total +
      cents(
        account.balance?.contract_total_cents ??
          account.summary.contract_total_cents,
      ),
    0,
  );
  const totalPaymentsDeposits = accounts.reduce(
    (total, account) => total + account.postedPaymentsDepositsCents,
    0,
  );
  const totalCredits = accounts.reduce(
    (total, account) => total + account.postedCreditsCents,
    0,
  );
  const totalFeesRefundsChargebacks = accounts.reduce(
    (total, account) => total + account.postedFeesRefundsChargebacksCents,
    0,
  );
  const totalOpenBalance = accounts.reduce(
    (total, account) => total + Math.max(account.balanceDueCents ?? 0, 0),
    0,
  );
  const accountsWithBalance = accounts.filter(
    (account) => (account.balanceDueCents ?? 0) > 0,
  ).length;
  const paidInFullCount = accounts.filter(
    (account) =>
      account.balanceDueCents !== null &&
      account.balanceDueCents <= 0 &&
      account.ledgerRows.length > 0,
  ).length;
  const attentionAccounts = accounts.filter(
    (account) => account.blockers.length > 0,
  ).length;
  const groupedAccounts = new Map<string, AccountReadiness[]>();

  for (const group of ["paid_full", "balance_due", "attention", "review", "no_ledger", "unlinked"]) {
    groupedAccounts.set(
      group,
      accounts.filter((account) => account.group === group),
    );
  }

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Payments"
          title="Payment Ledger & Account Readiness"
          summary="Internal financial truth workspace for reservation accounts, ledger-derived balances, payment entry, adjustments, go-home payment readiness, and financial history."
          status={canViewFinancials ? "Owner/admin financial view" : "Restricted financial view"}
          blockers={canViewFinancials ? `${attentionAccounts} account(s) need attention` : "Financial blockers restricted"}
          nextAction={canViewFinancials ? "Review balance due and record only verified Core ledger payments" : "Use owner/admin access for ledger review"}
          links={[
            { href: "/staff/payment-plans", label: "Payment Plans" },
            { href: "/staff/reservations", label: "Reservations" },
            { href: "/staff/documents", label: "Documents" },
            { href: "/staff/go-home", label: "Go-Home" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Open balance", value: canViewFinancials ? formatCurrency(totalOpenBalance) : "Restricted", note: "ledger-derived" },
            { label: "Paid in full", value: canViewFinancials ? paidInFullCount : "Restricted", note: "zero/negative balance" },
            { label: "Attention", value: canViewFinancials ? attentionAccounts : "Restricted", note: "blocker count" },
            { label: "Payments/deposits", value: canViewFinancials ? formatCurrency(totalPaymentsDeposits) : "Restricted", note: "posted decrease rows" },
            { label: "Adjustments", value: canViewFinancials ? formatCurrency(totalFeesRefundsChargebacks + totalCredits) : "Restricted", note: "credits, fees, refunds, chargebacks" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            { href: "#record-payment", label: "Record Payment" },
            { href: "#accounts", label: "Accounts", count: accounts.length },
            { href: "#ledger", label: "Ledger", count: ledgerResult.rows.length },
            { href: "#attention", label: "Attention", count: attentionAccounts },
            { href: "#audit", label: "Audit" },
            { href: "#adjustments", label: "Adjustments" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This workspace shows internal Core financial ledger readiness only. It does not charge cards, process refunds, create payment links, send reminders, move money, or call payment providers.
          </p>
        </section>

        <PaymentResult outcome={payment} />

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {warnings.join(" ")}
          </section>
        ) : null}

        {!canViewFinancials ? (
          <RestrictedPanel text="Payment ledger detail, account readiness, documents, financial events, and audit rows are restricted to owner/admin. Sensitive rows were not fetched for this profile." />
        ) : null}

        <section id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Contract Value" value={canViewFinancials ? formatCurrency(totalContractValue) : "Restricted"} note="Reservation contract totals from `core_payment_balance_view` or summary rows" />
          <StatCard label="Payments / Deposits" value={canViewFinancials ? formatCurrency(totalPaymentsDeposits) : "Restricted"} note="Posted deposit/payment ledger rows with decrease effect" />
          <StatCard label="Credits" value={canViewFinancials ? formatCurrency(totalCredits) : "Restricted"} note="Posted credit rows that reduce balance" />
          <StatCard label="Fees / Refunds / Chargebacks" value={canViewFinancials ? formatCurrency(totalFeesRefundsChargebacks) : "Restricted"} note="Posted increase-effect ledger rows" />
          <StatCard label="Open Balance Due" value={canViewFinancials ? formatCurrency(totalOpenBalance) : "Restricted"} note="Positive ledger-derived balances only" />
          <StatCard label="Accounts With Balance" value={canViewFinancials ? accountsWithBalance : "Restricted"} note="Reservation accounts where balance due is greater than zero" />
          <StatCard label="Paid In Full" value={canViewFinancials ? paidInFullCount : "Restricted"} note="Derivable only when balance is zero/negative and ledger exists" />
          <StatCard label="Attention Accounts" value={canViewFinancials ? attentionAccounts : "Restricted"} note="Deterministic blocker count from current metadata" />
        </section>

        <section id="record-payment" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Record Core Ledger Payment</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Existing internal action for posted deposit/payment rows only. It calls the controlled Core RPC and does not contact any payment provider.
              </p>
            </div>

            {activeReservations.length > 0 ? (
              <form action={recordReservationPayment} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Reservation
                  <select
                    name="reservationId"
                    required
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  >
                    <option value="">Select reservation</option>
                    {activeReservations.map((reservation) => (
                      <option key={reservation.reservation_id} value={reservation.reservation_id}>
                        {puppyLabel(reservation)} / {display(reservation.buyer_name || reservation.buyer_email, "Unlinked buyer")} / Balance {formatCurrency(reservation.balance_due_cents)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Entry type
                    <select
                      name="entryType"
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="deposit">Deposit</option>
                      <option value="payment">Payment</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Amount received
                    <input
                      type="text"
                      inputMode="decimal"
                      name="amountDollars"
                      placeholder="500.00"
                      required
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Method
                    <input
                      type="text"
                      name="paymentMethod"
                      maxLength={100}
                      placeholder="Cash, check, external receipt, etc."
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    External reference
                    <input
                      type="text"
                      name="externalReference"
                      maxLength={100}
                      placeholder="Optional receipt/reference"
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    name="notes"
                    maxLength={1000}
                    rows={3}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  />
                </label>

                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Record Core Ledger Payment
                </button>
              </form>
            ) : (
              <EmptyState text="No active reservations are available for Core deposit/payment ledger entry." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Readiness Grouping</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Accounts grouped from actual reservation, balance, ledger, document, and go-home metadata.
              </p>
            </div>
            {canViewFinancials ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {["paid_full", "balance_due", "attention", "review", "no_ledger", "unlinked"].map((group) => (
                  <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{groupLabel(group)}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {groupedAccounts.get(group)?.length ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">reservation account(s)</p>
                  </div>
                ))}
              </div>
            ) : (
              <RestrictedPanel text="Readiness grouping needs owner/admin financial rows and was not calculated for this role." />
            )}
          </section>
        </section>

        <section id="accounts" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Payment Accounts</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                One account per reservation summary row. Balance truth comes from `core_payment_balance_view`; displayed ledger subtotals use posted rows and `balance_effect`.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Go-Home
              </Link>
            </div>
          </div>

          {canViewFinancials ? (
            accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <article key={account.summary.reservation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{puppyLabel(account.summary)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {accountName(account.summary)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone={statusTone(account.summary.reservation_status)}>{formatKey(account.summary.reservation_status)}</Badge>
                          <Badge>{groupLabel(account.group)}</Badge>
                          <Badge>{account.documents.length} document(s)</Badge>
                          <Badge>{account.ledgerRows.length} ledger row(s)</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/staff/reservations/${account.summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                          Reservation readiness
                        </Link>
                        {account.summary.application_id ? (
                          <Link href={`/staff/applications/${account.summary.application_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                            Application
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <InfoItem label="Contract Total" value={formatCurrency(account.balance?.contract_total_cents ?? account.summary.contract_total_cents)} />
                      <InfoItem label="Deposit Required" value={formatCurrency(account.balance?.deposit_required_cents ?? account.summary.deposit_required_cents)} />
                      <InfoItem label="Payments / Deposits" value={formatCurrency(account.postedPaymentsDepositsCents)} />
                      <InfoItem label="Credits" value={formatCurrency(account.postedCreditsCents)} />
                      <InfoItem label="Fees / Refunds / Chargebacks" value={formatCurrency(account.postedFeesRefundsChargebacksCents)} />
                      <InfoItem label="Ledger-Derived Balance" value={formatCurrency(account.balanceDueCents)} />
                      <InfoItem label="Last Transaction" value={formatDateTime(account.lastTransactionAt)} />
                      <InfoItem label="Go-Home Payment Readiness" value={`${formatKey(account.summary.go_home_balance_cleared_status)} / ${formatDateTime(goHomeDate(account.goHome, account.summary))}`} />
                    </dl>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-sm font-bold text-slate-950">Account blockers</p>
                        {account.blockers.length > 0 ? (
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950">
                            {account.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-emerald-700">
                            No deterministic financial blockers were found from current metadata.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-sm font-bold text-slate-950">Related links</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Buyers</Link>
                          <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Families</Link>
                          <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Documents</Link>
                          <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Go-Home</Link>
                          {account.summary.puppy_id ? (
                            <Link href={`/staff/puppies/${account.summary.puppy_id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Puppy</Link>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          Document/payment relationship: {account.documents.some(isCompleteDocument) ? "complete/ready document metadata exists" : account.documents.length > 0 ? "document metadata exists but complete status is not confirmed" : "not enough financial metadata to evaluate"}.
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No reservation account rows exist yet. No live payment processor is connected and no payment movement occurs in Core yet." />
            )
          ) : (
            <RestrictedPanel text="Payment accounts require sensitive financial reads. No ledger, balance, document, event, or audit rows were fetched for this profile." />
          )}
        </section>

        <section id="ledger" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Recent Ledger Transactions</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Recent `core_financial_ledger` rows. Provider payloads, secrets, raw external data, and fake provider IDs are not displayed.
              </p>
            </div>

            {canViewFinancials ? (
              ledgerResult.rows.length > 0 ? (
                <div className="space-y-3">
                  {ledgerResult.rows.slice(0, 25).map((entry) => (
                    <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">
                            {formatKey(entry.entry_type)} / {formatCurrency(entry.amount_cents)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {ledgerContext(entry, summariesByReservationId)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{formatKey(entry.balance_effect)}</Badge>
                          <Badge tone={statusTone(entry.status)}>{formatKey(entry.status)}</Badge>
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <InfoItem label="Occurred" value={formatDateTime(entry.occurred_at ?? entry.created_at)} />
                        <InfoItem label="Reservation" value={shortId(entry.reservation_id)} />
                        <InfoItem label="Source / Reference" value={ledgerSource(entry)} />
                        <InfoItem label="Metadata" value={safeMetadataKeys(entry.metadata)} />
                      </dl>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {entry.description || "No memo recorded."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="No ledger/payment metadata exists yet. No live payment processor is connected and no payment movement occurs in Core yet." />
              )
            ) : (
              <RestrictedPanel text="Recent ledger transactions are restricted to owner/admin." />
            )}
          </section>

          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 id="attention" className="text-lg font-semibold text-slate-950">Attention / Blockers</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Deterministic blockers only. Missing fields stay explicit instead of invented.
              </p>
              {canViewFinancials ? (
                accounts.some((account) => account.blockers.length > 0) ? (
                  <div className="mt-5 space-y-3">
                    {accounts
                      .filter((account) => account.blockers.length > 0)
                      .map((account) => (
                        <article key={account.summary.reservation_id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                          <p className="text-sm font-bold">{puppyLabel(account.summary)} / {accountName(account.summary)}</p>
                          <ul className="mt-2 space-y-2 text-sm leading-6">
                            {account.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        </article>
                      ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-950">
                    No deterministic payment blockers were found from current metadata.
                  </p>
                )
              ) : (
                <RestrictedPanel text="Blocker evaluation needs owner/admin ledger and document access." />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 id="audit" className="text-lg font-semibold text-slate-950">Financial Events / Audit</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Recent payment, adjustment, and cancellation history where safely linkable.
              </p>
              {canViewFinancials ? (
                <div className="mt-5 grid gap-3">
                  {eventResult.rows.length > 0 || auditResult.rows.length > 0 ? (
                    <>
                      {eventResult.rows.slice(0, 5).map((event) => (
                        <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-bold text-slate-950">{formatKey(event.event_type)}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{event.summary || "Core event recorded."}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {event.source || "core_events"} / {formatDateTime(event.event_at)}
                          </p>
                        </article>
                      ))}
                      {auditResult.rows.slice(0, 5).map((audit) => (
                        <article key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-bold text-slate-950">{formatKey(audit.action)}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{audit.actor_identifier || "Actor not recorded"}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {audit.source || "core_audit_log"} / {formatKey(audit.outcome)} / {formatDateTime(audit.created_at)}
                          </p>
                        </article>
                      ))}
                    </>
                  ) : (
                    <EmptyState text="No recent financial event or audit rows were found." />
                  )}
                </div>
              ) : (
                <RestrictedPanel text="Financial event and audit rows are restricted to owner/admin." />
              )}
            </section>
          </section>
        </section>

        <section id="adjustments" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Balance Calculation Boundary</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              Balances come from `core_payment_balance_view` when available.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Posted deposit, payment, and credit rows decrease amount owed.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              Posted fee, refund, and chargeback rows increase amount owed according to `balance_effect`.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              No payment processor, refund operation, reminder send, customer portal payment, or provider call is connected.
            </div>
          </div>
          {canViewFinancials ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Current posted decrease total: {formatCurrency(ledgerDecreases(ledgerResult.rows))}. Current posted increase total: {formatCurrency(ledgerIncreases(ledgerResult.rows))}.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}





