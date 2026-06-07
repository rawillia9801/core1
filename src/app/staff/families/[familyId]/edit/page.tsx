import Link from "next/link";
import { notFound } from "next/navigation";
import { updateFamily } from "../../../relationship-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type FamilyRow = { id: string; name: string | null; status: string | null; notes: string | null };

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

export default async function EditFamilyPage({ params }: { params: Promise<{ familyId: string }> }) {
  const staff = await requireStaffProfile();
  const canEdit = staff.role === "owner" || staff.role === "admin";
  const { familyId } = await params;
  const familyResult = await readRows<FamilyRow>("core_families", { select: "id,name,status,notes", id: `eq.${familyId}`, limit: "1" });
  const family = familyResult.rows[0];
  if (!family) notFound();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Families</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit {family.name || `Family ${family.id.slice(0, 8)}`}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Correct internal household fields without portal invites or customer-facing changes.</p>
        </section>
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          This workspace is for internal owner/operator record correction and buyer assignment only. It does not send messages, process payments, generate documents, publish puppies, update the customer portal, or call external providers.
        </section>
        {!canEdit ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Only owner/admin can edit family records.</section>
        ) : (
          <form action={updateFamily} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="familyId" value={family.id} />
            {familyResult.warning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{familyResult.warning}</p> : null}
            <label className="block text-sm font-medium">Family name<input name="name" defaultValue={family.name ?? ""} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-medium">Status<select name="status" defaultValue={family.status ?? "active"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
            <label className="block text-sm font-medium">Notes<textarea name="notes" defaultValue={family.notes ?? ""} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Family</button>
              <Link href={`/staff/families/${family.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Family</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
