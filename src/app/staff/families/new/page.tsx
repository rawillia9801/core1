import Link from "next/link";
import { createFamily } from "../../relationship-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type BuyerRow = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; email: string | null };

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [] as T[], warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Core reads." };
  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` }, cache: "no-store" });
  if (!response.ok) return { rows: [] as T[], warning: `${table} read failed: ${response.status}` };
  return { rows: (await response.json()) as T[], warning: null };
}

function buyerLabel(buyer: BuyerRow) {
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${buyer.id.slice(0, 8)}`;
}

function familyMessage(code: string | undefined) {
  if (code === "migration_missing") return "The production database is missing the buyer/family relationship migration. Run migration 20260526460000_core_puppy_buyer_relationship_tools.sql in Supabase, then retry.";
  if (code === "configuration") return "Core database configuration is missing for this deployment.";
  if (code === "invalid") return "Check the family fields and try again.";
  if (code === "failed") return "Family save failed. The database rejected the request.";
  return null;
}

export default async function NewFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  const staff = await requireStaffProfile();
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const { family: familyCode } = await searchParams;
  const message = familyMessage(familyCode);
  const buyerResult = await readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email", order: "created_at.desc", limit: "500" });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Families</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Create Family / Household</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Create an internal household group and optionally link an existing buyer as primary contact.</p>
        </section>
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          This workspace is for internal owner/operator record correction and buyer assignment only. It does not send messages, process payments, generate documents, publish puppies, update the customer portal, or call external providers.
        </section>
        {message ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{message}</section>
        ) : null}
        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Only owner/admin can create family records.</section>
        ) : (
          <form action={createFamily} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {buyerResult.warning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{buyerResult.warning}</p> : null}
            <label className="block text-sm font-medium">Family name<input name="name" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-medium">Status<select name="status" defaultValue="active" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
            <label className="block text-sm font-medium">Optional primary buyer<select name="buyerId" defaultValue="" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">No buyer link yet</option>{buyerResult.rows.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyerLabel(buyer)}</option>)}</select></label>
            <label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Create Family</button>
              <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Families</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
