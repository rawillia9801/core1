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

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as T[], warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads." };
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
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatMoney(cents: number | null) {
  if (typeof cents !== "number") {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";

  if (["available", "ready", "active"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["reserved", "hold", "pending"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["sold", "completed", "placed"].includes(normalized)) {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

export default async function StaffPuppiesPage() {
  await requireStaffProfile();

  const [puppyResult, reservationResult] = await Promise.all([
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,notes,created_at,updated_at",
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
  const reservationsByPuppy = new Map(
    reservationResult.rows
      .filter((reservation) => reservation.puppy_id)
      .map((reservation) => [reservation.puppy_id as string, reservation]),
  );
  const availableCount = puppies.filter((puppy) => puppy.status?.toLowerCase() === "available").length;
  const reservedCount = puppies.filter((puppy) => reservationsByPuppy.has(puppy.id)).length;
  const listedCount = puppies.filter((puppy) => puppy.public_listing_status?.toLowerCase() === "public").length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Puppy Workspace</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only puppy command surface for current puppy status, listing visibility, reservation linkage, and basic identity details. No public listing changes, customer messages, documents, payments, or external systems are triggered here.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">
            This workspace only reads Core puppy and active reservation data. Puppy status edits, public website updates, health record tools, and buyer-facing visibility are still blocked until controlled write rules exist.
          </p>
        </section>

        {puppyResult.warning || reservationResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {puppyResult.warning ?? reservationResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puppies</p>
            <p className="mt-3 text-3xl font-bold">{puppies.length}</p>
            <p className="mt-2 text-sm text-slate-500">Core puppy records</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available</p>
            <p className="mt-3 text-3xl font-bold">{availableCount}</p>
            <p className="mt-2 text-sm text-slate-500">Marked available</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reserved</p>
            <p className="mt-3 text-3xl font-bold">{reservedCount}</p>
            <p className="mt-2 text-sm text-slate-500">Has active reservation</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public listed</p>
            <p className="mt-3 text-3xl font-bold">{listedCount}</p>
            <p className="mt-2 text-sm text-slate-500">Visibility marker only</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Puppy Records</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Current Core puppy rows with active reservation context when present.</p>
          </div>

          {puppies.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {puppies.map((puppy) => {
                const reservation = reservationsByPuppy.get(puppy.id);

                return (
                  <article key={puppy.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{puppyName(puppy)}</p>
                        <p className="mt-1 text-sm text-slate-500">ID {puppy.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(puppy.status)}>{display(puppy.status, "Unknown")}</Badge>
                        <Badge>{display(puppy.public_listing_status, "Private")}</Badge>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Sex</dt><dd className="mt-1 text-slate-700">{display(puppy.sex)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Color</dt><dd className="mt-1 text-slate-700">{display(puppy.color)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Coat</dt><dd className="mt-1 text-slate-700">{display(puppy.coat_type)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Birth date</dt><dd className="mt-1 text-slate-700">{formatDate(puppy.birth_at)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Health marker</dt><dd className="mt-1 text-slate-700">{display(puppy.health_status)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Litter</dt><dd className="mt-1 text-slate-700">{puppy.litter_id ? puppy.litter_id.slice(0, 8) : "Not linked"}</dd></div>
                    </dl>

                    {reservation ? (
                      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                        <p className="font-semibold">Active reservation</p>
                        <p className="mt-1">{display(reservation.buyer_name, "Buyer not named")} · {display(reservation.reservation_status, "Status unknown")}</p>
                        <p className="mt-1 text-blue-800">Balance marker: {formatMoney(reservation.balance_due_cents)}</p>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No active reservation attached.</div>
                    )}

                    {puppy.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{puppy.notes}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No puppy records found in local Core yet." />
          )}
        </section>
      </div>
    </main>
  );
}
