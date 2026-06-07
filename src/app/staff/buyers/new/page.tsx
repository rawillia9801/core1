import Link from "next/link";
import { createManualBuyer } from "../../relationship-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type FamilyRow = { id: string; name: string | null; status: string | null };

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

function familyLabel(family: FamilyRow) {
  return family.name || `Family ${family.id.slice(0, 8)}`;
}

export default async function NewBuyerPage() {
  const staff = await requireStaffProfile();
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const familyResult = await readRows<FamilyRow>("core_families", { select: "id,name,status", order: "created_at.desc", limit: "500" });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Buyers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Create Manual Buyer</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Create an internal Core buyer/contact record without sending messages, inviting portal users, or calling external systems.</p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          This workspace is for internal owner/operator record correction and buyer assignment only. It does not send messages, process payments, generate documents, publish puppies, update the customer portal, or call external providers.
        </section>

        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Only owner/admin can create buyer records.</section>
        ) : (
          <form action={createManualBuyer} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {familyResult.warning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{familyResult.warning}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">First name<input name="firstName" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Last name<input name="lastName" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Preferred name<input name="preferredName" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Approval status<select name="approvalStatus" defaultValue="pending" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="pending">Pending</option><option value="needs_review">Needs review</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="inactive">Inactive</option></select></label>
              <label className="text-sm font-medium">Email<input name="email" type="email" maxLength={180} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Phone<input name="phone" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Alternate phone<input name="alternatePhone" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Optional family link<select name="familyId" defaultValue="" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">No family link yet</option>{familyResult.rows.map((family) => <option key={family.id} value={family.id}>{familyLabel(family)} / {family.status ?? "status unknown"}</option>)}</select></label>
              <label className="text-sm font-medium sm:col-span-2">Street address<input name="streetAddress" maxLength={240} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">City<input name="city" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">State<input name="state" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Postal code<input name="postalCode" maxLength={40} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Create Buyer</button>
              <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Buyers</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
