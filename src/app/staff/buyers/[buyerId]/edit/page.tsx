import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBuyer } from "../../../relationship-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  approval_status: string | null;
  notes: string | null;
};

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

function buyerName(buyer: BuyerRow) {
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${buyer.id.slice(0, 8)}`;
}

export default async function EditBuyerPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const staff = await requireStaffProfile();
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const { buyerId } = await params;
  const buyerResult = await readRows<BuyerRow>("core_buyers", {
    select: "id,first_name,last_name,preferred_name,email,phone,alternate_phone,street_address,city,state,postal_code,approval_status,notes",
    id: `eq.${buyerId}`,
    limit: "1",
  });
  const buyer = buyerResult.rows[0];
  if (!buyer) notFound();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Buyers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit {buyerName(buyer)}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Correct internal buyer/contact fields. Financial truth remains on reservations and ledger rows.</p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          This workspace is for internal owner/operator record correction and buyer assignment only. It does not send messages, process payments, generate documents, publish puppies, update the customer portal, or call external providers.
        </section>

        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Only owner/admin can edit buyer records.</section>
        ) : (
          <form action={updateBuyer} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="buyerId" value={buyer.id} />
            {buyerResult.warning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{buyerResult.warning}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">First name<input name="firstName" defaultValue={buyer.first_name ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Last name<input name="lastName" defaultValue={buyer.last_name ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Preferred name<input name="preferredName" defaultValue={buyer.preferred_name ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Approval status<select name="approvalStatus" defaultValue={buyer.approval_status ?? "pending"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="pending">Pending</option><option value="needs_review">Needs review</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="inactive">Inactive</option></select></label>
              <label className="text-sm font-medium">Email<input name="email" type="email" defaultValue={buyer.email ?? ""} maxLength={180} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Phone<input name="phone" defaultValue={buyer.phone ?? ""} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Alternate phone<input name="alternatePhone" defaultValue={buyer.alternate_phone ?? ""} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium sm:col-span-2">Street address<input name="streetAddress" defaultValue={buyer.street_address ?? ""} maxLength={240} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">City<input name="city" defaultValue={buyer.city ?? ""} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">State<input name="state" defaultValue={buyer.state ?? ""} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Postal code<input name="postalCode" defaultValue={buyer.postal_code ?? ""} maxLength={40} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm font-medium">Notes<textarea name="notes" defaultValue={buyer.notes ?? ""} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Buyer</button>
              <Link href={`/staff/buyers/${buyer.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Buyer</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
