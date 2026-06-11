import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import {
  addApplicationReviewNoteFromDetail,
  approveApplicationFromDetail,
  declineApplicationFromDetail,
  markApplicationNeedsInfoFromDetail,
} from "./actions";
import { OperatorHeader, SectionNav, SummaryStrip } from "../../operator-ui";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL_STATUSES = new Set(["approved", "declined", "denied", "void", "archived"]);

type ApplicationRow = {
  id: string;
  family_id: string | null;
  buyer_id: string | null;
  external_reference: string | null;
  status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_profile_id: string | null;
  decision_notes: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  email_normalized: string | null;
  phone: string | null;
  phone_normalized: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  approval_status: string | null;
  source: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type SectionRow = {
  id: string;
  section_key: string | null;
  section_label: string | null;
  status: string | null;
  responses: Record<string, unknown> | null;
  review_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  reserved_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  puppy_name: string | null;
  puppy_status: string | null;
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  balance_due_cents: number | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  source: string | null;
  details: Record<string, unknown> | null;
  created_by_profile_id: string | null;
};

type AuditRow = {
  id: string;
  action: string | null;
  source: string | null;
  actor_identifier: string | null;
  outcome: string | null;
  created_at: string | null;
  request_context: Record<string, unknown> | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      rows: [] as T[],
      warning:
        "Core read configuration is not available for server-side operational reads.",
    };
  }

  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      rows: [] as T[],
      warning: `${table} read failed: ${response.status} ${body}`.trim(),
    };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function buyerName(buyer: BuyerRow | null) {
  if (!buyer) return "Unlinked applicant";
  return (
    buyer.preferred_name ||
    [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") ||
    buyer.email ||
    buyer.phone ||
    "Unnamed applicant"
  );
}

function addressLine(buyer: BuyerRow | null) {
  if (!buyer) return "Not recorded";
  const locality = [buyer.city, buyer.state, buyer.postal_code].filter(Boolean).join(", ");
  return [buyer.street_address, locality].filter(Boolean).join(" / ") || "Not recorded";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusTone(status: string | null | undefined) {
  const value = status?.toLowerCase() ?? "";
  if (value === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value === "declined" || value === "denied" || value === "archived") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }
  if (value === "needs_info" || value === "needs_review" || value === "waitlisted") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {children}
    </span>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function ResultMessage({
  approved,
  declined,
  needsInfo,
  noteAdded,
  error,
}: {
  approved?: string;
  declined?: string;
  needsInfo?: string;
  noteAdded?: string;
  error?: string;
}) {
  if (approved) return "Application approved. No email, SMS, documents, payments, reservations, public listings, or external provider calls were triggered.";
  if (declined) return "Application declined internally. No customer message or external provider call was triggered.";
  if (needsInfo) return "Application marked needs-info internally. No customer message or external provider call was triggered.";
  if (noteAdded) return "Internal review note added. No external side effect occurred.";
  if (error === "unauthorized") return "Your profile is not authorized for application review actions.";
  if (error) return "Application review action failed. Check the fields and try again.";
  return null;
}

function RestrictedMessage() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Owner/admin only
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Application Detail Restricted
          </h1>
          <p className="mt-3 text-sm leading-7">
            Application detail review is restricted to owner/admin users. Sensitive
            application rows were not fetched for this profile.
          </p>
          <Link
            href="/staff/applications"
            className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950"
          >
            Back to Applications
          </Link>
        </section>
      </div>
    </main>
  );
}

function NotFoundMessage() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Not found
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Application Not Found
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            No Core application row was found for that ID.
          </p>
          <Link
            href="/staff/applications"
            className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Back to Applications
          </Link>
        </section>
      </div>
    </main>
  );
}

