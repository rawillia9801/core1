import Link from "next/link";
import { approveApplication, createReservation } from "../../application-actions";
import { getDashboardData } from "../../dashboard-data";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";
import { ActionPanel } from "../action-panel";
import { CommunicationPanel } from "../communication-panel";
import { ProposedActionPanel } from "../proposed-action-panel";

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

  if (outcome === "invalid_contact") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Manual application needs applicant name plus email or phone.
      </p>
    );
  }

  if (outcome === "invalid_terms") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Terms acknowledgement is required before creating a manual application.
      </p>
    );
  }

  if (outcome === "invalid_input") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Manual application input needs review before saving.
      </p>
    );
  }

  if (outcome === "existing_customer_needs_review") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Existing customer context needs owner review before another manual application is saved.
      </p>
    );
  }

  if (outcome === "duplicate_customer_needs_review") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        A matching customer or application record needs owner review before saving another manual application.
      </p>
    );
  }

  if (outcome === "rpc_failed") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Manual application RPC failed. Check that the Core manual application action is deployed and available.
      </p>
    );
  }

  if (outcome === "config_missing") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Core server action configuration is incomplete.
      </p>
    );
  }

  if (outcome === "save_failed" || outcome === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Application workflow action failed. Review the server action log for details.
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
        Application approval failed. Review approval configuration and try again.
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
        Reservation creation failed. Review the server action log for details.
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
  const receivedCount = dashboard.applications.filter((row) =>
    ["received", "needs_review"].includes(row.status.toLowerCase()),
  ).length;
  const approvedCount = dashboard.applications.filter((row) => row.status.toLowerCase() === "approved").length;
  const reservationReadyCount = dashboard.applications.filter(
    (row) => row.status.toLowerCase() === "approved" && row.hasReservationContext,
  ).length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Applications"
          title="Application Workspace"
          summary="Dedicated owner/operator review surface for submitted applications, buyer/family matching, reservation readiness, and preview-only communication context."
          status={`${dashboard.applications.length} applications`}
          blockers={receivedCount > 0 ? `${receivedCount} awaiting review` : "No review blockers"}
          nextAction={reservationReadyCount > 0 ? `${reservationReadyCount} approved ready for reservation setup` : "Open the next submitted application"}
          links={[
            { href: "/staff", label: "Dashboard" },
            ...(isOwnerOrAdmin ? [{ href: "/staff/applications/new", label: "New Core Application" }] : []),
            { href: "/staff/buyers", label: "Buyers" },
            { href: "/staff/families", label: "Families" },
            { href: "/staff/reservations", label: "Reservations" },
          ]}
        />

        <section id="boundary" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
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

        <ActionPanel
          nextAction={receivedCount > 0 ? "Review received applications" : reservationReadyCount > 0 ? "Review approved applications for reservation setup" : "Review application action queue"}
          blockers={receivedCount}
          mode={isOwnerOrAdmin && receivedCount > 0 ? "available" : "review-only"}
          href="/staff/actions#applications"
          detail="Application actions use existing approval and reservation workflows only where they are already available."
        />

        <CommunicationPanel
          latestStatus={`${receivedCount} application(s) may need review follow-up`}
          nextFollowUp={receivedCount > 0 ? "Review applicant contact and application status before any outreach." : "Review application communication history and notification readiness as needed."}
          blockers={receivedCount}
          mode={receivedCount > 0 ? "attention" : "review"}
          detail="Application communication prompts are review-only and do not send customer messages."
        />

        <ProposedActionPanel
          nextAction={receivedCount > 0 ? "Application received but not reviewed" : reservationReadyCount > 0 ? "Approved applicant without reservation review" : "Review application readiness rules"}
          blockers={receivedCount}
          priority={receivedCount > 0 ? "high" : reservationReadyCount > 0 ? "normal" : "watch"}
          detail="Proposed action signals explain why application, buyer, family, and matching records need owner review."
        />

        <SummaryStrip
          items={[
            { label: "Applications", value: dashboard.applications.length, note: "Core review rows" },
            { label: "Awaiting review", value: receivedCount, note: "Received or needs review" },
            { label: "Approved", value: approvedCount, note: "Internal status only" },
            { label: "Available puppies", value: dashboard.availablePuppies.length, note: "Selectable for reservation" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#boundary", label: "Boundary" },
            { href: "#applications", label: "Applications", count: dashboard.applications.length },
            { href: "#latest-detail", label: "Latest Detail", count: dashboard.applicationSections.length },
            { href: "/staff/notifications", label: "Preview Queue" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div id="applications" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                          <Link
                            href={`/staff/applications/${applicationRow.id}`}
                            className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                          >
                            Open review
                          </Link>
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
                <EmptyList text="No application rows found in Core yet." />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <section id="latest-detail" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  <EmptyList text="No application section responses found for the latest application." />
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}


