import Link from "next/link";
import {
  canViewAuditActivity,
  canViewPhoneLookup,
  canViewSensitiveFinancials,
  requireStaffProfile,
} from "@/lib/staff-auth";
import type { ReactNode } from "react";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";

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
  buyer_id: string | null;
  buyer_name: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  puppy_status: string | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
};

type DogRow = {
  id: string;
  status: string | null;
  call_name: string | null;
  registered_name: string | null;
  sex: string | null;
  metadata: Record<string, unknown> | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  status: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  status: string | null;
  health_status: string | null;
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
  title?: string | null;
  document_type?: string | null;
};

type WeightLogRow = {
  id: string;
  puppy_id: string | null;
  measured_at: string | null;
  weight_grams: number | null;
};

type DogHealthRow = {
  id: string;
  dog_id: string | null;
  event_type: string | null;
  title: string | null;
  event_date: string | null;
  severity: string | null;
};

type KennelMediaRow = {
  id: string;
  entity_type: string | null;
  dog_id: string | null;
  puppy_id: string | null;
  is_primary: boolean | null;
  uploaded_at: string | null;
};

type DogDocumentRow = {
  id: string;
  dog_id: string | null;
  document_status: string | null;
  title: string | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  approval_status: string | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
};

type PhoneLookupSummaryRow = {
  normalized_phone: string | null;
  is_ambiguous: boolean | null;
  verification_required: boolean | null;
};

type ProposedActionRow = {
  id: string;
  status: string | null;
  risk_level: string | null;
};

type SystemNode = {
  label: string;
  value: string | number;
  status: string;
  icon: string;
  pulse: boolean;
  tone: string;
  position: string;
  line: string;
};

type BriefingItem = {
  label: string;
  value: string | number;
  detail: string;
  href?: string;
};

type RecommendedStep = {
  title: string;
  detail: string;
  href: string;
};

