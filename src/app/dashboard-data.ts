type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

type DashboardGoHome = {
  puppy: string;
  buyer: string;
  time: string;
  source: string;
  status: string;
};

type DashboardReservation = {
  puppy: string;
  buyer: string;
  status: string;
  balance: string;
};

type DashboardPhoneLookup = {
  phone: string;
  result: string;
  detail: string;
  tone: string;
};

type DashboardEvent = {
  summary: string;
  type: string;
  when: string;
};

type CountResult = {
  count: number;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email_normalized: string | null;
};

type PuppyRow = {
  id: string;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
};

type ReservationRow = {
  id: string;
  status: string | null;
  reserved_at: string | null;
  buyer_id: string | null;
  puppy_id: string | null;
};

type PaymentBalanceRow = {
  reservation_id: string;
  balance_due_cents: number | null;
};

type GoHomeRow = {
  reservation_id: string | null;
  buyer_id: string | null;
  puppy_id: string | null;
  effective_scheduled_at: string | null;
  effective_window_start: string | null;
  effective_status: string | null;
  source_of_schedule: string | null;
  has_individual_override: boolean | null;
};

type PhoneLookupRow = {
  normalized_phone: string | null;
  match_count: number | null;
  is_ambiguous: boolean | null;
  safe_display_name: string | null;
  verification_required: boolean | null;
  staff_routing_recommended: boolean | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
};

export type DashboardData = {
  stats: DashboardStat[];
  foundationChecks: readonly string[];
  navigation: readonly string[];
  goHomes: DashboardGoHome[];
  reservations: DashboardReservation[];
  phoneLookups: DashboardPhoneLookup[];
  kennelNotes: string[];
  emptyStates: readonly {
    title: string;
    text: string;
  }[];
  events: DashboardEvent[];
  dataSourceLabel: string;
  dataWarning: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const foundationChecks = [
  "Migrations apply locally",
  "Core smoke test passes",
  "Go-home effective view passes",
  "Lint passes",
] as const;

export const navigation = [
  "Dashboard",
  "Applications",
  "Buyers",
  "Families",
  "Dogs",
  "Litters",
  "Puppies",
  "Reservations",
  "Payments",
  "Go-Home",
  "Documents",
  "Messages",
  "Phone Lookup",
  "Kennel Logs",
  "Events",
] as const;

export const emptyStates = [
  {
    title: "Documents",
    text: "Template-driven generation, signatures, and customer visibility are planned but not connected.",
  },
  {
    title: "Customer Portal",
    text: "Portal screens wait for RLS, document visibility rules, and verified family access.",
  },
  {
    title: "Integrations",
    text: "Zoho, Twilio, email, payments, Home Assistant, cameras, and smart mirror remain off.",
  },
] as const;

function formatCurrencyFromCents(value: number | null | undefined) {
  return currencyFormatter.format((value ?? 0) / 100);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return dateTimeFormatter.format(parsed);
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) {
    return "Unassigned buyer";
  }

  const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");

  return buyer.preferred_name || fullName || buyer.email_normalized || "Unnamed buyer";
}

function puppyName(puppy: PuppyRow | undefined) {
  if (!puppy) {
    return "Unassigned puppy";
  }

  return puppy.name || puppy.collar_color || puppy.sex || "Unnamed puppy";
}

function fallbackDashboardData(dataWarning: string | null = null): DashboardData {
  return {
    stats: [
      {
        label: "Applications",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-blue-50 text-blue-700 ring-blue-100",
      },
      {
        label: "Reserved Puppies",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-violet-50 text-violet-700 ring-violet-100",
      },
      {
        label: "Balance Due",
        value: "$0",
        helper: "Supabase not configured",
        tone: "bg-amber-50 text-amber-700 ring-amber-100",
      },
      {
        label: "Events",
        value: "0",
        helper: "Supabase not configured",
        tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      },
    ],
    foundationChecks,
    navigation,
    goHomes: [],
    reservations: [],
    phoneLookups: [],
    kennelNotes: [
      "Supabase environment variables are not configured for this server render.",
      "No AI write actions are enabled.",
    ],
    emptyStates,
    events: [],
    dataSourceLabel: "Not connected",
    dataWarning:
      dataWarning ??
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local for local server-side reads.",
  };
}

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

