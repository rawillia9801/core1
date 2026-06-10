import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReadResult<T> = { rows: T[]; warning: string | null };

type PuppyRow = {
  id: string;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  status: string | null;
  health_status: string | null;
};

type ReservationSummaryRow = {
  reservation_id: string;
  reservation_status: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
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
  checklist_status: string | null;
  balance_cleared_status: string | null;
};

type ChecklistItemRow = {
  id: string;
  label: string | null;
  item_key: string | null;
  status: string | null;
  notes: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  balance_due_cents: number | null;
};

type DocumentRow = {
  reservation_id: string | null;
  puppy_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
};

type WeightLogRow = {
  id: string;
  measured_at: string | null;
  weight_grams: number | null;
};

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
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });

  if (!response.ok) return { rows: [], warning: `${table} unavailable for puppy handoff.` };
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

function puppyLabel(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.sex || `Puppy ${puppy.id.slice(0, 8)}`;
}

function latestWeight(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => new Date(b.measured_at ?? 0).getTime() - new Date(a.measured_at ?? 0).getTime())[0] ?? null;
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

export default async function PuppyHandoffPage({ params }: { params: Promise<{ puppyId: string }> }) {
  await requireStaffProfile();
  const { puppyId } = await params;

  if (!UUID_PATTERN.test(puppyId)) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Puppy handoff not found</h1>
          <Link href="/staff/go-home/handoff" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Back to handoff command</Link>
        </section>
      </main>
    );
  }

  const [puppyResult, reservationResult, weightResult] = await Promise.all([
    readRows<PuppyRow>("core_puppies", { select: "id,name,collar_color,sex,color,coat_type,status,health_status", id: `eq.${puppyId}`, limit: "1" }),
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,balance_due_cents,go_home_planned_at,go_home_method,go_home_status,go_home_location_text,created_at",
      puppy_id: `eq.${puppyId}`,
      order: "created_at.desc",
      limit: "5",
    }),
    readRows<WeightLogRow>("core_weight_logs", { select: "id,measured_at,weight_grams", puppy_id: `eq.${puppyId}`, order: "measured_at.desc.nullslast", limit: "10" }),
  ]);

  const puppy = puppyResult.rows[0] ?? null;
  const activeReservation = reservationResult.rows.find((row) => !["cancelled", "void", "released"].includes(row.reservation_status?.toLowerCase() ?? "")) ?? reservationResult.rows[0] ?? null;
  const reservationId = activeReservation?.reservation_id ?? null;

  const [goHomeResult, checklistResult, balanceResult, documentResult] = reservationId ? await Promise.all([
    readRows<GoHomeEffectiveRow>("core_go_home_effective_view", { select: "reservation_id,effective_pickup_delivery_type,effective_scheduled_at,effective_window_start,effective_window_end,effective_location_text,effective_contact_phone,effective_status,checklist_status,balance_cleared_status", reservation_id: `eq.${reservationId}`, limit: "1" }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", { select: "id,item_key,label,status,notes", reservation_id: `eq.${reservationId}`, order: "updated_at.desc", limit: "100" }),
    readRows<PaymentBalanceRow>("core_payment_balance_view", { select: "reservation_id,balance_due_cents", reservation_id: `eq.${reservationId}`, limit: "1" }),
    readRows<DocumentRow>("core_documents", { select: "reservation_id,puppy_id,document_type,title,status", or: `(reservation_id.eq.${reservationId},puppy_id.eq.${puppyId})`, order: "updated_at.desc", limit: "100" }),
  ]) : [
    { rows: [] as GoHomeEffectiveRow[], warning: null },
    { rows: [] as ChecklistItemRow[], warning: null },
    { rows: [] as PaymentBalanceRow[], warning: null },
    { rows: [] as DocumentRow[], warning: null },
  ];

  const warnings = [puppyResult, reservationResult, weightResult, goHomeResult, checklistResult, balanceResult, documentResult].map((result) => result.warning).filter(Boolean) as string[];

  if (!puppy) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Puppy handoff not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">No puppy record matched this ID.</p>
          <Link href="/staff/go-home/handoff" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Back to handoff command</Link>
        </section>
      </main>
    );
  }

  const goHome = goHomeResult.rows[0] ?? null;
  const balance = balanceResult.rows[0] ?? null;
  const checklistItems = checklistResult.rows;
  const documents = documentResult.rows;
  const latest = latestWeight(weightResult.rows);
  const completeChecklist = checklistItems.filter((item) => isCompleteChecklist(item.status)).length;
  const completeDocuments = documents.filter((document) => isCompleteDocument(document.status)).length;
  const effectiveDate = goHome?.effective_scheduled_at ?? goHome?.effective_window_start ?? activeReservation?.go_home_planned_at;
  const effectiveLocation = goHome?.effective_location_text ?? activeReservation?.go_home_location_text;
  const effectiveMethod = goHome?.effective_pickup_delivery_type ?? activeReservation?.go_home_method;
  const effectiveStatus = goHome?.effective_status ?? activeReservation?.go_home_status;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Puppy Handoff</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{puppyLabel(puppy)}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{display(puppy.sex)} / {display(puppy.color)} / {display(puppy.coat_type)} / {formatKey(puppy.status)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/go-home/handoff" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Handoff Command</Link>
              <Link href={`/staff/puppies/${puppy.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Puppy Detail</Link>
              {reservationId ? <Link href={`/staff/reservations/${reservationId}/handoff`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservation Handoff</Link> : null}
              {activeReservation?.buyer_id ? <Link href={`/staff/buyers/${activeReservation.buyer_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Buyer 360</Link> : null}
              {activeReservation?.family_id ? <Link href={`/staff/families/${activeReservation.family_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Family 360</Link> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">This workspace is an internal owner/operator puppy handoff detail only. It does not send messages, process payments, generate documents, release registration papers, publish puppies, update the customer portal, or call external providers.</p>
        </section>

        {warnings.length > 0 ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{warnings.join(" / ")}</section> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <InfoItem label="Assigned buyer" value={display(activeReservation?.buyer_name || activeReservation?.buyer_email, "No active buyer assignment")} />
          <InfoItem label="Go-home date" value={formatDateTime(effectiveDate)} />
          <InfoItem label="Method" value={formatKey(effectiveMethod)} />
          <InfoItem label="Location" value={display(effectiveLocation)} />
          <InfoItem label="Balance due" value={formatCurrency(balance?.balance_due_cents ?? activeReservation?.balance_due_cents)} />
          <InfoItem label="Latest weight" value={latest?.weight_grams ? `${latest.weight_grams} g` : "Not recorded"} />
          <InfoItem label="Documents" value={`${completeDocuments} of ${documents.length} complete`} />
          <InfoItem label="Checklist" value={`${completeChecklist} of ${checklistItems.length} complete`} />
          <InfoItem label="Go-home status" value={formatKey(effectiveStatus)} />
          <InfoItem label="Puppy marker" value={formatKey(puppy.health_status)} />
        </section>

        {reservationId ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Puppy Handoff Readiness</h2>
            <div className="mt-5 space-y-3">
              {checklistItems.length > 0 ? checklistItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
                  <p className="font-semibold text-slate-950">{display(item.label || item.item_key)}</p>
                  <p className="text-slate-600">{formatKey(item.status)} / {display(item.notes, "No notes")}</p>
                </div>
              )) : <EmptyState text="No handoff checklist items recorded yet." />}
            </div>
          </section>
        ) : <EmptyState text="This puppy does not have an active reservation handoff yet. Assign a buyer/family through the puppy detail workflow first." />}
      </div>
    </main>
  );
}
