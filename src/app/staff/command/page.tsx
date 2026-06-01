import {
  canViewAuditActivity,
  canViewPhoneLookup,
  canViewSensitiveFinancials,
  requireStaffProfile,
} from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type ApplicationRow = {
  id: string;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  puppy_status: string | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
};

type DogRow = {
  id: string;
  status: string | null;
};

type LitterRow = {
  id: string;
  status: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
};

type PuppyRow = {
  id: string;
  status: string | null;
  public_listing_status: string | null;
};

type GoHomeRow = {
  go_home_detail_id: string | null;
  effective_scheduled_at: string | null;
  effective_status: string | null;
  checklist_status: string | null;
  balance_cleared_status: string | null;
};

type NotificationRow = {
  id: string;
  notification_type: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  source: string | null;
  related_table: string | null;
  related_id: string | null;
};

type AuditRow = {
  id: string;
  action: string | null;
  outcome: string | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  status: string | null;
};

type PhoneLookupSummaryRow = {
  normalized_phone: string | null;
  is_ambiguous: boolean | null;
  verification_required: boolean | null;
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

function normalized(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function countByStatus<T extends { status: string | null }>(
  rows: T[],
  statuses: string[],
) {
  const wanted = new Set(statuses);
  return rows.filter((row) => wanted.has(normalized(row.status))).length;
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

function formatMoney(cents: number | null) {
  if (typeof cents !== "number") {
    return "Restricted or not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
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

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-white/80 bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

function SignalCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function ReadinessItem({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 text-sm font-semibold text-cyan-950">
      {text}
    </div>
  );
}

export default async function StaffCommandPage() {
  const staff = await requireStaffProfile();
  const canViewAudit = canViewAuditActivity(staff.role);
  const canViewFinancials = canViewSensitiveFinancials(staff.role);
  const canViewPhone = canViewPhoneLookup(staff.role);

  const [
    applicationResult,
    reservationResult,
    dogResult,
    litterResult,
    puppyResult,
    goHomeResult,
    notificationResult,
    eventResult,
    auditResult,
    documentResult,
    phoneResult,
  ] = await Promise.all([
    readRows<ApplicationRow>("core_applications", {
      select: "id,status,submitted_at,created_at",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select:
        "reservation_id,reservation_status,puppy_status,balance_due_cents,go_home_planned_at,go_home_status",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<DogRow>("core_dogs", {
      select: "id,status",
      limit: "500",
    }),
    readRows<LitterRow>("core_litters", {
      select: "id,status,birth_at,expected_birth_at",
      limit: "500",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,status,public_listing_status",
      limit: "500",
    }),
    readRows<GoHomeRow>("core_go_home_effective_view", {
      select:
        "go_home_detail_id,effective_scheduled_at,effective_status,checklist_status,balance_cleared_status",
      limit: "500",
    }),
    readRows<NotificationRow>("core_notifications", {
      select: "id,notification_type,status,sent_at,created_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,source,related_table,related_id",
      order: "event_at.desc",
      limit: "12",
    }),
    canViewAudit
      ? readRows<AuditRow>("core_audit_log", {
          select: "id,action,outcome,created_at",
          order: "created_at.desc",
          limit: "50",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
    canViewAudit
      ? readRows<DocumentRow>("core_documents", {
          select: "id,status",
          limit: "500",
        })
      : Promise.resolve({ rows: [] as DocumentRow[], warning: null }),
    canViewPhone
      ? readRows<PhoneLookupSummaryRow>("core_phone_lookup_summary_view", {
          select: "normalized_phone,is_ambiguous,verification_required",
          limit: "500",
        })
      : Promise.resolve({ rows: [] as PhoneLookupSummaryRow[], warning: null }),
  ]);

  const applications = applicationResult.rows;
  const reservations = reservationResult.rows;
  const dogs = dogResult.rows;
  const litters = litterResult.rows;
  const puppies = puppyResult.rows;
  const goHomes = goHomeResult.rows;
  const notifications = notificationResult.rows;
  const events = eventResult.rows;
  const audits = auditResult.rows;
  const documents = documentResult.rows;
  const phoneRows = phoneResult.rows;

  const activeReservationCount = reservations.filter(
    (row) => !["cancelled", "void", "released", "completed"].includes(normalized(row.reservation_status)),
  ).length;
  const pendingApplicationCount = countByStatus(applications, [
    "received",
    "needs_review",
    "pending",
  ]);
  const queuedNotificationCount = countByStatus(notifications, [
    "queued",
    "pending",
  ]);
  const unsentNotificationCount = notifications.filter((row) => !row.sent_at).length;
  const goHomeScheduledCount = goHomes.filter((row) =>
    Boolean(row.effective_scheduled_at),
  ).length;
  const goHomeUnscheduledCount = goHomes.filter(
    (row) => !row.effective_scheduled_at,
  ).length;
  const draftDocumentCount = countByStatus(documents, [
    "draft",
    "pending",
    "generated",
    "ready",
    "review",
  ]);
  const ambiguousPhoneCount = phoneRows.filter(
    (row) => row.is_ambiguous || row.verification_required,
  ).length;
  const availablePuppyCount = countByStatus(puppies, ["available"]);
  const reservedPuppyCount = countByStatus(puppies, ["reserved"]);
  const plannedLitterCount = countByStatus(litters, ["planned", "expected"]);
  const bornLitterCount = litters.filter((row) => Boolean(row.birth_at)).length;
  const openBalanceCount = canViewFinancials
    ? reservations.filter((row) => (row.balance_due_cents ?? 0) > 0).length
    : "Restricted";
  const totalBalanceDue = canViewFinancials
    ? reservations.reduce((sum, row) => sum + (row.balance_due_cents ?? 0), 0)
    : null;
  const successfulAuditCount = audits.filter(
    (row) => normalized(row.outcome) === "success",
  ).length;

  const warning =
    applicationResult.warning ??
    reservationResult.warning ??
    dogResult.warning ??
    litterResult.warning ??
    puppyResult.warning ??
    goHomeResult.warning ??
    notificationResult.warning ??
    eventResult.warning ??
    auditResult.warning ??
    documentResult.warning ??
    phoneResult.warning;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f0fdfa_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-700">
                Cherolee Core
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                Core Command Console
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                Read-only intelligence layer for Southwest Virginia Chihuahua
                operations. This shell summarizes Core records and shows the
                future command surface without connecting AI providers or write
                tools.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusPill label="AI provider" value="Not connected" />
              <StatusPill label="Writes" value="Approval required" />
              <StatusPill label="External systems" value="Off" />
              <StatusPill label="Mode" value="Read-only" />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-cyan-200/70 bg-cyan-50/80 p-6 text-cyan-950 shadow-sm ring-1 ring-white/60 backdrop-blur">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-700">
            Safety state
          </p>
          <p className="mt-2 text-sm leading-7">
            The console reads existing Core data only. It does not call OpenAI
            or any model provider, does not create proposed actions, does not
            write to the database, does not send messages, does not move money,
            does not generate documents, and does not publish anything.
          </p>
        </section>

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {warning}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="rounded-[1.4rem] border border-cyan-300/30 bg-white/5 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
                Planning shell only
              </p>
              <label
                htmlFor="command-input-preview"
                className="mt-4 block text-sm font-semibold text-slate-200"
              >
                Command input preview
              </label>
              <textarea
                id="command-input-preview"
                className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-4 text-sm leading-6 text-slate-400 outline-none"
                disabled
                value={
                  "Planning shell only - no AI provider connected. Future requests will summarize, propose, and wait for owner/admin approval before any controlled RPC/server action can write."
                }
                readOnly
              />
              <p className="mt-3 text-xs leading-6 text-slate-400">
                No form submission, API route, model call, tool call, or action
                queue exists here.
              </p>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Applications"
              value={applications.length}
              note={`${pendingApplicationCount} pending or needs review`}
            />
            <MetricCard
              label="Active reservations"
              value={activeReservationCount}
              note={`${openBalanceCount} with open balance marker`}
            />
            <MetricCard label="Dogs" value={dogs.length} note="Core dog records" />
            <MetricCard
              label="Litters"
              value={litters.length}
              note={`${plannedLitterCount} planned / ${bornLitterCount} born`}
            />
            <MetricCard
              label="Puppies"
              value={puppies.length}
              note={`${availablePuppyCount} available / ${reservedPuppyCount} reserved`}
            />
            <MetricCard
              label="Notifications"
              value={queuedNotificationCount}
              note={`${unsentNotificationCount} not marked sent`}
            />
            <MetricCard
              label="Go-home scheduled"
              value={goHomeScheduledCount}
              note={`${goHomeUnscheduledCount} without schedule`}
            />
            <MetricCard
              label="Documents"
              value={canViewAudit ? documents.length : "Restricted"}
              note={canViewAudit ? `${draftDocumentCount} draft/pending` : "Owner/admin only"}
            />
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-4">
          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <h2 className="text-lg font-black text-slate-950">Needs Review</h2>
            <div className="mt-5 space-y-3">
              <SignalCard
                title="Applications"
                value={pendingApplicationCount}
                detail="Received, pending, or needs-review application records."
              />
              <SignalCard
                title="Notifications"
                value={unsentNotificationCount}
                detail="Notification rows not marked sent. No delivery is connected here."
              />
              <SignalCard
                title="Phone ambiguity"
                value={canViewPhone ? ambiguousPhoneCount : "Restricted"}
                detail="Owner/admin phone lookup ambiguity count from Core views."
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <h2 className="text-lg font-black text-slate-950">Kennel Snapshot</h2>
            <div className="mt-5 space-y-3">
              <SignalCard
                title="Dogs"
                value={dogs.length}
                detail="Adult and breeding dog records in Core."
              />
              <SignalCard
                title="Litters"
                value={litters.length}
                detail={`${plannedLitterCount} planned/expected and ${bornLitterCount} born.`}
              />
              <SignalCard
                title="Puppies"
                value={puppies.length}
                detail={`${availablePuppyCount} available and ${reservedPuppyCount} reserved markers.`}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <h2 className="text-lg font-black text-slate-950">Customer Pipeline</h2>
            <div className="mt-5 space-y-3">
              <SignalCard
                title="Reservations"
                value={activeReservationCount}
                detail="Active reservation status rows in the summary view."
              />
              <SignalCard
                title="Balance due"
                value={canViewFinancials ? formatMoney(totalBalanceDue) : "Restricted"}
                detail="Ledger-derived total visible to owner/admin only."
              />
              <SignalCard
                title="Go-home"
                value={goHomeScheduledCount}
                detail="Scheduled effective go-home rows."
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <h2 className="text-lg font-black text-slate-950">System Safety</h2>
            <div className="mt-5 space-y-3">
              <SignalCard
                title="External systems"
                value="Off"
                detail="No Zoho, Twilio, SMTP, payment, portal, document, or public publishing connection."
              />
              <SignalCard
                title="Autonomous writes"
                value="Off"
                detail="No AI provider, write tools, or action queue connected."
              />
              <SignalCard
                title="Approval model"
                value="Planned"
                detail="Future action approval model is documented, not implemented."
              />
            </div>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-950">Recent Activity</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Latest rows from `core_events`. This is read-only timeline
                context.
              </p>
            </div>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">
                          {display(event.summary, formatKey(event.event_type))}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(event.event_at)} /{" "}
                          {display(event.source, "source unknown")}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                        {formatKey(event.event_type)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {display(event.related_table)} / {shortId(event.related_id)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No Core events found yet.
              </div>
            )}
          </section>

          <section className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
              <h2 className="text-lg font-black text-slate-950">
                Audit Outcome Summary
              </h2>
              {canViewAudit ? (
                <div className="mt-5 space-y-3">
                  <SignalCard
                    title="Recent audits"
                    value={audits.length}
                    detail={`${successfulAuditCount} recent success outcomes.`}
                  />
                  {audits.slice(0, 4).map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                    >
                      <p className="font-bold text-slate-950">
                        {formatKey(audit.action)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {formatKey(audit.outcome)} /{" "}
                        {formatDateTime(audit.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  Full audit activity is owner/admin-only and was not fetched
                  for this profile.
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
              <h2 className="text-lg font-black">Approval Queue Placeholder</h2>
              <p className="mt-3 text-sm leading-7">
                Proposed action approval queue is not implemented yet. This
                shell creates no queue rows and executes no actions.
              </p>
            </section>
          </section>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              The console can summarize Core. It cannot act for Core.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ReadinessItem text="Read-only summary connected" />
            <ReadinessItem text="No AI provider connected" />
            <ReadinessItem text="No write tools enabled" />
            <ReadinessItem text="No external sending enabled" />
            <ReadinessItem text="Future action approval model documented" />
          </div>
        </section>
      </div>
    </main>
  );
}