function ReviewForm({
  action,
  applicationId,
  title,
  label,
  button,
  required = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  applicationId: string;
  title: string;
  label: string;
  button: string;
  required?: boolean;
}) {
  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <label className="mt-3 block text-sm font-semibold text-slate-700">
        {label}
        <textarea
          name={title === "Add Internal Note" ? "reviewNote" : "decisionNotes"}
          required={required}
          maxLength={2000}
          rows={3}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
        />
      </label>
      <button
        type="submit"
        className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
      >
        {button}
      </button>
    </form>
  );
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{
    approved?: string;
    declined?: string;
    needs_info?: string;
    note_added?: string;
    error?: string;
  }>;
}) {
  const staff = await requireStaffProfile();
  const { applicationId } = await params;
  const query = await searchParams;

  if (staff.role !== "owner" && staff.role !== "admin") {
    return <RestrictedMessage />;
  }

  if (!UUID_PATTERN.test(applicationId)) {
    return <NotFoundMessage />;
  }

  const applicationResult = await readRows<ApplicationRow>("core_applications", {
    select:
      "id,family_id,buyer_id,external_reference,status,submitted_at,reviewed_at,reviewed_by_profile_id,decision_notes,source,metadata,created_at,updated_at",
    id: `eq.${applicationId}`,
    limit: "1",
  });
  const application = applicationResult.rows[0] ?? null;

  if (!application) {
    return <NotFoundMessage />;
  }

  const [
    buyerResult,
    familyResult,
    sectionResult,
    reservationResult,
    eventResult,
    auditResult,
    reviewerResult,
  ] = await Promise.all([
    application.buyer_id
      ? readRows<BuyerRow>("core_buyers", {
          select:
            "id,first_name,last_name,preferred_name,email,email_normalized,phone,phone_normalized,street_address,city,state,postal_code,approval_status,source,notes,metadata",
          id: `eq.${application.buyer_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as BuyerRow[], warning: null }),
    application.family_id
      ? readRows<FamilyRow>("core_families", {
          select: "id,name,status,notes,metadata",
          id: `eq.${application.family_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as FamilyRow[], warning: null }),
    readRows<SectionRow>("core_application_sections", {
      select: "id,section_key,section_label,status,responses,review_notes,created_at,updated_at",
      application_id: `eq.${applicationId}`,
      order: "section_label.asc.nullslast,section_key.asc.nullslast",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select:
        "reservation_id,reservation_status,reserved_at,buyer_name,buyer_email,puppy_name,puppy_status,contract_total_cents,deposit_required_cents,balance_due_cents",
      application_id: `eq.${applicationId}`,
      order: "reserved_at.desc.nullslast",
      limit: "5",
    }),
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,source,details,created_by_profile_id",
      application_id: `eq.${applicationId}`,
      order: "event_at.desc",
      limit: "10",
    }),
    readRows<AuditRow>("core_audit_log", {
      select: "id,action,source,actor_identifier,outcome,created_at,request_context",
      entity_table: "eq.core_applications",
      entity_id: `eq.${applicationId}`,
      order: "created_at.desc",
      limit: "10",
    }),
    application.reviewed_by_profile_id
      ? readRows<ProfileRow>("core_profiles", {
          select: "id,display_name,email",
          id: `eq.${application.reviewed_by_profile_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as ProfileRow[], warning: null }),
  ]);

  const buyer = buyerResult.rows[0] ?? null;
  const family = familyResult.rows[0] ?? null;
  const reviewer = reviewerResult.rows[0] ?? null;
  const status = application.status ?? "unknown";
  const normalizedStatus = status.toLowerCase();
  const canApprove = ["received", "needs_review"].includes(normalizedStatus);
  const canReview = !TERMINAL_STATUSES.has(normalizedStatus);
  const blockers = [
    !application.buyer_id ? "No buyer record linked." : null,
    !application.family_id ? "No family record linked." : null,
    sectionResult.rows.length === 0 ? "No submitted answer sections found." : null,
    normalizedStatus === "needs_info" ? "Applicant information is marked incomplete." : null,
    normalizedStatus === "approved" && reservationResult.rows.length === 0
      ? "Approved application has no linked reservation yet."
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
  const nextAction = canApprove
    ? "Review answers and approve, mark needs-info, or decline internally"
    : normalizedStatus === "approved" && reservationResult.rows.length === 0
      ? "Create reservation context from the application workspace"
      : "Review linked buyer, family, reservation, event, and audit context";
  const resultMessage = ResultMessage({
    approved: query.approved,
    declined: query.declined,
    needsInfo: query.needs_info,
    noteAdded: query.note_added,
    error: query.error,
  });
  const warning =
    applicationResult.warning ??
    buyerResult.warning ??
    familyResult.warning ??
    sectionResult.warning ??
    reservationResult.warning ??
    eventResult.warning ??
    auditResult.warning ??
    reviewerResult.warning;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Application Review"
          title={buyerName(buyer)}
          summary="Internal owner/operator command view for applicant identity, submitted answers, review status, linked buyer/family/reservation context, and safely linkable event/audit rows."
          status={formatKey(status)}
          blockers={blockers.length > 0 ? `${blockers.length} blocker(s)` : "No deterministic blockers"}
          nextAction={nextAction}
          links={[
            { href: "/staff/applications", label: "Applications" },
            ...(application.buyer_id ? [{ href: `/staff/buyers/${application.buyer_id}`, label: "Buyer 360" }] : []),
            ...(application.family_id ? [{ href: `/staff/families/${application.family_id}`, label: "Family 360" }] : []),
            { href: "/staff/reservations", label: "Reservations" },
            { href: "/staff/command", label: "Command" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page updates internal Core application review status only. It does not send email, SMS, portal messages, documents, payments, reservations, public listings, or external provider calls.
          </p>
        </section>

        {resultMessage ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
            {resultMessage}
          </section>
        ) : null}

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {warning}
          </section>
        ) : null}

        <SummaryStrip
          items={[
            { label: "Status", value: <Badge tone={statusTone(status)}>{formatKey(status)}</Badge>, note: application.source || "Source not recorded" },
            { label: "Submitted", value: formatDateTime(application.submitted_at ?? application.created_at), note: application.external_reference || shortId(application.id) },
            { label: "Reviewed", value: formatDateTime(application.reviewed_at), note: reviewer?.display_name || reviewer?.email || "Reviewer not recorded" },
            { label: "Blockers", value: blockers.length, note: reservationResult.rows.length ? `${reservationResult.rows.length} reservation link(s)` : "No reservation link" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#applicant", label: "Applicant" },
            { href: "#review", label: "Review" },
            { href: "#answers", label: "Answers", count: sectionResult.rows.length },
            { href: "#reservations", label: "Reservations", count: reservationResult.rows.length },
            { href: "#events", label: "Events", count: eventResult.rows.length },
            { href: "#audit", label: "Audit", count: auditResult.rows.length },
          ]}
        />

        {blockers.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
            <p className="font-bold uppercase tracking-[0.18em] text-amber-700">Blockers / Attention</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {blockers.map((blocker) => (
                <li key={blocker} className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 font-semibold">
                  {blocker}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section id="applicant" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Applicant Contact</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Email" value={buyer?.email || buyer?.email_normalized || "Not recorded"} />
                <InfoItem label="Phone" value={buyer?.phone || buyer?.phone_normalized || "Not recorded"} />
                <InfoItem label="Address / Location" value={addressLine(buyer)} />
                <InfoItem label="Buyer Status" value={formatKey(buyer?.approval_status)} />
                <InfoItem label="Buyer ID" value={shortId(application.buyer_id)} />
                <InfoItem label="Family ID" value={shortId(application.family_id)} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {application.buyer_id ? (
                  <Link href={`/staff/buyers/${application.buyer_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
                    Open Buyer 360
                  </Link>
                ) : null}
                {application.family_id ? (
                  <Link href={`/staff/families/${application.family_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
                    Open Family 360
                  </Link>
                ) : null}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Family context
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {family?.name || "Not linked"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {family?.notes || "No family notes recorded."}
                </p>
              </div>
            </section>

            <section id="review" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Review Workflow</h2>
              <dl className="mt-5 grid gap-4">
                <InfoItem label="Current Decision / Status" value={formatKey(status)} />
                <InfoItem label="Decision Notes" value={application.decision_notes || "Not recorded"} />
                <InfoItem label="Linked Reservation Count" value={reservationResult.rows.length} />
              </dl>

              <div className="mt-5 grid gap-4">
                {canApprove ? (
                  <ReviewForm
                    action={approveApplicationFromDetail}
                    applicationId={application.id}
                    title="Approve Application"
                    label="Decision notes, optional"
                    button="Approve"
                  />
                ) : null}
                {canReview ? (
                  <>
                    <ReviewForm
                      action={markApplicationNeedsInfoFromDetail}
                      applicationId={application.id}
                      title="Mark Needs Info"
                      label="Reason or requested information"
                      button="Mark Needs Info"
                      required
                    />
                    <ReviewForm
                      action={declineApplicationFromDetail}
                      applicationId={application.id}
                      title="Decline Application"
                      label="Internal decline reason"
                      button="Decline Internally"
                      required
                    />
                  </>
                ) : null}
                <ReviewForm
                  action={addApplicationReviewNoteFromDetail}
                  applicationId={application.id}
                  title="Add Internal Note"
                  label="Internal review note"
                  button="Add Note"
                  required
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section id="answers" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Application Answers</h2>
              <div className="mt-5 space-y-4">
                {sectionResult.rows.length > 0 ? (
                  sectionResult.rows.map((section) => (
                    <article key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-950">
                            {section.section_label || formatKey(section.section_key)}
                          </h3>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {section.section_key || "section"}
                          </p>
                        </div>
                        <Badge>{formatKey(section.status)}</Badge>
                      </div>
                      {section.responses && Object.keys(section.responses).length > 0 ? (
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          {Object.entries(section.responses).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {formatKey(key)}
                              </dt>
                              <dd className="mt-1 text-sm leading-6 text-slate-700">
                                {formatValue(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
                          No structured answers recorded for this section.
                        </p>
                      )}
                      {section.review_notes ? (
                        <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                          {section.review_notes}
                        </p>
                      ) : null}
                      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <summary className="cursor-pointer font-semibold text-slate-800">
                          Technical JSON
                        </summary>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5">
                          {JSON.stringify(section.responses ?? {}, null, 2)}
                        </pre>
                      </details>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    No application answer sections were found for this application.
                  </p>
                )}
              </div>
            </section>

            <section id="reservations" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">Linked Reservations</h2>
              <div className="mt-5 space-y-3">
                {reservationResult.rows.length > 0 ? (
                  reservationResult.rows.map((reservation) => (
                    <article key={reservation.reservation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-bold text-slate-950">
                          {reservation.puppy_name || "Unnamed puppy"}
                        </p>
                        <Badge>{formatKey(reservation.reservation_status)}</Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoItem label="Reserved At" value={formatDateTime(reservation.reserved_at)} />
                        <InfoItem label="Puppy Status" value={formatKey(reservation.puppy_status)} />
                        <InfoItem label="Contract Total" value={formatCurrency(reservation.contract_total_cents)} />
                        <InfoItem label="Balance Due" value={formatCurrency(reservation.balance_due_cents)} />
                      </dl>
                      <Link href={`/staff/reservations/${reservation.reservation_id}`} className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
                        Open reservation
                      </Link>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    No linked reservation found for this application.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section id="events" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Event History</h2>
            <div className="mt-5 space-y-3">
              {eventResult.rows.length > 0 ? (
                eventResult.rows.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-slate-950">{formatKey(event.event_type)}</p>
                      <span className="text-sm font-semibold text-slate-500">
                        {formatDateTime(event.event_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {event.summary || "Core event recorded."}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {event.source || "core_events"} / {shortId(event.id)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No linked event history found for this application.
                </p>
              )}
            </div>
          </section>

          <section id="audit" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Audit History</h2>
            <div className="mt-5 space-y-3">
              {auditResult.rows.length > 0 ? (
                auditResult.rows.map((audit) => (
                  <article key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-slate-950">{formatKey(audit.action)}</p>
                      <Badge>{formatKey(audit.outcome)}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {audit.actor_identifier || "Actor not recorded"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {audit.source || "core_audit_log"} / {formatDateTime(audit.created_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No linked event/audit history found for this application.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

