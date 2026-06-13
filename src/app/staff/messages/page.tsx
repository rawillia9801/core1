import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  buyer_id: string | null;
  family_id: string | null;
  channel: string | null;
  external_reference: string | null;
  subject: string | null;
  status: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string | null;
  buyer_id: string | null;
  direction: string | null;
  channel: string | null;
  external_reference: string | null;
  status: string | null;
  from_address: string | null;
  to_address: string | null;
  body_text: string | null;
  sent_at: string | null;
  received_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type PhoneCallRow = {
  id: string;
  conversation_id: string | null;
  buyer_id: string | null;
  external_reference: string | null;
  direction: string | null;
  status: string | null;
  from_phone: string | null;
  from_phone_normalized: string | null;
  to_phone: string | null;
  to_phone_normalized: string | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
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
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type MessageTemplateRow = {
  id: string;
  template_key: string | null;
  name: string | null;
  channel: string | null;
  subject_template: string | null;
  body_template: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type PhoneLookupSummaryRow = {
  normalized_phone: string | null;
  match_count: number | null;
  is_ambiguous: boolean | null;
  verification_required: boolean | null;
  staff_routing_recommended: boolean | null;
};

type CommunicationRecord = {
  id: string;
  kind: string;
  channel: string | null;
  status: string | null;
  title: string;
  summary: string;
  timestamp: string | null;
  buyerId: string | null;
  familyId: string | null;
  applicationId: string | null;
  reservationId: string | null;
  puppyId: string | null;
  conversationId: string | null;
  notificationId: string | null;
  phone: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  attention: string[];
};

type LinkageCounts = {
  application: number;
  reservation: number;
  buyerFamily: number;
  puppy: number;
  templatePreview: number;
  unknown: number;
};

const ATTENTION_STATUSES = new Set([
  "blocked",
  "failed",
  "missing",
  "needs_info",
  "needs_review",
  "pending",
  "queued",
  "skipped",
]);

const PENDING_STATUSES = new Set(["draft", "pending", "queued", "needs_info", "needs_review"]);
const SENSITIVE_TERMS = [
  "bite",
  "chargeback",
  "complaint",
  "decline",
  "denial",
  "denied",
  "emergency",
  "finance",
  "fraud",
  "legal",
  "medical",
  "payment",
  "refund",
  "sick",
  "veterinary",
];

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(
  restUrl: string,
  table: string,
  params: Record<string, string>,
) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
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

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatKey(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9@.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clipped(value: string | null | undefined, maxLength = 300) {
  if (!value) {
    return "Not recorded";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeFlag(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
}

function payloadString(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) {
    return null;
  }

  for (const key of keys) {
    const value = safeString(payload[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function safeMetadataKeys(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return [];
  }

  return Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("token") &&
        !lowered.includes("secret") &&
        !lowered.includes("password") &&
        !lowered.includes("credential") &&
        !lowered.includes("authorization") &&
        !lowered.includes("cookie") &&
        !lowered.includes("hash")
      );
    })
    .slice(0, 8);
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  const keys = safeMetadataKeys(metadata);
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No metadata keys recorded";
  }

  return keys.length > 0
    ? `Metadata keys: ${keys.join(", ")}`
    : "Metadata present, hidden from readiness view";
}

function statusTone(status: string | null) {
  const normalized = normalizeText(status);

  if (["open", "recorded", "previewed"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["ready", "sent", "completed", "closed"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["draft", "pending", "queued", "needs review", "needs info"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["failed", "blocked", "cancelled", "skipped"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isRecent(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 7;
}

function isOldPending(status: string | null | undefined, value: string | null | undefined) {
  const normalized = normalizeText(status).replaceAll(" ", "_");
  if (!PENDING_STATUSES.has(normalized) || !value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() > 1000 * 60 * 60 * 24 * 7;
}

function containsSensitiveText(...values: Array<string | null | undefined>) {
  const text = normalizeText(values.filter(Boolean).join(" "));
  return SENSITIVE_TERMS.some((term) => text.includes(term));
}

function phoneLookupKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\D/g, "");
  if (normalized.length === 10) {
    return `+1${normalized}`;
  }

  if (normalized.length === 11 && normalized.startsWith("1")) {
    return `+${normalized}`;
  }

  return value.trim();
}

function templateSafety(template: MessageTemplateRow | undefined) {
  const metadata = template?.metadata ?? {};
  const previewOnly = safeFlag(metadata.preview_only);
  const sendEnabled = safeFlag(metadata.send_enabled);
  const providerConnected = safeFlag(metadata.provider_connected);

  if (!template) {
    return "Template not linked";
  }

  if (previewOnly && !sendEnabled && !providerConnected) {
    return "Preview only";
  }

  return "Review flags";
}

function buildAttention({
  status,
  timestamp,
  hasLink,
  phone,
  phoneSummary,
  textValues,
  isQueuedNotification,
  template,
  provider,
}: {
  status: string | null | undefined;
  timestamp: string | null | undefined;
  hasLink: boolean;
  phone?: string | null;
  phoneSummary?: PhoneLookupSummaryRow;
  textValues: Array<string | null | undefined>;
  isQueuedNotification?: boolean;
  template?: MessageTemplateRow;
  provider?: string | null;
}) {
  const attention: string[] = [];
  const normalizedStatus = normalizeText(status).replaceAll(" ", "_");

  if (!hasLink) {
    attention.push("Unlinked communication context.");
  }

  if (ATTENTION_STATUSES.has(normalizedStatus)) {
    attention.push(`Status needs review: ${formatKey(status)}.`);
  }

  if (isOldPending(status, timestamp)) {
    attention.push("Pending or queued record is older than seven days.");
  }

  if (phone && (phoneSummary?.is_ambiguous || phoneSummary?.verification_required)) {
    attention.push("Phone/contact match needs human verification.");
  }

  if (phoneSummary?.staff_routing_recommended) {
    attention.push("Phone/contact match recommends owner/admin routing.");
  }

  if (containsSensitiveText(...textValues)) {
    attention.push("Sensitive communication category may need owner review.");
  }

  if (isQueuedNotification) {
    const metadata = template?.metadata ?? {};
    if (safeFlag(metadata.preview_only) && !safeFlag(metadata.send_enabled)) {
      attention.push("Queued notification remains preview-only and send-disabled.");
    }
  }

  if (provider && ["smtp", "resend"].includes(provider.toLowerCase())) {
    attention.push(`${formatKey(provider)} provider remains disconnected here.`);
  }

  return attention;
}

function Badge({
  children,
  tone = "bg-slate-100 text-slate-700 ring-slate-200",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function RestrictedState() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Communications
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Communications Readiness
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This owner/admin workspace reviews communication metadata before
            any customer messaging or provider behavior is approved.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Staff-role access is intentionally blocked from this communication
            readiness surface. No communication rows were fetched for this view.
          </p>
        </section>
      </div>
    </main>
  );
}

function sourceTimestamp(record: CommunicationRecord) {
  return record.timestamp ?? "";
}

function groupLabel(group: keyof LinkageCounts) {
  if (group === "application") return "Application-linked";
  if (group === "reservation") return "Reservation-linked";
  if (group === "buyerFamily") return "Buyer / family-linked";
  if (group === "puppy") return "Puppy-linked";
  if (group === "templatePreview") return "Template / preview-linked";
  return "Unknown / unlinked";
}

export default async function StaffMessagesPage() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    return <RestrictedState />;
  }

  const [
    conversationResult,
    messageResult,
    phoneCallResult,
    notificationResult,
    attemptResult,
    templateResult,
    phoneSummaryResult,
  ] = await Promise.all([
    readRows<ConversationRow>("core_conversations", {
      select:
        "id,buyer_id,family_id,channel,external_reference,subject,status,last_message_at,metadata,created_at,updated_at",
      order: "updated_at.desc",
      limit: "100",
    }),
    readRows<MessageRow>("core_messages", {
      select:
        "id,conversation_id,buyer_id,direction,channel,external_reference,status,from_address,to_address,body_text,sent_at,received_at,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: "150",
    }),
    readRows<PhoneCallRow>("core_phone_calls", {
      select:
        "id,conversation_id,buyer_id,external_reference,direction,status,from_phone,from_phone_normalized,to_phone,to_phone_normalized,started_at,ended_at,notes,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<NotificationRow>("core_notifications", {
      select:
        "id,family_id,buyer_id,template_id,notification_type,channel,status,scheduled_at,sent_at,payload,created_at,updated_at",
      order: "created_at.desc",
      limit: "150",
    }),
    readRows<DeliveryAttemptRow>("core_notification_delivery_attempts", {
      select:
        "id,notification_id,template_id,provider,channel,status,recipient_email,recipient_phone,subject,attempt_number,attempted_at,completed_at,error_message,metadata,created_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<MessageTemplateRow>("core_message_templates", {
      select:
        "id,template_key,name,channel,subject_template,body_template,status,metadata,created_at,updated_at",
      order: "template_key.asc.nullslast,updated_at.desc",
      limit: "100",
    }),
    readRows<PhoneLookupSummaryRow>("core_phone_lookup_summary_view", {
      select:
        "normalized_phone,match_count,is_ambiguous,verification_required,staff_routing_recommended",
      order: "normalized_phone.asc",
      limit: "250",
    }),
  ]);

  const conversations = conversationResult.rows;
  const messages = messageResult.rows;
  const phoneCalls = phoneCallResult.rows;
  const notifications = notificationResult.rows;
  const attempts = attemptResult.rows;
  const templates = templateResult.rows;
  const phoneSummaries = phoneSummaryResult.rows;
  const warnings = [
    conversationResult.warning,
    messageResult.warning,
    phoneCallResult.warning,
    notificationResult.warning,
    attemptResult.warning,
    templateResult.warning,
    phoneSummaryResult.warning,
  ].filter(Boolean);

  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const phoneSummaryByPhone = new Map(
    phoneSummaries
      .filter((row) => row.normalized_phone)
      .map((row) => [row.normalized_phone as string, row]),
  );
  const messagesByConversation = new Map<string, MessageRow[]>();
  const phoneCallsByConversation = new Map<string, PhoneCallRow[]>();

  for (const message of messages) {
    if (!message.conversation_id) continue;
    messagesByConversation.set(message.conversation_id, [
      ...(messagesByConversation.get(message.conversation_id) ?? []),
      message,
    ]);
  }

  for (const call of phoneCalls) {
    if (!call.conversation_id) continue;
    phoneCallsByConversation.set(call.conversation_id, [
      ...(phoneCallsByConversation.get(call.conversation_id) ?? []),
      call,
    ]);
  }

  const records: CommunicationRecord[] = [
    ...conversations.map((conversation) => {
      const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
      const conversationCalls = phoneCallsByConversation.get(conversation.id) ?? [];
      const latestMessage = conversationMessages[0] ?? null;
      const latestCall = conversationCalls[0] ?? null;
      const phone = latestCall?.from_phone_normalized ?? latestCall?.to_phone_normalized ?? null;
      const phoneSummary = phone ? phoneSummaryByPhone.get(phone) : undefined;
      const hasLink = Boolean(conversation.buyer_id || conversation.family_id);

      return {
        id: conversation.id,
        kind: "Conversation",
        channel: conversation.channel,
        status: conversation.status,
        title: display(conversation.subject, "Untitled conversation"),
        summary:
          latestMessage?.body_text ??
          latestCall?.notes ??
          `${conversationMessages.length} message row(s), ${conversationCalls.length} phone call row(s).`,
        timestamp:
          conversation.last_message_at ?? conversation.updated_at ?? conversation.created_at,
        buyerId: conversation.buyer_id,
        familyId: conversation.family_id,
        applicationId: null,
        reservationId: null,
        puppyId: null,
        conversationId: conversation.id,
        notificationId: null,
        phone,
        email: latestMessage?.from_address ?? latestMessage?.to_address ?? null,
        metadata: conversation.metadata,
        attention: buildAttention({
          status: conversation.status,
          timestamp: conversation.last_message_at ?? conversation.updated_at,
          hasLink,
          phone,
          phoneSummary,
          textValues: [conversation.subject, latestMessage?.body_text, latestCall?.notes],
        }),
      } satisfies CommunicationRecord;
    }),
    ...messages
      .filter((message) => !message.conversation_id)
      .map((message) => {
        const hasLink = Boolean(message.buyer_id);
        return {
          id: message.id,
          kind: "Message",
          channel: message.channel,
          status: message.status,
          title: `${formatKey(message.direction)} message`,
          summary: clipped(message.body_text),
          timestamp: message.received_at ?? message.sent_at ?? message.created_at,
          buyerId: message.buyer_id,
          familyId: null,
          applicationId: null,
          reservationId: null,
          puppyId: null,
          conversationId: null,
          notificationId: null,
          phone: null,
          email: message.from_address ?? message.to_address,
          metadata: message.metadata,
          attention: buildAttention({
            status: message.status,
            timestamp: message.created_at,
            hasLink,
            textValues: [message.body_text, message.from_address, message.to_address],
          }),
        } satisfies CommunicationRecord;
      }),
    ...phoneCalls
      .filter((call) => !call.conversation_id)
      .map((call) => {
        const phone = call.from_phone_normalized ?? call.to_phone_normalized ?? null;
        const phoneSummary = phone ? phoneSummaryByPhone.get(phone) : undefined;
        const hasLink = Boolean(call.buyer_id);
        return {
          id: call.id,
          kind: "Phone call",
          channel: "phone",
          status: call.status,
          title: `${formatKey(call.direction)} phone call`,
          summary: clipped(call.notes),
          timestamp: call.started_at ?? call.created_at,
          buyerId: call.buyer_id,
          familyId: null,
          applicationId: null,
          reservationId: null,
          puppyId: null,
          conversationId: null,
          notificationId: null,
          phone,
          email: null,
          metadata: call.metadata,
          attention: buildAttention({
            status: call.status,
            timestamp: call.started_at ?? call.created_at,
            hasLink,
            phone,
            phoneSummary,
            textValues: [call.notes, call.from_phone, call.to_phone],
          }),
        } satisfies CommunicationRecord;
      }),
    ...notifications.map((notification) => {
      const template = notification.template_id
        ? templatesById.get(notification.template_id)
        : undefined;
      const applicationId = payloadString(notification.payload, [
        "application_id",
        "related_application_id",
      ]);
      const reservationId = payloadString(notification.payload, [
        "reservation_id",
        "related_reservation_id",
      ]);
      const puppyId = payloadString(notification.payload, ["puppy_id", "related_puppy_id"]);
      const email = payloadString(notification.payload, [
        "recipient_email",
        "email",
        "to_email",
      ]);
      const hasLink = Boolean(
        notification.buyer_id ||
          notification.family_id ||
          applicationId ||
          reservationId ||
          puppyId ||
          notification.template_id,
      );

      return {
        id: notification.id,
        kind: "Notification",
        channel: notification.channel,
        status: notification.status,
        title: formatKey(notification.notification_type),
        summary: clipped(
          payloadString(notification.payload, ["subject", "body_preview", "message"]) ??
            template?.subject_template,
        ),
        timestamp: notification.scheduled_at ?? notification.created_at,
        buyerId: notification.buyer_id,
        familyId: notification.family_id,
        applicationId,
        reservationId,
        puppyId,
        conversationId: null,
        notificationId: notification.id,
        phone: null,
        email,
        metadata: notification.payload,
        attention: buildAttention({
          status: notification.status,
          timestamp: notification.created_at,
          hasLink,
          textValues: [
            notification.notification_type,
            payloadString(notification.payload, ["subject", "body_preview", "message"]),
            template?.subject_template,
            template?.body_template,
          ],
          isQueuedNotification: normalizeText(notification.status) === "queued",
          template,
        }),
      } satisfies CommunicationRecord;
    }),
    ...attempts.map((attempt) => {
      const template = attempt.template_id ? templatesById.get(attempt.template_id) : undefined;
      const hasLink = Boolean(attempt.notification_id || attempt.template_id);
      return {
        id: attempt.id,
        kind: "Delivery attempt",
        channel: attempt.channel,
        status: attempt.status,
        title: display(attempt.subject, "Delivery attempt log"),
        summary: display(attempt.error_message, `Provider ${formatKey(attempt.provider)} attempt ${attempt.attempt_number ?? "not recorded"}`),
        timestamp: attempt.attempted_at ?? attempt.created_at,
        buyerId: null,
        familyId: null,
        applicationId: null,
        reservationId: null,
        puppyId: null,
        conversationId: null,
        notificationId: attempt.notification_id,
        phone: attempt.recipient_phone,
        email: attempt.recipient_email,
        metadata: attempt.metadata,
        attention: buildAttention({
          status: attempt.status,
          timestamp: attempt.created_at,
          hasLink,
          phone: attempt.recipient_phone,
          phoneSummary: attempt.recipient_phone
            ? phoneSummaryByPhone.get(phoneLookupKey(attempt.recipient_phone) ?? "")
            : undefined,
          textValues: [attempt.subject, attempt.error_message, template?.body_template],
          template,
          provider: attempt.provider,
        }),
      } satisfies CommunicationRecord;
    }),
  ].sort((a, b) => sourceTimestamp(b).localeCompare(sourceTimestamp(a)));

  const totalRecords =
    conversations.length +
    messages.length +
    phoneCalls.length +
    notifications.length +
    attempts.length;
  const attentionRecords = records.filter((record) => record.attention.length > 0);
  const needsReviewCount = records.filter((record) =>
    ATTENTION_STATUSES.has(normalizeText(record.status).replaceAll(" ", "_")),
  ).length;
  const recentActivityCount = records.filter((record) => isRecent(record.timestamp)).length;
  const ambiguousCommunicationCount = records.filter((record) => {
    if (!record.phone) return false;
    const phoneSummary = phoneSummaryByPhone.get(phoneLookupKey(record.phone) ?? record.phone);
    return Boolean(phoneSummary?.is_ambiguous || phoneSummary?.verification_required);
  }).length;

  const linkageCounts = records.reduce<LinkageCounts>(
    (counts, record) => {
      if (record.applicationId) counts.application += 1;
      else if (record.reservationId) counts.reservation += 1;
      else if (record.buyerId || record.familyId) counts.buyerFamily += 1;
      else if (record.puppyId) counts.puppy += 1;
      else if (record.notificationId || record.metadata?.template_key) counts.templatePreview += 1;
      else counts.unknown += 1;
      return counts;
    },
    {
      application: 0,
      reservation: 0,
      buyerFamily: 0,
      puppy: 0,
      templatePreview: 0,
      unknown: 0,
    },
  );

  const previewTemplates = templates.filter((template) => {
    const metadata = template.metadata ?? {};
    return safeFlag(metadata.preview_only) && !safeFlag(metadata.send_enabled);
  });
  const providerDisconnectedTemplates = templates.filter(
    (template) => !safeFlag(template.metadata?.provider_connected),
  );
  const queuedNotifications = notifications.filter(
    (notification) => normalizeText(notification.status) === "queued",
  );
  const allTemplateRowsSafe =
    templates.length > 0 &&
    templates.every((template) => {
      const metadata = template.metadata ?? {};
      return safeFlag(metadata.preview_only) && !safeFlag(metadata.send_enabled) && !safeFlag(metadata.provider_connected);
    });

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Communications
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Communications Readiness
              </h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
                Internal owner/admin readiness view for communication metadata,
                notification previews, template safety flags, contact ambiguity,
                and follow-up attention signals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/communications" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
                Communications
              </Link>
              <Link href="/staff/notifications" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Notifications
              </Link>
              <Link href="/staff/phone-lookup" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Phone Lookup
              </Link>
              <Link href="/staff" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This workspace shows internal Core communication metadata only. It does not send email, SMS, Facebook messages, phone calls, portal messages, replies, or external provider requests.
          </p>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {warnings[0]}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total records" value={totalRecords} note="Conversations, messages, phone calls, notifications, and attempt logs" />
          <StatCard label="Unlinked / ambiguous" value={linkageCounts.unknown + ambiguousCommunicationCount} note={`${linkageCounts.unknown} unlinked and ${ambiguousCommunicationCount} ambiguous phone/contact record(s)`} />
          <StatCard label="Needs review" value={needsReviewCount} note="Queued, pending, blocked, failed, skipped, or needs-review statuses" />
          <StatCard label="Recent activity" value={recentActivityCount} note="Metadata activity in the last 7 days" />
          <StatCard label="Provider state" value={allTemplateRowsSafe ? "Preview" : "Review"} note={`${previewTemplates.length} preview-only template(s), ${providerDisconnectedTemplates.length} provider-disconnected`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Communication Metadata Records</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Combined read-only list from `core_conversations`, `core_messages`,
                `core_phone_calls`, `core_notifications`, and delivery-attempt logs.
                Provider payloads, secrets, and raw request/response bodies are not displayed.
              </p>
            </div>

            {records.length > 0 ? (
              <div className="space-y-4">
                {records.slice(0, 80).map((record) => (
                  <article key={`${record.kind}-${record.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{record.kind}</Badge>
                          <Badge>{formatKey(record.channel)}</Badge>
                          <Badge tone={statusTone(record.status)}>{formatKey(record.status)}</Badge>
                        </div>
                        <p className="mt-3 text-lg font-bold text-slate-950">{record.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{clipped(record.summary, 360)}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">
                        {formatDateTime(record.timestamp)}
                      </p>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <InfoItem label="Buyer / Family" value={`${shortId(record.buyerId)} / ${shortId(record.familyId)}`} />
                      <InfoItem label="Application" value={shortId(record.applicationId)} />
                      <InfoItem label="Reservation / Puppy" value={`${shortId(record.reservationId)} / ${shortId(record.puppyId)}`} />
                      <InfoItem label="Conversation / Notification" value={`${shortId(record.conversationId)} / ${shortId(record.notificationId)}`} />
                      <InfoItem label="Email" value={display(record.email)} />
                      <InfoItem label="Phone" value={display(record.phone)} />
                      <InfoItem label="Record ID" value={shortId(record.id)} />
                      <InfoItem label="Metadata" value={metadataSummary(record.metadata)} />
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {record.applicationId ? (
                        <Link href={`/staff/applications/${record.applicationId}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                          Application
                        </Link>
                      ) : null}
                      {record.reservationId ? (
                        <Link href={`/staff/reservations/${record.reservationId}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                          Reservation readiness
                        </Link>
                      ) : null}
                      <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                        Buyers
                      </Link>
                      <Link href="/staff/families" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                        Families
                      </Link>
                      <Link href="/staff/phone-lookup" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                        Phone Lookup
                      </Link>
                    </div>

                    {record.attention.length > 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Attention
                        </p>
                        <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">
                          {record.attention.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-950">
                        No deterministic readiness attention signal found for this metadata row.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No Core communication metadata exists yet. This readiness workspace will show records when conversations, messages, phone calls, notifications, templates, or attempt logs exist." />
            )}
          </section>

          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Readiness Grouping</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Records grouped by existing Core link fields only. This page does
                not infer customer identity beyond the stored metadata and phone
                lookup safety view.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    "application",
                    "reservation",
                    "buyerFamily",
                    "puppy",
                    "templatePreview",
                    "unknown",
                  ] as Array<keyof LinkageCounts>
                ).map((group) => (
                  <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{groupLabel(group)}</p>
                    <p className="mt-2 text-2xl font-bold">{linkageCounts[group]}</p>
                    <p className="mt-1 text-xs text-slate-500">metadata record(s)</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Attention Queue</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Internal follow-up signals only. These do not write status,
                route messages, call providers, or contact customers.
              </p>
              {attentionRecords.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {attentionRecords.slice(0, 12).map((record) => (
                    <article key={`attention-${record.kind}-${record.id}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{record.title}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                            {record.kind} / {shortId(record.id)}
                          </p>
                        </div>
                        <Badge tone="bg-white text-amber-800 ring-amber-200">
                          {record.attention.length} signal(s)
                        </Badge>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm leading-6">
                        {record.attention.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="Not enough metadata to evaluate attention signals, or no deterministic communication attention signals are currently present." />
              )}
            </section>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Preview-Only Notification And Template State</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Draft templates and queued notifications are visible for owner/admin review.
                Template existence and queue records never authorize sending.
              </p>
            </div>
            <Link href="/staff/notifications" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
              Open notification preview
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Templates" value={templates.length} note={`${previewTemplates.length} preview-only and send-disabled`} />
            <StatCard label="Queued notifications" value={queuedNotifications.length} note="Queue/tracking rows only" />
            <StatCard label="Delivery attempts" value={attempts.length} note="Attempt logs, not provider authority" />
            <StatCard label="Provider connected" value={providerDisconnectedTemplates.length === templates.length ? "No" : "Review"} note="SMTP, Resend, Twilio, Facebook, and portal sending remain disconnected" />
          </div>

          {templates.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {templates.slice(0, 12).map((template) => (
                <article key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{template.template_key || "template"}</Badge>
                    <Badge>{formatKey(template.channel)}</Badge>
                    <Badge tone={statusTone(template.status)}>{formatKey(template.status)}</Badge>
                    <Badge tone="bg-amber-50 text-amber-700 ring-amber-100">
                      {templateSafety(template)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">
                    {template.name || template.subject_template || "Unnamed template"}
                  </p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoItem label="Preview only" value={String(safeFlag(template.metadata?.preview_only))} />
                    <InfoItem label="Send enabled" value={String(safeFlag(template.metadata?.send_enabled))} />
                    <InfoItem label="Provider connected" value={String(safeFlag(template.metadata?.provider_connected))} />
                    <InfoItem label="Updated" value={formatDateTime(template.updated_at ?? template.created_at)} />
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="No Core message template records found." />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Readiness Boundary</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Communication metadata readable
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Notification/template preview readable
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No email or SMTP sending connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No SMS, phone call, or Twilio connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No Facebook or portal messaging connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No AI-generated send/reply action enabled
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

