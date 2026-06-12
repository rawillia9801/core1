import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type PuppyRow = {
  id: string;
  external_reference: string | null;
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
  metadata: Record<string, unknown> | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReservationRow = {
  puppy_id: string | null;
  reservation_status: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  balance_due_cents: number | null;
};

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
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as T[], warning: "Core read configuration is not available for server-side operational reads." };
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
    return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.external_reference || `Puppy ${puppy.id.slice(0, 8)}`;
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatMoney(cents: number | null) {
  if (typeof cents !== "number") return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function metadataText(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

function metadataCents(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  }

  return null;
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  if (["available", "ready", "active"].includes(normalized)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["reserved", "hold", "pending"].includes(normalized)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (["sold", "completed", "placed"].includes(normalized)) return "bg-violet-50 text-violet-700 ring-violet-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function PuppyResultMessage({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">Puppy record saved. No public listing, payment, document, message, portal, or external provider action was triggered.</section>;
  }

  if (outcome === "unauthorized") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Only owner/admin can add puppy records.</section>;
  }

  if (outcome === "invalid_input") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Check puppy form values, allowed status/sex/listing options, dates, money amounts, and field lengths.</section>;
  }

  if (outcome === "missing_identifier") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Enter at least one puppy identifier: name, collar color, or external reference.</section>;
  }

  if (outcome === "litter_required") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Select a litter before saving this puppy.</section>;
  }

  if (outcome === "litter_not_found") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">The selected litter was not found. Refresh the form and choose a current Core litter.</section>;
  }

  if (outcome === "invalid_litter") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">The litter selection is not valid for this puppy save.</section>;
  }

  if (outcome === "duplicate_identifier") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">A matching puppy identifier needs owner review before saving another puppy record.</section>;
  }

  if (outcome === "rpc_missing_or_failed") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Puppy create RPC failed or is not available. Check the deployed Core RPC signature before retrying.</section>;
  }

  if (outcome === "config_missing") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Core server action configuration is incomplete.</section>;
  }

  if (outcome === "save_failed" || outcome === "error") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Puppy save failed. Review the server action log for safe error details.</section>;
  }

  return null;
}

export default async function StaffPuppiesPage({ searchParams }: { searchParams: Promise<{ puppy?: string }> }) {
  await requireStaffProfile();
  const { puppy } = await searchParams;

  const [puppyResult, reservationResult] = await Promise.all([
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,metadata,notes,created_at,updated_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select: "puppy_id,reservation_status,buyer_name,buyer_email,balance_due_cents",
      reservation_status: "not.in.(cancelled,void,released)",
      limit: "1000",
    }),
  ]);

  const puppies = puppyResult.rows;
  const reservationsByPuppy = new Map(reservationResult.rows.filter((reservation) => reservation.puppy_id).map((reservation) => [reservation.puppy_id as string, reservation]));
  const availableCount = puppies.filter((row) => row.status?.toLowerCase() === "available").length;
  const reservedCount = puppies.filter((row) => reservationsByPuppy.has(row.id)).length;
  const listedCount = puppies.filter((row) => row.public_listing_status?.toLowerCase() === "public").length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Puppy Workspace</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Real Core puppy records for status, listing visibility marker, reservation linkage, and identity details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media#puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Media Center</Link>
              <Link href="/staff/puppies/new" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add Puppy</Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm"><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Real data only</p><p className="mt-2 text-sm leading-6">This workspace reads Core puppy and active reservation data. No public website updates, messages, documents, payments, or external systems are triggered.</p></section>
        <PuppyResultMessage outcome={puppy} />
        {puppyResult.warning || reservationResult.warning ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{puppyResult.warning ?? reservationResult.warning}</section> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puppies</p><p className="mt-3 text-3xl font-bold">{puppies.length}</p><p className="mt-2 text-sm text-slate-500">Core puppy records</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available</p><p className="mt-3 text-3xl font-bold">{availableCount}</p><p className="mt-2 text-sm text-slate-500">Marked available</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reserved</p><p className="mt-3 text-3xl font-bold">{reservedCount}</p><p className="mt-2 text-sm text-slate-500">Has active reservation</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public listed</p><p className="mt-3 text-3xl font-bold">{listedCount}</p><p className="mt-2 text-sm text-slate-500">Visibility marker only</p></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-lg font-semibold">Puppy Records</h2><p className="mt-1 text-sm leading-6 text-slate-500">Current Core puppy rows with active reservation context when present.</p></div>
          {puppies.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {puppies.map((row) => {
                const reservation = reservationsByPuppy.get(row.id);
                const registry = metadataText(row.metadata, ["registry", "registration"]);
                const priceCents = metadataCents(row.metadata, ["price_cents", "asking_price_cents", "sale_price_cents"]);
                const depositAmountCents = metadataCents(row.metadata, ["deposit_amount_cents", "deposit_cents", "deposit_required_cents"]);
                return (
                  <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-950">{puppyName(row)}</p><p className="mt-1 text-sm text-slate-500">ID {row.id.slice(0, 8)}</p></div><div className="flex flex-wrap gap-2"><Badge tone={statusTone(row.status)}>{display(row.status, "Unknown")}</Badge><Badge>{display(row.public_listing_status, "Private")}</Badge></div></div>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase text-slate-400">Sex</dt><dd className="mt-1 text-slate-700">{display(row.sex)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Color</dt><dd className="mt-1 text-slate-700">{display(row.color)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Coat</dt><dd className="mt-1 text-slate-700">{display(row.coat_type)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Birth date</dt><dd className="mt-1 text-slate-700">{formatDate(row.birth_at)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Registry</dt><dd className="mt-1 text-slate-700">{display(registry)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Price / Deposit</dt><dd className="mt-1 text-slate-700">{formatMoney(priceCents)} / {formatMoney(depositAmountCents)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Health marker</dt><dd className="mt-1 text-slate-700">{display(row.health_status)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Litter</dt><dd className="mt-1 text-slate-700">{row.litter_id ? row.litter_id.slice(0, 8) : "Not linked"}</dd></div></dl>
                    {reservation ? <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Active reservation</p><p className="mt-1">{display(reservation.buyer_name, "Buyer not named")} · {display(reservation.reservation_status, "Status unknown")}</p><p className="mt-1 text-blue-800">Balance marker: {formatMoney(reservation.balance_due_cents)}</p></div> : <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No active reservation attached.</div>}
                    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/staff/puppies/${row.id}`} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800">Open puppy</Link><Link href={`/staff/puppies/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit</Link></div>
                    {row.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{row.notes}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : <EmptyState text="No puppy records found in Core yet." />}
        </section>
      </div>
    </main>
  );
}
