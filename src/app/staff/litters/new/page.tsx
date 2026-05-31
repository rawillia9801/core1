import Link from "next/link";
import { createLitter } from "../../kennel-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type DogRow = {
  id: string;
  call_name: string | null;
  registered_name: string | null;
  sex: string | null;
  status: string | null;
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
    return [] as DogRow[];
  }

  const url = new URL(`${config.restUrl}/core_dogs`);
  url.searchParams.set("select", "id,call_name,registered_name,sex,status");
  url.searchParams.set("order", "call_name.asc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[core kennel] dog list read failed", await response.text().catch(() => ""));
    return [] as DogRow[];
  }

  return (await response.json()) as DogRow[];
}

function dogLabel(dog: DogRow) {
  const name = dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
  const sex = dog.sex ? ` · ${dog.sex}` : "";
  const status = dog.status ? ` · ${dog.status}` : "";
  return `${name}${sex}${status}`;
}

export default async function NewLitterPage() {
  const staff = await requireStaffProfile();
  const canCreate = staff.role === "owner" || staff.role === "admin";
  const dogs = await readDogs();
  const dams = dogs.filter((dog) => dog.sex?.toLowerCase() !== "male");
  const sires = dogs.filter((dog) => dog.sex?.toLowerCase() !== "female");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Litters</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Add Litter</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Creates a real Core litter record linked to sire/dam records when selected. No public website, customer message, document, payment, or external system is touched.</p>
        </section>

        {!canCreate ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Only owner/admin can add litter records.</section>
        ) : (
          <form action={createLitter} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <label className="block text-sm font-medium">Litter name<input name="litterName" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Dam<select name="damId" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{dams.map((dog) => <option key={dog.id} value={dog.id}>{dogLabel(dog)}</option>)}</select></label>
              <label className="text-sm font-medium">Sire<select name="sireId" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{sires.map((dog) => <option key={dog.id} value={dog.id}>{dogLabel(dog)}</option>)}</select></label>
              <label className="text-sm font-medium">Expected birth date<input type="date" name="expectedBirthAt" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Birth date<input type="date" name="birthAt" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Total puppies<input type="number" min="0" name="totalPuppies" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Female count<input type="number" min="0" name="femaleCount" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Male count<input type="number" min="0" name="maleCount" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Status<select name="status" defaultValue="planned" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="planned">Planned</option><option value="expected">Expected</option><option value="born">Born</option><option value="active">Active</option><option value="closed">Closed</option><option value="archived">Archived</option></select></label>
              <label className="text-sm font-medium">External reference<input name="externalReference" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="mt-8 flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="detailsPending" className="h-4 w-4" /> Details pending</label>
            </div>
            <label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Litter</button>
              <Link href="/staff/litters" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Litters</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
