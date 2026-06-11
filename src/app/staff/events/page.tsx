import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  family_id: string | null;
  buyer_id: string | null;
  application_id: string | null;
  puppy_id: string | null;
  reservation_id: string | null;
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

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
};

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

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as T[], warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads." };
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
    return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "—";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileLabel(profile: ProfileRow | undefined, fallback: string | null | undefined) {
  if (profile) {
    const name = profile.display_name || profile.email || profile.id.slice(0, 8);
    return profile.role ? `${name} (${profile.role})` : name;
  }

  return display(fallback, "System / not linked");
}

function compactJson(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value);
}

function outcomeTone(outcome: string | null) {
  const normalized = outcome?.toLowerCase() ?? "";
  if (normalized === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["blocked", "unauthorized", "rejected"].includes(normalized)) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (["error", "failed"].includes(normalized)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

export default async function StaffEventsPage() {
  const staff = await requireStaffProfile();
  const canViewAudit = staff.role === "owner" || staff.role === "admin";

  const [eventResult, auditResult, profileResult] = await Promise.all([
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,family_id,buyer_id,application_id,puppy_id,reservation_id,related_table,related_id,source,details,created_by_profile_id,created_at",
      order: "event_at.desc",
      limit: "80",
    }),
    canViewAudit
      ? readRows<AuditRow>("core_audit_log", {
          select: "id,actor_type,actor_profile_id,actor_identifier,source,action,entity_table,entity_id,request_context,outcome,error_message,created_at",
          order: "created_at.desc",
          limit: "80",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
    readRows<ProfileRow>("core_profiles", {
      select: "id,display_name,email,role",
      limit: "500",
    }),
  ]);

  const profilesById = new Map(profileResult.rows.map((profile) => [profile.id, profile]));
  const events = eventResult.rows;
  const audits = auditResult.rows;
  const sideEffectSafeEvents = events.filter((event) => event.details?.external_side_effects === false).length;
  const sideEffectSafeAudits = audits.filter((audit) => audit.request_context?.external_side_effects === false).length;
  const successAudits = audits.filter((audit) => audit.outcome?.toLowerCase() === "success").length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Events</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Events & Audit Workspace</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only timeline for Core operational events and validated write accountability. This page does not change records, send messages, generate documents, move payments, or contact outside systems.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Review boundary</p>
          <p className="mt-2 text-sm leading-6">Events show operational history. Audit rows show write accountability. Staff users can use Core, but full audit review stays owner/admin-only.</p>
        </section>

        {eventResult.warning || auditResult.warning || profileResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {eventResult.warning ?? auditResult.warning ?? profileResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Events</p><p className="mt-3 text-3xl font-bold">{events.length}</p><p className="mt-2 text-sm text-slate-500">Recent operational rows</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Audit rows</p><p className="mt-3 text-3xl font-bold">{canViewAudit ? audits.length : "Hidden"}</p><p className="mt-2 text-sm text-slate-500">Owner/admin accountability</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Successful writes</p><p className="mt-3 text-3xl font-bold">{canViewAudit ? successAudits : "Hidden"}</p><p className="mt-2 text-sm text-slate-500">Recent audit outcomes</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Side-effect safe</p><p className="mt-3 text-3xl font-bold">{sideEffectSafeEvents + sideEffectSafeAudits}</p><p className="mt-2 text-sm text-slate-500">Marked external_side_effects false</p></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5"><h2 className="text-lg font-semibold">Operational Events</h2><p className="mt-1 text-sm leading-6 text-slate-500">Recent rows from `core_events`, newest first.</p></div>
            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{display(event.summary, formatKey(event.event_type))}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(event.event_at)} · {display(event.source, "source unknown")}</p>
                      </div>
                      <Badge>{formatKey(event.event_type)}</Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Related</dt><dd className="mt-1 text-slate-700">{display(event.related_table)} · {shortId(event.related_id)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Actor</dt><dd className="mt-1 text-slate-700">{profileLabel(event.created_by_profile_id ? profilesById.get(event.created_by_profile_id) : undefined, event.created_by_profile_id)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Buyer / Family</dt><dd className="mt-1 text-slate-700">{shortId(event.buyer_id)} / {shortId(event.family_id)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Reservation / Puppy</dt><dd className="mt-1 text-slate-700">{shortId(event.reservation_id)} / {shortId(event.puppy_id)}</dd></div>
                    </dl>
                    <pre className="mt-4 overflow-x-auto rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">{compactJson(event.details)}</pre>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No Core event rows found yet." />}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5"><h2 className="text-lg font-semibold">Audit Accountability</h2><p className="mt-1 text-sm leading-6 text-slate-500">Recent rows from `core_audit_log`, owner/admin only.</p></div>
            {!canViewAudit ? (
              <EmptyState text="Audit accountability is restricted to owner/admin profiles." />
            ) : audits.length > 0 ? (
              <div className="space-y-4">
                {audits.map((audit) => (
                  <article key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{formatKey(audit.action)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(audit.created_at)} · {display(audit.source, "source unknown")}</p>
                      </div>
                      <Badge tone={outcomeTone(audit.outcome)}>{display(audit.outcome, "Unknown")}</Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Entity</dt><dd className="mt-1 text-slate-700">{display(audit.entity_table)} · {shortId(audit.entity_id)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Actor</dt><dd className="mt-1 text-slate-700">{profileLabel(audit.actor_profile_id ? profilesById.get(audit.actor_profile_id) : undefined, audit.actor_identifier)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Actor type</dt><dd className="mt-1 text-slate-700">{display(audit.actor_type)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Audit ID</dt><dd className="mt-1 text-slate-700">{shortId(audit.id)}</dd></div>
                    </dl>
                    {audit.error_message ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{audit.error_message}</p> : null}
                    <pre className="mt-4 overflow-x-auto rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">{compactJson(audit.request_context)}</pre>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No Core audit rows found yet." />}
          </section>
        </section>
      </div>
    </main>
  );
}

