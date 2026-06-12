import Link from "next/link";
import { getDashboardData } from "./dashboard-data";
import type { StaffProfile } from "@/lib/staff-auth";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SearchParams = {
  application?: string;
  approval?: string;
  reservation?: string;
  payment?: string;
  cancellation?: string;
};

const workspaceLinks = [
  { href: "/staff/applications", label: "Applications", helper: "Review, approve, and reserve" },
  { href: "/staff/reservations", label: "Reservations", helper: "Balances, payments, cancellations" },
  { href: "/staff/payments", label: "Payments", helper: "Core ledger entry and activity" },
  { href: "/staff/notifications", label: "Notifications", helper: "Templates, rules, attempt logs" },
] as const;

function StatusBadge({ children }: { children: ReactNode }) {
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
  children: ReactNode;
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

function RestrictedPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <p className="font-semibold">Restricted to owner/admin</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}

function TaskList({
  tasks,
  emptyText,
}: {
  tasks: {
    id: string;
    title: string;
    detail: string;
    meta: string;
    tone: string;
    links: {
      href: string;
      label: string;
    }[];
  }[];
  emptyText: string;
}) {
  if (tasks.length === 0) {
    return <EmptyList text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <article key={task.id} className={`rounded-2xl border p-4 ${task.tone}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-sm leading-6">{task.detail}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-75">{task.meta}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {task.links.map((link) => (
                <Link
                  key={`${task.id}-${link.href}-${link.label}`}
                  href={link.href}
                  className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkflowNotice({ searchParams }: { searchParams: SearchParams }) {
  const notices = [
    notice(searchParams.application, {
      created: ["success", "Application created. Application received notification queued for preview only; no email was sent."],
      "created-no-notification": ["success", "Application created. No applicant email was supplied, so no email-channel notification was queued."],
      "created-notification-warning": ["warning", "Application created, but the preview-only notification could not be queued. No email was sent."],
    }),
    notice(searchParams.approval, {
      success: ["success", "Application approved. No email was sent."],
      unauthorized: ["warning", "Your role cannot approve applications."],
      invalid_input: ["warning", "Application approval could not run because the submitted application reference was invalid."],
      not_eligible: ["warning", "Application approval was blocked because the application is not in an approvable status."],
      missing_links: ["warning", "Application approval could not continue because required linked records were missing."],
      rpc_failed: ["error", "Application approval RPC failed. Check the deployed Core action before retrying."],
      config_missing: ["error", "Core server action configuration is incomplete for application approval."],
      save_failed: ["error", "Application approval failed. Review the server action log for safe details."],
      error: ["error", "Application approval failed. Review the server action log for safe details."],
    }),
    notice(searchParams.reservation, {
      success: ["success", "Reservation created. Puppy status is now reserved; no payment was recorded."],
      unauthorized: ["warning", "Your role cannot create reservations."],
      invalid_input: ["warning", "Reservation creation needs valid application, puppy, and amount inputs."],
      invalid_money: ["warning", "Reservation creation needs a valid contract total and deposit amount."],
      invalid_amounts: ["warning", "Reservation deposit cannot be greater than the contract total."],
      not_eligible: ["warning", "Reservation creation was blocked because the application or puppy is not eligible."],
      missing_links: ["warning", "Reservation creation needs linked buyer and family records."],
      blocked: ["warning", "Reservation creation was blocked because the puppy already has an active reservation."],
      rpc_failed: ["error", "Reservation creation RPC failed. Check the deployed Core action before retrying."],
      config_missing: ["error", "Core server action configuration is incomplete for reservation creation."],
      save_failed: ["error", "Reservation creation failed. Review the server action log for safe details."],
      error: ["error", "Reservation creation failed. Review the server action log for safe details."],
    }),
    notice(searchParams.payment, {
      success: ["success", "Deposit/payment recorded in Core. Balance due has been refreshed from the ledger."],
      unauthorized: ["warning", "Your role cannot record deposits or payments."],
      invalid_input: ["warning", "Payment entry needs a valid reservation, entry type, and optional detail lengths."],
      invalid_money: ["warning", "Payment entry needs a valid positive amount."],
      not_found: ["warning", "Payment entry could not find the selected reservation."],
      not_eligible: ["warning", "The selected reservation cannot accept a recorded deposit/payment."],
      rpc_failed: ["error", "Payment recording RPC failed. Check the deployed Core action before retrying."],
      config_missing: ["error", "Core server action configuration is incomplete for payment recording."],
      save_failed: ["error", "Payment recording failed. Review the server action log for safe details."],
      error: ["error", "Payment recording failed. Review the server action log for safe details."],
    }),
    notice(searchParams.cancellation, {
      success: ["success", "Reservation cancelled in Core. No refund was issued and ledger history was not modified."],
      unauthorized: ["warning", "Your role cannot cancel reservations."],
      invalid_input: ["warning", "Reservation cancellation needs valid bounded inputs."],
      invalid_reason: ["warning", "Reservation cancellation needs a reason before saving."],
      not_found: ["warning", "Reservation cancellation could not find the selected reservation."],
      not_eligible: ["warning", "The selected reservation cannot be cancelled from its current status."],
      rpc_failed: ["error", "Reservation cancellation RPC failed. Check the deployed Core action before retrying."],
      config_missing: ["error", "Core server action configuration is incomplete for cancellation."],
      save_failed: ["error", "Reservation cancellation failed. Review the server action log for safe details."],
      error: ["error", "Reservation cancellation failed. Review the server action log for safe details."],
    }),
  ].filter((item): item is { tone: "success" | "warning" | "error"; text: string } => Boolean(item));

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {notices.map((item) => (
        <p
          key={item.text}
          className={`rounded-2xl border p-3 text-sm ${
            item.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : item.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {item.text}
        </p>
      ))}
    </div>
  );
}

