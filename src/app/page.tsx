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

export default async function Home() {
  const dashboard = await getDashboardData();
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
                  still has no dashboard write actions, no public customer portal,
                  and no live external integrations.
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
                    {dashboard.applications.length > 0 ? (
                      dashboard.applications.map((application) => (
                        <div
                          key={application.id}
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                        >
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
                      ))
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
                  title="Reservations"
                  description="Read from Core reservations with buyer, puppy, and ledger balance summaries."
                >
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    {dashboard.reservations.length > 0 ? (
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Puppy</th>
                            <th className="px-4 py-3">Buyer</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {dashboard.reservations.map((reservation) => (
                            <tr key={`${reservation.puppy}-${reservation.buyer}`}>
                              <td className="px-4 py-4 font-semibold text-slate-950">
                                {reservation.puppy}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {reservation.buyer}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge>{reservation.status}</StatusBadge>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-950">
                                {reservation.balance}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4">
                        <EmptyList text="No reservation rows found in local Supabase." />
                      </div>
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
