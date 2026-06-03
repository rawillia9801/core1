import { requireStaffProfile } from "@/lib/staff-auth";
import {
  approveProposedAction,
  createProposedAction,
  rejectProposedAction,
} from "./actions";

export const dynamic = "force-dynamic";

type ProposedActionRow = {
  id: string;
  action_type: string | null;
  title: string | null;
  summary: string | null;
  risk_level: string | null;
  status: string | null;
  proposed_by_type: string | null;
  proposed_by_profile_id: string | null;
  source: string | null;
  target_table: string | null;
  target_id: string | null;
  before_snapshot: Record<string, unknown> | null;
  proposed_change: Record<string, unknown> | null;
  validation_status: string | null;
  approved_by_profile_id: string | null;
  approved_at: string | null;
  rejected_by_profile_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  execution_status: string | null;
  executed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
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

function normalized(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function countByStatus(rows: ProposedActionRow[], status: string) {
  return rows.filter((row) => normalized(row.status) === status).length;
}

function riskTone(riskLevel: string | null) {
  const risk = normalized(riskLevel);

  if (risk === "blocked") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (risk === "high") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (risk === "medium") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function statusTone(status: string | null) {
  const value = normalized(status);

  if (value === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "rejected" || value === "cancelled" || value === "expired") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (value === "needs_review") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
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

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatKey(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  name,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
      />
    </label>
  );
}

function StatusMessage({
  created,
  approved,
  rejected,
  error,
}: {
  created?: string;
  approved?: string;
  rejected?: string;
  error?: string;
}) {
  if (created) {
    return "Proposed action created for review. No business action was executed.";
  }

  if (approved) {
    return "Proposed action marked approved. Approval does not execute the business action yet.";
  }

  if (rejected) {
    return "Proposed action marked rejected. No business action was executed.";
  }

  if (error === "unauthorized") {
    return "Your profile is not authorized to change proposed action records.";
  }

  if (error) {
    return "Proposed action update failed. Check the fields and try again.";
  }

  return null;
}

function canReviewProposal(proposal: ProposedActionRow) {
  const status = normalized(proposal.status);
  return status === "draft" || status === "needs_review";
}

function canApproveProposal(proposal: ProposedActionRow) {
  return canReviewProposal(proposal) && normalized(proposal.risk_level) !== "blocked";
}

function proposedChangeSummary(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) {
    return "No proposed change keys recorded.";
  }

  const safeEntries = Object.entries(value)
    .filter(([key]) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("secret") &&
        !lowered.includes("token") &&
        !lowered.includes("key") &&
        !lowered.includes("password")
      );
    })
    .slice(0, 6)
    .map(([key, entryValue]) => {
      if (
        typeof entryValue === "string" ||
        typeof entryValue === "number" ||
        typeof entryValue === "boolean"
      ) {
        return `${key}: ${String(entryValue)}`;
      }

      if (entryValue === null) {
        return `${key}: null`;
      }

      return `${key}: ${Array.isArray(entryValue) ? "array" : "object"}`;
    });

  return safeEntries.length > 0
    ? safeEntries.join(" / ")
    : "Proposed change metadata present, hidden from preview.";
}

