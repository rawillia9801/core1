import Link from "next/link";
import { getSmtpReadiness } from "@/lib/core/smtp-mailer";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, OperatorStatusPill, SectionNav, SummaryStrip } from "../operator-ui";
import { sendSmtpTestEmail } from "./actions";

export const dynamic = "force-dynamic";

type Focus = "overview" | "test" | "templates" | "notifications" | "logs";
type ReadResult<T> = { rows: T[]; warning: string | null };
type Payload = Record<string, unknown> | null;

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
  payload: Payload;
  created_at: string | null;
  updated_at: string | null;
};

type TemplateRow = {
  id: string;
  template_key: string | null;
  name: string | null;
  channel: string | null;
  subject_template: string | null;
  body_template: string | null;
  status: string | null;
  metadata: Payload;
  updated_at: string | null;
};

type AttemptRow = {
  id: string;
  notification_id: string | null;
  template_id: string | null;
  provider: string | null;
  channel: string | null;
  status: string | null;
  recipient_email: string | null;
  subject: string | null;
  attempt_number: number | null;
  attempted_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Payload;
  created_at: string | null;
};

const focusLinks = [
  { key: "overview", href: "/staff/email", label: "Overview" },
  { key: "test", href: "/staff/email/test", label: "Test" },
  { key: "templates", href: "/staff/email/templates", label: "Templates" },
  { key: "notifications", href: "/staff/email/notifications", label: "Notifications" },
  { key: "logs", href: "/staff/email/logs", label: "Logs" },
] as const;

