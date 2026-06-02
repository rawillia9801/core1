import Link from "next/link";
import { archiveDog, updateDog } from "../../../kennel-manage-actions";
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
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return [] as T[];
  }

  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `[core kennel] ${table} dog edit read failed`,
      await response.text().catch(() => ""),
    );
    return [] as T[];
  }

  return (await response.json()) as T[];
}

function dateInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dogTitle(dog: DogRow) {
  return dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
}

export default async function EditDogPage({
  params,
}: {
  params: Promise<{ dogId: string }>;
}) {
  const staff = await requireStaffProfile();
  const { dogId } = await params;
  const dogs = await readRows<DogRow>("core_dogs", {
    select:
      "id,external_reference,registered_name,call_name,sex,color,coat_type,birth_at,status,notes",
    id: `eq.${dogId}`,
    limit: "1",
  });
  const dog = dogs[0];
  const canEdit = staff.role === "owner" || staff.role === "admin";

  if (!dog) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Dog not found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The requested Core dog record was not found.
          </p>
          <Link
            href="/staff/dogs"
            className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Back to Dogs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Dogs
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit Dog</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Updates a real Core dog record only. Delete marks the dog inactive
            instead of hard-deleting linked litter or kennel history.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page edits Core kennel metadata through audited server actions.
            It does not publish listings, send messages, generate documents,
            move payments, or call external systems.
          </p>
        </section>

        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Only owner/admin can edit dog records.
          </section>
        ) : (
          <form
            action={updateDog}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="dogId" value={dog.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Call name
                <input
                  name="callName"
                  defaultValue={dog.call_name ?? ""}
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Registered name
                <input
                  name="registeredName"
                  defaultValue={dog.registered_name ?? ""}
                  maxLength={180}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Sex
                <select
                  name="sex"
                  defaultValue={dog.sex ?? ""}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Not recorded</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Status
                <select
                  name="status"
                  defaultValue={dog.status ?? "active"}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="retired">Retired</option>
                  <option value="hold">Hold</option>
                  <option value="deceased">Deceased</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Color
                <input
                  name="color"
                  defaultValue={dog.color ?? ""}
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Coat type
                <input
                  name="coatType"
                  defaultValue={dog.coat_type ?? ""}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                Birth date
                <input
                  type="date"
                  name="birthAt"
                  defaultValue={dateInput(dog.birth_at)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium">
                External reference
                <input
                  name="externalReference"
                  defaultValue={dog.external_reference ?? ""}
                  maxLength={160}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                name="notes"
                defaultValue={dog.notes ?? ""}
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Dog
              </button>
              <Link
                href="/staff/dogs"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}

        {canEdit ? (
          <form
            action={archiveDog}
            className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm"
          >
            <input type="hidden" name="dogId" value={dog.id} />
            <h2 className="text-lg font-bold">Archive-style delete</h2>
            <p className="mt-2 text-sm leading-6">
              This marks {dogTitle(dog)} inactive. It does not hard-delete the
              dog or linked kennel history.
            </p>
            <button
              type="submit"
              className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800"
            >
              Mark Inactive
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
