import {
  approveApplication,
  createReservation,
  recordReservationPayment,
} from "./application-actions";
import { getDashboardData } from "./dashboard-data";

export const dynamic = "force-dynamic";

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {text}
    </div>
  );
}

function ApprovalResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Application approved. No email was sent.
      </p>
    );
  }

  if (outcome === "not_eligible") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Only received or needs review applications can be approved.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Application approval failed. Check local approval configuration and try again.
      </p>
    );
  }

  return null;
}

function ReservationResult({ outcome }: { outcome: string | undefined }) {
  if (outcome === "success") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Reservation created. Puppy status is now reserved; no payment was recorded.
      </p>
    );
  }

  if (outcome === "not_approved") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Reservation creation requires an approved application.
      </p>
    );
  }

  if (outcome === "missing_links") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Reservation creation requires matched buyer and family records.
      </p>
    );
  }

  if (outcome === "puppy_unavailable") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        The selected puppy is no longer available for reservation.
      </p>
    );
  }

  if (outcome === "invalid_amounts") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Deposit required cannot exceed the contract total.
      </p>
    );
  }

  if (outcome === "invalid_money") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Enter dollar amounts using numbers with up to two decimal places, such as 2000.00.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Reservation creation failed. Check local server logs for details.
      </p>
    );
  }

  return null;
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

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Deposit/payment recording failed. Check local server logs for details.
      </p>
    );
  }

  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ approval?: string; reservation?: string; payment?: string }>;
}) {
  const dashboard = await getDashboardData();
  const { approval, reservation, payment } = await searchParams;
  const latestApplicationReference = dashboard.applicationSections[0]?.applicationReference;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="lg:flex lg:min-h-screen">
        <aside className="hidden border-r border-slate-800 bg-slate-950 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:px-5 lg:py-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
              Cherolee
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Core</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Unified business and kennel command center.
            </p>
          </div>

          <nav className="space-y-1 pb-8">
            {dashboard.navigation.map((item) => (
              <div
                key={item}
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  item === "Dashboard"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 px-4 pb-12 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px] space-y-6">
            {dashboard.dataWarning ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm sm:p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                  Dashboard data warning
                </p>
                <p className="mt-2 text-sm leading-6">{dashboard.dataWarning}</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm sm:p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                  {dashboard.dataSourceLabel}
                </p>
                <p className="mt-2 text-sm leading-6">
                  This dashboard is reading local Supabase data server-side. It
                  has guarded local/dev write actions for approved workflows;
                  customer access, production writes, and live external integrations
                  remain off.
                </p>
              </div>
            )}

            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                    Southwest Virginia Chihuahua
                  </p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    Cherolee Core Dashboard
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                    Read-only operating dashboard backed by local Core Supabase
                    tables and verified read models. Write tools, live imports,
                    customer access, payments, documents, and messaging remain
                    controlled separately.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge>Read-only</StatusBadge>
                  <StatusBadge>Server-side data</StatusBadge>
                  <StatusBadge>No live integrations</StatusBadge>
                </div>
              </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stat.tone}`}
                  >
                    {stat.label}
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{stat.helper}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <SectionCard
                title="Foundation Verification"
                description="Current local checkpoint before authenticated dashboard actions."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {dashboard.foundationChecks.map((check) => (
                    <div
                      key={check}
                      className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                        ✓
                      </span>
                      {check}
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Build Boundary">
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
                    Current dashboard scope
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-200">
                    Local read-only Supabase data is allowed here. No dashboard
                    writes, no customer portal, no live Zoho cutover, no Twilio
                    routing, no payment processor, and no document generation are
                    enabled from this shell.
                  </p>
                </div>
              </SectionCard>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <SectionCard
                  title="Received Applications"
                  description="Latest local Core applications imported from guarded intake or smoke data."
                >
                  <div className="space-y-3">
                    <ApprovalResult outcome={approval} />
                    <ReservationResult outcome={reservation} />
                    {dashboard.applications.length > 0 ? (
                      dashboard.applications.map((application) => {
                        const canApprove = ["received", "needs_review"].includes(
                          application.status.toLowerCase(),
                        );

                        return (
                          <div
                            key={application.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-950">
                                    {application.applicant}
                                  </p>
                                  <StatusBadge>{application.status}</StatusBadge>
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                  {application.email}
                                </p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {application.source} · {application.reference}
                                </p>
                              </div>
                              <div className="text-sm font-semibold text-slate-500 lg:text-right">
                                {application.submitted}
                              </div>
                            </div>
                            {canApprove ? (
                              <form action={approveApplication} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                <input type="hidden" name="applicationId" value={application.id} />
                                <label className="block text-sm font-medium text-slate-700">
                                  Decision notes (optional)
                                  <textarea
                                    name="decisionNotes"
                                    maxLength={1000}
                                    rows={2}
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                                <button
                                  type="submit"
                                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  Approve Application
                                </button>
                              </form>
                            ) : null}
                            {application.status.toLowerCase() === "approved" &&
                            application.hasReservationContext ? (
                              <form action={createReservation} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                <input type="hidden" name="applicationId" value={application.id} />
                                <label className="block text-sm font-medium text-slate-700">
                                  Available puppy
                                  <select
                                    name="puppyId"
                                    required
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  >
                                    <option value="">Select a puppy</option>
                                    {dashboard.availablePuppies.map((puppy) => (
                                      <option key={puppy.id} value={puppy.id}>
                                        {puppy.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block text-sm font-medium text-slate-700">
                                    Contract total (dollars)
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      name="contractTotalDollars"
                                      placeholder="2000.00"
                                      required
                                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                    />
                                  </label>
                                  <label className="block text-sm font-medium text-slate-700">
                                    Deposit required (dollars, optional)
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      name="depositRequiredDollars"
                                      placeholder="500.00"
                                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                    />
                                  </label>
                                </div>
                                <label className="block text-sm font-medium text-slate-700">
                                  Sale type (optional)
                                  <input
                                    type="text"
                                    name="saleType"
                                    maxLength={100}
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-700">
                                  Reservation notes (optional)
                                  <textarea
                                    name="notes"
                                    maxLength={1000}
                                    rows={2}
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                                <button
                                  type="submit"
                                  disabled={dashboard.availablePuppies.length === 0}
                                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                  Create Reservation
                                </button>
                              </form>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <EmptyList text="No application rows found in local Supabase." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Latest Application Detail"
                  description={
                    latestApplicationReference
                      ? `Read-only section responses for ${latestApplicationReference}.`
                      : "Read-only section responses for the latest imported application."
                  }
                >
                  <div className="space-y-4">
                    {dashboard.applicationSections.length > 0 ? (
                      dashboard.applicationSections.map((section) => (
                        <div
                          key={`${section.applicationId}-${section.sectionKey}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {section.sectionLabel}
                              </p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {section.sectionKey}
                              </p>
                            </div>
                            <StatusBadge>{section.status}</StatusBadge>
                          </div>
                          {section.responses.length > 0 ? (
                            <dl className="grid gap-2 sm:grid-cols-2">
                              {section.responses.map((response) => (
                                <div
                                  key={`${section.sectionKey}-${response.label}`}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    {response.label}
                                  </dt>
                                  <dd className="mt-1 text-sm leading-6 text-slate-700">
                                    {response.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <EmptyList text="This section has no stored responses." />
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyList text="No application section responses found for the latest local application." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Upcoming Go-Homes"
                  description="Read from the effective go-home view."
                >
                  <div className="space-y-3">
                    {dashboard.goHomes.length > 0 ? (
                      dashboard.goHomes.map((goHome) => (
                        <div
                          key={`${goHome.puppy}-${goHome.buyer}-${goHome.time}`}
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">
                              {goHome.puppy}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {goHome.buyer} · {goHome.time}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <StatusBadge>{goHome.source}</StatusBadge>
                            <StatusBadge>{goHome.status}</StatusBadge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyList text="No go-home rows found in the local effective view." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Reservation Workflow Status"
                  description="Latest local/development reservations from the Core reservation summary read model."
                >
                  <div className="space-y-3">
                    <PaymentResult outcome={payment} />
                    {dashboard.reservations.length > 0 ? (
                      dashboard.reservations.map((reservation) => {
                        const canRecordPayment = !["cancelled", "void", "released"].includes(
                          reservation.status.toLowerCase(),
                        );

                        return (
                        <div
                          key={reservation.reservationId}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{reservation.puppy}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {reservation.buyer} · {reservation.buyerEmail}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge>{reservation.status}</StatusBadge>
                              <StatusBadge>Puppy: {reservation.puppyStatus}</StatusBadge>
                            </div>
                          </div>
                          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservation</dt>
                              <dd className="mt-1 text-slate-700">{reservation.id}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Application</dt>
                              <dd className="mt-1 text-slate-700">{reservation.applicationReference}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reserved</dt>
                              <dd className="mt-1 text-slate-700">{reservation.reservedAt}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contract Total</dt>
                              <dd className="mt-1 font-semibold text-slate-950">{reservation.contractTotal}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deposit Required</dt>
                              <dd className="mt-1 font-semibold text-slate-950">{reservation.depositRequired}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance Due</dt>
                              <dd className="mt-1 font-semibold text-slate-950">{reservation.balance}</dd>
                            </div>
                          </dl>
                          {canRecordPayment ? (
                            <form action={recordReservationPayment} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                              <input type="hidden" name="reservationId" value={reservation.reservationId} />
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Local/development payment recording only
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  Transaction type
                                  <select
                                    name="entryType"
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  >
                                    <option value="deposit">Deposit</option>
                                    <option value="payment">Payment</option>
                                  </select>
                                </label>
                                <label className="block text-sm font-medium text-slate-700">
                                  Amount received (dollars)
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    name="amountDollars"
                                    placeholder="500.00"
                                    required
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-700">
                                  Payment method (optional)
                                  <input
                                    type="text"
                                    name="paymentMethod"
                                    maxLength={100}
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-700">
                                  External reference (optional)
                                  <input
                                    type="text"
                                    name="externalReference"
                                    maxLength={255}
                                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                  />
                                </label>
                              </div>
                              <label className="block text-sm font-medium text-slate-700">
                                Notes (optional)
                                <textarea
                                  name="notes"
                                  maxLength={1000}
                                  rows={2}
                                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                                />
                              </label>
                              <button
                                type="submit"
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Record Deposit/Payment
                              </button>
                            </form>
                          ) : null}
                        </div>
                        );
                      })
                    ) : (
                      <EmptyList text="No local/development reservations found yet. Approve an application and create a reservation to verify this workflow." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Latest Events"
                  description="Recent Core event feed from local Supabase."
                >
                  <div className="space-y-3">
                    {dashboard.events.length > 0 ? (
                      dashboard.events.map((event) => (
                        <div
                          key={`${event.type}-${event.when}-${event.summary}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge>{event.type}</StatusBadge>
                            <span className="text-xs font-semibold text-slate-500">
                              {event.when}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {event.summary}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyList text="No event rows found in local Supabase." />
                    )}
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard
                  title="Phone Lookup Safety"
                  description="Read from the phone lookup summary view."
                >
                  <div className="space-y-3">
                    {dashboard.phoneLookups.length > 0 ? (
                      dashboard.phoneLookups.map((lookup) => (
                        <div
                          key={lookup.phone}
                          className={`rounded-2xl border p-4 ${lookup.tone}`}
                        >
                          <p className="text-sm font-bold">{lookup.phone}</p>
                          <p className="mt-1 text-sm font-semibold">
                            {lookup.result}
                          </p>
                          <p className="mt-1 text-sm opacity-80">{lookup.detail}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyList text="No phone lookup summary rows found locally." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Kennel / Staff Notes">
                  <div className="space-y-3">
                    {dashboard.kennelNotes.map((note) => (
                      <div
                        key={note}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Still Offline">
                  <div className="space-y-3">
                    {dashboard.emptyStates.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
