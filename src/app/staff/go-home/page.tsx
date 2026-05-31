import Link from "next/link";
import { updateGoHomeDetail } from "../../application-actions";
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

function ReadinessItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span
        className={
          ready
            ? "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
            : "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
        }
      >
        {ready ? "✓" : "!"}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {ready ? "Readable in Core." : "Needs staff review before customer handoff."}
        </p>
      </div>
    </div>
  );
}

function GoHomeResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Go-home detail saved locally in Core. No customer message, document, payment, or external system was triggered.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot update go-home details.
      </p>
    );
  }

  if (outcome === "invalid_datetime") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Enter a valid go-home date/time or leave it blank.
      </p>
    );
  }

  if (outcome === "invalid_input") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Check the selected reservation, method, status, checklist, balance marker, and note lengths.
      </p>
    );
  }

  if (outcome === "not_found" || outcome === "not_eligible") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        The selected reservation cannot receive a go-home update.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Go-home update failed. Check local server logs for details.
      </p>
    );
  }

  return null;
}

export default async function StaffGoHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    goHome?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const dashboard = await getDashboardData(staff);
  const { goHome } = await searchParams;
  const scheduledGoHomes = dashboard.goHomes.filter((goHomeRow) => goHomeRow.time !== "Not scheduled");
  const unscheduledGoHomes = dashboard.goHomes.filter((goHomeRow) => goHomeRow.time === "Not scheduled");
  const activeReservations = dashboard.reservations.filter(
    (reservation) => !["cancelled", "void", "released"].includes(reservation.status.toLowerCase()),
  );
  const canUpdateGoHome = staff.role === "owner" || staff.role === "admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Go-Home
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Go-Home Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Staff workspace for pickup or delivery timing, schedule source, reservation handoff readiness, and next-step planning. Customer messages, documents, payment actions, and external integrations remain disconnected.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/reservations" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/payments" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Payments
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
            Go-home saves are Core-only records. They do not send customer reminders, generate documents, clear balances, charge payments, contact transport, or touch any external system.
          </p>
        </section>

        <GoHomeResult outcome={goHome} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Go-home rows</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.goHomes.length}</p>
            <p className="mt-2 text-sm text-slate-500">Effective Core records</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduled</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{scheduledGoHomes.length}</p>
            <p className="mt-2 text-sm text-slate-500">Have a go-home time</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Needs scheduling</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{unscheduledGoHomes.length}</p>
            <p className="mt-2 text-sm text-slate-500">No time recorded yet</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">External systems</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">Off</p>
            <p className="mt-2 text-sm text-slate-500">No email, SMS, payment, or document action</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Set Go-Home Detail</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Owner/admin controlled local Core update for one active reservation. This creates or updates the current ungrouped go-home detail.
                </p>
              </div>

              {canUpdateGoHome ? (
                activeReservations.length > 0 ? (
                  <form action={updateGoHomeDetail} className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Reservation
                      <select name="reservationId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                        <option value="">Select reservation</option>
                        {activeReservations.map((reservation) => (
                          <option key={reservation.reservationId} value={reservation.reservationId}>
                            {reservation.puppy} · {reservation.buyer} · {reservation.status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Method
                        <select name="method" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                          <option value="">Not set</option>
                          <option value="pickup">Pickup</option>
                          <option value="delivery">Delivery</option>
                          <option value="meetup">Meetup</option>
                          <option value="transport">Transport</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Go-home date/time
                        <input type="datetime-local" name="plannedAt" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                      Location
                      <input type="text" name="location" maxLength={500} placeholder="Meeting place, pickup address, or delivery notes" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Status
                        <select name="status" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                          <option value="pending">Pending</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="ready">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="delayed">Delayed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Checklist
                        <select name="checklistStatus" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                          <option value="">Not set</option>
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="needs_review">Needs review</option>
                          <option value="complete">Complete</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Balance marker
                        <select name="balanceClearedStatus" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                          <option value="">Not set</option>
                          <option value="unknown">Unknown</option>
                          <option value="not_cleared">Not cleared</option>
                          <option value="pending_review">Pending review</option>
                          <option value="cleared">Cleared</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                      Contact notes
                      <textarea name="contactNotes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Puppy/reservation notes
                      <textarea name="individualNotes" maxLength={1000} rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                    </label>

                    <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                      Save Go-Home Detail
                    </button>
                  </form>
                ) : (
                  <EmptyList text="No active reservations are available for go-home scheduling." />
                )
              ) : (
                <EmptyList text="Go-home updates are owner/admin only. Staff can review the read-only go-home workspace after records exist." />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Upcoming Go-Home Records</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Effective schedule rows from Core. Group schedules and individual overrides are already resolved before this page displays them.
                </p>
              </div>

              <div className="space-y-4">
                {dashboard.goHomes.length > 0 ? (
                  dashboard.goHomes.map((goHomeRow) => (
                    <article key={`${goHomeRow.puppy}-${goHomeRow.buyer}-${goHomeRow.time}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{goHomeRow.puppy}</p>
                          <p className="mt-1 text-sm text-slate-600">{goHomeRow.buyer}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge>{goHomeRow.status}</StatusBadge>
                          <StatusBadge>{goHomeRow.source}</StatusBadge>
                        </div>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Go-home time</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{goHomeRow.time}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Schedule source</dt>
                          <dd className="mt-1 text-slate-700">{goHomeRow.source}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
                          <dd className="mt-1 text-slate-700">{goHomeRow.status}</dd>
                        </div>
                      </dl>
                    </article>
                  ))
                ) : (
                  <EmptyList text="No go-home rows found in local Core yet." />
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Readiness Lane</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This page checks whether Core can display and update the pieces needed before go-home handoff workflows expand.
                </p>
              </div>
              <div className="space-y-3">
                <ReadinessItem label="Reservations are readable" ready={dashboard.reservations.length > 0} />
                <ReadinessItem label="Go-home read model is connected" ready={dashboard.goHomes.length > 0} />
                <ReadinessItem label="Ledger-derived balance remains separate" ready />
                <ReadinessItem label="No customer messages are sent" ready />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Next Controlled Features</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• Add a staff-facing go-home checklist workflow.</li>
                <li>• Add document and communication handoff rules after message safety stays verified.</li>
                <li>• Keep customer-facing go-home visibility blocked until portal access rules exist.</li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
