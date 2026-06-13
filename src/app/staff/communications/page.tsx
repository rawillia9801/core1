import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import {
  OperatorHeader,
  OperatorStatusPill,
  SectionNav,
  SummaryStrip,
} from "../operator-ui";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };

type ConversationRow = {
  id: string;
  buyer_id: string | null;
  family_id: string | null;
  channel: string | null;
  subject: string | null;
  status: string | null;
  last_message_at: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string | null;
  buyer_id: string | null;
  direction: string | null;
  channel: string | null;
  status: string | null;
  from_address: string | null;
  to_address: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
};

type NotificationRow = {
  id: string;
  family_id: string | null;
  buyer_id: string | null;
  template_id: string | null;
  notification_type: string | null;
  channel: string | null;
  status: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type DeliveryAttemptRow = {
  id: string;
  notification_id: string | null;
  template_id: string | null;
  provider: string | null;
  channel: string | null;
  status: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  attempt_number: number | null;
  attempted_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type TemplateRow = {
  id: string;
  template_key: string | null;
  name: string | null;
  channel: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

type ApplicationRow = {
  id: string;
  status: string | null;
  buyer_id: string | null;
  family_id: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  approval_status: string | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
};

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  application_id: string | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  buyer_id: string | null;
  family_id: string | null;
  application_id: string | null;
  reservation_id: string | null;
  puppy_id: string | null;
  related_table: string | null;
  related_id: string | null;
  source: string | null;
};

type FollowUpRow = {
  id: string;
  lane: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  status: string;
  href: string;
};

const ATTENTION_STATUSES = new Set(["blocked", "failed", "missing_recipient", "missing_template", "config_missing", "review_required"]);
const PENDING_STATUSES = new Set(["pending", "queued", "draft", "previewed", "needs_review", "received", "submitted", "new"]);
const COMPLETE_DOCUMENT_STATUSES = new Set(["signed", "completed", "complete", "filed", "approved", "accepted", "ready"]);
const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [], warning: "config_missing: Core server-side read configuration is not available." };

  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { rows: [], warning: `warning: ${table} read skipped (${response.status}).` };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function cents(value: number | null | undefined) {
  if (typeof value !== "number") return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function buyerName(row: BuyerRow | undefined) {
  if (!row) return "Unlinked buyer";
  return row.preferred_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || row.phone || `Buyer ${shortId(row.id)}`;
}

function familyName(row: FamilyRow | undefined) {
  return row?.name || (row ? `Family ${shortId(row.id)}` : "Unlinked family");
}

function payloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function notificationStatus(row: NotificationRow) {
  const status = normalized(row.status);
  if (status === "sent") return "sent";
  if (status === "queued") return "queued";
  if (status === "pending") return "pending";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  if (!payloadString(row.payload, "recipient_email") && row.channel === "email") return "missing_recipient";
  if (!row.template_id && !payloadString(row.payload, "template_key")) return "missing_template";
  return status || "review_required";
}

function statusTone(status: string | null | undefined): "neutral" | "green" | "blue" | "amber" | "red" {
  const value = normalized(status);
  if (value === "sent" || value === "completed" || value === "signed" || value === "current") return "green";
  if (ATTENTION_STATUSES.has(value)) return "red";
  if (PENDING_STATUSES.has(value) || value === "warning" || value === "skipped") return "amber";
  if (value === "review" || value === "review_required" || value === "previewed") return "blue";
  return "neutral";
}

function isActiveReservation(row: ReservationRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalized(row.reservation_status));
}

function communicationEventExists(events: EventRow[], id: string | null | undefined) {
  if (!id) return false;
  return events.some((event) => {
    const haystack = `${event.event_type ?? ""} ${event.summary ?? ""} ${event.source ?? ""}`.toLowerCase();
    return (
      (event.application_id === id || event.reservation_id === id || event.buyer_id === id || event.family_id === id || event.related_id === id) &&
      (haystack.includes("notification") || haystack.includes("message") || haystack.includes("follow"))
    );
  });
}

function FollowUpCard({ row }: { row: FollowUpRow }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <OperatorStatusPill tone={row.priority === "High" ? "red" : row.priority === "Medium" ? "amber" : "blue"}>{row.priority}</OperatorStatusPill>
            <OperatorStatusPill tone="blue">{row.lane}</OperatorStatusPill>
            <OperatorStatusPill tone={statusTone(row.status)}>{formatKey(row.status)}</OperatorStatusPill>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-950">{row.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{row.detail}</p>
        </div>
        <Link href={row.href} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          Review
        </Link>
      </div>
    </article>
  );
}