const staticTemplates = [
  {
    key: "application_received",
    name: "Application received",
    purpose: "Confirm a puppy application was received.",
    subject: "We received your puppy application",
    body: "Hi {{buyer_first_name}}, thank you for applying with Southwest Virginia Chihuahua. We received your application and will review it soon.",
    variables: ["buyer_first_name", "application_date"],
  },
  {
    key: "application_approved",
    name: "Application approved",
    purpose: "Let a buyer know their application is approved after owner review.",
    subject: "Your puppy application has been approved",
    body: "Hi {{buyer_first_name}}, your application has been approved. We will follow up with next steps for matching and reservation options.",
    variables: ["buyer_first_name"],
  },
  {
    key: "application_needs_review",
    name: "Application needs review",
    purpose: "Ask for additional details before a final application decision.",
    subject: "A quick follow-up about your puppy application",
    body: "Hi {{buyer_first_name}}, thank you for your application. We have a couple of follow-up questions before we finish reviewing it.",
    variables: ["buyer_first_name"],
  },
  {
    key: "reservation_confirmed",
    name: "Reservation confirmed",
    purpose: "Confirm a puppy reservation after the reservation workflow is complete.",
    subject: "Your puppy reservation is confirmed",
    body: "Hi {{buyer_first_name}}, your reservation for {{puppy_name}} is confirmed. We will keep you updated on next steps.",
    variables: ["buyer_first_name", "puppy_name"],
  },
  {
    key: "payment_reminder",
    name: "Deposit/payment reminder",
    purpose: "Friendly reminder to review an upcoming deposit or payment.",
    subject: "Payment reminder for {{puppy_name}}",
    body: "Hi {{buyer_first_name}}, this is a friendly reminder about the next payment step for {{puppy_name}}. Contact us with any questions.",
    variables: ["buyer_first_name", "puppy_name", "amount_due"],
  },
  {
    key: "document_ready",
    name: "Document ready",
    purpose: "Tell a buyer a document is ready for review.",
    subject: "A document is ready for your review",
    body: "Hi {{buyer_first_name}}, a document for {{puppy_name}} is ready for review. Please contact us if anything looks unclear.",
    variables: ["buyer_first_name", "puppy_name", "document_title"],
  },
  {
    key: "document_signed_received",
    name: "Document signed/received",
    purpose: "Acknowledge that a document has been received.",
    subject: "We received your document",
    body: "Hi {{buyer_first_name}}, we received your document. Thank you for getting that back to us.",
    variables: ["buyer_first_name", "document_title"],
  },
  {
    key: "go_home_readiness",
    name: "Go-home readiness",
    purpose: "Share go-home preparation next steps after owner review.",
    subject: "Getting ready for go-home day",
    body: "Hi {{buyer_first_name}}, we are getting ready for {{puppy_name}}'s go-home day. We will confirm timing, documents, and final checklist items.",
    variables: ["buyer_first_name", "puppy_name", "go_home_date"],
  },
  {
    key: "general_buyer_follow_up",
    name: "General buyer follow-up",
    purpose: "Warm follow-up for buyer questions or routine updates.",
    subject: "Following up from Southwest Virginia Chihuahua",
    body: "Hi {{buyer_first_name}}, we wanted to follow up and make sure you have what you need. Please contact us anytime with questions.",
    variables: ["buyer_first_name"],
  },
  {
    key: "puppy_update_notice",
    name: "Puppy update notice",
    purpose: "Let a family know a puppy update is available.",
    subject: "A puppy update is ready",
    body: "Hi {{buyer_first_name}}, we have a new update for {{puppy_name}}. We are excited to share how things are going.",
    variables: ["buyer_first_name", "puppy_name"],
  },
];

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
  if (!config) return { rows: [], warning: "Core server-side read configuration is not available." };
  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) return { rows: [], warning: `${table} read skipped (${response.status}).` };
  return { rows: (await response.json()) as T[], warning: null };
}

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function payloadString(payload: Payload, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function tone(status: string | null | undefined): "neutral" | "green" | "blue" | "amber" | "red" {
  const value = normalized(status);
  if (["sent", "ready", "available", "approved", "active"].includes(value)) return "green";
  if (["queued", "pending", "previewed", "draft", "warning", "skipped", "needs_review"].includes(value)) return "amber";
  if (["failed", "blocked", "missing_recipient", "missing_template", "config_missing", "send_failed"].includes(value)) return "red";
  if (["test", "smtp", "email", "review_required"].includes(value)) return "blue";
  return "neutral";
}

function notificationStatus(row: NotificationRow) {
  const status = normalized(row.status);
  if (status) return status;
  if (row.channel === "email" && !payloadString(row.payload, "recipient_email")) return "missing_recipient";
  if (!row.template_id && !payloadString(row.payload, "template_key")) return "missing_template";
  return "review_required";
}

function resultMessage(result: string | undefined) {
  if (!result) return null;
  const messages: Record<string, string> = {
    sent: "SMTP test email sent.",
    config_missing: "SMTP configuration is incomplete.",
    invalid_recipient: "Enter a valid recipient email address.",
    unauthorized: "Only owner/admin users can send a test email.",
    smtp_auth_failed: "SMTP authentication failed. Check the configured mailbox username/password outside Core.",
    smtp_connection_failed: "SMTP connection failed. Check host, port, secure mode, and provider availability.",
    smtp_rejected: "SMTP provider rejected the test message.",
    send_failed: "SMTP test failed. Review configuration and provider status.",
  };
  return (
    <section className={`rounded-3xl border p-5 text-sm font-semibold shadow-sm ${result === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
      {messages[result] ?? "SMTP test result needs review."}
    </section>
  );
}

function TemplateCard({ template, stored }: { template: (typeof staticTemplates)[number]; stored?: TemplateRow }) {
  const status = stored ? display(stored.status, "available") : "needs implementation";
  const subject = stored?.subject_template || template.subject;
  const body = stored?.body_template || template.body;
  const fields = Array.isArray(stored?.metadata?.merge_fields)
    ? (stored?.metadata?.merge_fields as unknown[]).filter((field): field is string => typeof field === "string")
    : template.variables;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{template.name}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{template.purpose}</p>
        </div>
        <OperatorStatusPill tone={stored ? tone(status) : "amber"}>{stored ? formatKey(status) : "Needs Implementation"}</OperatorStatusPill>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Subject</dt><dd className="mt-1 font-semibold text-slate-800">{subject}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Body Preview</dt><dd className="mt-1 leading-6 text-slate-600">{body}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-slate-400">Variables</dt><dd className="mt-1 text-slate-600">{fields.length ? fields.join(", ") : "Not listed"}</dd></div>
      </dl>
    </article>
  );
}

function Row({ title, detail, status, href }: { title: string; detail: string; status: string; href?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <OperatorStatusPill tone={tone(status)}>{formatKey(status)}</OperatorStatusPill>
          {href ? <Link href={href} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open</Link> : null}
        </div>
      </div>
    </article>
  );
}

export async function EmailReadinessPage({ focus = "overview", result }: { focus?: Focus; result?: string }) {
  await requireStaffProfile();
  const smtp = getSmtpReadiness();
  const [notificationResult, templateResult, attemptResult] = await Promise.all([
    readRows<NotificationRow>("core_notifications", { select: "id,family_id,buyer_id,template_id,notification_type,channel,status,scheduled_at,sent_at,payload,created_at,updated_at", order: "created_at.desc", limit: "200" }),
    readRows<TemplateRow>("core_message_templates", { select: "id,template_key,name,channel,subject_template,body_template,status,metadata,updated_at", order: "template_key.asc.nullslast,updated_at.desc", limit: "150" }),
    readRows<AttemptRow>("core_notification_delivery_attempts", { select: "id,notification_id,template_id,provider,channel,status,recipient_email,subject,attempt_number,attempted_at,completed_at,error_message,metadata,created_at", order: "created_at.desc", limit: "150" }),
  ]);
  const notifications = notificationResult.rows;
  const templates = templateResult.rows;
  const attempts = attemptResult.rows;
  const warnings = [notificationResult.warning, templateResult.warning, attemptResult.warning].filter(Boolean);
  const byTemplateKey = new Map(templates.filter((row) => row.template_key).map((row) => [row.template_key as string, row]));
  const queued = notifications.filter((row) => ["queued", "pending"].includes(notificationStatus(row)));
  const sent = notifications.filter((row) => notificationStatus(row) === "sent");
  const failed = notifications.filter((row) => ["failed", "blocked", "warning"].includes(notificationStatus(row)));
  const missingRecipient = notifications.filter((row) => row.channel === "email" && !payloadString(row.payload, "recipient_email"));
  const missingTemplate = notifications.filter((row) => !row.template_id && !payloadString(row.payload, "template_key"));
  const failedAttempts = attempts.filter((row) => ["failed", "blocked", "skipped"].includes(normalized(row.status)));
  const visible = focus === "overview" ? ["overview", "test", "templates", "notifications", "logs"] : ["overview", focus];

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Email Command Center"
          title="SMTP Email Delivery / Template / Notification Test Center"
          summary="Owner/admin readiness for SMTP configuration, one-recipient test sends, customer-safe template previews, notification queue status, and safe delivery-attempt logs."
          status={smtp.configured ? "SMTP configured" : "SMTP incomplete"}
          blockers={smtp.missing.length + failed.length + failedAttempts.length + missingRecipient.length + missingTemplate.length}
          nextAction={smtp.configured ? "Send a controlled owner/admin SMTP test if needed" : "Complete SMTP environment variables outside Core"}
          links={[
            { href: "/staff/email/test", label: "Test SMTP" },
            { href: "/staff/email/templates", label: "Templates" },
            { href: "/staff/email/notifications", label: "Notifications" },
            { href: "/staff/communications", label: "Communications" },
          ]}
        />

        {resultMessage(result)}

        <SummaryStrip
          items={[
            { label: "SMTP readiness", value: smtp.configured ? "Ready" : "Incomplete", note: smtp.missing.length ? `${smtp.missing.length} missing` : `${smtp.host}:${smtp.port ?? "?"}` },
            { label: "Queued", value: queued.length, note: "pending notification rows" },
            { label: "Sent", value: sent.length, note: "existing notification status" },
            { label: "Attention", value: failed.length + failedAttempts.length + missingRecipient.length + missingTemplate.length, note: "failed/missing/warning" },
            { label: "Templates", value: templates.length, note: `${staticTemplates.length} expected preview types` },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
          <p className="font-bold">Safety boundary</p>
          <p className="mt-1">Only the test page can send, and it sends exactly one owner/admin-initiated SMTP test email to a typed recipient. No template preview, queue row, payment reminder, document notice, portal update, or customer workflow sends automatically.</p>
        </section>

        {warnings.length ? <section className="rounded-3xl border border-amber-200 bg-white p-5 text-sm leading-6 text-amber-950 shadow-sm">{warnings.join(" ")}</section> : null}

        <SectionNav items={focusLinks.map((item) => ({ href: item.href, label: item.label }))} />

        {visible.includes("overview") ? (
          <section id="overview" className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">SMTP Configuration Readiness</h2>
              <div className="mt-5 grid gap-3 text-sm">
                {smtp.required.map((item) => (
                  <div key={item.key} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span>{item.key}</span>
                    <OperatorStatusPill tone={item.configured ? "green" : "red"}>{item.configured ? "Configured" : "Missing"}</OperatorStatusPill>
                  </div>
                ))}
                <div className="flex justify-between gap-3 pt-2"><span>From</span><strong>{smtp.from}</strong></div>
                <div className="flex justify-between gap-3"><span>Reply-To</span><strong>{smtp.replyTo ?? "Not configured"}</strong></div>
                <div className="flex justify-between gap-3"><span>Security</span><strong>{smtp.secure ? "TLS/secure" : "STARTTLS/plain connect"}</strong></div>
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Quick Links</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {focusLinks.slice(1).map((item) => <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">{item.label}</Link>)}
                <Link href="/staff/communications" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">Communications</Link>
                <Link href="/staff/actions" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">Actions</Link>
              </div>
            </section>
          </section>
        ) : null}

        {visible.includes("test") ? (
          <section id="test" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Send One SMTP Test Email</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Owner/admin only. The recipient must be typed explicitly. This does not send a customer template or update notification queue status.</p>
            <form action={sendSmtpTestEmail} className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="text-sm font-semibold">Recipient email
                <input name="recipient" type="email" required placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <button type="submit" className="self-end rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white">Send Test Email</button>
            </form>
          </section>
        ) : null}

        {visible.includes("templates") ? (
          <section id="templates" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold">Customer-Safe Email Templates</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Preview language only. These cards do not send email and do not activate workflow delivery.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {staticTemplates.map((template) => <TemplateCard key={template.key} template={template} stored={byTemplateKey.get(template.key)} />)}
            </div>
          </section>
        ) : null}

        {visible.includes("notifications") ? (
          <section id="notifications" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Notification Queue / Readiness</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Existing `core_notifications` rows grouped by safe readiness status.</p>
              </div>
              <Link href="/staff/notifications" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Legacy Notifications</Link>
            </div>
            <div className="grid gap-3">
              {notifications.slice(0, 30).map((row) => {
                const applicationId = payloadString(row.payload, "application_id");
                const reservationId = payloadString(row.payload, "reservation_id");
                return <Row key={row.id} title={formatKey(row.notification_type)} detail={`Recipient: ${display(payloadString(row.payload, "recipient_email"), "Missing")} / Template: ${payloadString(row.payload, "template_key") || display(row.template_id, "Missing")} / Created: ${formatDateTime(row.created_at)}`} status={notificationStatus(row)} href={applicationId ? `/staff/applications/${applicationId}` : reservationId ? `/staff/reservations/${reservationId}` : row.buyer_id ? `/staff/buyers/${row.buyer_id}` : row.family_id ? `/staff/families/${row.family_id}` : undefined} />;
              })}
              {notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">No persistent notification rows were found.</div> : null}
            </div>
          </section>
        ) : null}

        {visible.includes("logs") ? (
          <section id="logs" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold">Email / Notification Logs</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Safe delivery-attempt rows from `core_notification_delivery_attempts`; raw provider responses and credentials are not shown.</p>
            </div>
            <div className="grid gap-3">
              {attempts.slice(0, 30).map((row) => <Row key={row.id} title={display(row.subject, `Delivery attempt ${row.id.slice(0, 8)}`)} detail={`${formatKey(row.provider)} / ${display(row.recipient_email, "No recipient")} / attempted ${formatDateTime(row.attempted_at ?? row.created_at)}`} status={row.status || "review_required"} />)}
              {attempts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">No persistent email delivery log table rows were found. SMTP testing and notification readiness are available, but historical provider logs are not stored in Core yet.</div> : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
