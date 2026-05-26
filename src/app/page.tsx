const stats = [
  {
    label: "Applications",
    value: "7",
    helper: "3 need review",
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  {
    label: "Reserved Puppies",
    value: "12",
    helper: "5 go-home soon",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  {
    label: "Balance Due",
    value: "$18,450",
    helper: "ledger-derived total",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  {
    label: "Today",
    value: "14",
    helper: "feed items",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
];

const navigation = [
  "Dashboard",
  "Applications",
  "Buyers",
  "Families",
  "Dogs",
  "Litters",
  "Puppies",
  "Reservations",
  "Payments",
  "Go-Home",
  "Documents",
  "Messages",
  "Phone Lookup",
  "Kennel Logs",
  "Events",
];

const goHomes = [
  {
    puppy: "Luna Test Puppy",
    buyer: "Sarah Test Buyer",
    time: "May 30, 2:00 PM",
    source: "Group default",
    status: "Scheduled",
  },
  {
    puppy: "Nova Test Puppy",
    buyer: "Sarah Test Buyer",
    time: "May 30, 5:00 PM",
    source: "Individual override",
    status: "Review",
  },
  {
    puppy: "Blue Boy",
    buyer: "Miller Family",
    time: "Jun 2, 11:00 AM",
    source: "Ungrouped detail",
    status: "Pending",
  },
];

const reservations = [
  {
    puppy: "Pink Girl",
    buyer: "Davis Family",
    status: "Deposit paid",
    balance: "$1,500 due",
  },
  {
    puppy: "Luna Test Puppy",
    buyer: "Sarah Test Buyer",
    status: "Reserved",
    balance: "$1,530 due",
  },
  {
    puppy: "Cream Girl",
    buyer: "Watson Family",
    status: "Contract sent",
    balance: "$2,000 due",
  },
];

const phoneLookups = [
  {
    phone: "+1 (276) 555-0101",
    result: "Unambiguous match",
    detail: "Safe context available after server validation",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    phone: "+1 (276) 555-0102",
    result: "Ambiguous match",
    detail: "Sensitive details redacted; route to staff",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
];

const kennelNotes = [
  "Weight log due for Ember litter",
  "Pupdate draft needed for reserved puppies",
  "Medication reminder requires staff confirmation",
  "No AI write actions are enabled",
];

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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-950 px-5 py-6 text-white lg:block">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
              Cherolee
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Core</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Unified business and kennel command center.
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => (
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

        <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                  Southwest Virginia Chihuahua
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Cherolee Core Dashboard
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  Read-only shell for the future operating dashboard. This screen
                  uses safe placeholder data while Core read models, RLS, imports,
                  and write tools remain controlled and separate.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge>Read-only</StatusBadge>
                <StatusBadge>No production data</StatusBadge>
                <StatusBadge>No live integrations</StatusBadge>
              </div>
            </div>
          </header>

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
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

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <SectionCard
                title="Upcoming Go-Homes"
                description="Resolved from the effective go-home read model: group defaults, individual overrides, or ungrouped details."
              >
                <div className="space-y-3">
                  {goHomes.map((goHome) => (
                    <div
                      key={`${goHome.puppy}-${goHome.time}`}
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
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Reservations"
                description="Future dashboard rows should come from Core reservation, puppy, buyer, and payment summary views."
              >
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Puppy</th>
                        <th className="px-4 py-3 font-semibold">Buyer</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {reservations.map((reservation) => (
                        <tr key={`${reservation.puppy}-${reservation.buyer}`}>
                          <td className="px-4 py-3 font-medium text-slate-950">
                            {reservation.puppy}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {reservation.buyer}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {reservation.status}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-950">
                            {reservation.balance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Phone Lookup Safety"
                description="Ambiguous phone matches must redact puppy, payment, and go-home context until verification or staff routing exists."
              >
                <div className="space-y-3">
                  {phoneLookups.map((lookup) => (
                    <div
                      key={lookup.phone}
                      className={`rounded-2xl border p-4 ${lookup.tone}`}
                    >
                      <p className="text-sm font-semibold">{lookup.phone}</p>
                      <p className="mt-2 text-base font-bold">{lookup.result}</p>
                      <p className="mt-1 text-sm leading-6">{lookup.detail}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Kennel Notes"
                description="Kennel workflows stay read-only until validated write tools and audit rules are approved."
              >
                <ul className="space-y-3">
                  {kennelNotes.map((note) => (
                    <li
                      key={note}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Next Build Gate">
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
                    Before live data
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-200">
                    Connect this dashboard to Supabase only after read models,
                    access rules, and safe server-side data loading are reviewed.
                    No customer-facing portal, phone routing, payments, or document
                    generation should be enabled from this shell.
                  </p>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
