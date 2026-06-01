import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const KENNEL_EVENT_TYPES = [
  "dog_created",
  "dog_updated",
  "dog_archived",
  "litter_created",
  "litter_updated",
  "litter_archived",
  "puppy_created",
  "puppy_updated",
  "puppy_archived",
] as const;

const KENNEL_AUDIT_ACTIONS = [
  "create_dog",
  "update_dog",
  "archive_dog",
  "create_litter",
  "update_litter",
  "archive_litter",
  "create_puppy",
  "update_puppy",
  "archive_puppy",
] as const;

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  puppy_id: string | null;
  related_table: string | null;
  related_id: string | null;
  source: string | null;
  details: Record<string, unknown> | null;
  created_by_profile_id: string | null;
  created_at: string | null;
};

type AuditRow = {
  id: string;
  actor_type: string | null;
  actor_profile_id: string | null;
  actor_identifier: string | null;
  source: string | null;
  action: string | null;
  entity_table: string | null;
  entity_id: string | null;
  request_context: Record<string, unknown> | null;
  outcome: string | null;
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

function entityType(value: string | null | undefined) {
  if (value === "core_dogs") {
    return "dog";
  }

  if (value === "core_litters") {
    return "litter";
  }

  if (value === "core_puppies") {
    return "puppy";
  }

  return "other";
}

function entityCount(events: EventRow[], type: "dog" | "litter" | "puppy") {
  return events.filter((event) => entityType(event.related_table) === type).length;
}

function safeDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) {
    return "No detail keys recorded";
  }

  const safePairs = Object.entries(details)
    .filter(([key]) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("secret") &&
        !lowered.includes("token") &&
        !lowered.includes("key")
      );
    })
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return safePairs.length > 0
    ? safePairs.join(" / ")
    : "Details present, hidden from preview";
}

function outcomeTone(outcome: string | null) {
  const normalized = outcome?.toLowerCase() ?? "";

  if (normalized === "success") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["blocked", "unauthorized", "rejected"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["error", "failed"].includes(normalized)) {
    return "bg-red-50 text-red-700 ring-red-100";
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
            Core Kennel History
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Kennel Logs
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Kennel event and audit history is restricted to owner/admin during
            this phase.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Staff-role access is intentionally blocked from this first kennel
            history surface. No kennel event or audit rows were fetched.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function StaffKennelLogsPage() {
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    return <RestrictedState />;
  }

  const [eventResult, auditResult] = await Promise.all([
    readRows<EventRow>("core_events", {
      select:
        "id,event_type,event_at,summary,puppy_id,related_table,related_id,source,details,created_by_profile_id,created_at",
      event_type: `in.(${KENNEL_EVENT_TYPES.join(",")})`,
      order: "event_at.desc",
      limit: "100",
    }),
    readRows<AuditRow>("core_audit_log", {
      select:
        "id,actor_type,actor_profile_id,actor_identifier,source,action,entity_table,entity_id,request_context,outcome,error_message,created_at",
      action: `in.(${KENNEL_AUDIT_ACTIONS.join(",")})`,
      order: "created_at.desc",
      limit: "100",
    }),
  ]);

  const events = eventResult.rows;
  const audits = auditResult.rows;
  const dogEventCount = entityCount(events, "dog");
  const litterEventCount = entityCount(events, "litter");
  const puppyEventCount = entityCount(events, "puppy");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Kennel History
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Kennel Logs
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only kennel operations history for dog, litter, and puppy
            create, update, and archive workflows.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page only reads Core kennel history. It does not change dogs,
            litters, puppies, listings, messages, documents, payments, or
            outside systems.
          </p>
        </section>

        {eventResult.warning || auditResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {eventResult.warning ?? auditResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kennel events
            </p>
            <p className="mt-3 text-3xl font-bold">{events.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Dog, litter, and puppy timeline rows
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dog events
            </p>
            <p className="mt-3 text-3xl font-bold">{dogEventCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              `core_dogs` history rows
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Litter events
            </p>
            <p className="mt-3 text-3xl font-bold">{litterEventCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              `core_litters` history rows
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Puppy events
            </p>
            <p className="mt-3 text-3xl font-bold">{puppyEventCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              `core_puppies` history rows
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Recent Kennel Timeline</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Dog, litter, and puppy create/update/archive events from
                `core_events`.
              </p>
            </div>

            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {display(event.summary, formatKey(event.event_type))}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(event.event_at)} /{" "}
                          {display(event.source, "source unknown")}
                        </p>
                      </div>
                      <Badge>{formatKey(event.event_type)}</Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Entity
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(event.related_table)} / {shortId(event.related_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Puppy
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(event.puppy_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Actor profile
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(event.created_by_profile_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Details
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {safeDetails(event.details)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No kennel event rows found yet." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Audit Accountability</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Related kennel write audit rows from `core_audit_log`,
                owner/admin only.
              </p>
            </div>

            {audits.length > 0 ? (
              <div className="space-y-4">
                {audits.map((audit) => (
                  <article
                    key={audit.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {formatKey(audit.action)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(audit.created_at)} /{" "}
                          {display(audit.source, "source unknown")}
                        </p>
                      </div>
                      <Badge tone={outcomeTone(audit.outcome)}>
                        {formatKey(audit.outcome)}
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Entity
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(audit.entity_table)} / {shortId(audit.entity_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Actor
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(audit.actor_profile_id)} /{" "}
                          {display(audit.actor_type)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Request context
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {safeDetails(audit.request_context)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Error
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(audit.error_message, "None")}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No kennel audit rows found yet." />
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This workspace reviews kennel history only. It is not an edit or
              publishing surface.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Kennel events readable
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Kennel audit rows readable
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No writes enabled
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No public publishing enabled
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No customer messages sent
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