type ConsoleCard = {
  title: string;
  detail: string;
  href?: string;
  badge?: string;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
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
        "Core read configuration is not available for server-side operational reads.",
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

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") {
    return "Not recorded";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatWeight(grams: number | null | undefined) {
  if (typeof grams !== "number") {
    return "No weight recorded";
  }

  return `${grams}g`;
}

function daysUntil(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.ceil((end - start) / 86_400_000);
}

function isToday(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function GlassPanel({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={`rounded-[2rem] border border-white/75 bg-white/78 shadow-[0_24px_70px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/60 backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function TinyPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/70 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.13em] text-cyan-900 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
      {children}
    </span>
  );
}

function HelperRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-sm font-semibold text-slate-700">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-sm text-sky-700 ring-1 ring-sky-100">
        {icon}
      </span>
      {text}
    </div>
  );
}

function BriefingPanel({ items }: { items: BriefingItem[] }) {
  return (
    <GlassPanel className="relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_88%_24%,rgba(59,130,246,0.14),transparent_24%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[0.76fr_1.24fr] xl:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-700">
            Today&apos;s Briefing
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Good morning. Core has the operating picture ready.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Core reviewed existing records and surfaced the items most likely to need owner/operator attention.
          </p>
          <p className="mt-5 rounded-2xl border border-cyan-100 bg-white/75 p-4 text-xs font-bold leading-6 text-cyan-950">
            Briefing is generated from existing Core records only. No actions are taken from this panel.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">{item.label}</p>
                  <span className="rounded-2xl bg-slate-950 px-3 py-1 text-sm font-black text-white shadow-sm">
                    {item.value}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  {item.detail}
                </p>
              </>
            );
            const className =
              "block rounded-2xl border border-white/80 bg-white/72 p-4 shadow-sm ring-1 ring-cyan-100/60 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_45px_rgba(14,165,233,0.12)]";

            return item.href ? (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            ) : (
              <div key={item.label} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}

function RecommendedNextSteps({ steps }: { steps: RecommendedStep[] }) {
  return (
    <GlassPanel className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(59,130,246,0.12),transparent_42%),radial-gradient(circle_at_92%_18%,rgba(45,212,191,0.14),transparent_24%)]" />
      <div className="relative">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
          Recommended Next Steps
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Deterministic actions to review next
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {steps.length > 0 ? (
            steps.map((step) => (
              <Link
                key={step.title}
                href={step.href}
                className="block rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm ring-1 ring-cyan-100/60 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_45px_rgba(14,165,233,0.12)]"
              >
                <p className="text-sm font-black text-slate-950">{step.title}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  {step.detail}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/70 p-5 text-sm font-bold leading-6 text-cyan-950 lg:col-span-2 xl:col-span-3">
              No urgent next steps found from current Core records.
            </div>
          )}
        </div>
        <p className="mt-5 rounded-2xl border border-cyan-100 bg-white/70 p-4 text-xs font-bold leading-6 text-cyan-950">
          Recommendations are deterministic from current Core records. No actions are taken automatically.
        </p>
      </div>
    </GlassPanel>
  );
}

function ReadinessItem({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-cyan-100 bg-white/70 p-4 text-sm font-bold text-cyan-950 shadow-sm">
      <div className="mb-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
      {text}
    </div>
  );
}

function OutputRow({
  title,
  detail,
  time,
  badge,
}: {
  title: string;
  detail: string;
  time: string;
  badge: string;
}) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_45px_rgba(14,165,233,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="mt-1 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
          <div>
            <p className="font-black text-slate-950">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {time}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
          {badge}
        </span>
      </div>
    </article>
  );
}

function SummaryLine({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
      <div>
        <p className="text-sm font-black text-slate-950">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
      </div>
      <span className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white shadow-sm">
        {value}
      </span>
    </div>
  );
}

function ConsoleSection({
  id,
  title,
  eyebrow,
  detail,
  cards,
  emptyText,
}: {
  id?: string;
  title: string;
  eyebrow: string;
  detail: string;
  cards: ConsoleCard[];
  emptyText: string;
}) {
  return (
    <GlassPanel id={id} className="p-6">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
      </div>
      {cards.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const body = (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">{card.title}</p>
                  {card.badge ? <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{card.badge}</span> : null}
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{card.detail}</p>
              </>
            );
            const className = "block rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm ring-1 ring-cyan-100/60 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_45px_rgba(14,165,233,0.12)]";
            return card.href ? (
              <Link key={`${card.title}-${card.detail}`} href={card.href} className={className}>{body}</Link>
            ) : (
              <div key={`${card.title}-${card.detail}`} className={className}>{body}</div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/70 p-5 text-sm font-bold leading-6 text-cyan-950">{emptyText}</div>
      )}
    </GlassPanel>
  );
}

function CommandNode({ node }: { node: SystemNode }) {
  return (
    <div className={`absolute ${node.position}`}>
      <div
        className={`pointer-events-none absolute ${node.line} core-command-connector hidden rounded-full bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent xl:block`}
      />
      <div
        className={`relative z-10 grid h-28 w-28 place-items-center rounded-full border border-white/80 bg-white/82 p-3 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] ring-1 backdrop-blur-xl ${node.tone} ${node.pulse ? "core-command-node-pulse" : ""}`}
      >
        <div>
          <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white/80 text-lg shadow-sm">
            {node.icon}
          </div>
          <p className="mt-2 text-[0.64rem] font-black uppercase tracking-[0.11em] text-slate-500">
            {node.label}
          </p>
          <p className="text-xl font-black text-slate-950">{node.value}</p>
          <p className="text-[0.64rem] font-bold text-slate-500">{node.status}</p>
        </div>
      </div>
    </div>
  );
}

function CommandCloud({ nodes }: { nodes: SystemNode[] }) {
  return (
    <GlassPanel className="relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(56,189,248,0.24),transparent_33%),radial-gradient(circle_at_26%_22%,rgba(129,140,248,0.19),transparent_28%),radial-gradient(circle_at_73%_78%,rgba(45,212,191,0.17),transparent_30%)]" />
      <div className="relative min-h-[760px] xl:min-h-[620px]">
        <div className="absolute left-1/2 top-[46%] z-20 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2">
          <div className="core-command-cloud relative overflow-hidden rounded-[3.2rem] border border-white/80 bg-white/70 p-7 shadow-[0_28px_90px_rgba(37,99,235,0.18)] ring-1 ring-cyan-100/80 backdrop-blur-2xl sm:p-9">
            <div className="pointer-events-none absolute inset-0 core-command-orbit bg-[linear-gradient(115deg,transparent_0%,rgba(125,211,252,0.18)_35%,transparent_55%),radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.9),transparent_24%),radial-gradient(circle_at_74%_72%,rgba(45,212,191,0.16),transparent_24%)]" />
            <div className="pointer-events-none absolute inset-6 rounded-[2.5rem] border border-cyan-100/70" />
            <div className="relative text-center">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-700">
                Core Intelligence Hub
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Core is online and ready to help.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Your read-only command brain for business, kennel, family, and future smart-home operations.
              </p>

              <div className="mt-6 rounded-[1.6rem] border border-cyan-100 bg-white/85 p-3 shadow-[0_18px_60px_rgba(14,165,233,0.16)]">
                <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-950 px-4 py-3 text-left text-white shadow-inner">
                  <div className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30 sm:grid">
                    ✦
                  </div>
                  <input
                    aria-label="Command preview"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-300 outline-none placeholder:text-slate-400"
                    disabled
                    placeholder="Ask Core anything... summarize today, review puppies, prepare next steps"
                  />
                  <button
                    type="button"
                    disabled
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-300 text-slate-950 opacity-70 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                    aria-label="Command shell disabled"
                  >
                    →
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Planning shell only — no AI provider connected.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <TinyPill>Safety: Safe</TinyPill>
                <TinyPill>Planning: Ready</TinyPill>
                <TinyPill>Monitoring: Active</TinyPill>
                <TinyPill>Approval: Required</TinyPill>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Core reads only. Sensitive actions require review and approval.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden xl:block">
          {nodes.map((node) => (
            <CommandNode key={node.label} node={node} />
          ))}
        </div>

        <div className="grid gap-3 pt-[520px] sm:grid-cols-2 lg:grid-cols-3 xl:hidden">
          {nodes.map((node) => (
            <div
              key={node.label}
              className={`rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm ring-1 ${node.tone}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg shadow-sm">
                  {node.icon}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    {node.label}
                  </p>
                  <p className="text-2xl font-black text-slate-950">{node.value}</p>
                  <p className="text-xs font-semibold text-slate-500">{node.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
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
    proposedActionResult,
    weightResult,
    dogHealthResult,
    kennelMediaResult,
    dogDocumentResult,
    buyerResult,
    familyResult,
  ] = await Promise.all([
    readRows<ApplicationRow>("core_applications", {
      select: "id,status,submitted_at,created_at",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select:
        "reservation_id,reservation_status,buyer_id,buyer_name,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,balance_due_cents,go_home_planned_at,go_home_status",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<DogRow>("core_dogs", {
      select: "id,status,call_name,registered_name,sex,metadata",
      limit: "500",
    }),
    readRows<LitterRow>("core_litters", {
      select: "id,litter_name,status,birth_at,expected_birth_at",
      limit: "500",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,litter_id,name,collar_color,status,health_status,public_listing_status",
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
    canViewAudit
      ? readRows<ProposedActionRow>("core_proposed_actions", {
          select: "id,status,risk_level",
          order: "created_at.desc",
          limit: "100",
        })
      : Promise.resolve({ rows: [] as ProposedActionRow[], warning: null }),
    readRows<WeightLogRow>("core_weight_logs", {
      select: "id,puppy_id,measured_at,weight_grams",
      order: "measured_at.desc",
      limit: "500",
    }),
    canViewAudit
      ? readRows<DogHealthRow>("core_dog_health_events", {
          select: "id,dog_id,event_type,title,event_date,severity",
          order: "event_date.desc",
          limit: "100",
        })
      : Promise.resolve({ rows: [] as DogHealthRow[], warning: null }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,is_primary,uploaded_at",
      order: "uploaded_at.desc",
      limit: "500",
    }),
    canViewAudit
      ? readRows<DogDocumentRow>("core_dog_documents", {
          select: "id,dog_id,document_status,title",
          order: "updated_at.desc",
          limit: "500",
        })
      : Promise.resolve({ rows: [] as DogDocumentRow[], warning: null }),
    readRows<BuyerRow>("core_buyers", {
      select: "id,first_name,last_name,preferred_name,email,approval_status",
      order: "updated_at.desc",
      limit: "200",
    }),
    readRows<FamilyRow>("core_families", {
      select: "id,name,status",
      order: "updated_at.desc",
      limit: "200",
    }),
  ]);

  const applications = applicationResult.rows;
  const reservations = reservationResult.rows;
  const dogs = dogResult.rows;
  const litters = litterResult.rows;
  const puppies = puppyResult.rows;
  const goHomes = goHomeResult.rows;
  const notifications = notificationResult.rows;
  const events = eventResult.rows;
  const documents = documentResult.rows;
  const phoneRows = phoneResult.rows;
  const proposedActions = proposedActionResult.rows;
  const weights = weightResult.rows;
  const dogHealthEvents = dogHealthResult.rows;
  const kennelMedia = kennelMediaResult.rows;
  const dogDocuments = dogDocumentResult.rows;
  const buyers = buyerResult.rows;
  const families = familyResult.rows;

  const activeReservationCount = reservations.filter(
    (row) => !["cancelled", "void", "released", "completed"].includes(normalized(row.reservation_status)),
  ).length;
  const activeReservedPuppyIds = new Set(
    reservations
      .filter((row) => row.puppy_id && !["cancelled", "void", "released", "completed"].includes(normalized(row.reservation_status)))
      .map((row) => row.puppy_id as string),
  );
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
  const proposedNeedsReviewCount = countByStatus(proposedActions, ["needs_review"]);
  const proposedHighRiskCount = proposedActions.filter((row) =>
    ["high", "blocked"].includes(normalized(row.risk_level)),
  ).length;
  const weightsTodayByPuppy = new Set(
    weights
      .filter((row) => row.puppy_id && isToday(row.measured_at))
      .map((row) => row.puppy_id as string),
  );
  const latestWeightByPuppy = new Map<string, WeightLogRow>();
  weights.forEach((row) => {
    if (row.puppy_id && !latestWeightByPuppy.has(row.puppy_id)) {
      latestWeightByPuppy.set(row.puppy_id, row);
    }
  });
  const puppyMediaIds = new Set(
    kennelMedia
      .filter((row) => row.puppy_id)
      .map((row) => row.puppy_id as string),
  );
  const dogMediaIds = new Set(
    kennelMedia.filter((row) => row.dog_id).map((row) => row.dog_id as string),
  );
  const dogDocumentIds = new Set(
    dogDocuments
      .filter((row) => row.dog_id)
      .map((row) => row.dog_id as string),
  );
  const newbornPuppies = puppies.filter((row) =>
    ["newborn", "watch", "at_risk", "available", "hold", "reserved"].includes(
      normalized(row.status),
    ),
  );
  const puppiesMissingWeightToday = newbornPuppies.filter(
    (row) => !weightsTodayByPuppy.has(row.id),
  ).length;
  const puppiesWithoutAssignment = puppies.filter((row) => !activeReservedPuppyIds.has(row.id));
  const watchPuppies = puppies.filter((row) =>
    ["watch", "at_risk", "attention", "needs_attention"].some((status) =>
      `${normalized(row.status)} ${normalized(row.health_status)}`.includes(status),
    ),
  );
  const expectedSoonLitters = litters.filter((row) => {
    const days = daysUntil(row.expected_birth_at);
    return days !== null && days >= 0 && days <= 14;
  });
  const goHomeUpcomingCount = goHomes.filter((row) => {
    const days = daysUntil(row.effective_scheduled_at);
    return days !== null && days >= 0 && days <= 14;
  }).length;
  const goHomeBlockerCount = goHomes.filter((row) =>
    ["blocked", "pending", "incomplete", "not_cleared"].some((status) =>
      `${normalized(row.checklist_status)} ${normalized(row.balance_cleared_status)} ${normalized(row.effective_status)}`.includes(
        status,
      ),
    ),
  ).length;
  const dogsMissingMetadata = dogs.filter(
    (row) => !row.call_name || !row.sex || !row.status,
  ).length;
  const buyersPending = buyers.filter((row) =>
    ["pending", "needs_review", "received"].includes(normalized(row.approval_status)),
  ).length;
  const activeFamilies = countByStatus(families, ["active"]);

  const priorityCards: ConsoleCard[] = [
    {
      title: "Newborn weights today",
      detail: `${puppiesMissingWeightToday} newborn/recent puppy record(s) do not show a weight logged today. Latest weights remain observation-only.`,
      href: "/staff/litters",
      badge: String(puppiesMissingWeightToday),
    },
    {
      title: "Puppies without buyer assignment",
      detail: `${puppiesWithoutAssignment.length} puppy record(s) do not have an active Core reservation assignment. Assignment must happen through the reservation workflow.`,
      href: "/staff/puppies",
      badge: String(puppiesWithoutAssignment.length),
    },
    {
      title: "Watch / attention puppies",
      detail: `${watchPuppies.length} puppy record(s) have deterministic status text suggesting watch or attention review. No diagnosis is made.`,
      href: "/staff/puppies",
      badge: String(watchPuppies.length),
    },
    {
      title: "Expected litters",
      detail: `${expectedSoonLitters.length} expected litter record(s) are dated within the next 14 days.`,
      href: "/staff/litters",
      badge: String(expectedSoonLitters.length),
    },
    {
      title: "Go-home blockers",
      detail: `${goHomeBlockerCount} go-home readiness record(s) show blocked, pending, incomplete, or not-cleared status text.`,
      href: "/staff/go-home",
      badge: String(goHomeBlockerCount),
    },
    {
      title: "Open balances",
      detail: canViewFinancials
        ? `${openBalanceCount} active reservation record(s) show balance due in the read model.`
        : "Financial detail is restricted for this role.",
      href: "/staff/payments",
      badge: String(openBalanceCount),
    },
    {
      title: "Communication previews",
      detail: `${unsentNotificationCount} notification record(s) are not marked sent. This console does not send messages.`,
      href: "/staff/notifications",
      badge: String(unsentNotificationCount),
    },
    {
      title: "Dog metadata review",
      detail: `${dogsMissingMetadata} dog record(s) are missing call name, sex, or status values from the current Core read.`,
      href: "/staff/dogs",
      badge: String(dogsMissingMetadata),
    },
  ];

  const puppyCards: ConsoleCard[] = newbornPuppies.slice(0, 6).map((puppy) => {
    const latestWeight = latestWeightByPuppy.get(puppy.id);
    return {
      title: display(puppy.name, puppy.collar_color ? `${puppy.collar_color} collar` : shortId(puppy.id)),
      detail: [
        `Status: ${formatKey(puppy.status)} / ${formatKey(puppy.health_status)}`,
        `Latest weight: ${formatWeight(latestWeight?.weight_grams)} (${formatDateTime(latestWeight?.measured_at)})`,
        weightsTodayByPuppy.has(puppy.id) ? "Weight logged today" : "No weight logged today",
        puppyMediaIds.has(puppy.id) ? "Internal photo metadata present" : "No internal photo metadata found",
      ].join(" | "),
      href: `/staff/puppies/${puppy.id}`,
      badge: activeReservedPuppyIds.has(puppy.id) ? "Assigned" : "Assign",
    };
  });

  const dogCards: ConsoleCard[] = dogs.slice(0, 6).map((dog) => ({
    title: display(dog.call_name, display(dog.registered_name, shortId(dog.id))),
    detail: [
      `Status: ${formatKey(dog.status)} / ${formatKey(dog.sex)}`,
      dogMediaIds.has(dog.id) ? "Internal photo metadata present" : "No internal photo metadata found",
      dogDocumentIds.has(dog.id) ? "Document metadata present" : "No document metadata found",
      dogHealthEvents.some((event) => event.dog_id === dog.id) ? "Health/care history present" : "No health/care history found",
    ].join(" | "),
    href: `/staff/dogs/${dog.id}`,
    badge: formatKey(dog.status),
  }));

  const relationshipCards: ConsoleCard[] = reservations.slice(0, 6).map((reservation) => ({
    title: display(
      reservation.buyer_name,
      display(reservation.family_name, `Reservation ${shortId(reservation.reservation_id)}`),
    ),
    detail: [
      `Puppy: ${display(reservation.puppy_name, reservation.puppy_collar_color ?? undefined)}`,
      `Reservation: ${formatKey(reservation.reservation_status)}`,
      canViewFinancials ? `Balance: ${formatMoney(reservation.balance_due_cents)}` : "Balance: restricted",
      `Go-home: ${formatDateTime(reservation.go_home_planned_at)}`,
    ].join(" | "),
    href: reservation.buyer_id ? `/staff/buyers/${reservation.buyer_id}` : "/staff/reservations",
    badge: formatKey(reservation.reservation_status),
  }));

  const assignmentCards: ConsoleCard[] = puppiesWithoutAssignment.slice(0, 6).map((puppy) => ({
    title: display(puppy.name, puppy.collar_color ? `${puppy.collar_color} collar` : shortId(puppy.id)),
    detail: [
      `Status: ${formatKey(puppy.status)}`,
      weightsTodayByPuppy.has(puppy.id) ? "Weight logged today" : "Missing today's weight",
      "Open puppy detail to assign buyer through a reservation.",
    ].join(" | "),
    href: `/staff/puppies/${puppy.id}`,
    badge: "Assign",
  }));

  const pipelineCards: ConsoleCard[] = [
    {
      title: "Applications",
      detail: `${applications.length} total application record(s), ${pendingApplicationCount} needing review from deterministic status values.`,
      href: "/staff/applications",
      badge: String(pendingApplicationCount),
    },
    {
      title: "Reservations",
      detail: `${activeReservationCount} active reservation record(s), ${reservedPuppyCount} puppy record(s) marked reserved.`,
      href: "/staff/reservations",
      badge: String(activeReservationCount),
    },
    {
      title: "Buyers / families",
      detail: `${buyers.length} buyer record(s), ${families.length} family record(s), ${buyersPending} buyer approval record(s) pending review, ${activeFamilies} active families.`,
      href: "/staff/buyers",
      badge: String(buyersPending),
    },
  ];

  const readinessCards: ConsoleCard[] = [
    {
      title: "Go-home readiness",
      detail: `${goHomeUpcomingCount} go-home record(s) scheduled within 14 days, ${goHomeUnscheduledCount} unscheduled, ${goHomeBlockerCount} possible blocker(s).`,
      href: "/staff/go-home",
      badge: String(goHomeBlockerCount),
    },
    {
      title: "Payment attention",
      detail: canViewFinancials
        ? `${openBalanceCount} reservation record(s) show balance due. This console does not process payments.`
        : "Payment details are restricted for this role.",
      href: "/staff/payments",
      badge: String(openBalanceCount),
    },
    {
      title: "Document attention",
      detail: canViewAudit
        ? `${draftDocumentCount} document metadata record(s) are pending, ready, generated, or in review states. No documents are generated here.`
        : "Document detail is restricted to owner/admin users.",
      href: "/staff/documents",
      badge: canViewAudit ? String(draftDocumentCount) : "Locked",
    },
  ];

  const communicationCards: ConsoleCard[] = [
    {
      title: "Notification queue",
      detail: `${queuedNotificationCount} queued/pending notification record(s), ${unsentNotificationCount} not marked sent. Preview only; no SMTP, SMS, or provider call is connected.`,
      href: "/staff/notifications",
      badge: String(unsentNotificationCount),
    },
    {
      title: "Messages readiness",
      detail: "Communications readiness stays internal and preview-only from this surface.",
      href: "/staff/messages",
      badge: "Preview",
    },
    {
      title: "Phone lookup safety",
      detail: canViewPhone
        ? `${ambiguousPhoneCount} phone lookup result(s) require human verification before future phone workflows.`
        : "Phone lookup detail is restricted to owner/admin users.",
      href: "/staff/phone-lookup",
      badge: canViewPhone ? String(ambiguousPhoneCount) : "Locked",
    },
  ];

  const eventAuditCards: ConsoleCard[] = [
    ...events.slice(0, 3).map((event) => ({
      title: display(event.summary, formatKey(event.event_type)),
      detail: `${formatDateTime(event.event_at)} | ${display(event.related_table)} / ${shortId(event.related_id)} | ${display(event.source, "source unknown")}`,
      href: "/staff/events",
      badge: formatKey(event.event_type),
    })),
    ...(canViewAudit
      ? auditResult.rows.slice(0, 3).map((audit) => ({
          title: formatKey(audit.action),
          detail: `${formatDateTime(audit.created_at)} | Outcome: ${formatKey(audit.outcome)}`,
          href: "/staff/events",
          badge: "Audit",
        }))
      : []),
  ];

  const proposedCards: ConsoleCard[] = canViewAudit
    ? proposedActions.slice(0, 6).map((action) => ({
        title: `Proposed action ${shortId(action.id)}`,
        detail: `Status: ${formatKey(action.status)} | Risk: ${formatKey(action.risk_level)}. Review-only; approval does not execute changes yet.`,
        href: "/staff/proposed-actions",
        badge: formatKey(action.risk_level),
      }))
    : [
        {
          title: "Proposed actions restricted",
          detail: "Owner/admin access is required to review proposed-action records.",
          badge: "Locked",
        },
      ];

  const briefingItems: BriefingItem[] = [
    {
      label: "Applications needing review",
      value: pendingApplicationCount,
      detail:
        pendingApplicationCount > 0
          ? "Review queue has applications ready for owner/operator attention."
          : "No application review backlog in the current Core read.",
      href: "/staff/applications",
    },
    {
      label: "Notifications queued",
      value: unsentNotificationCount,
      detail:
        unsentNotificationCount > 0
          ? "Preview records are waiting; no email or SMS is sent from here."
          : "No unsent notification records found in this read.",
      href: "/staff/notifications",
    },
    {
      label: "Go-home items unscheduled",
      value: goHomeUnscheduledCount,
      detail:
        goHomeUnscheduledCount > 0
          ? "Some go-home records still need schedule review."
          : "Current go-home records have schedule coverage.",
      href: "/staff/go-home",
    },
    {
      label: "Documents pending",
      value: canViewAudit ? draftDocumentCount : "Owner/admin",
      detail: canViewAudit
        ? "Document metadata may need review; no generation or signature action is connected."
        : "Document inventory details are restricted to owner/admin users.",
    },
    {
      label: "Phone lookup ambiguity",
      value: canViewPhone ? ambiguousPhoneCount : "Owner/admin",
      detail: canViewPhone
        ? "Ambiguous phone records require human verification before any future phone workflow."
        : "Phone ambiguity details are restricted to owner/admin users.",
    },
    {
      label: "Proposed actions needing review",
      value: canViewAudit ? proposedNeedsReviewCount : "Owner/admin",
      detail: canViewAudit
        ? "Proposal records are review-only; approval does not execute business changes."
        : "Proposed-action review details are restricted to owner/admin users.",
      href: canViewAudit ? "/staff/proposed-actions" : undefined,
    },
  ];
  const recommendedSteps: RecommendedStep[] = [
    ...(pendingApplicationCount > 0
      ? [
          {
            title: "Review pending applications",
            detail: `${pendingApplicationCount} application record(s) need owner/operator review.`,
            href: "/staff/applications",
          },
        ]
      : []),
    ...(goHomeUnscheduledCount > 0
      ? [
          {
            title: "Schedule go-home details",
            detail: `${goHomeUnscheduledCount} go-home record(s) need schedule review.`,
            href: "/staff/go-home",
          },
        ]
      : []),
    ...(canViewAudit && proposedNeedsReviewCount > 0
      ? [
          {
            title: "Review proposed actions",
            detail: `${proposedNeedsReviewCount} proposal record(s) are waiting for review.`,
            href: "/staff/proposed-actions",
          },
        ]
      : []),
    ...(canViewPhone && ambiguousPhoneCount > 0
      ? [
          {
            title: "Resolve phone lookup ambiguity",
            detail: `${ambiguousPhoneCount} phone lookup result(s) need human verification.`,
            href: "/staff/phone-lookup",
          },
        ]
      : []),
    ...(canViewAudit && draftDocumentCount > 0
      ? [
          {
            title: "Review pending document metadata",
            detail: `${draftDocumentCount} document metadata record(s) are pending or in review states.`,
            href: "/staff/documents",
          },
        ]
      : []),
    ...(unsentNotificationCount > 0
      ? [
          {
            title: "Review notification queue",
            detail: `${unsentNotificationCount} notification record(s) are not marked sent.`,
            href: "/staff/notifications",
          },
        ]
      : []),
  ];

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
    phoneResult.warning ??
    proposedActionResult.warning ??
    weightResult.warning ??
    dogHealthResult.warning ??
    kennelMediaResult.warning ??
    dogDocumentResult.warning ??
    buyerResult.warning ??
    familyResult.warning;

  const nodes: SystemNode[] = [
    {
      label: "Applications",
      value: applications.length,
      status: `${pendingApplicationCount} review`,
      icon: "✉",
      pulse: pendingApplicationCount > 0,
      tone: "ring-blue-200/80",
      position: "left-[5%] top-[10%]",
      line: "left-[88px] top-[54px] h-[2px] w-[210px] rotate-[16deg]",
    },
    {
      label: "Notifications",
      value: queuedNotificationCount,
      status: `${unsentNotificationCount} unsent`,
      icon: "•",
      pulse: queuedNotificationCount > 0 || unsentNotificationCount > 0,
      tone: "ring-cyan-200/80",
      position: "left-[1%] top-[39%]",
      line: "left-[92px] top-[54px] h-[2px] w-[250px] rotate-[-2deg]",
    },
    {
      label: "Messages",
      value: "Read",
      status: "calm",
      icon: "◌",
      pulse: false,
      tone: "ring-slate-200/80",
      position: "left-[8%] bottom-[11%]",
      line: "left-[86px] top-[34px] h-[2px] w-[210px] rotate-[-18deg]",
    },
    {
      label: "Phone Lookup",
      value: canViewPhone ? ambiguousPhoneCount : "—",
      status: canViewPhone ? "verify" : "locked",
      icon: "☎",
      pulse: canViewPhone && ambiguousPhoneCount > 0,
      tone: "ring-amber-200/80",
      position: "left-[22%] bottom-[3%]",
      line: "left-[70px] top-[10px] h-[2px] w-[135px] rotate-[-42deg]",
    },
    {
      label: "Puppies",
      value: puppies.length,
      status: `${availablePuppyCount} open`,
      icon: "◇",
      pulse: false,
      tone: "ring-violet-200/80",
      position: "left-[44%] bottom-[1%]",
      line: "left-[44px] top-[-84px] h-[2px] w-[128px] rotate-[-88deg]",
    },
    {
      label: "Go-Home",
      value: goHomeScheduledCount,
      status: `${goHomeUnscheduledCount} unscheduled`,
      icon: "⌂",
      pulse: goHomeUnscheduledCount > 0,
      tone: "ring-emerald-200/80",
      position: "right-[23%] bottom-[3%]",
      line: "right-[70px] top-[10px] h-[2px] w-[140px] rotate-[42deg]",
    },
    {
      label: "Documents",
      value: canViewAudit ? documents.length : "—",
      status: canViewAudit ? `${draftDocumentCount} pending` : "locked",
      icon: "▣",
      pulse: canViewAudit && draftDocumentCount > 0,
      tone: "ring-sky-200/80",
      position: "right-[8%] bottom-[11%]",
      line: "right-[86px] top-[34px] h-[2px] w-[210px] rotate-[18deg]",
    },
    {
      label: "Reservations",
      value: activeReservationCount,
      status: "active",
      icon: "◆",
      pulse: false,
      tone: "ring-blue-200/80",
      position: "right-[1%] top-[39%]",
      line: "right-[92px] top-[54px] h-[2px] w-[250px] rotate-[2deg]",
    },
    {
      label: "Dogs",
      value: dogs.length,
      status: "records",
      icon: "✦",
      pulse: false,
      tone: "ring-indigo-200/80",
      position: "right-[5%] top-[10%]",
      line: "right-[88px] top-[54px] h-[2px] w-[210px] rotate-[-16deg]",
    },
    {
      label: "Litters",
      value: litters.length,
      status: `${plannedLitterCount} planned`,
      icon: "✧",
      pulse: plannedLitterCount > 0,
      tone: "ring-teal-200/80",
      position: "right-[22%] top-[2%]",
      line: "right-[70px] top-[78px] h-[2px] w-[120px] rotate-[-44deg]",
    },
    {
      label: "Safety",
      value: "Safe",
      status: "locked",
      icon: "✓",
      pulse: false,
      tone: "ring-emerald-200/80",
      position: "left-[22%] top-[2%]",
      line: "left-[70px] top-[78px] h-[2px] w-[120px] rotate-[44deg]",
    },
  ];

  return (
    <main className="operator-workspace min-h-screen overflow-hidden px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <OperatorHeader
          eyebrow="Core Command Console"
          title="Core is online and ready to help."
          summary="Your read-only command brain for business, kennel, family, and readiness operations. Core can summarize, organize, prepare, and review; approval is required before anything sensitive changes."
          status="Read-only / safe"
          blockers={priorityCards.length > 0 ? `${priorityCards.length} priority item(s)` : "No urgent priority items"}
          nextAction={recommendedSteps[0]?.title ?? "Review today's command lanes"}
          links={[
            { href: "/staff", label: "Today" },
            { href: "/staff/payment-plans", label: "Payment Plans" },
            { href: "/staff/go-home/handoff", label: "Handoff" },
            { href: "/staff/proposed-actions", label: "Proposed Actions" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Applications", value: applications.length, note: "recent rows" },
            { label: "Reservations", value: activeReservationCount, note: `${openBalanceCount} open balance` },
            { label: "Puppies", value: puppies.length, note: `${availablePuppyCount} available / ${reservedPuppyCount} reserved` },
            { label: "Go-home", value: goHomeScheduledCount, note: `${goHomeUnscheduledCount} unscheduled` },
            { label: "Communications", value: queuedNotificationCount, note: `${unsentNotificationCount} pending/preview` },
            { label: "Proposals", value: canViewAudit ? proposedActions.length : "Restricted", note: "review state only" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#today", label: "Today", count: priorityCards.length },
            { href: "#neonatal", label: "Neonatal", count: puppyCards.length },
            { href: "#buyers", label: "Buyers/Families", count: relationshipCards.length },
            { href: "#payments", label: "Payments", count: readinessCards.length },
            { href: "#communications", label: "Communications", count: communicationCards.length },
            { href: "#events", label: "Events/Audit", count: eventAuditCards.length },
            { href: "#proposals", label: "Proposed", count: proposedCards.length },
            { href: "#system", label: "System" },
          ]}
        />

        <section className="rounded-[2rem] border border-cyan-200/70 bg-cyan-50/80 p-6 text-cyan-950 shadow-[0_18px_45px_rgba(14,165,233,0.08)] ring-1 ring-white/60 backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-700">
                Safety State: Safe
              </p>
              <p className="mt-2 max-w-5xl text-sm leading-7">
                Core is observing existing records only. It cannot send messages, move money, generate documents, publish listings, control devices, or write changes from this console.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TinyPill>No AI provider</TinyPill>
              <TinyPill>No write tools</TinyPill>
              <TinyPill>No external sending</TinyPill>
              <TinyPill>Approval model documented</TinyPill>
            </div>
          </div>
        </section>

        <BriefingPanel items={briefingItems} />

        <RecommendedNextSteps steps={recommendedSteps} />

        <ConsoleSection
          id="today"
          eyebrow="Today"
          title="Today's Priority Queue"
          detail="Owner/operator attention items derived from current Core metadata only."
          cards={priorityCards}
          emptyText="No urgent priority items found from current Core metadata."
        />

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm font-black leading-7 text-amber-950 shadow-sm">
          This Command Center is an internal owner/operator control surface only. It does not send messages, process payments, generate documents, publish puppies, expose private files, update the customer portal, call AI providers, or contact external services.
        </section>

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {warning}
          </section>
        ) : null}

        <CommandCloud nodes={nodes} />

        <section className="grid gap-6 xl:grid-cols-2">
          <ConsoleSection
            id="neonatal"
            eyebrow="Neonatal"
            title="Neonatal / Puppy Command Summary"
            detail="Puppy cards show identity, status, latest observed weight, today's weight coverage, and private media metadata when present."
            cards={puppyCards}
            emptyText="No newborn/recent puppy records were found in the current Core read."
          />
          <ConsoleSection
            id="dogs"
            eyebrow="Breeding Stock"
            title="Dogs / Breeding Stock Summary"
            detail="Dog cards summarize internal profile readiness, photo metadata, document metadata, and care/event history."
            cards={dogCards}
            emptyText="No dog records were found in the current Core read."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ConsoleSection
            id="buyers"
            eyebrow="Relationships"
            title="Buyer / Family Relationship Summary"
            detail="Reservation-linked buyer, family, puppy, balance, and go-home context for human review."
            cards={relationshipCards}
            emptyText="No reservation-linked buyer/family records were found in the current Core read."
          />
          <ConsoleSection
            id="pipeline"
            eyebrow="Pipeline"
            title="Application / Reservation Pipeline"
            detail="High-level Core pipeline counts for applications, reservations, buyers, and family records."
            cards={pipelineCards}
            emptyText="No application or reservation pipeline records were found in the current Core read."
          />
        </section>

        <ConsoleSection
          id="assignment"
          eyebrow="Assignment"
          title="Puppy Buyer Assignment Links"
          detail="Puppies without active reservation assignments link to the puppy detail workflow where buyer assignment is created through Core reservations."
          cards={assignmentCards}
          emptyText="No unassigned puppy records were found in the current Core read."
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <ConsoleSection
            id="payments"
            eyebrow="Readiness"
            title="Payment / Document / Go-Home Readiness"
            detail="Read-only readiness indicators. This surface does not process payments or generate documents."
            cards={readinessCards}
            emptyText="No payment, document, or go-home readiness items were found."
          />
          <ConsoleSection
            id="communications"
            eyebrow="Communications"
            title="Communications Preview"
            detail="Preview-only communication and phone safety context. No SMTP, Twilio, Facebook, or provider call is connected."
            cards={communicationCards}
            emptyText="No communication preview records were found."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ConsoleSection
            id="events"
            eyebrow="Timeline"
            title="Event / Audit Feed"
            detail="Recent operational events and owner/admin audit rows when safely visible."
            cards={eventAuditCards}
            emptyText="No event or audit rows were found for the current role."
          />
          <ConsoleSection
            id="proposals"
            eyebrow="Future AI Boundary"
            title="Proposed Actions / Future AI Boundary"
            detail="Proposed actions are review records only. They do not execute business changes, contact providers, or update customer-facing systems."
            cards={proposedCards}
            emptyText="No proposed action records were found."
          />
        </section>

        <section id="system" className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <GlassPanel className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
              Helpful assistant surface
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              What Core can help with right now
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Core can prepare and organize. Sensitive actions stay under owner/admin control.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <HelperRow icon="↻" text="Summarize today’s activity" />
              <HelperRow icon="◇" text="Review kennel status" />
              <HelperRow icon="!" text="Show applications needing review" />
              <HelperRow icon="⌂" text="Check go-home readiness" />
              <HelperRow icon="✓" text="Review proposed actions" />
              <HelperRow icon="•" text="Surface safety warnings" />
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">
              Future locked capabilities
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <HelperRow icon="♬" text="Voice commands" />
              <HelperRow icon="◉" text="Smart kennel monitoring" />
              <HelperRow icon="⌁" text="Smart home controls" />
              <HelperRow icon="⏱" text="Automated reminders" />
              <HelperRow icon="✉" text="Customer messaging" />
              <HelperRow icon="▣" text="Document preparation" />
            </div>
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-950">
              Future voice and smart-home controls will use the same approval model. No live voice, device, or provider control is connected here.
            </p>
          </GlassPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
          <GlassPanel className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
                  Core Outputs
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Operational output console
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">Core Outputs</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Recent Actions</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Operational Insights</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <OutputRow
                    key={event.id}
                    title={display(event.summary, formatKey(event.event_type))}
                    detail={`${display(event.related_table)} / ${shortId(event.related_id)} · ${display(event.source, "source unknown")}`}
                    time={formatDateTime(event.event_at)}
                    badge={formatKey(event.event_type)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-6 text-slate-600">
                  Core has no recent output yet. As records change, activity will appear here.
                </div>
              )}
            </div>
          </GlassPanel>

          <div className="space-y-6">
            <GlassPanel className="p-6">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
                System At A Glance
              </p>
              <div className="mt-5 space-y-3">
                <SummaryLine label="Safety State" value="Safe" note="External systems off and writes locked" />
                <SummaryLine label="Active Reservations" value={activeReservationCount} note={`${openBalanceCount} open balance marker`} />
                <SummaryLine label="Dogs" value={dogs.length} note="Core dog records" />
                <SummaryLine label="Litters" value={litters.length} note={`${plannedLitterCount} planned / ${bornLitterCount} born`} />
                <SummaryLine label="Puppies" value={puppies.length} note={`${availablePuppyCount} available / ${reservedPuppyCount} reserved`} />
                <SummaryLine label="Go-Home Scheduled" value={goHomeScheduledCount} note={`${goHomeUnscheduledCount} without schedule`} />
                <SummaryLine label="Notifications" value={queuedNotificationCount} note={`${unsentNotificationCount} not marked sent`} />
                <SummaryLine label="Documents Pending" value={canViewAudit ? draftDocumentCount : "—"} note={canViewAudit ? `${documents.length} document rows visible` : "Owner/admin only"} />
                <SummaryLine label="Proposed Actions" value={canViewAudit ? proposedActions.length : "—"} note={canViewAudit ? `${proposedNeedsReviewCount} waiting / ${proposedHighRiskCount} high-risk` : "Owner/admin only"} />
              </div>
            </GlassPanel>

            <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
              <h2 className="text-lg font-black">Approval Queue</h2>
              <p className="mt-3 text-sm leading-7">
                Proposed actions are review records only. Approval does not execute business changes yet.
              </p>
              <Link
                href="/staff/proposed-actions"
                className="mt-4 inline-flex rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Open Proposed Actions
              </Link>
            </section>
          </div>
        </section>

        <GlassPanel className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              The console can summarize Core. It cannot act for Core.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <ReadinessItem text="Read-only summary connected" />
            <ReadinessItem text="No AI provider connected" />
            <ReadinessItem text="No write tools enabled" />
            <ReadinessItem text="No external sending enabled" />
            <ReadinessItem text="Proposed action model available" />
            <ReadinessItem text="Voice/smart-home future only" />
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}

