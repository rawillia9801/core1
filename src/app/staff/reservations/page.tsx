import Link from "next/link";
import { cancelReservation, recordReservationPayment } from "../../application-actions";
import { getDashboardData } from "../../dashboard-data";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function PaymentResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Deposit/payment recorded locally. Balance due has been refreshed from the ledger.
      </p>
    );
  }

  if (outcome === "invalid_money") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Enter an amount received in dollars using numbers with up to two decimal places, such as 500.00.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot record deposits or payments.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Deposit/payment recording failed. Check local server logs for details.
      </p>
    );
  }

  return null;
}

function CancellationResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Reservation cancelled locally. No refund was issued and ledger history was not modified.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot perform that cancellation action.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Reservation cancellation failed. Check local server logs for details.
      </p>
    );
  }

  return null;
}

export default async function StaffReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment?: string;
    cancellation?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const dashboard = await getDashboardData(staff);
  const { payment, cancellation } = await searchParams;
  const canViewFinancials = dashboard.readScopes.canViewSensitiveFinancials;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Reservations
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Reservation Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Dedicated staff workspace for reservation status, balance visibility, local deposit/payment entries, and guarded cancellation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Dashboard
              </Link>
              <Link href="/staff/applications" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Applications
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            Payments recorded here are local Core ledger entries only. No payment processor, refund, customer email, or Hostinger SMTP delivery is connected.
          </p>
        </section>

        <PaymentResult outcome={payment} />
        <CancellationResult outcome={cancellation} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservations</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.reservations.length}</p>
            <p className="mt-2 text-sm text-slate-500">Current local Core rows</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Go-homes</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.goHomes.length}</p>
            <p className="mt-2 text-sm text-slate-500">Effective go-home rows</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ledger access</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{canViewFinancials ? "On" : "Off"}</p>
            <p className="mt-2 text-sm text-slate-500">Owner/admin controlled</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notification queue</p>
            <Link href="/staff/notifications" className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
              Preview queue
            </Link>
            <p className="mt-2 text-sm text-slate-500">No sending connected</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">Reservations</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ledger-derived balance and guarded local actions for active reservation records.
            </p>
          </div>

          <div className="space-y-4">
            {dashboard.reservations.length > 0 ? (
              dashboard.reservations.map((reservation) => {
                const canRecordPayment = !["cancelled", "void", "released"].includes(reservation.status.toLowerCase());
                const canCancelReservation = ["reserved", "pending"].includes(reservation.status.toLowerCase());

                return (
                  <article key={reservation.reservationId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{reservation.puppy}</p>
                        <p className="mt-1 text-sm text-slate-600">{reservation.buyer} · {reservation.buyerEmail}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge>{reservation.status}</StatusBadge>
                        <StatusBadge>Puppy: {reservation.puppyStatus}</StatusBadge>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/staff/reservations/${reservation.reservationId}`}
                        className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                      >
                        Open readiness
                      </Link>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservation</dt><dd className="mt-1 text-slate-700">{reservation.id}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Application</dt><dd className="mt-1 text-slate-700">{reservation.applicationReference}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reserved</dt><dd className="mt-1 text-slate-700">{reservation.reservedAt}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contract Total</dt><dd className="mt-1 font-semibold text-slate-950">{reservation.contractTotal}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deposit Required</dt><dd className="mt-1 font-semibold text-slate-950">{reservation.depositRequired}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance Due</dt><dd className="mt-1 font-semibold text-slate-950">{reservation.balance}</dd></div>
                    </dl>

                    {canRecordPayment ? (
                      <form action={recordReservationPayment} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                        <input type="hidden" name="reservationId" value={reservation.reservationId} />
                        <label className="block text-sm font-medium text-slate-700">
                          Entry type
                          <select name="entryType" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                            <option value="deposit">Deposit</option>
                            <option value="payment">Payment</option>
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Amount received
                          <input type="text" inputMode="decimal" name="amountDollars" placeholder="500.00" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Method
                          <input type="text" name="paymentMethod" maxLength={100} placeholder="Cash, Good Dog, etc." className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                        </label>
                        <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record</button>
                      </form>
                    ) : null}

                    {canCancelReservation ? (
                      <form action={cancelReservation} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                        <input type="hidden" name="reservationId" value={reservation.reservationId} />
                        <label className="block text-sm font-medium text-slate-700">
                          Cancellation reason
                          <textarea name="reason" maxLength={1000} rows={2} required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input type="checkbox" name="releasePuppy" value="yes" className="h-4 w-4 rounded border-slate-300" />
                          Release puppy back to available if safe
                        </label>
                        <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                          Cancel Reservation
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <EmptyList text="No reservation rows found in local Supabase." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
