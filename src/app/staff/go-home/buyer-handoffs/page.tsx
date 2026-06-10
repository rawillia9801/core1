import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function BuyerHandoffsPage() {
  await requireStaffProfile();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Go-Home</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Buyer Handoffs</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Internal owner/operator queue for buyer-linked go-home work.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/staff/go-home/handoff" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Handoff Command</Link>
            <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Buyers</Link>
            <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Reservations</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
