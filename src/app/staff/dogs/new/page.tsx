import Link from "next/link";
import { createDog } from "../../kennel-actions";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function NewDogPage() {
  const staff = await requireStaffProfile();
  const canCreate = staff.role === "owner" || staff.role === "admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Dogs</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Add Dog</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Creates a real Core dog record. No public website, customer message, document, payment, or external system is touched.</p>
        </section>

        {!canCreate ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Only owner/admin can add dog records.</section>
        ) : (
          <form action={createDog} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Call name<input name="callName" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Registered name<input name="registeredName" maxLength={180} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Sex<select name="sex" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="unknown">Unknown</option></select></label>
              <label className="text-sm font-medium">Status<select name="status" defaultValue="active" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option><option value="retired">Retired</option><option value="hold">Hold</option><option value="deceased">Deceased</option></select></label>
              <label className="text-sm font-medium">Color<input name="color" maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Coat type<input name="coatType" maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Birth date<input type="date" name="birthAt" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">External reference<input name="externalReference" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save Dog</button>
              <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Dogs</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
