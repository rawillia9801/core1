import Link from "next/link";
import { archivePuppy, updatePuppy } from "../../../kennel-manage-actions";
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
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  status: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [] as T[], warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Core edit reads." };

  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[core kennel] ${table} edit read failed`, body);
    return { rows: [] as T[], warning: `${table} edit read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function dateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function centsFromMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  }

  return null;
}

function moneyInputValue(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

function litterLabel(litter: LitterRow) {
  const name = litter.litter_name || `Litter ${litter.id.slice(0, 8)}`;
  const status = litter.status ? ` · ${litter.status}` : "";
  return `${name}${status}`;
}

export default async function EditPuppyPage({ params }: { params: Promise<{ puppyId: string }> }) {
  const staff = await requireStaffProfile();
  const { puppyId } = await params;
  const [puppies, litters] = await Promise.all([
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,metadata,notes",
      id: `eq.${puppyId}`,
      limit: "1",
    }),
    readRows<LitterRow>("core_litters", {
      select: "id,litter_name,status",
      order: "created_at.desc",
      limit: "500",
    }),
  ]);
  const puppy = puppies.rows[0];
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const warnings = [puppies.warning, litters.warning].filter(Boolean);
  const priceCents = centsFromMetadata(puppy?.metadata, ["price_cents", "asking_price_cents", "sale_price_cents"]);
  const depositAmountCents = centsFromMetadata(puppy?.metadata, ["deposit_amount_cents", "deposit_cents", "deposit_required_cents"]);

  if (!puppy) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Puppy not found</h1>
          <Link href="/staff/puppies" className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Back to Puppies</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit Puppy</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Updates a real Core puppy record only. Delete hides/unavailable-marks the puppy instead of hard-deleting linked history.</p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
          This workspace is for internal owner/operator record correction and buyer assignment only. It does not send messages, process payments, generate documents, publish puppies, update the customer portal, or call external providers.
        </section>

        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Only owner/admin can edit puppy records.</section>
        ) : (
          <form action={updatePuppy} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="puppyId" value={puppy.id} />
            {warnings.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}
            <label className="block text-sm font-medium">Litter<select name="litterId" defaultValue={puppy.litter_id ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not linked</option>{litters.rows.map((litter) => <option key={litter.id} value={litter.id}>{litterLabel(litter)}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Name<input name="name" defaultValue={puppy.name ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Collar color<input name="collarColor" defaultValue={puppy.collar_color ?? ""} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Sex<select name="sex" defaultValue={puppy.sex ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="unknown">Unknown</option></select></label>
              <label className="text-sm font-medium">Status<select name="status" defaultValue={puppy.status ?? "unavailable"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="unavailable">Unavailable</option><option value="available">Available</option><option value="hold">Hold</option><option value="reserved">Reserved</option><option value="placed">Placed</option><option value="kept">Kept</option><option value="deceased">Deceased</option></select></label>
              <label className="text-sm font-medium">Color<input name="color" defaultValue={puppy.color ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Coat type<input name="coatType" defaultValue={puppy.coat_type ?? ""} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Birth date<input type="date" name="birthAt" defaultValue={dateInput(puppy.birth_at)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Public listing status<select name="publicListingStatus" defaultValue={puppy.public_listing_status ?? "private"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="private">Private</option><option value="coming_soon">Coming soon</option><option value="public">Public marker</option><option value="hidden">Hidden</option></select></label>
              <label className="text-sm font-medium">Health marker<input name="healthStatus" defaultValue={puppy.health_status ?? ""} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Price amount<input name="priceDollars" defaultValue={moneyInputValue(priceCents)} inputMode="decimal" placeholder="2000.00" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Deposit amount<input name="depositAmountDollars" defaultValue={moneyInputValue(depositAmountCents)} inputMode="decimal" placeholder="500.00" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">External reference<input name="externalReference" defaultValue={puppy.external_reference ?? ""} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <p className="text-xs leading-5 text-slate-500">Price and deposit are internal puppy metadata only. They do not process payments, update a buyer balance, publish a listing, or contact customers.</p>
            <label className="block text-sm font-medium">Notes<textarea name="notes" defaultValue={puppy.notes ?? ""} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Changes</button>
              <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Puppies</Link>
            </div>
          </form>
        )}

        {canEdit ? (
          <form action={archivePuppy} className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <input type="hidden" name="puppyId" value={puppy.id} />
            <p className="text-sm font-semibold text-amber-900">Delete / hide puppy</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">This marks the puppy unavailable and hidden. It does not hard-delete reservation or litter history.</p>
            <button type="submit" className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900">Hide Puppy</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