async function readCount(
  restUrl: string,
  serviceRoleKey: string,
  table: string,
  extraParams: Record<string, string> = {},
): Promise<CountResult> {
  const response = await fetch(
    buildUrl(restUrl, table, {
      select: "id",
      ...extraParams,
    }),
    {
      method: "HEAD",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        prefer: "count=exact",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} count failed: ${response.status} ${body}`.trim());
  }

  const contentRange = response.headers.get("content-range") ?? "*/0";
  const countText = contentRange.split("/").at(-1) ?? "0";
  const count = Number.parseInt(countText, 10);

  return {
    count: Number.isFinite(count) ? count : 0,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const config = getSupabaseRestConfig();

  if (!config) {
    return fallbackDashboardData();
  }

  try {
    const { restUrl, serviceRoleKey } = config;

    const [
      applicationsCount,
      receivedApplicationsCount,
      reservationsCount,
      reservations,
      balances,
      goHomes,
      phoneLookups,
      events,
    ] = await Promise.all([
      readCount(restUrl, serviceRoleKey, "core_applications"),
      readCount(restUrl, serviceRoleKey, "core_applications", {
        status: "eq.received",
      }),
      readCount(restUrl, serviceRoleKey, "core_reservations"),
      readRows<ReservationRow>(restUrl, serviceRoleKey, "core_reservations", {
        select: "id,status,reserved_at,buyer_id,puppy_id",
        order: "reserved_at.desc.nullslast",
        limit: "5",
      }),
      readRows<PaymentBalanceRow>(restUrl, serviceRoleKey, "core_payment_balance_view", {
        select: "reservation_id,balance_due_cents",
        limit: "1000",
      }),
      readRows<GoHomeRow>(restUrl, serviceRoleKey, "core_go_home_effective_view", {
        select:
          "reservation_id,buyer_id,puppy_id,effective_scheduled_at,effective_window_start,effective_status,source_of_schedule,has_individual_override",
        order: "effective_scheduled_at.asc.nullslast",
        limit: "5",
      }),
      readRows<PhoneLookupRow>(restUrl, serviceRoleKey, "core_phone_lookup_summary_view", {
        select:
          "normalized_phone,match_count,is_ambiguous,safe_display_name,verification_required,staff_routing_recommended",
        limit: "5",
      }),
      readRows<EventRow>(restUrl, serviceRoleKey, "core_events", {
        select: "id,event_type,event_at,summary",
        order: "event_at.desc",
        limit: "6",
      }),
    ]);

    const buyerIds = Array.from(
      new Set(
        [
          ...reservations.map((reservation) => reservation.buyer_id),
          ...goHomes.map((goHome) => goHome.buyer_id),
        ].filter(Boolean) as string[],
      ),
    );
    const puppyIds = Array.from(
      new Set(
        [
          ...reservations.map((reservation) => reservation.puppy_id),
          ...goHomes.map((goHome) => goHome.puppy_id),
        ].filter(Boolean) as string[],
      ),
    );

    const [buyers, puppies] = await Promise.all([
      buyerIds.length > 0
        ? readRows<BuyerRow>(restUrl, serviceRoleKey, "core_buyers", {
            select: "id,first_name,last_name,preferred_name,email_normalized",
            id: `in.(${buyerIds.join(",")})`,
          })
        : Promise.resolve([]),
      puppyIds.length > 0
        ? readRows<PuppyRow>(restUrl, serviceRoleKey, "core_puppies", {
            select: "id,name,collar_color,sex",
            id: `in.(${puppyIds.join(",")})`,
          })
        : Promise.resolve([]),
    ]);

    const buyersById = new Map(buyers.map((buyer) => [buyer.id, buyer]));
    const puppiesById = new Map(puppies.map((puppy) => [puppy.id, puppy]));
    const balancesByReservationId = new Map(
      balances.map((balance) => [balance.reservation_id, balance]),
    );

    const totalBalanceDueCents = balances.reduce(
      (sum, balance) => sum + Math.max(balance.balance_due_cents ?? 0, 0),
      0,
    );

    return {
      stats: [
        {
          label: "Applications",
          value: String(applicationsCount.count),
          helper: `${receivedApplicationsCount.count} received/pending`,
          tone: "bg-blue-50 text-blue-700 ring-blue-100",
        },
        {
          label: "Reserved Puppies",
          value: String(reservationsCount.count),
          helper: "active reservation records",
          tone: "bg-violet-50 text-violet-700 ring-violet-100",
        },
        {
          label: "Balance Due",
          value: formatCurrencyFromCents(totalBalanceDueCents),
          helper: "ledger-derived total",
          tone: "bg-amber-50 text-amber-700 ring-amber-100",
        },
        {
          label: "Events",
          value: String(events.length),
          helper: "latest feed items",
          tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        },
      ],
      foundationChecks,
      navigation,
      goHomes: goHomes.map((goHome) => ({
        puppy: puppyName(goHome.puppy_id ? puppiesById.get(goHome.puppy_id) : undefined),
        buyer: buyerName(goHome.buyer_id ? buyersById.get(goHome.buyer_id) : undefined),
        time: formatDateTime(goHome.effective_scheduled_at ?? goHome.effective_window_start),
        source:
          goHome.source_of_schedule ||
          (goHome.has_individual_override ? "Individual override" : "Group/default"),
        status: goHome.effective_status || "Pending",
      })),
      reservations: reservations.map((reservation) => {
        const matchingBalance = balancesByReservationId.get(reservation.id);

        return {
          puppy: puppyName(
            reservation.puppy_id ? puppiesById.get(reservation.puppy_id) : undefined,
          ),
          buyer: buyerName(
            reservation.buyer_id ? buyersById.get(reservation.buyer_id) : undefined,
          ),
          status: reservation.status || "Unknown",
          balance: `${formatCurrencyFromCents(matchingBalance?.balance_due_cents)} due`,
        };
      }),
      phoneLookups: phoneLookups.map((lookup) => ({
        phone: lookup.normalized_phone || "Unknown phone",
        result: lookup.is_ambiguous ? "Ambiguous match" : "Unambiguous match",
        detail: lookup.is_ambiguous
          ? "Sensitive details redacted; route to staff"
          : lookup.safe_display_name || `${lookup.match_count ?? 0} safe match`,
        tone: lookup.is_ambiguous
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      })),
      kennelNotes: [
        "Dashboard now reads local Supabase data server-side.",
        "No browser-side Supabase client is enabled.",
        "No dashboard write actions are enabled.",
        "Live Zoho, Twilio, payments, documents, and customer portal remain off.",
      ],
      emptyStates,
      events: events.map((event) => ({
        summary: event.summary || "Core event recorded",
        type: event.event_type || "event",
        when: formatDateTime(event.event_at),
      })),
      dataSourceLabel: "Local Supabase read-only",
      dataWarning: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase read error";

    return fallbackDashboardData(message);
  }
}
