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
  created_at: string | null;
};

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
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads.",
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
  return value ? value.slice(0, 8) : "-";
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

function clipped(value: string | null | undefined, maxLength = 280) {
  if (!value) {
    return "Not recorded";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No metadata keys recorded";
  }

  const safeKeys = Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("token") &&
        !lowered.includes("secret") &&
        !lowered.includes("key")
      );
    })
    .slice(0, 6);

  return safeKeys.length > 0
    ? `Metadata keys: ${safeKeys.join(", ")}`
    : "Metadata present, hidden from preview";
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";

  if (["open", "recorded", "queued", "previewed"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["sent", "completed", "closed"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["failed", "blocked", "cancelled", "skipped"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function RestrictedState() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Communications
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Messages Workspace
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This internal communication inventory is restricted to owner/admin
            while sending, customer portal, and message visibility rules remain
            unfinished.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Staff-role access is intentionally blocked from this first messages
            inventory surface. No communication rows were fetched for this view.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function StaffMessagesPage() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    return <RestrictedState />;
  }

  const [conversationResult, messageResult, notificationResult, attemptResult] =
    await Promise.all([
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
        limit: "100",
      }),
      readRows<NotificationRow>("core_notifications", {
        select:
          "id,family_id,buyer_id,template_id,notification_type,channel,status,scheduled_at,sent_at,payload,created_at,updated_at",
        order: "created_at.desc",
        limit: "100",
      }),
      readRows<DeliveryAttemptRow>("core_notification_delivery_attempts", {
        select:
          "id,notification_id,template_id,provider,channel,status,recipient_email,recipient_phone,subject,attempt_number,attempted_at,completed_at,error_message,created_at",
        order: "created_at.desc",
        limit: "100",
      }),
    ]);

  const conversations = conversationResult.rows;
  const messages = messageResult.rows;
  const notifications = notificationResult.rows;
  const attempts = attemptResult.rows;

  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messages) {
    if (!message.conversation_id) {
      continue;
    }

    messagesByConversation.set(message.conversation_id, [
      ...(messagesByConversation.get(message.conversation_id) ?? []),
      message,
    ]);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Communications
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Messages Workspace
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only internal communication inventory for conversations,
            recorded messages, queued notifications, and delivery-attempt
            metadata.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page only reads Core communication metadata. It does not send
            email, send SMS, create replies, contact customers, trigger
            notifications, or call external providers.
          </p>
        </section>

        {conversationResult.warning ||
        messageResult.warning ||
        notificationResult.warning ||
        attemptResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {conversationResult.warning ??
              messageResult.warning ??
              notificationResult.warning ??
              attemptResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Conversations
            </p>
            <p className="mt-3 text-3xl font-bold">{conversations.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Core conversation containers
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Messages
            </p>
            <p className="mt-3 text-3xl font-bold">{messages.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Recorded message rows only
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notifications
            </p>
            <p className="mt-3 text-3xl font-bold">{notifications.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Queue/tracking metadata
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Delivery attempts
            </p>
            <p className="mt-3 text-3xl font-bold">{attempts.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Attempt logs, not sending authority
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Conversation And Message Records</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Rows from `core_conversations` and `core_messages`, newest
              activity first. No reply or send controls are available.
            </p>
          </div>

          {conversations.length > 0 ? (
            <div className="space-y-4">
              {conversations.map((conversation) => {
                const conversationMessages =
                  messagesByConversation.get(conversation.id) ?? [];
                const latestMessage = conversationMessages[0];

                return (
                  <article
                    key={conversation.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">
                          {display(conversation.subject, "Untitled conversation")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Conversation {shortId(conversation.id)} /{" "}
                          {formatKey(conversation.channel)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(conversation.status)}>
                          {formatKey(conversation.status)}
                        </Badge>
                        <Badge>{conversationMessages.length} message(s)</Badge>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Buyer / Family
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(conversation.buyer_id)} /{" "}
                          {shortId(conversation.family_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          External ref
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(conversation.external_reference)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Last message
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(conversation.last_message_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Updated
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(conversation.updated_at)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Latest message
                        </p>
                        {latestMessage ? (
                          <>
                            <p className="mt-2">
                              {formatKey(latestMessage.direction)} /{" "}
                              {formatKey(latestMessage.channel)} /{" "}
                              {formatKey(latestMessage.status)}
                            </p>
                            <p className="mt-2 leading-6">
                              {clipped(latestMessage.body_text)}
                            </p>
                            <p className="mt-2 text-slate-500">
                              From {display(latestMessage.from_address)} to{" "}
                              {display(latestMessage.to_address)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-slate-500">
                            No linked message rows found.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Metadata
                        </p>
                        <p className="mt-2 leading-6">
                          {metadataSummary(conversation.metadata)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No Core conversation rows found yet. This read-only workspace will show real communication metadata when records exist." />
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Notification Metadata</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Recent rows from `core_notifications`. These are queue/tracking
                rows only and do not prove delivery.
              </p>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 25).map((notification) => (
                  <article
                    key={notification.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {formatKey(notification.notification_type)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Notification {shortId(notification.id)}
                        </p>
                      </div>
                      <Badge tone={statusTone(notification.status)}>
                        {formatKey(notification.status)}
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Channel
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatKey(notification.channel)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Sent at
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(notification.sent_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Buyer / Family
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(notification.buyer_id)} /{" "}
                          {shortId(notification.family_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Created
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(notification.created_at)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No Core notification rows found." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Delivery Attempt Metadata</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Recent rows from `core_notification_delivery_attempts`.
                Existence of rows does not authorize provider sending.
              </p>
            </div>

            {attempts.length > 0 ? (
              <div className="space-y-4">
                {attempts.slice(0, 25).map((attempt) => (
                  <article
                    key={attempt.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {display(attempt.subject, "No subject")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Provider {formatKey(attempt.provider)} / Attempt{" "}
                          {attempt.attempt_number ?? "not recorded"}
                        </p>
                      </div>
                      <Badge tone={statusTone(attempt.status)}>
                        {formatKey(attempt.status)}
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Recipient
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(attempt.recipient_email, display(attempt.recipient_phone))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Notification
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(attempt.notification_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Attempted
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(attempt.attempted_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Error
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(attempt.error_message, "None")}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No Core delivery attempt rows found." />
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This workspace is a read-only internal review surface, not a
              sending console.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Communication metadata readable
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Notification metadata readable
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Delivery attempts readable
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No email sending connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No SMS/Twilio connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No AI autonomous write action enabled
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
