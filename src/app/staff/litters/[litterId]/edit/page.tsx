import Link from "next/link";
import { archiveLitter, updateLitter } from "../../../kennel-manage-actions";
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
};

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
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();
  if (!config) return [] as T[];

  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`[core kennel] ${table} edit read failed`, await response.text().catch(() => ""));
    return [] as T[];
  }

  return (await response.json()) as T[];
}

function dateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dogLabel(dog: DogRow) {
  const name = dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
  const sex = dog.sex ? ` · ${dog.sex}` : "";
  const status = dog.status ? ` · ${dog.status}` : "";
  return `${name}${sex}${status}`;
}

export default async function EditLitterPage({ params }: { params: Promise<{ litterId: string }> }) {
  const staff = await requireStaffProfile();
  const { litterId } = await params;
  const [litters, dogs] = await Promise.all([
    readRows<LitterRow>("core_litters", {
      select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes",
      id: `eq.${litterId}`,
      limit: "1",
    }),
    readRows<DogRow>("core_dogs", {
      select: "id,call_name,registered_name,sex,status",
      order: "call_name.asc",
      limit: "500",
    }),
  ]);
  const litter = litters[0];
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const dams = dogs.filter((dog) => dog.sex?.toLowerCase() !== "male");
  const sires = dogs.filter((dog) => dog.sex?.toLowerCase() !== "female");

  if (!litter) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Litter not found</h1>
          <Link href="/staff/litters" className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Back to Litters</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Litters</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit Litter</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Updates a real Core litter record only. Delete marks the litter archived instead of hard-deleting linked puppy history.</p>
        </section>

        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Only owner/admin can edit litter records.</section>
        ) : (
          <form action={updateLitter} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="litterId" value={litter.id} />
            <label className="block text-sm font-medium">Litter name<input name="litterName" defaultValue={litter.litter_name ?? ""} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Dam<select name="damId" defaultValue={litter.dam_id ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{dams.map((dog) => <option key={dog.id} value={dog.id}>{dogLabel(dog)}</option>)}</select></label>
              <label className="text-sm font-medium">Sire<select name="sireId" defaultValue={litter.sire_id ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{sires.map((dog) => <option key={dog.id} value={dog.id}>{dogLabel(dog)}</option>)}</select></label>
              <label className="text-sm font-medium">Expected birth date<input type="date" name="expectedBirthAt" defaultValue={dateInput(litter.expected_birth_at)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Birth date<input type="date" name="birthAt" defaultValue={dateInput(litter.birth_at)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Total puppies<input type="number" min="0" name="totalPuppies" defaultValue={litter.total_puppies ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Female count<input type="number" min="0" name="femaleCount" defaultValue={litter.female_count ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Male count<input type="number" min="0" name="maleCount" defaultValue={litter.male_count ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Status<select name="status" defaultValue={litter.status ?? "planned"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="planned">Planned</option><option value="expected">Expected</option><option value="born">Born</option><option value="active">Active</option><option value="closed">Closed</option><option value="archived">Archived</option></select></label>
              <label className="text-sm font-medium">External reference<input name="externalReference" defaultValue={litter.external_reference ?? ""} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="mt-8 flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="detailsPending" defaultChecked={litter.details_pending ?? false} className="h-4 w-4" /> Details pending</label>
            </div>
            <label className="block text-sm font-medium">Notes<textarea name="notes" defaultValue={litter.notes ?? ""} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Changes</button>
              <Link href="/staff/litters" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Litters</Link>
            </div>
          </form>
        )}

        {canEdit ? (
          <form action={archiveLitter} className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <input type="hidden" name="litterId" value={litter.id} />
            <p className="text-sm font-semibold text-amber-900">Delete / archive litter</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">This marks the litter archived. It does not hard-delete linked puppy rows or history.</p>
            <button type="submit" className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900">Archive Litter</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
