import Link from "next/link";
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

type NotificationPreview = {
  id: string;
  notificationType: string;
  channel: string;
  status: string;
  recipientEmail: string;
  recipientPhone: string;
  buyerId: string;
  familyId: string;
  applicationId: string;
  reservationId: string;
  ledgerEntryId: string;
  templateKey: string;
  templateStatus: string;
  subjectPreview: string;
  bodyPreview: string;
  metadataSummary: string[];
  scheduledAt: string;
  sentAt: string;
  createdAt: string;
};

type TemplatePreview = {
  id: string;
  templateKey: string;
  name: string;
  channel: string;
  status: string;
  subjectTemplate: string;
  bodyTemplate: string;
  metadataSummary: string[];
  previewOnly: string;
  sendEnabled: string;
  providerConnected: string;
  approvalRequired: string;
  updatedAt: string;
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

function metadataSummary(payload: Record<string, unknown> | null) {
  const metadata = payload?.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata)
    .filter(([, value]) => {
      return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      );
    })
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`);
}

function templateMetadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata)
    .filter(([key, value]) => {
      return (
        key !== "merge_fields" &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean")
      );
    })
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${String(value)}`);
}

function mergeFieldsSummary(metadata: Record<string, unknown> | null) {
  const mergeFields = metadata?.merge_fields;

  if (!Array.isArray(mergeFields)) {
    return "Not listed";
  }

  const fields = mergeFields.filter((field): field is string => typeof field === "string");

  return fields.length > 0 ? fields.join(", ") : "Not listed";
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
    metadataSummary: [
      `merge_fields: ${mergeFieldsSummary(metadata)}`,
      ...templateMetadataSummary(metadata),
    ],
    previewOnly: safeFlag(metadata.preview_only),
    sendEnabled: safeFlag(metadata.send_enabled),
    providerConnected: safeFlag(metadata.provider_connected),
    approvalRequired: safeFlag(metadata.owner_admin_approval_required),
    updatedAt: formatDateTime(template.updated_at ?? template.created_at),
  };
}

function toPreview(
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
    recipientPhone: safeString(payload.recipient_phone) || "Not provided",
    buyerId: shortId(notification.buyer_id),
    familyId: shortId(notification.family_id),
    applicationId: shortId(safeString(payload.application_id)),
    reservationId: shortId(safeString(payload.reservation_id)),
    ledgerEntryId: shortId(safeString(payload.ledger_entry_id)),
    templateKey: payloadTemplateKey || template?.template_key || "Not linked",
    templateStatus: template?.status || "No template row",
    subjectPreview: clipped(
      safeString(payload.subject) || template?.subject_template,
      240,
    ),
    bodyPreview: clipped(
      safeString(payload.body_preview) || template?.body_template,
      1000,
    ),
    metadataSummary: metadataSummary(payload),
    scheduledAt: formatDateTime(notification.scheduled_at),
    sentAt: formatDateTime(notification.sent_at),
    createdAt: formatDateTime(notification.created_at),
  };
}

async function getNotificationPreviews() {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      previews: [] as NotificationPreview[],
      templates: [] as TemplatePreview[],
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
  const templateIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.template_id)
        .filter(Boolean) as string[],
    ),
  );
  const missingTemplateIds = templateIds.filter(
    (templateId) => !seededTemplates.some((template) => template.id === templateId),
  );
  const linkedTemplates =
    missingTemplateIds.length > 0
      ? await readRows<MessageTemplateRow>(
          restUrl,
          serviceRoleKey,
          "core_message_templates",
          {
            select:
              "id,template_key,name,channel,subject_template,body_template,status,metadata,created_at,updated_at",
            id: `in.(${missingTemplateIds.join(",")})`,
          },
        )
      : [];
  const templatesById = new Map(
    [...seededTemplates, ...linkedTemplates].map((template) => [template.id, template]),
  );

  return {
    previews: notifications.map((notification) =>
      toPreview(
        notification,
        notification.template_id
          ? templatesById.get(notification.template_id)
          : undefined,
      ),
    ),
    templates: seededTemplates.map(toTemplatePreview),
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
            Staff users cannot view queued notification previews during this
            phase. This page may expose recipient and operational communication
            context, so it is owner/admin only.
          </p>
          <Link
            href="/staff"
            className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
          >
            Back to staff dashboard
          </Link>
        </section>
      </main>
    );
  }

  const { previews, templates, warning } = await getNotificationPreviews();

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
                Owner/admin read-only preview of queued Core notifications and
                draft seeded email templates. This page shows what future
                transactional emails might use for recipient, context, subject,
                and body preview.
              </p>
            </div>
            <Link
              href="/staff"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Back to dashboard
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Preview only - no email sending connected
          </p>
          <p className="mt-2 text-sm leading-6">
            Hostinger SMTP, Resend, provider credentials, send workers,
            automatic emails, and send buttons are not connected here. This page
            performs server-side reads only.
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
                Seeded Email Templates
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Showing preview-only draft templates from `core_message_templates`.
                These templates are reusable content foundations, not approval to
                send email.
              </p>
            </div>
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {templates.length} template{templates.length === 1 ? "" : "s"}
            </p>
          </div>

          {templates.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                          {template.templateKey}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                          {template.channel}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                          {template.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-950">
                        {template.name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      Updated {template.updatedAt}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Preview Only" value={template.previewOnly} />
                    <Detail label="Send Enabled" value={template.sendEnabled} />
                    <Detail label="Provider Connected" value={template.providerConnected} />
                    <Detail label="Owner/Admin Approval" value={template.approvalRequired} />
                    <Detail label="Template ID" value={template.id.slice(0, 8)} mono />
                  </dl>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Subject Template
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {template.subjectTemplate}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Body Template
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {template.bodyTemplate}
                    </p>
                  </div>

                  {template.metadataSummary.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Safe Template Metadata
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {template.metadataSummary.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">
                No seeded email templates found.
              </p>
              <p className="mt-2">
                Pull and apply the template seed migration before expecting this
                section to show the preview-only draft template foundation.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Recent Queued Notifications
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Showing up to 25 queued notification records from
              `core_notifications`.
            </p>
          </div>

          {previews.length > 0 ? (
            <div className="space-y-4">
              {previews.map((preview) => (
                <article
                  key={preview.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                          {preview.notificationType}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                          {preview.channel}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                          {preview.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-950">
                        {preview.subjectPreview}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      Created {preview.createdAt}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Recipient Email" value={preview.recipientEmail} />
                    <Detail label="Recipient Phone" value={preview.recipientPhone} />
                    <Detail label="Template Key" value={preview.templateKey} />
                    <Detail label="Template Status" value={preview.templateStatus} />
                    <Detail label="Buyer" value={preview.buyerId} mono />
                    <Detail label="Family" value={preview.familyId} mono />
                    <Detail label="Application" value={preview.applicationId} mono />
                    <Detail label="Reservation" value={preview.reservationId} mono />
                    <Detail label="Ledger Entry" value={preview.ledgerEntryId} mono />
                    <Detail label="Scheduled" value={preview.scheduledAt} />
                    <Detail label="Sent At" value={preview.sentAt} />
                    <Detail label="Notification ID" value={preview.id.slice(0, 8)} mono />
                  </dl>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Body Preview
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {preview.bodyPreview}
                    </p>
                  </div>

                  {preview.metadataSummary.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Safe Metadata Summary
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {preview.metadataSummary.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-slate-800">
                No queued notifications found.
              </p>
              <p className="mt-2">
                Future approved workflows can queue notifications after template,
                preview, recipient override, send logging, and safety rules are
                approved. This page will remain read-only until a later explicit
                sending task.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
