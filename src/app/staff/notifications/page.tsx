import Link from "next/link";
import { COMMUNICATION_RULES } from "@/lib/email/communication-rules";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

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
  idempotency_key: string | null;
  external_message_id: string | null;
  attempt_number: number | null;
  attempted_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  response_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type TemplatePreview = {
  id: string;
  templateKey: string;
  name: string;
  channel: string;
  status: string;
  subjectTemplate: string;
  bodyTemplate: string;
  previewOnly: string;
  sendEnabled: string;
  providerConnected: string;
  approvalRequired: string;
  mergeFields: string;
  updatedAt: string;
};

type AttemptPreview = {
  id: string;
  notificationId: string;
  templateId: string;
  provider: string;
  channel: string;
  status: string;
  recipientEmail: string;
  subject: string;
  idempotencyKey: string;
  attemptNumber: string;
  attemptedAt: string;
  completedAt: string;
  errorMessage: string;
  sent: string;
  createdAt: string;
};

type NotificationPreview = {
  id: string;
  notificationType: string;
  channel: string;
  status: string;
  recipientEmail: string;
  templateKey: string;
  subjectPreview: string;
  bodyPreview: string;
  sentAt: string;
  createdAt: string;
  buyerId: string;
  familyId: string;
  applicationId: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
}

