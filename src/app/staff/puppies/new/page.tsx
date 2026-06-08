import Link from "next/link";
import { createPuppy } from "../../kennel-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type LitterRow = {
  id: string;
  litter_name: string | null;
  status: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

async function readLitters() {
  const config = getSupabaseRestConfig();

  if (!config) {
    return [] as LitterRow[];
  }

  const url = new URL(`${config.restUrl}/core_litters`);
  url.searchParams.set("select", "id,litter_name,status,birth_at,expected_birth_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[core kennel] litter list read failed", await response.text().catch(() => ""));
    return [] as LitterRow[];
  }

  return (await response.json()) as LitterRow[];
}

function litterLabel(litter: LitterRow) {
  const name = litter.litter_name || `Litter ${litter.id.slice(0, 8)}`;
  const status = litter.status ? ` · ${litter.status}` : "";
  return `${name}${status}`;
}

export default async function NewPuppyPage() {
  const staff = await requireStaffProfile();
  const canCreate = staff.role === "owner" || staff.role === "admin";
  const litters = await readLitters();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Add Puppy</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Creates a real Core puppy record, optionally linked to a real Core litter. No public website, customer message, document, payment, or external system is touched.</p>
        </section>

        {!canCreate ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Only owner/admin can add puppy records.</section>
        ) : (
          <form action={createPuppy} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <label className="block text-sm font-medium">Litter<select name="litterId" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{litters.map((litter) => <option key={litter.id} value={litter.id}>{litterLabel(litter)}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Name<input name="name" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Collar color<input name="collarColor" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Sex<select name="sex" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="unknown">Unknown</option></select></label>
              <label className="text-sm font-medium">Status<select name="status" defaultValue="unavailable" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="unavailable">Unavailable</option><option value="available">Available</option><option value="hold">Hold</option><option value="reserved">Reserved</option><option value="placed">Placed</option><option value="kept">Kept</option><option value="deceased">Deceased</option></select></label>
              <label className="text-sm font-medium">Color<input name="color" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Coat type<input name="coatType" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Birth date<input type="date" name="birthAt" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Public listing status<select name="publicListingStatus" defaultValue="private" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="private">Private</option><option value="coming_soon">Coming soon</option><option value="public">Public marker</option><option value="hidden">Hidden</option></select></label>
              <label className="text-sm font-medium">Health marker<input name="healthStatus" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Registry<input name="registry" maxLength={80} placeholder="AKC, CKC, ACA, etc." className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Registry number<input name="registryNumber" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Price amount<input name="priceDollars" inputMode="decimal" placeholder="2000.00" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Deposit amount<input name="depositAmountDollars" inputMode="decimal" placeholder="500.00" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Internal cost amount<input name="internalCostDollars" inputMode="decimal" placeholder="0.00" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">External reference<input name="externalReference" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <p className="text-xs leading-5 text-slate-500">Registry, price, deposit, and internal cost are private Core metadata only. They do not process payments, publish listings, update a portal, or contact customers.</p>
            <label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Puppy</button>
              <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Puppies</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
