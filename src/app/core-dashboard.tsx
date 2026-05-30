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
  { href: "/staff/payments", label: "Payments", helper: "Local ledger entry and activity" },
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

function WorkflowNotice({ searchParams }: { searchParams: SearchParams }) {
  const notices = [
    searchParams.application === "created"
      ? "Application created. Application received notification queued for preview only; no email was sent."
      : null,
    searchParams.application === "created-no-notification"
      ? "Application created. No applicant email was supplied, so no email-channel notification was queued."
      : null,
    searchParams.application === "created-notification-warning"
      ? "Application created, but the preview-only notification could not be queued. No email was sent."
      : null,
    searchParams.approval === "success" ? "Application approved. No email was sent." : null,
    searchParams.reservation === "success"
      ? "Reservation created. Puppy status is now reserved; no payment was recorded."
      : null,
    searchParams.payment === "success"
      ? "Deposit/payment recorded locally. Balance due has been refreshed from the ledger."
      : null,
    searchParams.cancellation === "success"
      ? "Reservation cancelled locally. No refund was issued and ledger history was not modified."
      : null,
  ].filter(Boolean);

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {notices.map((notice) => (
        <p
          key={notice}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      ))}
    </div>
  );
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
    <main className="min-h-screen bg-slate-100 px-4 pb-12 pt-5 text-slate-950 sm:px-6 lg:px-8">
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
              This overview reads local Core data server-side. The detailed staff workspaces now live in dedicated pages so the top navigation is the single workspace navigation.
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
                Cherolee Core Overview
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Core is the autonomous operator layer being built to help run the business. This page is now the overview only; the staff operating work happens in the dedicated workspace pages above.
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

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Recent Applications"
            description="Latest local Core applications. Use the Applications workspace for approval and reservation creation."
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
                <EmptyList text="No application rows found in local Supabase." />
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
                <EmptyList text="No reservation rows found in local Supabase." />
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
                <EmptyList text="No go-home rows found in the local effective view." />
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
              <EmptyList text="No event rows found in local Supabase." />
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
