import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          Cherolee Core
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Staff Access Boundary In Progress
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The Core dashboard is moving behind a protected staff route. This root
          page is intentionally non-sensitive and does not display Core buyer,
          puppy, reservation, ledger, or workflow data.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/staff"
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Staff Workspace
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Staff Sign In
          </Link>
        </div>
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Selected real data, live integrations, customer access, payment
          processing, email, Twilio, documents, and RLS remain off.
        </p>
      </section>
    </main>
  );
}
