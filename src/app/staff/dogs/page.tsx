import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type DogRow = {
  id: string;
  external_reference: string | null;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

async function readDogs() {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as DogRow[], warning: "Core read configuration is not available for server-side operational reads." };
  }

  const url = new URL(`${config.restUrl}/core_dogs`);
  url.searchParams.set("select", "id,external_reference,registered_name,call_name,sex,color,coat_type,birth_at,status,notes,created_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { rows: [] as DogRow[], warning: `core_dogs read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as DogRow[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function dogName(dog: DogRow) {
  return dog.call_name || dog.registered_name || dog.external_reference || `Dog ${dog.id.slice(0, 8)}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function ResultMessage({ value }: { value?: string }) {
  if (value === "success") return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Dog record created in Core.</p>;
  if (value === "updated") return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Dog record updated in Core.</p>;
  if (value === "deleted") return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Dog record was marked inactive in Core.</p>;
  if (!value) return null;
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Dog action result: {value}</p>;
}

export default async function StaffDogsPage({ searchParams }: { searchParams: Promise<{ dog?: string }> }) {
  await requireStaffProfile();
  const { dog } = await searchParams;
  const result = await readDogs();
  const dogs = result.rows;
  const activeCount = dogs.filter((row) => row.status?.toLowerCase() === "active").length;
  const females = dogs.filter((row) => row.sex?.toLowerCase() === "female").length;
  const males = dogs.filter((row) => row.sex?.toLowerCase() === "male").length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Dogs</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Dogs Workspace</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Real Core dog records for dams, sires, adults, and retired dogs. Add/edit actions update real Core rows only.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media#dogs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Media Center</Link>
              <Link href="/staff/dogs/new" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add Dog</Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Real data only</p>
          <p className="mt-2 text-sm leading-6">This page reads and updates real Core dog records. It does not send messages, create documents, move payments, update public listings, or touch external systems.</p>
        </section>

        <ResultMessage value={dog} />

        {result.warning ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{result.warning}</section> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dogs</p><p className="mt-3 text-3xl font-bold">{dogs.length}</p><p className="mt-2 text-sm text-slate-500">Core dog records</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p><p className="mt-3 text-3xl font-bold">{activeCount}</p><p className="mt-2 text-sm text-slate-500">Marked active</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Females</p><p className="mt-3 text-3xl font-bold">{females}</p><p className="mt-2 text-sm text-slate-500">Recorded female</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Males</p><p className="mt-3 text-3xl font-bold">{males}</p><p className="mt-2 text-sm text-slate-500">Recorded male</p></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Dog Records</h2>
          {dogs.length > 0 ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {dogs.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-lg font-bold">{dogName(row)}</p><p className="mt-1 text-sm text-slate-500">{display(row.registered_name, "No registered name")}</p></div>
                    <div className="flex flex-wrap gap-2"><Badge>{display(row.status, "Unknown")}</Badge><Badge>{display(row.sex, "Sex not recorded")}</Badge></div>
                  </div>
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-semibold uppercase text-slate-400">Color</dt><dd>{display(row.color)}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-400">Coat</dt><dd>{display(row.coat_type)}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-400">Birth date</dt><dd>{formatDate(row.birth_at)}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-slate-400">External ref</dt><dd>{display(row.external_reference)}</dd></div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/staff/dogs/${row.id}`} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Open profile</Link>
                    <Link href={`/staff/dogs/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit</Link>
                  </div>
                  {row.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{row.notes}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No real dog records found in Core yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
