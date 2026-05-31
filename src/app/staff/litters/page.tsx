import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type LitterRow = {
  id: string;
  external_reference: string | null;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  expected_birth_at: string | null;
  birth_at: string | null;
  total_puppies: number | null;
  female_count: number | null;
  male_count: number | null;
  status: string | null;
  details_pending: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DogRow = {
  id: string;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  status: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  status: string | null;
  public_listing_status: string | null;
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

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function dogName(dog: DogRow | undefined) {
  if (!dog) {
    return "Not linked";
  }

  return dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || `Puppy ${puppy.id.slice(0, 8)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";

  if (["born", "active", "available"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["planned", "expected", "pending"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["closed", "completed", "archived"].includes(normalized)) {
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

export default async function StaffLittersPage({ searchParams }: { searchParams: Promise<{ litter?: string }> }) {
  await requireStaffProfile();
  const { litter } = await searchParams;

  const [litterResult, dogResult, puppyResult] = await Promise.all([
    readRows<LitterRow>("core_litters", {
      select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes,created_at,updated_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<DogRow>("core_dogs", {
      select: "id,registered_name,call_name,sex,status",
      limit: "500",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,litter_id,name,collar_color,sex,status,public_listing_status",
      limit: "1000",
    }),
  ]);

  const litters = litterResult.rows;
  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));
  const puppiesByLitter = new Map<string, PuppyRow[]>();

  for (const puppy of puppyResult.rows) {
    if (!puppy.litter_id) {
      continue;
    }

    puppiesByLitter.set(puppy.litter_id, [...(puppiesByLitter.get(puppy.litter_id) ?? []), puppy]);
  }

  const bornCount = litters.filter((row) => Boolean(row.birth_at)).length;
  const expectedCount = litters.filter((row) => !row.birth_at && Boolean(row.expected_birth_at)).length;
  const totalPuppies = litters.reduce((sum, row) => sum + (row.total_puppies ?? puppiesByLitter.get(row.id)?.length ?? 0), 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Litters</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Litters Workspace</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Real Core litter records with sire, dam, birth timing, puppy counts, and linked puppy context. No fake/demo data and no outside systems.
              </p>
            </div>
            <Link href="/staff/litters/new" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add Litter</Link>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Real data only</p>
          <p className="mt-2 text-sm leading-6">This workspace reads only existing Core rows from core_litters, core_dogs, and core_puppies.</p>
        </section>

        {litter ? <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">Litter action result: {litter}</section> : null}

        {litterResult.warning || dogResult.warning || puppyResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {litterResult.warning ?? dogResult.warning ?? puppyResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Litters</p><p className="mt-3 text-3xl font-bold">{litters.length}</p><p className="mt-2 text-sm text-slate-500">Core litter records</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Born</p><p className="mt-3 text-3xl font-bold">{bornCount}</p><p className="mt-2 text-sm text-slate-500">Have birth date</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected</p><p className="mt-3 text-3xl font-bold">{expectedCount}</p><p className="mt-2 text-sm text-slate-500">Expected, not born</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puppies</p><p className="mt-3 text-3xl font-bold">{totalPuppies}</p><p className="mt-2 text-sm text-slate-500">Recorded/linked count</p></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-lg font-semibold">Litter Records</h2><p className="mt-1 text-sm leading-6 text-slate-500">Current Core litter rows with linked sire, dam, and puppy records when present.</p></div>
          {litters.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {litters.map((row) => {
                const puppies = puppiesByLitter.get(row.id) ?? [];
                const dam = row.dam_id ? dogsById.get(row.dam_id) : undefined;
                const sire = row.sire_id ? dogsById.get(row.sire_id) : undefined;
                return (
                  <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-950">{display(row.litter_name, `Litter ${row.id.slice(0, 8)}`)}</p><p className="mt-1 text-sm text-slate-500">ID {row.id.slice(0, 8)}</p></div><div className="flex flex-wrap gap-2"><Badge tone={statusTone(row.status)}>{display(row.status, "Unknown")}</Badge>{row.details_pending ? <Badge tone="bg-amber-50 text-amber-700 ring-amber-100">Details pending</Badge> : null}</div></div>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase text-slate-400">Dam</dt><dd className="mt-1 text-slate-700">{dogName(dam)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Sire</dt><dd className="mt-1 text-slate-700">{dogName(sire)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Expected birth</dt><dd className="mt-1 text-slate-700">{formatDate(row.expected_birth_at)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Birth date</dt><dd className="mt-1 text-slate-700">{formatDate(row.birth_at)}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Total puppies</dt><dd className="mt-1 text-slate-700">{row.total_puppies ?? puppies.length}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-400">Female / Male</dt><dd className="mt-1 text-slate-700">{row.female_count ?? "?"} / {row.male_count ?? "?"}</dd></div></dl>
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Linked puppies</p>{puppies.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{puppies.map((puppy) => <Badge key={puppy.id} tone="bg-white text-blue-800 ring-blue-100">{puppyName(puppy)} · {display(puppy.status, "status unknown")}</Badge>)}</div> : <p className="mt-1 text-blue-800">No linked puppy rows yet.</p>}</div>
                    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit</Link></div>
                    {row.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{row.notes}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : <EmptyState text="No real litter records found in local Core yet." />}
        </section>
      </div>
    </main>
  );
}
