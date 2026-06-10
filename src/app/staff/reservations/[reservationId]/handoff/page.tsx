import Link from "next/link";
import { updateGoHomeDetail } from "../../../../application-actions";
import { requireStaffProfile } from "@/lib/staff-auth";
import { upsertGoHomeChecklistItem } from "../../../go-home/actions";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  contact_notes: string | null;
  individual_notes: string | null;
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

  if (!response.ok) return { rows: [], warning: `${table} unavailable for reservation handoff.` };
  return { rows: (await response.json()) as T[], warning: null };
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
  return ["complete", "not_applicable"].includes(status?.toLowerCase() ?? "");
}

function isCompleteDocument(status: string | null | undefined) {
  return ["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(status?.toLowerCase() ?? "");
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
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

export default async function ReservationHandoffPage({ params }: { params: Promise<{ reservationId: string }> }) {
  const staff = await requireStaffProfile();
  const { reservationId } = await params;
  const canEdit = staff.role === "owner" || staff.role === "admin";

  if (!UUID_PATTERN.test(reservationId)) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Reservation handoff not found</h1>
          <Link href="/staff/go-home/handoff" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Back to handoff command</Link>
        </section>
      </main>
    );
  }

  const [summaryResult, goHomeResult, checklistResult, balanceResult, documentResult] = await Promise.all([
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,buyer_phone,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,balance_due_cents,go_home_planned_at,go_home_method,go_home_status,go_home_location_text,created_at",
      reservation_id: `eq.${reservationId}`,
      limit: "1",
    }),
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", {
      select: "reservation_id,effective_pickup_delivery_type,effective_scheduled_at,effective_window_start,effective_window_end,effective_location_text,effective_contact_phone,effective_status,source_of_schedule,checklist_status,balance_cleared_status,contact_notes,individual_notes,completed_at,updated_at",
      reservation_id: `eq.${reservationId}`,
      limit: "1",
    }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", { select: "id,reservation_id,item_key,label,status,notes,completed_at,updated_at", reservation_id: `eq.${reservationId}`, order: "updated_at.desc", limit: "100" }),
    readRows<PaymentBalanceRow>("core_payment_balance_view", { select: "reservation_id,balance_due_cents", reservation_id: `eq.${reservationId}`, limit: "1" }),
    readRows<DocumentRow>("core_documents", { select: "reservation_id,buyer_id,family_id,puppy_id,document_type,title,status", or: `(reservation_id.eq.${reservationId})`, order: "updated_at.desc", limit: "100" }),
  ]);

  const summary = summaryResult.rows[0] ?? null;
  const goHome = goHomeResult.rows[0] ?? null;
  const balance = balanceResult.rows[0] ?? null;
  const checklistItems = checklistResult.rows;
  const documents = documentResult.rows;
  const warnings = [summaryResult, goHomeResult, checklistResult, balanceResult, documentResult].map((result) => result.warning).filter(Boolean) as string[];

  if (!summary) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Reservation handoff not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">No reservation summary row matched this reservation.</p>
          <Link href="/staff/go-home/handoff" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Back to handoff command</Link>
        </section>
      </main>
    );
  }

  const completeChecklist = checklistItems.filter((item) => isCompleteChecklist(item.status)).length;
  const completeDocuments = documents.filter((document) => isCompleteDocument(document.status)).length;
  const effectiveDate = goHome?.effective_scheduled_at ?? goHome?.effective_window_start ?? summary.go_home_planned_at;
  const effectiveLocation = goHome?.effective_location_text ?? summary.go_home_location_text;
  const effectiveMethod = goHome?.effective_pickup_delivery_type ?? summary.go_home_method;
  const effectiveStatus = goHome?.effective_status ?? summary.go_home_status;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Reservation Handoff</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{display(summary.puppy_name || summary.puppy_collar_color, "Puppy handoff")}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{display(summary.buyer_name || summary.buyer_email, "Unlinked buyer")} / {display(summary.family_name, "Unlinked family")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/go-home/handoff" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Handoff Command</Link>
              <Link href={`/staff/reservations/${summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservation Detail</Link>
              {summary.puppy_id ? <Link href={`/staff/puppies/${summary.puppy_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Puppy Detail</Link> : null}
              {summary.buyer_id ? <Link href={`/staff/buyers/${summary.buyer_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Buyer 360</Link> : null}
              {summary.family_id ? <Link href={`/staff/families/${summary.family_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Family 360</Link> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">This workspace is an internal owner/operator go-home handoff detail only. It does not send messages, process payments, generate documents, release registration papers, publish puppies, update the customer portal, or call external providers.</p>
        </section>

        {warnings.length > 0 ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{warnings.join(" / ")}</section> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <InfoItem label="Date" value={formatDateTime(effectiveDate)} />
          <InfoItem label="Method" value={formatKey(effectiveMethod)} />
          <InfoItem label="Location" value={display(effectiveLocation)} />
          <InfoItem label="Balance due" value={formatCurrency(balance?.balance_due_cents ?? summary.balance_due_cents)} />
          <InfoItem label="Status" value={formatKey(effectiveStatus)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Readiness Snapshot</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{completeChecklist} of {checklistItems.length} checklist</Badge>
              <Badge>{completeDocuments} of {documents.length} documents</Badge>
              <Badge>{formatKey(summary.reservation_status)}</Badge>
              <Badge>{formatKey(summary.puppy_status)}</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {checklistItems.length > 0 ? checklistItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
                  <p className="font-semibold text-slate-950">{display(item.label || item.item_key)}</p>
                  <p className="text-slate-600">{formatKey(item.status)} / {display(item.notes, "No notes")}</p>
                </div>
              )) : <EmptyState text="No handoff checklist items recorded yet." />}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Pickup / Delivery Controls</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">These forms use existing Core go-home actions and checklist actions only.</p>
            {canEdit ? (
              <div className="mt-5 grid gap-6 xl:grid-cols-2">
                <form action={updateGoHomeDetail} className="space-y-4">
                  <input type="hidden" name="reservationId" value={summary.reservation_id} />
                  <label className="block text-sm font-medium text-slate-700">Method<select name="method" defaultValue={effectiveMethod ?? ""} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Not set</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="meetup">Meetup</option><option value="transport">Transport</option></select></label>
                  <label className="block text-sm font-medium text-slate-700">Go-home date/time<input type="datetime-local" name="plannedAt" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                  <label className="block text-sm font-medium text-slate-700">Location<input type="text" name="location" maxLength={500} defaultValue={effectiveLocation ?? ""} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                  <label className="block text-sm font-medium text-slate-700">Status<select name="status" defaultValue={effectiveStatus ?? "pending"} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="ready">Ready</option><option value="completed">Completed</option><option value="delayed">Delayed</option><option value="cancelled">Cancelled</option></select></label>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Handoff Detail</button>
                </form>

                <form action={upsertGoHomeChecklistItem} className="space-y-4">
                  <input type="hidden" name="reservationId" value={summary.reservation_id} />
                  <label className="block text-sm font-medium text-slate-700">Checklist item<select name="itemKey" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select item</option>{HANDOFF_CHECKLIST_ITEMS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                  <label className="block text-sm font-medium text-slate-700">Status<select name="status" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_review">Needs review</option><option value="complete">Complete</option><option value="not_applicable">Not applicable</option></select></label>
                  <label className="block text-sm font-medium text-slate-700">Notes<textarea name="notes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Checklist Item</button>
                </form>
              </div>
            ) : <EmptyState text="Handoff edits are owner/admin only." />}
          </section>
        </section>
      </div>
    </main>
  );
}