function LaneSection({ id, title, rows, empty }: { id: string; title: string; rows: FollowUpRow[]; empty: string }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <OperatorStatusPill tone={rows.length > 0 ? "amber" : "green"}>{rows.length}</OperatorStatusPill>
      </div>
      <div className="grid gap-3">
        {rows.length > 0 ? rows.map((row) => <FollowUpCard key={row.id} row={row} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">{empty}</div>}
      </div>
    </section>
  );
}

export default async function StaffCommunicationsPage() {
  await requireStaffProfile();

  const [
    conversationResult,
    messageResult,
    notificationResult,
    attemptResult,
    templateResult,
    applicationResult,
    buyerResult,
    familyResult,
    reservationResult,
    documentResult,
    eventResult,
  ] = await Promise.all([
    readRows<ConversationRow>("core_conversations", { select: "id,buyer_id,family_id,channel,subject,status,last_message_at,created_at", order: "last_message_at.desc.nullslast,created_at.desc", limit: "100" }),
    readRows<MessageRow>("core_messages", { select: "id,conversation_id,buyer_id,direction,channel,status,from_address,to_address,sent_at,received_at,created_at", order: "created_at.desc", limit: "150" }),
    readRows<NotificationRow>("core_notifications", { select: "id,family_id,buyer_id,template_id,notification_type,channel,status,scheduled_at,sent_at,payload,created_at,updated_at", order: "created_at.desc", limit: "150" }),
    readRows<DeliveryAttemptRow>("core_notification_delivery_attempts", { select: "id,notification_id,template_id,provider,channel,status,recipient_email,recipient_phone,subject,attempt_number,attempted_at,completed_at,metadata,created_at", order: "created_at.desc", limit: "100" }),
    readRows<TemplateRow>("core_message_templates", { select: "id,template_key,name,channel,status,metadata,updated_at", order: "template_key.asc.nullslast,updated_at.desc", limit: "100" }),
    readRows<ApplicationRow>("core_applications", { select: "id,status,buyer_id,family_id,submitted_at,created_at", order: "created_at.desc", limit: "250" }),
    readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,approval_status", order: "created_at.desc", limit: "500" }),
    readRows<FamilyRow>("core_families", { select: "id,name,status", order: "created_at.desc", limit: "500" }),
    readRows<ReservationRow>("core_reservation_summary", { select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,buyer_phone,family_id,family_name,puppy_id,puppy_name,application_id,balance_due_cents,go_home_planned_at,go_home_status,go_home_checklist_status,go_home_balance_cleared_status,created_at", order: "created_at.desc", limit: "250" }),
    readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at", order: "updated_at.desc.nullslast", limit: "250" }),
    readRows<EventRow>("core_events", { select: "id,event_type,event_at,summary,buyer_id,family_id,application_id,reservation_id,puppy_id,related_table,related_id,source", order: "event_at.desc", limit: "250" }),
  ]);

  const conversations = conversationResult.rows;
  const messages = messageResult.rows;
  const notifications = notificationResult.rows;
  const attempts = attemptResult.rows;
  const templates = templateResult.rows;
  const applications = applicationResult.rows;
  const buyers = buyerResult.rows;
  const families = familyResult.rows;
  const reservations = reservationResult.rows.filter(isActiveReservation);
  const documents = documentResult.rows;
  const events = eventResult.rows;

  const warnings = [
    conversationResult.warning,
    messageResult.warning,
    notificationResult.warning,
    attemptResult.warning,
    templateResult.warning,
    applicationResult.warning,
    buyerResult.warning,
    familyResult.warning,
    reservationResult.warning,
    documentResult.warning,
    eventResult.warning,
  ].filter(Boolean);

  const buyersById = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const familiesById = new Map(families.map((family) => [family.id, family]));
  const reservationsByApplicationId = new Map(reservations.filter((row) => row.application_id).map((row) => [row.application_id as string, row]));
  const templatesById = new Map(templates.map((template) => [template.id, template]));

  const queueAttention = notifications.filter((row) => {
    const status = notificationStatus(row);
    return status === "failed" || status === "missing_recipient" || status === "missing_template" || status === "config_missing" || status === "review_required";
  });
  const queued = notifications.filter((row) => ["queued", "pending"].includes(notificationStatus(row)));
  const sent = notifications.filter((row) => notificationStatus(row) === "sent");
  const failedAttempts = attempts.filter((row) => ["failed", "blocked", "skipped"].includes(normalized(row.status)));
  const unresolvedConversations = conversations.filter((row) => ["open", "pending", "needs_review", "blocked"].includes(normalized(row.status)));
  const inboundPending = messages.filter((row) => normalized(row.direction) === "inbound" && ["recorded", "pending", "needs_review", "open"].includes(normalized(row.status)));

  const applicationFollowUps = applications
    .filter((app) => ["new", "received", "submitted", "needs_review", "pending"].includes(normalized(app.status)))
    .slice(0, 18)
    .map((app): FollowUpRow => ({
      id: `application-${app.id}`,
      lane: "Applications",
      priority: "High",
      title: "New application needs review",
      detail: `${buyerName(app.buyer_id ? buyersById.get(app.buyer_id) : undefined)} / ${familyName(app.family_id ? familiesById.get(app.family_id) : undefined)} / received ${formatDateTime(app.submitted_at ?? app.created_at)}`,
      status: app.status || "review_required",
      href: `/staff/applications/${app.id}`,
    }));

  const applicationNoFollowUp = applications
    .filter((app) => !communicationEventExists(events, app.id))
    .slice(0, 12)
    .map((app): FollowUpRow => ({
      id: `app-no-follow-${app.id}`,
      lane: "Follow-Ups",
      priority: "Medium",
      title: "Application received but no follow-up event found",
      detail: `${buyerName(app.buyer_id ? buyersById.get(app.buyer_id) : undefined)} needs owner review before any customer contact.`,
      status: "review_required",
      href: `/staff/applications/${app.id}`,
    }));

  const approvedWithoutReservation = applications
    .filter((app) => normalized(app.status) === "approved" && !reservationsByApplicationId.has(app.id))
    .slice(0, 12)
    .map((app): FollowUpRow => ({
      id: `approved-no-reservation-${app.id}`,
      lane: "Matching",
      priority: "Medium",
      title: "Approved application without reservation",
      detail: "Review matching/reservation readiness before any communication or promise.",
      status: "review_required",
      href: `/staff/applications/${app.id}`,
    }));

  const missingContact = buyers
    .filter((buyer) => !buyer.email && !buyer.phone)
    .slice(0, 12)
    .map((buyer): FollowUpRow => ({
      id: `missing-contact-${buyer.id}`,
      lane: "Buyers/Families",
      priority: "High",
      title: "Buyer missing contact detail",
      detail: `${buyerName(buyer)} has no email or phone recorded.`,
      status: "missing_recipient",
      href: `/staff/buyers/${buyer.id}`,
    }));

  const documentFollowUps = documents
    .filter((doc) => !COMPLETE_DOCUMENT_STATUSES.has(normalized(doc.status)))
    .slice(0, 14)
    .map((doc): FollowUpRow => ({
      id: `document-${doc.id}`,
      lane: "Documents",
      priority: "Medium",
      title: "Document pending signature/review",
      detail: `${display(doc.title || doc.document_type, "Document")} is ${formatKey(doc.status)}.`,
      status: doc.status || "pending",
      href: `/staff/documents/${doc.id}`,
    }));

  const paymentFollowUps = reservations
    .filter((row) => (row.balance_due_cents ?? 0) > 0)
    .slice(0, 14)
    .map((row): FollowUpRow => ({
      id: `payment-${row.reservation_id}`,
      lane: "Payments",
      priority: "Medium",
      title: "Payment readiness needs owner review",
      detail: `${display(row.buyer_name, "Buyer")} has ${cents(row.balance_due_cents)} open on ${display(row.puppy_name, "reservation")}.`,
      status: "review_required",
      href: `/staff/reservations/${row.reservation_id}`,
    }));

  const goHomeFollowUps = reservations
    .filter((row) => row.go_home_planned_at && !communicationEventExists(events, row.reservation_id))
    .slice(0, 14)
    .map((row): FollowUpRow => ({
      id: `go-home-${row.reservation_id}`,
      lane: "Go-Home",
      priority: "High",
      title: "Go-home communication needed",
      detail: `${display(row.puppy_name, "Puppy")} is scheduled ${formatDateTime(row.go_home_planned_at)}; verify checklist, balance, and contact plan.`,
      status: row.go_home_status || "review_required",
      href: `/staff/reservations/${row.reservation_id}`,
    }));

  const reservationBlockers = reservations
    .filter((row) => !row.buyer_id || !row.puppy_id || normalized(row.go_home_checklist_status) === "blocked" || normalized(row.go_home_balance_cleared_status) === "blocked")
    .slice(0, 14)
    .map((row): FollowUpRow => ({
      id: `reservation-blocker-${row.reservation_id}`,
      lane: "Reservations",
      priority: "High",
      title: "Reservation blocker needs communication review",
      detail: `${display(row.buyer_name, "Buyer")} / ${display(row.puppy_name, "Puppy")} has missing links or blocked go-home readiness.`,
      status: "blocked",
      href: `/staff/reservations/${row.reservation_id}`,
    }));

  const followUps = [
    ...applicationFollowUps,
    ...applicationNoFollowUp,
    ...approvedWithoutReservation,
    ...missingContact,
    ...documentFollowUps,
    ...paymentFollowUps,
    ...goHomeFollowUps,
    ...reservationBlockers,
  ];

  const recentActivity = [...notifications, ...attempts, ...messages, ...events]
    .map((row) => {
      if ("notification_type" in row) {
        return {
          id: `notification-${row.id}`,
          title: formatKey(row.notification_type),
          detail: `${formatKey(notificationStatus(row))} / ${formatKey(row.channel)} / ${payloadString(row.payload, "template_key") || shortId(row.template_id)}`,
          href: "/staff/notifications",
          at: row.updated_at ?? row.created_at,
          status: notificationStatus(row),
        };
      }
      if ("provider" in row) {
        return {
          id: `attempt-${row.id}`,
          title: `Delivery attempt ${shortId(row.id)}`,
          detail: `${formatKey(row.provider)} / ${formatKey(row.status)} / ${display(row.recipient_email || row.recipient_phone, "No recipient")}`,
          href: "/staff/notifications",
          at: row.completed_at ?? row.attempted_at ?? row.created_at,
          status: row.status || "review_required",
        };
      }
      if ("direction" in row) {
        return {
          id: `message-${row.id}`,
          title: `${formatKey(row.direction)} ${formatKey(row.channel)}`,
          detail: `${formatKey(row.status)} / ${display(row.from_address || row.to_address, "No address")}`,
          href: "/staff/messages",
          at: row.received_at ?? row.sent_at ?? row.created_at,
          status: row.status || "recorded",
        };
      }
      return {
        id: `event-${row.id}`,
        title: formatKey(row.event_type),
        detail: display(row.summary, "Timeline event"),
        href: "/staff/events",
        at: row.event_at,
        status: row.event_type || "recorded",
      };
    })
    .sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime())
    .slice(0, 16);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <OperatorHeader
          eyebrow="Communications Command Center"
          title="Communications / Follow-Ups"
          summary="Read-only owner/operator queue for communication metadata, notification readiness, follow-up prompts, and related record links. This page does not send email, SMS, portal messages, Facebook messages, or provider calls."
          status={`${queued.length} queued / ${sent.length} sent`}
          blockers={queueAttention.length + failedAttempts.length + missingContact.length}
          nextAction={followUps[0]?.title ?? "Review communication readiness"}
          links={[
            { href: "/staff/messages", label: "Messages" },
            { href: "/staff/notifications", label: "Notifications" },
            { href: "/staff/actions", label: "Actions" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Open conversations", value: unresolvedConversations.length, note: `${inboundPending.length} inbound pending` },
            { label: "Queued notifications", value: queued.length, note: `${queueAttention.length} need attention` },
            { label: "Delivery attempts", value: attempts.length, note: `${failedAttempts.length} failed/blocked/skipped` },
            { label: "Follow-up prompts", value: followUps.length, note: "Review prompts only" },
            { label: "Templates", value: templates.length, note: "Preview/readiness" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Review-only communication surface</p>
          <p className="mt-2 text-sm leading-6">
            Safe operator links are provided for review. No customer message is sent from this command center, and no raw provider payloads, SMTP secrets, service-role errors, or external request bodies are shown.
          </p>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-white p-5 text-amber-950 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read warnings</p>
            <div className="mt-3 grid gap-2 text-sm leading-6">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </section>
        ) : null}

        <SectionNav
          items={[
            { href: "#overview", label: "Overview", count: followUps.length },
            { href: "#follow-ups", label: "Follow-Ups", count: applicationNoFollowUp.length },
            { href: "#applications", label: "Applications", count: applicationFollowUps.length },
            { href: "#buyers", label: "Buyers/Families", count: missingContact.length },
            { href: "#reservations", label: "Reservations", count: reservationBlockers.length },
            { href: "#documents", label: "Documents", count: documentFollowUps.length },
            { href: "#payments", label: "Payments", count: paymentFollowUps.length },
            { href: "#go-home", label: "Go-Home", count: goHomeFollowUps.length },
            { href: "#notifications", label: "Notifications", count: queued.length },
            { href: "#attention", label: "Failed/Attention", count: queueAttention.length + failedAttempts.length },
            { href: "#activity", label: "Activity", count: recentActivity.length },
          ]}
        />

        <section id="overview" className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Notification Readiness</h2>
            <div className="mt-4 grid gap-3 text-sm">
              {["queued", "pending", "sent", "failed", "skipped", "missing_recipient", "missing_template", "review_required"].map((status) => (
                <div key={status} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <span>{formatKey(status)}</span>
                  <OperatorStatusPill tone={statusTone(status)}>
                    {notifications.filter((row) => notificationStatus(row) === status).length}
                  </OperatorStatusPill>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Communication Metadata</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-3"><span>Conversations</span><strong>{conversations.length}</strong></div>
              <div className="flex justify-between gap-3"><span>Messages</span><strong>{messages.length}</strong></div>
              <div className="flex justify-between gap-3"><span>Events reviewed</span><strong>{events.length}</strong></div>
              <div className="flex justify-between gap-3"><span>Follow-up candidates</span><strong>{followUps.length}</strong></div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Template Safety</h2>
            <div className="mt-4 grid gap-3 text-sm">
              {templates.slice(0, 5).map((template) => (
                <div key={template.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <span>{template.template_key || template.name || shortId(template.id)}</span>
                  <OperatorStatusPill tone={statusTone(template.status)}>{formatKey(template.status)}</OperatorStatusPill>
                </div>
              ))}
              {templates.length === 0 ? <p className="text-slate-500">No template rows found.</p> : null}
            </div>
          </div>
        </section>

        <LaneSection id="follow-ups" title="Follow-Ups" rows={[...applicationNoFollowUp, ...approvedWithoutReservation]} empty="No application follow-up gaps were found in the current read window." />
        <LaneSection id="applications" title="Applications" rows={applicationFollowUps} empty="No new application review communication prompts found." />
        <LaneSection id="buyers" title="Buyers / Families" rows={missingContact} empty="No buyer records without email or phone were found in the current read window." />
        <LaneSection id="reservations" title="Reservations" rows={reservationBlockers} empty="No reservation communication blockers were found." />
        <LaneSection id="documents" title="Documents" rows={documentFollowUps} empty="No document signature/review follow-up prompts found." />
        <LaneSection id="payments" title="Payments" rows={paymentFollowUps} empty="No payment readiness follow-up prompts found." />
        <LaneSection id="go-home" title="Go-Home" rows={goHomeFollowUps} empty="No go-home communication prompts found." />

        <section id="notifications" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Recently Queued Notifications</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Queue records from `core_notifications`, with recipient/template readiness derived from existing metadata.</p>
            </div>
            <Link href="/staff/notifications" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Review notification page</Link>
          </div>
          <div className="grid gap-3">
            {notifications.slice(0, 14).map((notification) => {
              const template = notification.template_id ? templatesById.get(notification.template_id) : undefined;
              const status = notificationStatus(notification);
              const reservationId = payloadString(notification.payload, "reservation_id");
              const applicationId = payloadString(notification.payload, "application_id");
              return (
                <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OperatorStatusPill tone={statusTone(status)}>{formatKey(status)}</OperatorStatusPill>
                        <OperatorStatusPill tone="blue">{formatKey(notification.channel)}</OperatorStatusPill>
                        <OperatorStatusPill tone="neutral">{payloadString(notification.payload, "template_key") || template?.template_key || "No template"}</OperatorStatusPill>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-950">{formatKey(notification.notification_type)}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Recipient: {display(payloadString(notification.payload, "recipient_email") || payloadString(notification.payload, "recipient_phone"), "Missing recipient")} / Created: {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {notification.buyer_id ? <Link href={`/staff/buyers/${notification.buyer_id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Buyer</Link> : null}
                      {notification.family_id ? <Link href={`/staff/families/${notification.family_id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Family</Link> : null}
                      {applicationId ? <Link href={`/staff/applications/${applicationId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Application</Link> : null}
                      {reservationId ? <Link href={`/staff/reservations/${reservationId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Reservation</Link> : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">No notification records found.</div> : null}
          </div>
        </section>

        <section id="attention" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-950">Failed / Attention</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Classified statuses only: sent, queued, pending, failed, warning, skipped, missing recipient/template, config missing, or review required.</p>
          </div>
          <div className="grid gap-3">
            {[...queueAttention, ...failedAttempts].slice(0, 18).map((row) => {
              const isNotification = "notification_type" in row;
              const status = isNotification ? notificationStatus(row) : row.status || "warning";
              return (
                <article key={`${isNotification ? "n" : "a"}-${row.id}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OperatorStatusPill tone={statusTone(status)}>{formatKey(status)}</OperatorStatusPill>
                        <OperatorStatusPill tone="blue">{formatKey(row.channel)}</OperatorStatusPill>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-950">
                        {isNotification ? formatKey(row.notification_type) : display(row.subject, "Delivery attempt needs review")}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {isNotification
                          ? `Recipient: ${display(payloadString(row.payload, "recipient_email") || payloadString(row.payload, "recipient_phone"), "Missing recipient")}`
                          : `Provider: ${formatKey(row.provider)} / Attempt: ${row.attempt_number ?? 1}`}
                      </p>
                    </div>
                    <Link href="/staff/notifications" className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900">Review notification</Link>
                  </div>
                </article>
              );
            })}
            {queueAttention.length + failedAttempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">No failed or attention notification attempts found.</div> : null}
          </div>
        </section>

        <section id="activity" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-950">Recent Communication Activity</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Combined recent messages, notifications, delivery attempt metadata, and communication-related events.</p>
          </div>
          <div className="grid gap-3">
            {recentActivity.map((activity) => (
              <article key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OperatorStatusPill tone={statusTone(activity.status)}>{formatKey(activity.status)}</OperatorStatusPill>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{formatDateTime(activity.at)}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-950">{activity.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{activity.detail}</p>
                  </div>
                  <Link href={activity.href} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open source</Link>
                </div>
              </article>
            ))}
            {recentActivity.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">No communication activity rows found.</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
