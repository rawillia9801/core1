import Link from "next/link";
import { approveApplication, createReservation } from "../../application-actions";
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

function ResultMessage({ outcome }: { outcome: string | undefined }) {
  if (outcome === "created") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Core-native application created. Application received notification queued for preview only; no email was sent.
      </p>
    );
  }

  if (outcome === "created-no-notification") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Core-native application created. No applicant email was supplied, so no email-channel notification was queued.
      </p>
    );
  }

  if (outcome === "created-notification-warning") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Core-native application created, but the preview-only notification could not be queued. No email was sent.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Manual application entry is restricted to owner/admin.
      </p>
    );
  }

  if (outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Application workflow action failed. Check local server logs for details.
      </p>
    );
  }

  return null;
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
        Only received or needs-review applications can be approved.
      </p>
    );
  }

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot approve applications.
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

  if (outcome === "unauthorized") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Your staff role cannot create reservations.
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

export default async function StaffApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    application?: string;
    approval?: string;
    reservation?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const dashboard = await getDashboardData(staff);
  const { application, approval, reservation } = await searchParams;
  const isOwnerOrAdmin = staff.role === "owner" || staff.role === "admin";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Applications
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Application Workspace
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Dedicated staff workspace for Core-native applications. Core is the autonomous operator layer; this page is the controlled staff review surface around it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/staff"
                className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Dashboard
              </Link>
              {isOwnerOrAdmin ? (
                <Link
                  href="/staff/applications/new"
                  className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  New Core Application
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            Application review can approve and create reservations through controlled server actions. No customer email is sent. Hostinger SMTP is the planned future email provider, but it is not connected here.
          </p>
        </section>

        <ResultMessage outcome={application} />
        <ApprovalResult outcome={approval} />
        <ReservationResult outcome={reservation} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Applications</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.applications.length}</p>
            <p className="mt-2 text-sm text-slate-500">Current local Core rows</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available puppies</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.availablePuppies.length}</p>
            <p className="mt-2 text-sm text-slate-500">Selectable for reservation</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sections</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{dashboard.applicationSections.length}</p>
            <p className="mt-2 text-sm text-slate-500">Latest application response groups</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications</p>
            <Link href="/staff/notifications" className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
              Preview queue
            </Link>
            <p className="mt-2 text-sm text-slate-500">Preview-only communication lane</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Applications</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review, approve, and start reservation creation from approved applications.
              </p>
            </div>

            <div className="space-y-4">
              {dashboard.applications.length > 0 ? (
                dashboard.applications.map((applicationRow) => {
                  const status = applicationRow.status.toLowerCase();
                  const canApprove = ["received", "needs_review"].includes(status);
                  const canCreateReservation = status === "approved" && applicationRow.hasReservationContext;

                  return (
                    <article key={applicationRow.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{applicationRow.applicant}</p>
                            <StatusBadge>{applicationRow.status}</StatusBadge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{applicationRow.email}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {applicationRow.source} · {applicationRow.reference}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 lg:text-right">{applicationRow.submitted}</p>
                      </div>

                      {canApprove ? (
                        <form action={approveApplication} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                          <input type="hidden" name="applicationId" value={applicationRow.id} />
                          <label className="block text-sm font-medium text-slate-700">
                            Decision notes (optional)
                            <textarea
                              name="decisionNotes"
                              maxLength={1000}
                              rows={2}
                              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                            />
                          </label>
                          <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                            Approve Application
                          </button>
                        </form>
                      ) : null}

                      {canCreateReservation ? (
                        <form action={createReservation} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                          <input type="hidden" name="applicationId" value={applicationRow.id} />
                          <label className="block text-sm font-medium text-slate-700">
                            Available puppy
                            <select
                              name="puppyId"
                              required
                              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                            >
                              <option value="">Select a puppy</option>
                              {dashboard.availablePuppies.map((puppy) => (
                                <option key={puppy.id} value={puppy.id}>{puppy.label}</option>
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
                    </article>
                  );
                })
              ) : (
                <EmptyList text="No application rows found in local Supabase." />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Latest Application Detail</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Read-only section responses for the latest application.
                </p>
              </div>

              <div className="space-y-4">
                {dashboard.applicationSections.length > 0 ? (
                  dashboard.applicationSections.map((section) => (
                    <article key={`${section.applicationId}-${section.sectionKey}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{section.sectionLabel}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.sectionKey}</p>
                        </div>
                        <StatusBadge>{section.status}</StatusBadge>
                      </div>
                      {section.responses.length > 0 ? (
                        <dl className="grid gap-2 sm:grid-cols-2">
                          {section.responses.map((response) => (
                            <div key={`${section.sectionKey}-${response.label}`} className="rounded-xl border border-slate-200 bg-white p-3">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{response.label}</dt>
                              <dd className="mt-1 text-sm leading-6 text-slate-700">{response.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <EmptyList text="This section has no stored responses." />
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyList text="No application section responses found for the latest local application." />
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
