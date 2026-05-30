import Link from "next/link";
import { recordReservationPayment } from "../../application-actions";
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

function RestrictedPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
      <p className="font-semibold">Restricted to owner/admin</p>
      <p className="mt-1">{text}</p>
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

  if (outcome === "invalid_input") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Payment entry must be a deposit or payment with valid optional details.
      </p>
    );
  }

  if (outcome === "not_found" || outcome === "not_eligible") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        The selected reservation cannot accept a recorded deposit/payment.
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

export default async function StaffPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    payment?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const dashboard = await getDashboardData(staff);
  const { payment } = await searchParams;
  const canViewFinancials = dashboard.readScopes.canViewSensitiveFinancials;
  const activeReservations = dashboard.reservations.filter(
    (reservation) => !["cancelled", "void", "released"].includes(reservation.status.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Payments
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Payment Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Dedicated staff workspace for local Core ledger payment entry and payment activity review. This is not a payment processor and does not move money.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Dashboard
              </Link>
              <Link href="/staff/reservations" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/notifications" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Notifications
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page records local Core ledger entries only. No payment processor, refund, chargeback processor action, customer email, or Hostinger SMTP delivery is connected.
          </p>
        </section>

        <PaymentResult outcome={payment} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active reservations</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{activeReservations.length}</p>
            <p className="mt-2 text-sm text-slate-500">Eligible for local payment entry</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ledger rows</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.ledgerActivity.length}</p>
            <p className="mt-2 text-sm text-slate-500">Visible by current role</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Financial access</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{canViewFinancials ? "On" : "Off"}</p>
            <p className="mt-2 text-sm text-slate-500">Owner/admin controlled</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email sending</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">Off</p>
            <p className="mt-2 text-sm text-slate-500">Hostinger SMTP not connected</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Record Local Payment</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Select an active reservation and record a local deposit/payment ledger entry. No external money movement occurs.
              </p>
            </div>

            {activeReservations.length > 0 ? (
              <form action={recordReservationPayment} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Reservation
                  <select
                    name="reservationId"
                    required
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  >
                    <option value="">Select reservation</option>
                    {activeReservations.map((reservation) => (
                      <option key={reservation.reservationId} value={reservation.reservationId}>
                        {reservation.puppy} · {reservation.buyer} · Balance {reservation.balance}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Entry type
                    <select
                      name="entryType"
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    >
                      <option value="deposit">Deposit</option>
                      <option value="payment">Payment</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Amount received
                    <input
                      type="text"
                      inputMode="decimal"
                      name="amountDollars"
                      placeholder="500.00"
                      required
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Method
                    <input
                      type="text"
                      name="paymentMethod"
                      maxLength={100}
                      placeholder="Cash, Good Dog, etc."
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    External reference
                    <input
                      type="text"
                      name="externalReference"
                      maxLength={100}
                      placeholder="Optional receipt/reference"
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    name="notes"
                    maxLength={1000}
                    rows={3}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  />
                </label>

                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  Record Local Payment
                </button>
              </form>
            ) : (
              <EmptyList text="No active reservations are available for local payment entry." />
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Financial Ledger Activity</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Read-only Core ledger activity visible to the current staff role.
              </p>
            </div>

            {canViewFinancials ? (
              <div className="space-y-3">
                {dashboard.ledgerActivity.length > 0 ? (
                  dashboard.ledgerActivity.map((entry) => (
                    <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{entry.buyer}</p>
                          <p className="mt-1 text-sm text-slate-600">{entry.puppy} · {entry.buyerEmail}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge>{entry.type}</StatusBadge>
                          <StatusBadge>{entry.balanceEffect}</StatusBadge>
                          <StatusBadge>{entry.status}</StatusBadge>
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{entry.amount}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</dt>
                          <dd className="mt-1 text-slate-700">{entry.category}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Occurred</dt>
                          <dd className="mt-1 text-slate-700">{entry.occurredAt}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservation</dt>
                          <dd className="mt-1 font-mono text-slate-700">{entry.reservationId}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reference</dt>
                          <dd className="mt-1 text-slate-700">{entry.externalReference}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Related ledger</dt>
                          <dd className="mt-1 font-mono text-slate-700">{entry.relatedLedgerId}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{entry.description}</p>
                    </article>
                  ))
                ) : (
                  <EmptyList text="No ledger activity rows are visible for the current local data." />
                )}
              </div>
            ) : (
              <RestrictedPanel text="Financial ledger activity is restricted to owner/admin during this phase." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
