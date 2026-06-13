import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffProfile } from "@/lib/staff-auth";
import { SectionNav } from "../operator-ui";
import { ActionPanel } from "../action-panel";
import { CommunicationPanel } from "../communication-panel";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };

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
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  posted_ledger_total_cents: number | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
  created_at: string | null;
};

type ReservationRow = {
  id: string;
  sale_type: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
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
  entry_type: string | null;
  balance_effect: string | null;
  status: string | null;
  amount_cents: number | null;
  occurred_at: string | null;
  description: string | null;
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
};

type PlanAccount = {
  summary: ReservationSummaryRow;
  reservation: ReservationRow | null;
  balance: PaymentBalanceRow | null;
  ledgerRows: LedgerRow[];
  documents: DocumentRow[];
  planDetected: boolean;
  depositPostedCents: number;
  paymentPostedCents: number;
  balanceDueCents: number | null;
  expectedHalfDownCents: number | null;
  estimatedSixMonthPaymentCents: number | null;
  lastPaymentAt: string | null;
  lane: "plan" | "stale" | "deposit" | "hold" | "clear" | "watch";
  blockers: string[];
};

const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);
const COMPLETE_DOCUMENT_STATUSES = new Set(["signed", "completed", "complete", "filed", "approved", "accepted", "ready"]);

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
  if (!config) return { rows: [], warning: "Missing Supabase read configuration for Core payment plan review." };
  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) return { rows: [], warning: `${table} read failed: ${response.status}` };
  return { rows: (await response.json()) as T[], warning: null };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function cents(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function metadataText(metadata: Record<string, unknown> | null | undefined) {
  return metadata ? normalizeText(JSON.stringify(metadata)) : "";
}

function isActiveReservation(summary: ReservationSummaryRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalizeText(summary.reservation_status));
}

function isPosted(entry: LedgerRow) {
  return normalizeText(entry.status) === "posted";
}

function isCompleteDocument(document: DocumentRow) {
  return COMPLETE_DOCUMENT_STATUSES.has(normalizeText(document.status));
}

function linkedDocuments(summary: ReservationSummaryRow, documents: DocumentRow[]) {
  return documents.filter((document) => document.reservation_id === summary.reservation_id || document.buyer_id === summary.buyer_id || document.family_id === summary.family_id || document.puppy_id === summary.puppy_id);
}

function postedAmount(ledgerRows: LedgerRow[], words: string[]) {
  return ledgerRows.filter((entry) => isPosted(entry) && words.includes(normalizeText(entry.entry_type))).reduce((total, entry) => total + cents(entry.amount_cents), 0);
}

function latestLedgerDate(ledgerRows: LedgerRow[]) {
  return ledgerRows.map((entry) => entry.occurred_at ?? entry.created_at).filter(Boolean).sort().at(-1) ?? null;
}

function isStale(value: string | null, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}

function planDetected(summary: ReservationSummaryRow, reservation: ReservationRow | null, ledgerRows: LedgerRow[]) {
  const text = normalizeText(`${reservation?.sale_type ?? ""} ${reservation?.notes ?? ""} ${metadataText(reservation?.metadata)} ${ledgerRows.map((row) => row.description ?? "").join(" ")}`);
  return ["finance", "financing", "payment plan", "installment", "monthly", "good dog", "apr", "admin fee", "half down"].some((term) => text.includes(term));
}

function buildBlockers(account: Omit<PlanAccount, "blockers" | "lane">) {
  const blockers: string[] = [];
  const balanceDue = account.balanceDueCents;
  if (balanceDue === null) blockers.push("Ledger-derived balance is unavailable.");
  if ((balanceDue ?? 0) > 0) blockers.push(`Open balance remains: ${formatCurrency(balanceDue)}.`);
  if (account.expectedHalfDownCents !== null && account.depositPostedCents < account.expectedHalfDownCents) blockers.push(`Half-down target not met: ${formatCurrency(account.depositPostedCents)} posted of ${formatCurrency(account.expectedHalfDownCents)} expected.`);
  if (account.planDetected && account.lastPaymentAt && isStale(account.lastPaymentAt, 35) && (balanceDue ?? 0) > 0) blockers.push("Plan appears stale: no posted payment in 35+ days while balance remains.");
  if (account.planDetected && !account.lastPaymentAt && (balanceDue ?? 0) > 0) blockers.push("Plan candidate has no posted payment date.");
  if ((balanceDue ?? 0) > 0 && account.documents.some(isCompleteDocument)) blockers.push("Completed/ready document metadata exists while balance remains due; registration/release needs review.");
  if (!account.summary.buyer_id || !account.summary.puppy_id) blockers.push("Reservation account is missing buyer or puppy linkage.");
  return blockers;
}