async function readRows<T>(
  restUrl: string,
  serviceRoleKey: string,
  table: string,
  params: Record<string, string>,
) {
  const response = await fetch(buildUrl(restUrl, table, params), {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} read failed: ${response.status} ${body}`.trim());
  }

  return (await response.json()) as T[];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return dateTimeFormatter.format(parsed);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeFlag(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "not set";
}

function clipped(value: string | null | undefined, maxLength = 600) {
  if (!value) {
    return "Not provided";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function mergeFieldsSummary(metadata: Record<string, unknown> | null) {
  const mergeFields = metadata?.merge_fields;

  if (!Array.isArray(mergeFields)) {
    return "Not listed";
  }

  const fields = mergeFields.filter((field): field is string => typeof field === "string");

  return fields.length > 0 ? fields.join(", ") : "Not listed";
}

function sentSummary(responsePayload: Record<string, unknown> | null) {
  if (!responsePayload || typeof responsePayload !== "object") {
    return "false";
  }

  return safeFlag(responsePayload.sent);
}

function toTemplatePreview(template: MessageTemplateRow): TemplatePreview {
  const metadata = template.metadata ?? {};

  return {
    id: template.id,
    templateKey: template.template_key || "unknown",
    name: template.name || "Unnamed template",
    channel: template.channel || "unknown",
    status: template.status || "unknown",
    subjectTemplate: clipped(template.subject_template, 240),
    bodyTemplate: clipped(template.body_template, 1000),
    previewOnly: safeFlag(metadata.preview_only),
    sendEnabled: safeFlag(metadata.send_enabled),
    providerConnected: safeFlag(metadata.provider_connected),
    approvalRequired: safeFlag(metadata.owner_admin_approval_required),
    mergeFields: mergeFieldsSummary(metadata),
    updatedAt: formatDateTime(template.updated_at ?? template.created_at),
  };
}

function toAttemptPreview(attempt: DeliveryAttemptRow): AttemptPreview {
  return {
    id: attempt.id,
    notificationId: shortId(attempt.notification_id),
    templateId: shortId(attempt.template_id),
    provider: attempt.provider || "unknown",
    channel: attempt.channel || "unknown",
    status: attempt.status || "unknown",
    recipientEmail: attempt.recipient_email || "Not provided",
    subject: clipped(attempt.subject, 240),
    idempotencyKey: attempt.idempotency_key || "Not provided",
    attemptNumber: String(attempt.attempt_number ?? "Not set"),
    attemptedAt: formatDateTime(attempt.attempted_at),
    completedAt: formatDateTime(attempt.completed_at),
    errorMessage: attempt.error_message || "None",
    sent: sentSummary(attempt.response_payload),
    createdAt: formatDateTime(attempt.created_at),
  };
}

function toNotificationPreview(
  notification: NotificationRow,
  template: MessageTemplateRow | undefined,
): NotificationPreview {
  const payload = notification.payload ?? {};
  const payloadTemplateKey = safeString(payload.template_key);

  return {
    id: notification.id,
    notificationType: notification.notification_type || "unknown",
    channel: notification.channel || "unknown",
    status: notification.status || "unknown",
    recipientEmail: safeString(payload.recipient_email) || "Not provided",
    templateKey: payloadTemplateKey || template?.template_key || "Not linked",
    subjectPreview: clipped(safeString(payload.subject) || template?.subject_template, 240),
    bodyPreview: clipped(safeString(payload.body_preview) || template?.body_template, 1000),
    sentAt: formatDateTime(notification.sent_at),
    createdAt: formatDateTime(notification.created_at),
    buyerId: shortId(notification.buyer_id),
    familyId: shortId(notification.family_id),
    applicationId: shortId(safeString(payload.application_id)),
  };
}

async function getNotificationPreviews() {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      previews: [] as NotificationPreview[],
      templates: [] as TemplatePreview[],
      attempts: [] as AttemptPreview[],
      warning:
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Notification previews require server-side local/staging configuration.",
    };
  }

  const { restUrl, serviceRoleKey } = config;
  const notifications = await readRows<NotificationRow>(
    restUrl,
    serviceRoleKey,
    "core_notifications",
    {
      select:
        "id,family_id,buyer_id,template_id,notification_type,channel,status,scheduled_at,sent_at,payload,created_at",
      status: "eq.queued",
      order: "created_at.desc",
      limit: "25",
    },
  );
  const seededTemplates = await readRows<MessageTemplateRow>(
    restUrl,
    serviceRoleKey,
    "core_message_templates",
    {
      select:
        "id,template_key,name,channel,subject_template,body_template,status,metadata,created_at,updated_at",
      channel: "eq.email",
      order: "template_key.asc",
      limit: "50",
    },
  );
  const deliveryAttempts = await readRows<DeliveryAttemptRow>(
    restUrl,
    serviceRoleKey,
    "core_notification_delivery_attempts",
    {
      select:
        "id,notification_id,template_id,provider,channel,status,recipient_email,recipient_phone,subject,idempotency_key,external_message_id,attempt_number,attempted_at,completed_at,error_message,response_payload,metadata,created_at",
      order: "created_at.desc",
      limit: "25",
    },
  );
  const templatesById = new Map(seededTemplates.map((template) => [template.id, template]));

  return {
    previews: notifications.map((notification) =>
      toNotificationPreview(
        notification,
        notification.template_id ? templatesById.get(notification.template_id) : undefined,
      ),
    ),
    templates: seededTemplates.map(toTemplatePreview),
    attempts: deliveryAttempts.map(toAttemptPreview),
    warning: null,
  };
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
      {children}
    </span>
  );
}

export default async function StaffNotificationsPage() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Restricted to owner/admin
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            Notification Preview
          </h1>
          <p className="mt-3 text-sm leading-6">
            Staff users cannot view queued notification previews during this phase.
          </p>
          <Link href="/staff" className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900">
            Back to staff dashboard
          </Link>
        </section>
      </main>
    );
  }

  const { previews, templates, attempts, warning } = await getNotificationPreviews();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                Cherolee Core Notifications
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                Email Preview Queue
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Owner/admin read-only preview of communication rules, queued notifications,
                seeded templates, and blocked/previewed delivery attempt logs.
              </p>
            </div>
            <Link href="/staff" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
              Back to dashboard
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Preview only - no email sending connected
          </p>
          <p className="mt-2 text-sm leading-6">
            Hostinger SMTP, Resend, provider credentials, send workers, automatic emails,
            and send buttons are not connected here. This page performs server-side reads only.
          </p>
        </section>

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
            <p className="text-sm font-semibold">{warning}</p>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Communication Approval Rules
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Current rules for template delivery. Customer delivery and automatic delivery are disabled for every rule.
              </p>
            </div>
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {COMMUNICATION_RULES.length} rules
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {COMMUNICATION_RULES.map((rule) => (
              <article key={rule.templateKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <Pill>{rule.templateKey}</Pill>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                    {rule.mode}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">{rule.label}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Detail label="Customer Delivery Now" value={String(rule.customerDeliveryAllowedNow)} />
                  <Detail label="Automatic Delivery Now" value={String(rule.automaticDeliveryAllowedNow)} />
                  <Detail label="Staff Approval Required" value={String(rule.staffApprovalRequiredBeforeSend)} />
                </dl>
                <p className="mt-4 text-sm leading-6 text-slate-700">{rule.reason}</p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Required Before Any Send
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {rule.requiredBeforeAnySend.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Seeded Email Templates</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Preview-only draft templates from core_message_templates. These are content foundations, not approval to send email.
              </p>
            </div>
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {templates.length} template{templates.length === 1 ? "" : "s"}
            </p>
          </div>

          {templates.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((template) => (
                <article key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{template.templateKey}</Pill>
                    <Pill>{template.channel}</Pill>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                      {template.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{template.name}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Preview Only" value={template.previewOnly} />
                    <Detail label="Send Enabled" value={template.sendEnabled} />
                    <Detail label="Provider Connected" value={template.providerConnected} />
                    <Detail label="Owner/Admin Approval" value={template.approvalRequired} />
                    <Detail label="Merge Fields" value={template.mergeFields} />
                    <Detail label="Template ID" value={template.id.slice(0, 8)} mono />
                  </dl>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subject Template</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{template.subjectTemplate}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Body Template</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{template.bodyTemplate}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">No seeded email templates found.</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Delivery Attempt Logs</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                DELIVERY ATTEMPT LOGS - NO EMAIL SENDING CONNECTED. Showing recent blocked/previewed rows from core_notification_delivery_attempts.
              </p>
            </div>
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
            </p>
          </div>

          {attempts.length > 0 ? (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <article key={attempt.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{attempt.provider}</Pill>
                    <Pill>{attempt.channel}</Pill>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                      {attempt.status}
                    </span>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-100">
                      sent: {attempt.sent}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{attempt.subject}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Recipient Email" value={attempt.recipientEmail} />
                    <Detail label="Attempt Number" value={attempt.attemptNumber} />
                    <Detail label="Notification" value={attempt.notificationId} mono />
                    <Detail label="Template" value={attempt.templateId} mono />
                    <Detail label="Attempted" value={attempt.attemptedAt} />
                    <Detail label="Completed" value={attempt.completedAt} />
                    <Detail label="Error" value={attempt.errorMessage} />
                    <Detail label="Attempt ID" value={attempt.id.slice(0, 8)} mono />
                  </dl>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Idempotency Key</p>
                    <p className="mt-2 break-all font-mono text-sm leading-6 text-slate-700">{attempt.idempotencyKey}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">No delivery attempt logs found.</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent Queued Notifications</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Showing up to 25 queued notification records from core_notifications.</p>
            </div>
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {previews.length} queued
            </p>
          </div>

          {previews.length > 0 ? (
            <div className="space-y-4">
              {previews.map((preview) => (
                <article key={preview.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{preview.notificationType}</Pill>
                    <Pill>{preview.channel}</Pill>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                      {preview.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{preview.subjectPreview}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Recipient Email" value={preview.recipientEmail} />
                    <Detail label="Template Key" value={preview.templateKey} />
                    <Detail label="Buyer" value={preview.buyerId} mono />
                    <Detail label="Family" value={preview.familyId} mono />
                    <Detail label="Application" value={preview.applicationId} mono />
                    <Detail label="Sent At" value={preview.sentAt} />
                    <Detail label="Created" value={preview.createdAt} />
                    <Detail label="Notification ID" value={preview.id.slice(0, 8)} mono />
                  </dl>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Body Preview</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.bodyPreview}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">No queued notifications found.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