function notice(
  value: string | undefined,
  messages: Record<string, ["success" | "warning" | "error", string]>,
) {
  if (!value || !messages[value]) return null;
  const [tone, text] = messages[value];
  return { tone, text };
}

export default async function CoreDashboard({
  searchParams,
  staff,
}: {
  searchParams: Promise<SearchParams>;
  staff: StaffProfile;
}) {
  const dashboard = await getDashboardData(staff);
  const resolvedSearchParams = await searchParams;

  return (
    <main className="operator-workspace min-h-screen px-4 pb-12 pt-5 text-slate-950 sm:px-6 lg:px-8">
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
              This overview reads Core operational data server-side. Detailed owner/operator workspaces now live in dedicated pages so the left navigation remains the single workspace navigation.
            </p>
          </div>
        )}

        {staff.role === "staff" ? (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm sm:p-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Staff operational read scope
            </p>
            <p className="mt-2 text-sm leading-6">
              Staff can see application, puppy, reservation, and go-home workflow basics. Sensitive financial ledger details, phone lookup, full audit activity, and the general event feed remain restricted.
            </p>
          </div>
        ) : null}

        <WorkflowNotice searchParams={resolvedSearchParams} />

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Southwest Virginia Chihuahua
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Core Operational Overview
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Core is the governed operator layer for the business. This page is the overview; detailed owner/operator workspaces live in dedicated pages so the left navigation remains the single workspace navigation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge>Overview</StatusBadge>
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
              <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stat.tone}`}>
                {stat.label}
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-950">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500">{stat.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {workspaceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <p className="text-lg font-semibold text-slate-950">{link.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{link.helper}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Today&apos;s Care Checklist
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                Kennel Daily Task Board
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                This board is an internal owner/operator checklist only. It does not diagnose puppies, send messages, process payments, generate documents, publish listings, update the portal, or call external providers.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
              {dashboard.taskBoard.totalTasks} task{dashboard.taskBoard.totalTasks === 1 ? "" : "s"} from current Core metadata
            </div>
          </div>

          {dashboard.taskBoard.totalTasks === 0 ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">
              No urgent tasks found from current Core metadata.
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-950">Newborn / Puppy Care Today</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Recent litter puppies with missing today weight, latest weight, or deterministic watch flags.</p>
              </div>
              <TaskList tasks={dashboard.taskBoard.newbornPuppyCare} emptyText="No newborn puppy care tasks found from current weight and care metadata." />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-950">Expected Litters / Whelping Prep</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Upcoming expected litters and setup flags from existing litter records.</p>
              </div>
              <TaskList tasks={dashboard.taskBoard.expectedLitters} emptyText="No expected litter prep tasks found from current litter metadata." />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-950">Go-Home Readiness Today / Upcoming</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Upcoming go-home records plus payment, document, and checklist blockers where available.</p>
              </div>
              <TaskList tasks={dashboard.taskBoard.goHomeReadiness} emptyText="No go-home readiness tasks found from current reservation metadata." />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-950">Payment / Document / Communication Attention</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Read-only attention items. No sending, payment processing, or document generation is connected.</p>
              </div>
              <TaskList tasks={dashboard.taskBoard.accountAttention} emptyText="No payment, document, or communication attention items found from current metadata." />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-2">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-950">Kennel Record Maintenance</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Dogs, litters, and puppies with safely derivable missing basic metadata. No automatic changes are made.</p>
              </div>
              <TaskList tasks={dashboard.taskBoard.kennelMaintenance} emptyText="No kennel record maintenance tasks found from current dog, litter, and puppy metadata." />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Recent Applications"
            description="Latest Core applications. Use the Applications workspace for approval and reservation creation."
          >
            <div className="space-y-3">
              {dashboard.applications.length > 0 ? (
                dashboard.applications.slice(0, 5).map((application) => (
                  <div
                    key={application.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{application.applicant}</p>
                          <StatusBadge>{application.status}</StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{application.email}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {application.source} · {application.reference}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{application.submitted}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyList text="No application rows found in Core yet." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Reservation Snapshot"
            description="Latest reservation rows and ledger-derived balances. Use the Reservations or Payments workspace for actions."
          >
            <div className="space-y-3">
              {dashboard.reservations.length > 0 ? (
                dashboard.reservations.slice(0, 5).map((reservation) => (
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
                        <StatusBadge>Balance {reservation.balance}</StatusBadge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyList text="No reservation rows found in Core yet." />
              )}
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="Foundation Verification">
            <div className="grid gap-3">
              {dashboard.foundationChecks.map((check) => (
                <div
                  key={check}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">✓</span>
                  {check}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Upcoming Go-Homes">
            <div className="space-y-3">
              {dashboard.goHomes.length > 0 ? (
                dashboard.goHomes.slice(0, 5).map((goHome) => (
                  <div
                    key={`${goHome.puppy}-${goHome.buyer}-${goHome.time}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-950">{goHome.puppy}</p>
                    <p className="mt-1 text-sm text-slate-600">{goHome.buyer} · {goHome.time}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge>{goHome.source}</StatusBadge>
                      <StatusBadge>{goHome.status}</StatusBadge>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyList text="No go-home rows found in the Core effective view." />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Still Offline">
            <div className="space-y-3">
              {dashboard.emptyStates.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Recent Events"
            description="Owner/admin-only event feed preview."
          >
            {!dashboard.readScopes.canViewEventFeed ? (
              <RestrictedPanel text="The general event feed can include sensitive workflow details, so it is restricted to owner/admin." />
            ) : dashboard.events.length > 0 ? (
              <div className="space-y-3">
                {dashboard.events.slice(0, 5).map((event) => (
                  <div
                    key={`${event.type}-${event.when}-${event.summary}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge>{event.type}</StatusBadge>
                      <span className="text-xs font-semibold text-slate-500">{event.when}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">{event.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyList text="No event rows found in Core yet." />
            )}
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
        </section>
      </div>
    </main>
  );
}

