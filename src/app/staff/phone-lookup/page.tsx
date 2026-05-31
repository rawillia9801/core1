import {
  canViewPhoneLookup,
  requireStaffProfile,
} from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type PhoneLookupSummaryRow = {
  normalized_phone: string | null;
  match_count: number | null;
  is_ambiguous: boolean | null;
  matched_buyer_ids: string[] | null;
  matched_profile_ids: string[] | null;
  matched_family_ids: string[] | null;
  safe_display_name: string | null;
  verification_required: boolean | null;
  staff_routing_recommended: boolean | null;
};

type PhoneLookupContextRow = {
  normalized_phone: string | null;
  phone_type: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  email: string | null;
  approval_status: string | null;
  latest_application_status: string | null;
  family_id: string | null;
  family_name: string | null;
  reservation_id: string | null;
  reservation_status: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  balance_due_cents: number | null;
  currency: string | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
  match_count: number | null;
  is_ambiguous: boolean | null;
  verification_required: boolean | null;
  staff_routing_recommended: boolean | null;
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

function shortIdList(values: string[] | null | undefined) {
  if (!values || values.length === 0) {
    return "None";
  }

  return values.map((value) => value.slice(0, 8)).join(", ");
}

function formatMoney(cents: number | null, currency = "USD") {
  if (typeof cents !== "number") {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function formatDateTime(value: string | null) {
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

function safetyTone(row: PhoneLookupSummaryRow) {
  if (row.is_ambiguous || row.verification_required) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (row.match_count === 1) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function safetyLabel(row: PhoneLookupSummaryRow) {
  if (row.is_ambiguous) {
    return "Ambiguous";
  }

  if (row.verification_required) {
    return "Needs verification";
  }

  if (row.match_count === 1) {
    return "Single match";
  }

  return "Review";
}

function recommendedAction(row: PhoneLookupSummaryRow) {
  if (row.staff_routing_recommended) {
    return "Route to staff review before using this phone number.";
  }

  if (row.verification_required) {
    return "Verify the buyer/family context before any future contact workflow.";
  }

  if (row.match_count === 1) {
    return "Single Core match. Still read-only; no message or lookup is triggered.";
  }

  return "Review the Core record before relying on this phone number.";
}

function contextLabel(contexts: PhoneLookupContextRow[]) {
  const firstNamedContext = contexts.find(
    (context) => context.buyer_name || context.family_name || context.email,
  );

  if (!firstNamedContext) {
    return "Context hidden or not recorded";
  }

  const name = firstNamedContext.buyer_name || firstNamedContext.family_name;
  const email = firstNamedContext.email;

  return [name, email].filter(Boolean).join(" / ") || "Context not recorded";
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
            Core Phone Safety
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Phone Lookup Safety
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This owner/admin workspace reviews Core phone/contact ambiguity. Staff
            role access is intentionally restricted before selected real-data
            staging.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Phone lookup safety can expose sensitive contact ambiguity. Your
            profile can use operational workspaces, but this read surface is
            owner/admin-only right now.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function StaffPhoneLookupPage() {
  const staff = await requireStaffProfile();

  if (!canViewPhoneLookup(staff.role)) {
    return <RestrictedState />;
  }

  const [summaryResult, contextResult] = await Promise.all([
    readRows<PhoneLookupSummaryRow>("core_phone_lookup_summary_view", {
      select:
        "normalized_phone,match_count,is_ambiguous,matched_buyer_ids,matched_profile_ids,matched_family_ids,safe_display_name,verification_required,staff_routing_recommended",
      order: "normalized_phone.asc",
      limit: "250",
    }),
    readRows<PhoneLookupContextRow>("core_phone_lookup_view", {
      select:
        "normalized_phone,phone_type,buyer_id,buyer_name,email,approval_status,latest_application_status,family_id,family_name,reservation_id,reservation_status,puppy_id,puppy_name,balance_due_cents,currency,go_home_planned_at,go_home_status,match_count,is_ambiguous,verification_required,staff_routing_recommended",
      order: "normalized_phone.asc",
      limit: "250",
    }),
  ]);

  const summaryRows = summaryResult.rows;
  const contextRows = contextResult.rows;
  const contextByPhone = new Map<string, PhoneLookupContextRow[]>();

  for (const context of contextRows) {
    if (!context.normalized_phone) {
      continue;
    }

    contextByPhone.set(context.normalized_phone, [
      ...(contextByPhone.get(context.normalized_phone) ?? []),
      context,
    ]);
  }

  const totalMatches = summaryRows.reduce(
    (total, row) => total + (row.match_count ?? 0),
    0,
  );
  const singleMatchCount = summaryRows.filter(
    (row) => !row.is_ambiguous && row.match_count === 1,
  ).length;
  const ambiguousCount = summaryRows.filter((row) => row.is_ambiguous).length;
  const needsVerificationCount = summaryRows.filter(
    (row) => row.verification_required,
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Phone Safety
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Phone Lookup Safety
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only owner/admin review of phone number match ambiguity from
            existing Core records. This workspace helps identify contact records
            that need human verification before any future phone workflow.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page reads Core phone/contact ambiguity only. It does not call,
            text, verify, or contact anyone. It does not use Twilio, create
            messages, write database records, or call external APIs.
          </p>
        </section>

        {summaryResult.warning || contextResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {summaryResult.warning ?? contextResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone records
            </p>
            <p className="mt-3 text-3xl font-bold">{summaryRows.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              {totalMatches} total Core matches
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Single match
            </p>
            <p className="mt-3 text-3xl font-bold">{singleMatchCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              One Core contact context
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ambiguous
            </p>
            <p className="mt-3 text-3xl font-bold">{ambiguousCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              Requires human review
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Needs verification
            </p>
            <p className="mt-3 text-3xl font-bold">
              {needsVerificationCount}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              No auto-resolution allowed
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Phone Match Records</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Rows from `core_phone_lookup_summary_view`, with readable context
              from `core_phone_lookup_view` when that context is safe for the
              view to expose.
            </p>
          </div>

          {summaryRows.length > 0 ? (
            <div className="space-y-4">
              {summaryRows.map((row) => {
                const phone = row.normalized_phone ?? "unknown-phone";
                const contexts = contextByPhone.get(phone) ?? [];
                const primaryContext = contexts[0];

                return (
                  <article
                    key={phone}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">
                          {display(row.normalized_phone, "Phone not recorded")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {display(row.safe_display_name, contextLabel(contexts))}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={safetyTone(row)}>{safetyLabel(row)}</Badge>
                        <Badge>{row.match_count ?? 0} match(es)</Badge>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Phone type
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatKey(primaryContext?.phone_type)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Buyer / Family
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(primaryContext?.buyer_id)} /{" "}
                          {shortId(primaryContext?.family_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Application / Approval
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(primaryContext?.latest_application_status)} /{" "}
                          {display(primaryContext?.approval_status)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Reservation
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(primaryContext?.reservation_id)} /{" "}
                          {display(primaryContext?.reservation_status)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Puppy
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(primaryContext?.puppy_name)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Balance
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatMoney(
                            primaryContext?.balance_due_cents ?? null,
                            primaryContext?.currency ?? "USD",
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Go-home
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(primaryContext?.go_home_planned_at ?? null)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Go-home status
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {display(primaryContext?.go_home_status)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Matched buyers
                        </p>
                        <p className="mt-1">{shortIdList(row.matched_buyer_ids)}</p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Matched families
                        </p>
                        <p className="mt-1">
                          {shortIdList(row.matched_family_ids)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Matched profiles
                        </p>
                        <p className="mt-1">
                          {shortIdList(row.matched_profile_ids)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                      {recommendedAction(row)}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No Core phone lookup rows found yet. This is a read-only safety workspace and will show records once Core has phone/contact data in the existing views." />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Phone safety is a read surface only. Ambiguity is never resolved
              automatically from this page.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Phone lookup views readable
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-950">
              Ambiguous matches are not auto-resolved
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No Twilio or external lookup connected
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