function laneFor(account: Omit<PlanAccount, "lane">): PlanAccount["lane"] {
  if ((account.balanceDueCents ?? 0) <= 0 && account.ledgerRows.length > 0) return "clear";
  if ((account.balanceDueCents ?? 0) > 0 && account.documents.some(isCompleteDocument)) return "hold";
  if (account.expectedHalfDownCents !== null && account.depositPostedCents < account.expectedHalfDownCents) return "deposit";
  if (account.planDetected && account.lastPaymentAt && isStale(account.lastPaymentAt, 35)) return "stale";
  if (account.planDetected) return "plan";
  return "watch";
}

function accountName(summary: ReservationSummaryRow) {
  return `${display(summary.buyer_name || summary.buyer_email, "Unlinked buyer")} / ${display(summary.family_name, "Unlinked family")}`;
}

function puppyLabel(summary: ReservationSummaryRow) {
  return display(summary.puppy_name || summary.puppy_collar_color, "Unlinked puppy");
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function StatCard({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p><p className="mt-2 text-sm leading-6 text-slate-500">{note}</p></div>;
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</dd></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function laneLabel(lane: PlanAccount["lane"]) {
  if (lane === "plan") return "Payment Plan Candidates";
  if (lane === "stale") return "Stale Payment Review";
  if (lane === "deposit") return "Deposit / Half-Down Review";
  if (lane === "hold") return "Registration Hold Review";
  if (lane === "clear") return "Paid / Clear";
  return "Watch / Standard Balance";
}

function PlanCard({ account }: { account: PlanAccount }) {
  const recentLedger = account.ledgerRows.slice(0, 5);
  const completeDocs = account.documents.filter(isCompleteDocument).length;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-lg font-bold text-slate-950">{accountName(account.summary)}</p><p className="mt-1 text-sm leading-6 text-slate-600">{puppyLabel(account.summary)} / {display(account.reservation?.sale_type, "Sale type not recorded")}</p><div className="mt-3 flex flex-wrap gap-2"><Badge>{account.planDetected ? "Plan detected" : "Standard/unknown"}</Badge><Badge>{account.blockers.length} blocker(s)</Badge><Badge>{completeDocs} of {account.documents.length} docs</Badge><Badge>{formatCurrency(account.balanceDueCents)}</Badge></div></div><div className="flex flex-wrap gap-2"><Link href={`/staff/reservations/${account.summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Reservation</Link>{account.summary.puppy_id ? <Link href={`/staff/puppies/${account.summary.puppy_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Puppy</Link> : null}{account.summary.buyer_id ? <Link href={`/staff/buyers/${account.summary.buyer_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Buyer</Link> : null}{account.summary.family_id ? <Link href={`/staff/families/${account.summary.family_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">Family</Link> : null}</div></div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><InfoItem label="Contract" value={formatCurrency(account.balance?.contract_total_cents ?? account.summary.contract_total_cents)} /><InfoItem label="Posted deposit" value={formatCurrency(account.depositPostedCents)} /><InfoItem label="Posted payments" value={formatCurrency(account.paymentPostedCents)} /><InfoItem label="Balance due" value={formatCurrency(account.balanceDueCents)} /><InfoItem label="Half-down target" value={formatCurrency(account.expectedHalfDownCents)} /><InfoItem label="Est. 6 month payment" value={formatCurrency(account.estimatedSixMonthPaymentCents)} /><InfoItem label="Last payment" value={formatDateTime(account.lastPaymentAt)} /><InfoItem label="Go-home" value={formatDateTime(account.summary.go_home_planned_at)} /></dl>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">Owner review</p>{account.blockers.length > 0 ? <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">{account.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-emerald-700">No deterministic payment-plan blockers were found.</p>}</section><section className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-950">Recent ledger</p><div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">{recentLedger.length > 0 ? recentLedger.map((entry) => <p key={entry.id}>{formatDateTime(entry.occurred_at ?? entry.created_at)} / {entry.entry_type} / {formatCurrency(entry.amount_cents)} / {entry.status}</p>) : <p>No ledger rows recorded.</p>}</div></section></div>
    </article>
  );
}

export default async function StaffPaymentPlansPage() {
  const staff = await requireStaffProfile();
  const canViewFinancials = staff.role === "owner" || staff.role === "admin";
  const [summaryResult, reservationResult, balanceResult, ledgerResult, documentResult] = await Promise.all([
    readRows<ReservationSummaryRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,currency,go_home_planned_at,go_home_status,go_home_balance_cleared_status,created_at,updated_at", order: "reserved_at.desc.nullslast,created_at.desc", limit: "250" }),
    readRows<ReservationRow>("core_reservations", { select: "id,sale_type,notes,metadata", order: "updated_at.desc", limit: "250" }),
    canViewFinancials ? readRows<PaymentBalanceRow>("core_payment_balance_view", { select: "reservation_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,last_posted_payment_at", order: "last_posted_payment_at.desc.nullslast", limit: "250" }) : Promise.resolve({ rows: [] as PaymentBalanceRow[], warning: null }),
    canViewFinancials ? readRows<LedgerRow>("core_financial_ledger", { select: "id,reservation_id,entry_type,balance_effect,status,amount_cents,occurred_at,description,created_at", order: "occurred_at.desc,created_at.desc", limit: "750" }) : Promise.resolve({ rows: [] as LedgerRow[], warning: null }),
    canViewFinancials ? readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at", order: "updated_at.desc", limit: "500" }) : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
  ]);
  const warnings = [summaryResult.warning, reservationResult.warning, balanceResult.warning, ledgerResult.warning, documentResult.warning].filter(Boolean);
  const activeSummaries = summaryResult.rows.filter(isActiveReservation);
  const reservationById = new Map(reservationResult.rows.map((row) => [row.id, row]));
  const balanceByReservation = new Map(balanceResult.rows.map((row) => [row.reservation_id, row]));
  const ledgerByReservation = new Map<string, LedgerRow[]>();
  for (const entry of ledgerResult.rows) { if (!entry.reservation_id) continue; ledgerByReservation.set(entry.reservation_id, [...(ledgerByReservation.get(entry.reservation_id) ?? []), entry]); }
  const accounts: PlanAccount[] = activeSummaries.map((summary) => {
    const reservation = reservationById.get(summary.reservation_id) ?? null;
    const balance = balanceByReservation.get(summary.reservation_id) ?? null;
    const ledgerRows = ledgerByReservation.get(summary.reservation_id) ?? [];
    const documents = linkedDocuments(summary, documentResult.rows);
    const contract = balance?.contract_total_cents ?? summary.contract_total_cents ?? null;
    const expectedHalfDownCents = contract === null ? null : Math.round(contract / 2);
    const remaining = contract === null || expectedHalfDownCents === null ? null : contract - expectedHalfDownCents;
    const estimatedSixMonthPaymentCents = remaining === null ? null : Math.ceil(remaining / 6);
    const depositPostedCents = postedAmount(ledgerRows, ["deposit"]);
    const paymentPostedCents = postedAmount(ledgerRows, ["deposit", "payment"]);
    const balanceDueCents = balance?.balance_due_cents ?? summary.balance_due_cents ?? null;
    const lastPaymentAt = balance?.last_posted_payment_at ?? latestLedgerDate(ledgerRows);
    const detectedPlan = planDetected(summary, reservation, ledgerRows);
    const base = { summary, reservation, balance, ledgerRows, documents, planDetected: detectedPlan, depositPostedCents, paymentPostedCents, balanceDueCents, expectedHalfDownCents, estimatedSixMonthPaymentCents, lastPaymentAt };
    const blockers = buildBlockers(base);
    return { ...base, blockers, lane: laneFor({ ...base, blockers }) };
  });
  const lanes: Array<{ key: PlanAccount["lane"]; rows: PlanAccount[] }> = ["plan", "stale", "deposit", "hold", "clear", "watch"].map((key) => ({ key: key as PlanAccount["lane"], rows: accounts.filter((account) => account.lane === key) }));
  const totalOpenBalance = accounts.reduce((total, account) => total + Math.max(account.balanceDueCents ?? 0, 0), 0);
  const totalExpectedHalfDown = accounts.reduce((total, account) => total + cents(account.expectedHalfDownCents), 0);
  const planCandidates = accounts.filter((account) => account.planDetected).length;
  const holds = accounts.filter((account) => account.lane === "hold" || account.lane === "stale").length;
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px] space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Payments</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Payment Plan Command Center</h1><p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">Owner/operator workspace for payment plan candidates, half-down review, installment watch, open balances, registration hold readiness, and go-home financial blockers.</p></div><div className="flex flex-wrap gap-2"><Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Payments</Link><Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservations</Link><Link href="/staff/go-home/handoff" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Go-Home Handoff</Link></div></div></section><SectionNav items={[{ href: "#plan-candidates", label: "Plan Candidates" },{ href: "#stale-plans", label: "Stale Plans" },{ href: "#deposit-half-down", label: "Deposit / Half-Down" },{ href: "#registration-holds", label: "Registration Holds" },{ href: "#paid-clear", label: "Paid / Clear" },{ href: "#watch", label: "Watch" }]} /><ActionPanel nextAction={holds > 0 ? "Review stale plans and registration holds" : "Review payment plan action queue"} blockers={canViewFinancials ? holds : 0} mode="review-only" href="/staff/actions#payments" detail="Payment plan actions stay as review links into existing reservation, ledger, and handoff workspaces; no reminders, portal release, or provider call is connected." /><CommunicationPanel latestStatus={canViewFinancials ? `${holds} payment plan account(s) need follow-up review` : "Payment-plan communication status is restricted"} nextFollowUp="Review plan, balance, registration hold, and go-home context before any payment-plan outreach." blockers={canViewFinancials ? holds : 0} mode={canViewFinancials && holds > 0 ? "attention" : "review"} detail="No payment reminder, portal release, registration update, or provider call is triggered from this panel." /><section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm"><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p><p className="mt-2 text-sm leading-6">This workspace is an internal owner/operator financial planning and ledger-readiness view only. It does not move money, send reminders, release registration papers, update the customer portal, or call outside providers.</p></section>{warnings.length > 0 ? <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{warnings.join(" ")}</section> : null}{!canViewFinancials ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Payment plan details are restricted to owner/admin. Financial rows were not fetched for this profile.</section> : null}<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Active accounts" value={accounts.length} note="Active reservations reviewed" /><StatCard label="Plan candidates" value={canViewFinancials ? planCandidates : "Restricted"} note="Detected from sale type, notes, metadata, or ledger text" /><StatCard label="Open balance" value={canViewFinancials ? formatCurrency(totalOpenBalance) : "Restricted"} note="Positive ledger-derived balances" /><StatCard label="Half-down target" value={canViewFinancials ? formatCurrency(totalExpectedHalfDown) : "Restricted"} note="Estimated policy target from contract totals" /><StatCard label="Hold/review" value={canViewFinancials ? holds : "Restricted"} note="Document or recent-payment blockers" /></section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Policy Markers</h2><div className="mt-5 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Half-down estimate: contract total × 50%.</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Six-month estimate: remaining balance after half-down ÷ 6.</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Registration hold review is flagged when documents look complete/ready while balance remains due.</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">Detection reads internal reservation metadata, notes, sale type, and ledger descriptions only.</div></div></section><section className="space-y-6">{lanes.map((lane) => <section key={lane.key} id={lane.key === "plan" ? "plan-candidates" : lane.key === "stale" ? "stale-plans" : lane.key === "deposit" ? "deposit-half-down" : lane.key === "hold" ? "registration-holds" : lane.key === "clear" ? "paid-clear" : "watch"} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-950">{laneLabel(lane.key)}</h2><Badge>{lane.rows.length}</Badge></div><div className="grid gap-5 xl:grid-cols-2">{lane.rows.length > 0 ? lane.rows.map((account) => <PlanCard key={account.summary.reservation_id} account={account} />) : <EmptyState text={`No accounts in ${laneLabel(lane.key).toLowerCase()}.`} />}</div></section>)}</section></div></main>
  );
}