function RestrictedMessage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Owner/admin only
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Proposed Actions
          </h1>
          <p className="mt-3 text-sm leading-7">
            Proposed action review is restricted to owner/admin users. Proposal
            rows were not fetched for this staff profile.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function ProposedActionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    approved?: string;
    rejected?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const staff = await requireStaffProfile();
  const canViewProposals = staff.role === "owner" || staff.role === "admin";

  if (!canViewProposals) {
    return <RestrictedMessage />;
  }

  const proposedActionsResult = await readRows<ProposedActionRow>(
    "core_proposed_actions",
    {
      select:
        "id,action_type,title,summary,risk_level,status,proposed_by_type,proposed_by_profile_id,source,target_table,target_id,before_snapshot,proposed_change,validation_status,approved_by_profile_id,approved_at,rejected_by_profile_id,rejected_at,rejection_reason,expires_at,execution_status,executed_at,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: "50",
    },
  );

  const proposedActions = proposedActionsResult.rows;
  const needsReviewCount = countByStatus(proposedActions, "needs_review");
  const approvedCount = countByStatus(proposedActions, "approved");
  const rejectedCount = countByStatus(proposedActions, "rejected");
  const highOrBlockedCount = proposedActions.filter((row) =>
    ["high", "blocked"].includes(normalized(row.risk_level)),
  ).length;
  const statusMessage = StatusMessage(params);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Staff workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Proposed Actions
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
            Read-only internal queue for future staff or Core Command Console
            proposals. Approval records review state only; it does not execute
            business changes.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 shadow-sm">
          <p className="font-bold">Safety boundary</p>
          <p className="mt-1">
            This page only reviews proposed actions. Approved proposed actions
            do not execute business changes yet. No AI provider, write tool,
            payment movement, message sending, document generation, public
            publishing, or external system call is connected here.
          </p>
        </section>

        {proposedActionsResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {proposedActionsResult.warning}
          </section>
        ) : null}

        {statusMessage ? (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold leading-6 text-blue-950 shadow-sm">
            {statusMessage}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total proposed"
            value={proposedActions.length}
            note="Recent proposal records loaded read-only"
          />
          <MetricCard
            label="Needs review"
            value={needsReviewCount}
            note="Waiting for owner/admin review"
          />
          <MetricCard
            label="Approved"
            value={approvedCount}
            note="Approved state only, not executed"
          />
          <MetricCard
            label="Rejected"
            value={rejectedCount}
            note="Rejected proposal records"
          />
          <MetricCard
            label="High/blocked"
            value={highOrBlockedCount}
            note="Higher-risk proposals need stricter review"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Owner/admin proposal intake
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Create Proposed Action
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              This form creates proposal records only. It does not send email,
              send SMS, move money, generate documents, publish listings, call
              providers, or change target records.
            </p>
          </div>

          <form action={createProposedAction} className="grid gap-5 xl:grid-cols-2">
            <TextField
              label="Title"
              name="title"
              required
              placeholder="Review follow-up for application"
            />
            <TextField
              label="Action type"
              name="action_type"
              required
              placeholder="draft_customer_follow_up"
            />
            <label className="block text-sm font-semibold text-slate-700 xl:col-span-2">
              Summary
              <textarea
                name="summary"
                rows={3}
                placeholder="Short review note for the owner/operator."
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
              />
            </label>
            <SelectField
              label="Domain"
              name="domain"
              defaultValue="business"
              options={[
                "business",
                "kennel",
                "puppies",
                "buyers_families",
                "payments",
                "documents",
                "messages",
                "personal_family",
                "grocery_list",
                "smart_home",
                "monitoring_alerts",
                "voice_command",
                "system",
                "unknown",
              ]}
            />
            <SelectField
              label="Permission tier"
              name="permission_tier"
              defaultValue="owner_admin_approval_required"
              options={[
                "read_only",
                "immediate_safe_action",
                "confirmation_required",
                "owner_admin_approval_required",
                "blocked_until_configured",
              ]}
            />
            <SelectField
              label="Risk level"
              name="risk_level"
              defaultValue="low"
              options={["low", "medium", "high", "blocked"]}
            />
            <TextField
              label="Target table, optional"
              name="target_table"
              placeholder="core_applications"
            />
            <TextField
              label="Target ID, optional UUID"
              name="target_id"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <label className="block text-sm font-semibold text-slate-700 xl:col-span-2">
              Proposed change summary or JSON
              <textarea
                name="proposed_change_summary"
                rows={5}
                placeholder='Plain text summary, or JSON such as {"draft_only": true, "note": "Prepare follow-up"}'
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
              />
            </label>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 xl:col-span-2">
              Approval does not execute the business action yet. This queue
              stores review records only.
            </div>
            <div className="xl:col-span-2">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Create Proposed Action
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight">
              Proposal Records
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Showing up to 50 recent `core_proposed_actions` rows. JSON fields
              are summarized by safe keys only.
            </p>
          </div>

          {proposedActions.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {proposedActions.map((proposal) => {
                const reviewable = canReviewProposal(proposal);
                const approvable = canApproveProposal(proposal);

                return (
                  <article
                    key={proposal.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-950">
                        {display(proposal.title, "Untitled proposal")}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatKey(proposal.action_type)} /{" "}
                        {shortId(proposal.id)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={statusTone(proposal.status)}>
                        {formatKey(proposal.status)}
                      </Badge>
                      <Badge tone={riskTone(proposal.risk_level)}>
                        {formatKey(proposal.risk_level)}
                      </Badge>
                    </div>
                  </div>

                  {proposal.summary ? (
                    <p className="mt-4 text-sm leading-6 text-slate-700">
                      {proposal.summary}
                    </p>
                  ) : null}

                  <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Target
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {display(proposal.target_table)} /{" "}
                        {shortId(proposal.target_id)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Source
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {display(proposal.source)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Validation
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatKey(proposal.validation_status)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Execution
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatKey(proposal.execution_status)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Created
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(proposal.created_at)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Expires
                      </dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(proposal.expires_at)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    <p className="font-semibold text-slate-950">
                      Proposed change key summary
                    </p>
                    <p className="mt-1">
                      {proposedChangeSummary(proposal.proposed_change)}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Approval marker
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {proposal.approved_by_profile_id
                          ? `${shortId(proposal.approved_by_profile_id)} / ${formatDateTime(proposal.approved_at)}`
                          : "Not approved"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Rejection marker
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {proposal.rejected_by_profile_id
                          ? `${shortId(proposal.rejected_by_profile_id)} / ${formatDateTime(proposal.rejected_at)}`
                          : "Not rejected"}
                      </p>
                      {proposal.rejection_reason ? (
                        <p className="mt-2 text-slate-600">
                          {proposal.rejection_reason}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {reviewable ? (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-950">
                        Review controls update proposal status only.
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-amber-900">
                        Approval does not execute the business action yet. No
                        email, SMS, payment, document, publishing, or device
                        action happens from this page.
                      </p>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {approvable ? (
                          <form action={approveProposedAction}>
                            <input
                              type="hidden"
                              name="proposed_action_id"
                              value={proposal.id}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              Approve Review Record Only
                            </button>
                          </form>
                        ) : (
                          <div className="rounded-xl border border-red-200 bg-white/70 p-3 text-sm font-semibold text-red-800">
                            Blocked-risk proposals cannot be approved here.
                          </div>
                        )}
                        <form action={rejectProposedAction} className="space-y-2">
                          <input
                            type="hidden"
                            name="proposed_action_id"
                            value={proposal.id}
                          />
                          <input
                            name="rejection_reason"
                            placeholder="Optional rejection reason"
                            className="block w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800"
                          />
                          <button
                            type="submit"
                            className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            Reject Review Record Only
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
                      This proposal is in a terminal review state. No approve or
                      reject controls are shown.
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No proposed action records exist yet. Future staff or command
              console workflows can create proposals for owner/admin review,
              but no execution behavior is enabled.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 text-cyan-950 shadow-sm">
          <h2 className="text-lg font-bold">Readiness Lane</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-semibold">
              Proposed action rows readable
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-semibold">
              Review state visible
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-semibold">
              Approval/rejection status only
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-semibold">
              No execution tools enabled
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-semibold">
              No external side effects
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
