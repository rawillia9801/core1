import Link from "next/link";

export const dynamic = "force-dynamic";

function statusMessage(status: string | undefined) {
  if (status === "email_sent") return "Your application was received and confirmation emails were sent.";
  if (status === "email_not_configured") return "Your application was received. Email confirmation is not configured yet.";
  if (status === "email_warning") return "Your application was received. One or more confirmation emails could not be sent.";
  if (status === "error") return "We could not complete the application submission. Please try again or contact us.";
  return "Your application request has been processed.";
}

export default async function ApplicationReceivedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Southwest Virginia Chihuahua</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Application Received</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{statusMessage(status)}</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">Submitting an application does not reserve a puppy, approve an application, or complete a purchase. We review applications internally before making placement decisions.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/apply" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800">Submit another application</Link>
          <Link href="/" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
