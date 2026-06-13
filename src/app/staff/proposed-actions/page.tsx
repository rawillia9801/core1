import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import {
  approveProposedAction,
  createProposedAction,
  rejectProposedAction,
} from "./actions";
import { ActionPanel } from "../action-panel";
import { BreedingCarePanel } from "../breeding-care-panel";
import { EmailReadinessPanel } from "../email-readiness-panel";
import { ProposedActionPanel } from "../proposed-action-panel";
import {
  OperatorHeader,
  OperatorStatusPill,
  SectionNav,
  SummaryStrip,
} from "../operator-ui";

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

type ApplicationRow = {
  id: string;
  status: string | null;
  buyer_id: string | null;
  family_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  approval_status: string | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
};

type PreferenceRow = {
  buyer_id: string | null;
  preferred_sex: string | null;
  preferred_colors: string[] | null;
  preferred_coat_types: string[] | null;
  desired_timing: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
  health_status: string | null;
  public_listing_status: string | null;
  updated_at: string | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
  status: string | null;
  details_pending: boolean | null;
};

type DogRow = {
  id: string;
  call_name: string | null;
  registered_name: string | null;
  sex: string | null;
  status: string | null;
  updated_at: string | null;
};

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  puppy_status: string | null;
  application_id: string | null;
  contract_total_cents: number | null;
  deposit_required_cents: number | null;
  posted_ledger_total_cents: number | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentRow = {
  id: string;
  reservation_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
  updated_at: string | null;
};

type MediaRow = {
  id: string;
  entity_type: string | null;
  dog_id: string | null;
  puppy_id: string | null;
  is_primary: boolean | null;
  uploaded_at: string | null;
};

type NotificationRow = {
  id: string;
  family_id: string | null;
  buyer_id: string | null;
  template_id: string | null;
  notification_type: string | null;
  channel: string | null;
  status: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

type DeliveryAttemptRow = {
  id: string;
  notification_id: string | null;
  provider: string | null;
  channel: string | null;
  status: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  created_at: string | null;
};

type LedgerRow = {
  id: string;
  reservation_id: string | null;
  entry_type: string | null;
  balance_effect: string | null;
  status: string | null;
  amount_cents: number | null;
  occurred_at: string | null;
  created_at: string | null;
};

type WeightLogRow = {
  id: string;
  puppy_id: string | null;
  measured_at: string | null;
  weight_grams: number | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  summary: string | null;
  event_at: string | null;
  buyer_id: string | null;
  family_id: string | null;
  puppy_id: string | null;
  reservation_id: string | null;
  application_id: string | null;
  related_table: string | null;
  related_id: string | null;
};

type RulePriority = "urgent" | "high" | "normal" | "watch";
type RuleMode = "review-only" | "action-available";
type RuleCategory =
  | "Applications"
  | "Matching"
  | "Reservations"
  | "Payments"
  | "Documents"
  | "Media"
  | "Communications"
  | "Go-Home"
  | "Kennel / Care";

type RuleAction = {
  id: string;
  title: string;
  reason: string;
  priority: RulePriority;
  category: RuleCategory;
  blockers: string[];
  href: string;
  actionLabel: string;
  mode: RuleMode;
  related: Array<{ label: string; href: string }>;
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

function normalizedText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) return "Unlinked buyer";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || buyer.phone || `Buyer ${shortId(buyer.id)}`;
}

function puppyName(puppy: PuppyRow | undefined | null) {
  if (!puppy) return "Unlinked puppy";
  return puppy.name || puppy.collar_color || `Puppy ${shortId(puppy.id)}`;
}

function summaryPuppyName(summary: ReservationRow) {
  return display(summary.puppy_name || summary.puppy_collar_color, "Unlinked puppy");
}

function dogName(dog: DogRow) {
  return dog.call_name || dog.registered_name || `Dog ${shortId(dog.id)}`;
}

function litterName(litter: LitterRow) {
  return litter.litter_name || `Litter ${shortId(litter.id)}`;
}

function pushRule(rows: RuleAction[], row: RuleAction) {
  rows.push(row);
}

function priorityTone(priority: RulePriority): "neutral" | "green" | "blue" | "amber" | "red" {
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  if (priority === "normal") return "blue";
  return "neutral";
}

function modeTone(mode: RuleMode): "neutral" | "green" | "blue" | "amber" | "red" {
  return mode === "action-available" ? "green" : "blue";
}

function priorityRank(priority: RulePriority) {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  if (priority === "normal") return 2;
  return 3;
}

function sortRules(rows: RuleAction[]) {
  return [...rows].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.blockers.length - a.blockers.length);
}

function isActiveReservation(row: ReservationRow) {
  return !["cancelled", "void", "released"].includes(normalized(row.reservation_status));
}

function isPendingDocument(row: DocumentRow) {
  return ["draft", "sent", "pending", "pending_signature", "needs_signature", "needs_review", "unsigned"].includes(normalized(row.status));
}

function isStaleDocument(row: DocumentRow) {
  return ["replaced", "superseded", "stale", "expired", "void", "cancelled"].includes(normalized(row.status));
}

function docsForReservation(documents: DocumentRow[], summary: ReservationRow) {
  return documents.filter((doc) =>
    doc.reservation_id === summary.reservation_id ||
    (summary.buyer_id && doc.buyer_id === summary.buyer_id) ||
    (summary.family_id && doc.family_id === summary.family_id) ||
    (summary.puppy_id && doc.puppy_id === summary.puppy_id)
  );
}

function hasDocumentType(documents: DocumentRow[], words: string[]) {
  return documents.some((doc) => {
    const text = normalizedText(`${doc.document_type ?? ""} ${doc.title ?? ""}`);
    return words.every((word) => text.includes(word)) && !isStaleDocument(doc);
  });
}

function latestDate(values: Array<string | null | undefined>) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function payloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function notificationStatus(row: NotificationRow) {
  const status = normalized(row.status);
  if (status === "sent") return "sent";
  if (status === "queued") return "queued";
  if (status === "pending") return "pending";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  if (!payloadString(row.payload, "recipient_email") && row.channel === "email") return "missing_recipient";
  if (!row.template_id && !payloadString(row.payload, "template_key")) return "missing_template";
  return status || "review_required";
}

function communicationEventExists(events: EventRow[], id: string | null | undefined) {
  if (!id) return false;
  return events.some((event) => {
    const haystack = `${event.event_type ?? ""} ${event.summary ?? ""}`.toLowerCase();
    return (
      (event.application_id === id || event.reservation_id === id || event.buyer_id === id || event.family_id === id || event.related_id === id) &&
      (haystack.includes("notification") || haystack.includes("message") || haystack.includes("follow"))
    );
  });
}

function preferenceMatchesPuppy(preference: PreferenceRow | undefined, puppy: PuppyRow) {
  if (!preference) return false;
  const preferredSex = normalizedText(preference.preferred_sex);
  const sexMatch = !preferredSex || !puppy.sex || normalizedText(puppy.sex) === preferredSex;
  const colors = preference.preferred_colors?.map(normalizedText).filter(Boolean) ?? [];
  const colorMatch = colors.length === 0 || colors.some((color) => normalizedText(puppy.color).includes(color));
  const coats = preference.preferred_coat_types?.map(normalizedText).filter(Boolean) ?? [];
  const coatMatch = coats.length === 0 || coats.some((coat) => normalizedText(puppy.coat_type).includes(coat));
  return sexMatch && colorMatch && coatMatch;
}

function RuleRowCard({ row }: { row: RuleAction }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <OperatorStatusPill tone={priorityTone(row.priority)}>{row.priority}</OperatorStatusPill>
            <OperatorStatusPill tone="blue">{row.category}</OperatorStatusPill>
            <OperatorStatusPill tone={modeTone(row.mode)}>{formatKey(row.mode)}</OperatorStatusPill>
            <OperatorStatusPill tone={row.blockers.length > 0 ? "amber" : "green"}>
              {row.blockers.length} blocker{row.blockers.length === 1 ? "" : "s"}
            </OperatorStatusPill>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-950">{row.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{row.reason}</p>
          {row.blockers.length > 0 ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
              {row.blockers.slice(0, 3).join(" / ")}
            </p>
          ) : null}
          {row.related.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {row.related.map((link) => (
                <Link key={`${row.id}-${link.href}-${link.label}`} href={link.href} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <Link href={row.href} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
          {row.actionLabel}
        </Link>
      </div>
    </article>
  );
}

function RuleLane({ id, title, rows, empty }: { id: string; title: string; rows: RuleAction[]; empty: string }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <OperatorStatusPill tone={rows.length > 0 ? "amber" : "green"}>{rows.length}</OperatorStatusPill>
      </div>
      <div className="grid gap-3">
        {rows.length > 0 ? rows.map((row) => <RuleRowCard key={row.id} row={row} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">{empty}</div>}
      </div>
    </section>
  );
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

  if (error === "invalid_input") {
    return "Proposed action update needs valid fields and a valid proposal reference.";
  }

  if (error === "rpc_failed") {
    return "Proposed action RPC failed. Check the deployed Core proposal action before retrying.";
  }

  if (error === "config_missing") {
    return "Core server action configuration is incomplete for proposed actions.";
  }

  if (error === "save_failed") {
    return "Proposed action update failed. Review the server action log for safe details.";
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
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
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

  const [
    proposedActionsResult,
    applicationResult,
    buyerResult,
    familyResult,
    preferenceResult,
    puppyResult,
    litterResult,
    dogResult,
    reservationResult,
    documentResult,
    mediaResult,
    notificationResult,
    attemptResult,
    ledgerResult,
    weightResult,
    eventResult,
  ] = await Promise.all([
    readRows<ProposedActionRow>("core_proposed_actions", {
      select:
        "id,action_type,title,summary,risk_level,status,proposed_by_type,proposed_by_profile_id,source,target_table,target_id,before_snapshot,proposed_change,validation_status,approved_by_profile_id,approved_at,rejected_by_profile_id,rejected_at,rejection_reason,expires_at,execution_status,executed_at,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: "50",
    }),
    readRows<ApplicationRow>("core_applications", { select: "id,status,buyer_id,family_id,submitted_at,reviewed_at,created_at", order: "created_at.desc", limit: "250" }),
    readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,approval_status", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<FamilyRow>("core_families", { select: "id,name,status", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<PreferenceRow>("core_buyer_preferences", { select: "buyer_id,preferred_sex,preferred_colors,preferred_coat_types,desired_timing", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<PuppyRow>("core_puppies", { select: "id,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,updated_at", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<LitterRow>("core_litters", { select: "id,litter_name,dam_id,sire_id,birth_at,expected_birth_at,status,details_pending", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<DogRow>("core_dogs", { select: "id,call_name,registered_name,sex,status,updated_at", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<ReservationRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,posted_ledger_total_cents,balance_due_cents,go_home_planned_at,go_home_status,go_home_checklist_status,go_home_balance_cleared_status,created_at,updated_at", order: "created_at.desc", limit: "500" }),
    readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at", order: "updated_at.desc.nullslast", limit: "750" }),
    readRows<MediaRow>("core_kennel_media", { select: "id,entity_type,dog_id,puppy_id,is_primary,uploaded_at", order: "uploaded_at.desc.nullslast", limit: "1000" }),
    readRows<NotificationRow>("core_notifications", { select: "id,family_id,buyer_id,template_id,notification_type,channel,status,payload,created_at", order: "created_at.desc", limit: "250" }),
    readRows<DeliveryAttemptRow>("core_notification_delivery_attempts", { select: "id,notification_id,provider,channel,status,recipient_email,recipient_phone,subject,created_at", order: "created_at.desc", limit: "150" }),
    readRows<LedgerRow>("core_financial_ledger", { select: "id,reservation_id,entry_type,balance_effect,status,amount_cents,occurred_at,created_at", order: "occurred_at.desc.nullslast,created_at.desc", limit: "750" }),
    readRows<WeightLogRow>("core_weight_logs", { select: "id,puppy_id,measured_at,weight_grams", order: "measured_at.desc.nullslast", limit: "1000" }),
    readRows<EventRow>("core_events", { select: "id,event_type,summary,event_at,buyer_id,family_id,puppy_id,reservation_id,application_id,related_table,related_id", order: "event_at.desc", limit: "500" }),
  ]);

  const proposedActions = proposedActionsResult.rows;
  const applications = applicationResult.rows;
  const buyers = buyerResult.rows;
  const preferences = preferenceResult.rows;
  const puppies = puppyResult.rows;
  const litters = litterResult.rows;
  const dogs = dogResult.rows;
  const reservations = reservationResult.rows.filter(isActiveReservation);
  const documents = documentResult.rows;
  const media = mediaResult.rows;
  const notifications = notificationResult.rows;
  const attempts = attemptResult.rows;
  const ledger = ledgerResult.rows;
  const weights = weightResult.rows;
  const events = eventResult.rows;

  const warnings = [
    proposedActionsResult.warning,
    applicationResult.warning,
    buyerResult.warning,
    familyResult.warning,
    preferenceResult.warning,
    puppyResult.warning,
    litterResult.warning,
    dogResult.warning,
    reservationResult.warning,
    documentResult.warning,
    mediaResult.warning,
    notificationResult.warning,
    attemptResult.warning,
    ledgerResult.warning,
    weightResult.warning,
    eventResult.warning,
  ].filter(Boolean);

  const buyersById = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const preferencesByBuyerId = new Map(preferences.filter((preference) => preference.buyer_id).map((preference) => [preference.buyer_id as string, preference]));
  const activeReservationByPuppyId = new Map(reservations.filter((reservation) => reservation.puppy_id).map((reservation) => [reservation.puppy_id as string, reservation]));
  const activeReservationByApplicationId = new Map(reservations.filter((reservation) => reservation.application_id).map((reservation) => [reservation.application_id as string, reservation]));
  const ledgerByReservationId = new Map<string, LedgerRow[]>();
  for (const entry of ledger) {
    if (!entry.reservation_id) continue;
    ledgerByReservationId.set(entry.reservation_id, [...(ledgerByReservationId.get(entry.reservation_id) ?? []), entry]);
  }
  const mediaByDogId = new Map<string, MediaRow[]>();
  const mediaByPuppyId = new Map<string, MediaRow[]>();
  for (const row of media) {
    if (row.entity_type === "dog" && row.dog_id) mediaByDogId.set(row.dog_id, [...(mediaByDogId.get(row.dog_id) ?? []), row]);
    if (row.entity_type === "puppy" && row.puppy_id) mediaByPuppyId.set(row.puppy_id, [...(mediaByPuppyId.get(row.puppy_id) ?? []), row]);
  }
  const puppiesByLitterId = new Map<string, PuppyRow[]>();
  for (const puppy of puppies) {
    if (puppy.litter_id) puppiesByLitterId.set(puppy.litter_id, [...(puppiesByLitterId.get(puppy.litter_id) ?? []), puppy]);
  }
  const weightsByPuppyId = new Map<string, WeightLogRow[]>();
  for (const weight of weights) {
    if (weight.puppy_id) weightsByPuppyId.set(weight.puppy_id, [...(weightsByPuppyId.get(weight.puppy_id) ?? []), weight]);
  }

  const ruleActions: RuleAction[] = [];
  const approvedApplications = applications.filter((application) => normalized(application.status) === "approved");
  const availablePuppies = puppies.filter((puppy) => normalized(puppy.status) === "available" && !activeReservationByPuppyId.has(puppy.id));

  for (const application of applications.filter((row) => ["received", "submitted", "needs_review", "new", "pending"].includes(normalized(row.status))).slice(0, 20)) {
    pushRule(ruleActions, {
      id: `app-review-${application.id}`,
      title: `Review ${buyerName(buyersById.get(application.buyer_id ?? ""))}`,
      reason: "Application received and not reviewed.",
      priority: "high",
      category: "Applications",
      blockers: [!application.buyer_id ? "Buyer link missing" : "", !application.family_id ? "Family link missing" : ""].filter(Boolean),
      href: `/staff/applications/${application.id}`,
      actionLabel: "Open Application",
      mode: "action-available",
      related: [
        ...(application.buyer_id ? [{ label: "Buyer", href: `/staff/buyers/${application.buyer_id}` }] : []),
        ...(application.family_id ? [{ label: "Family", href: `/staff/families/${application.family_id}` }] : []),
      ],
    });
  }

  for (const application of applications.filter((row) => !row.buyer_id || !row.family_id).slice(0, 12)) {
    pushRule(ruleActions, {
      id: `app-missing-data-${application.id}`,
      title: "Application missing required review data",
      reason: "Application is missing buyer or family linkage needed for a clean owner review.",
      priority: "urgent",
      category: "Applications",
      blockers: [!application.buyer_id ? "Buyer link missing" : "", !application.family_id ? "Family link missing" : ""].filter(Boolean),
      href: `/staff/applications/${application.id}`,
      actionLabel: "Review Data",
      mode: "review-only",
      related: [],
    });
  }

  for (const application of approvedApplications.filter((row) => !activeReservationByApplicationId.has(row.id)).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `approved-unmatched-${application.id}`,
      title: `${buyerName(buyersById.get(application.buyer_id ?? ""))} approved without reservation`,
      reason: "Approved applicant does not have an active reservation link.",
      priority: "normal",
      category: "Matching",
      blockers: availablePuppies.length === 0 ? ["No available puppies in current read window"] : [],
      href: "/staff/matching",
      actionLabel: "Open Matching",
      mode: "review-only",
      related: [{ label: "Application", href: `/staff/applications/${application.id}` }],
    });
  }

  for (const buyer of buyers.filter((row) => !row.email && !row.phone).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `buyer-contact-${buyer.id}`,
      title: `${buyerName(buyer)} needs contact review`,
      reason: "Buyer/family is missing key contact information.",
      priority: "urgent",
      category: "Applications",
      blockers: ["No email or phone recorded"],
      href: `/staff/buyers/${buyer.id}`,
      actionLabel: "Open Buyer",
      mode: "review-only",
      related: [],
    });
  }

  for (const puppy of availablePuppies.slice(0, 20)) {
    const matchedApplications = approvedApplications.filter((application) => preferenceMatchesPuppy(preferencesByBuyerId.get(application.buyer_id ?? ""), puppy));
    if (matchedApplications.length > 0) {
      pushRule(ruleActions, {
        id: `puppy-match-${puppy.id}`,
        title: `${puppyName(puppy)} has approved applicant match signals`,
        reason: "Puppy is available and approved applicant preferences match recorded puppy facts.",
        priority: "normal",
        category: "Matching",
        blockers: [],
        href: "/staff/matching",
        actionLabel: "Review Match",
        mode: "review-only",
        related: [{ label: "Puppy", href: `/staff/puppies/${puppy.id}` }],
      });
    } else if (!communicationEventExists(events, puppy.id)) {
      pushRule(ruleActions, {
        id: `puppy-no-match-${puppy.id}`,
        title: `${puppyName(puppy)} needs matching review`,
        reason: "Puppy is available and no matching review signal was found in the current event window.",
        priority: "watch",
        category: "Matching",
        blockers: [],
        href: `/staff/puppies/${puppy.id}`,
        actionLabel: "Open Puppy",
        mode: "review-only",
        related: [{ label: "Matching", href: "/staff/matching" }],
      });
    }
  }

  for (const summary of reservations.slice(0, 80)) {
    const linkedDocs = docsForReservation(documents, summary);
    const blockers = [
      (summary.balance_due_cents ?? 0) > 0 ? `Balance due ${formatMoney(summary.balance_due_cents)}` : "",
      !hasDocumentType(linkedDocs, ["deposit"]) ? "Deposit agreement not found" : "",
      !summary.go_home_planned_at ? "Go-home readiness not scheduled" : "",
      normalized(summary.go_home_checklist_status) !== "complete" ? "Go-home checklist incomplete" : "",
      summary.puppy_id && (mediaByPuppyId.get(summary.puppy_id) ?? []).length === 0 ? "Puppy media missing" : "",
    ].filter(Boolean);
    if (blockers.length > 0) {
      pushRule(ruleActions, {
        id: `reservation-${summary.reservation_id}`,
        title: `${summaryPuppyName(summary)} reservation needs readiness review`,
        reason: "Reservation has one or more deterministic blockers from payment, document, go-home, or puppy readiness.",
        priority: blockers.length > 2 ? "urgent" : "high",
        category: "Reservations",
        blockers,
        href: `/staff/reservations/${summary.reservation_id}`,
        actionLabel: "Open Reservation",
        mode: "action-available",
        related: [
          ...(summary.puppy_id ? [{ label: "Puppy", href: `/staff/puppies/${summary.puppy_id}` }] : []),
          ...(summary.buyer_id ? [{ label: "Buyer", href: `/staff/buyers/${summary.buyer_id}` }] : []),
        ],
      });
    }
  }

  for (const summary of reservations.filter((row) => (row.balance_due_cents ?? 0) > 0 || (row.deposit_required_cents ?? 0) > (row.posted_ledger_total_cents ?? 0)).slice(0, 20)) {
    const reservationLedger = ledgerByReservationId.get(summary.reservation_id) ?? [];
    const latestLedger = latestDate(reservationLedger.map((row) => row.occurred_at ?? row.created_at));
    pushRule(ruleActions, {
      id: `payment-${summary.reservation_id}`,
      title: `${display(summary.buyer_name || summary.buyer_email, "Buyer")} payment account needs review`,
      reason: (summary.deposit_required_cents ?? 0) > (summary.posted_ledger_total_cents ?? 0)
        ? "Deposit or half-down appears not fully recorded."
        : "Payment account has a ledger-derived balance issue.",
      priority: "high",
      category: "Payments",
      blockers: [`Balance due ${formatMoney(summary.balance_due_cents)}`, latestLedger && daysSince(latestLedger)! > 45 ? "Payment plan may be stale" : ""].filter(Boolean),
      href: "/staff/payments",
      actionLabel: "Open Payments",
      mode: "action-available",
      related: [{ label: "Reservation", href: `/staff/reservations/${summary.reservation_id}` }],
    });
  }

  for (const doc of documents.filter((row) => isPendingDocument(row) || isStaleDocument(row) || normalized(row.status) === "signed").slice(0, 40)) {
    pushRule(ruleActions, {
      id: `document-${doc.id}`,
      title: display(doc.title || doc.document_type, "Document needs review"),
      reason: isStaleDocument(doc) ? "Document is stale/replaced/expired." : normalized(doc.status) === "signed" ? "Document is signed but may need filed/accepted review." : "Document is pending signature or owner review.",
      priority: isStaleDocument(doc) ? "high" : "normal",
      category: "Documents",
      blockers: [!doc.reservation_id && !doc.buyer_id && !doc.family_id && !doc.puppy_id ? "No related record link" : ""].filter(Boolean),
      href: `/staff/documents/${doc.id}`,
      actionLabel: "Open Document",
      mode: "review-only",
      related: [
        ...(doc.reservation_id ? [{ label: "Reservation", href: `/staff/reservations/${doc.reservation_id}` }] : []),
        ...(doc.puppy_id ? [{ label: "Puppy", href: `/staff/puppies/${doc.puppy_id}` }] : []),
      ],
    });
  }

  for (const dog of dogs.filter((row) => !mediaByDogId.get(row.id)?.some((item) => item.is_primary)).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `dog-photo-${dog.id}`,
      title: `${dogName(dog)} missing primary photo`,
      reason: "Dog media exists without a primary image, or no dog media was found.",
      priority: "watch",
      category: "Media",
      blockers: ["Primary dog photo missing"],
      href: `/staff/dogs/${dog.id}`,
      actionLabel: "Open Dog",
      mode: "review-only",
      related: [{ label: "Media", href: "/staff/media" }],
    });
  }

  for (const puppy of puppies.filter((row) => normalized(row.status) !== "retired").slice(0, 80)) {
    const puppyMedia = mediaByPuppyId.get(puppy.id) ?? [];
    const latestMedia = latestDate(puppyMedia.map((row) => row.uploaded_at));
    const blockers = [
      !puppyMedia.some((row) => row.is_primary) ? "Primary puppy photo missing" : "",
      !latestMedia || (daysSince(latestMedia) ?? 0) > 30 ? "No recent puppy photo signal" : "",
    ].filter(Boolean);
    if (blockers.length > 0) {
      pushRule(ruleActions, {
        id: `puppy-media-${puppy.id}`,
        title: `${puppyName(puppy)} media readiness needs review`,
        reason: blockers.includes("Primary puppy photo missing") ? "Primary puppy photo is missing." : "Puppy has no recent photo signal.",
        priority: "watch",
        category: "Media",
        blockers,
        href: `/staff/puppies/${puppy.id}`,
        actionLabel: "Open Puppy",
        mode: "review-only",
        related: [{ label: "Media", href: "/staff/media" }],
      });
    }
  }

  for (const litter of litters.slice(0, 50)) {
    const litterPuppies = puppiesByLitterId.get(litter.id) ?? [];
    const missingPhotoCount = litterPuppies.filter((puppy) => (mediaByPuppyId.get(puppy.id) ?? []).length === 0).length;
    if (missingPhotoCount > 0 || litter.details_pending || !litter.dam_id || !litter.sire_id) {
      pushRule(ruleActions, {
        id: `litter-${litter.id}`,
        title: `${litterName(litter)} readiness incomplete`,
        reason: "Litter gallery, profile, or linked puppy readiness is incomplete.",
        priority: missingPhotoCount > 2 ? "high" : "watch",
        category: "Kennel / Care",
        blockers: [
          missingPhotoCount > 0 ? `${missingPhotoCount} puppy media record(s) missing` : "",
          litter.details_pending ? "Litter details pending" : "",
          !litter.dam_id ? "Dam missing" : "",
          !litter.sire_id ? "Sire missing" : "",
        ].filter(Boolean),
        href: `/staff/litters/${litter.id}`,
        actionLabel: "Open Litter",
        mode: "review-only",
        related: [{ label: "Media", href: "/staff/media" }],
      });
    }
  }

  for (const notification of notifications.filter((row) => ["queued", "pending", "failed", "missing_recipient", "missing_template", "review_required"].includes(notificationStatus(row))).slice(0, 20)) {
    pushRule(ruleActions, {
      id: `notification-${notification.id}`,
      title: `${formatKey(notification.notification_type)} notification needs review`,
      reason: notificationStatus(notification) === "failed" ? "Notification failed or needs attention." : "Queued notification needs review before any future delivery workflow.",
      priority: ["failed", "missing_recipient", "missing_template"].includes(notificationStatus(notification)) ? "high" : "normal",
      category: "Communications",
      blockers: [formatKey(notificationStatus(notification))],
      href: "/staff/communications",
      actionLabel: "Open Communications",
      mode: "review-only",
      related: [
        ...(notification.buyer_id ? [{ label: "Buyer", href: `/staff/buyers/${notification.buyer_id}` }] : []),
        ...(notification.family_id ? [{ label: "Family", href: `/staff/families/${notification.family_id}` }] : []),
      ],
    });
  }

  for (const attempt of attempts.filter((row) => ["failed", "blocked", "skipped"].includes(normalized(row.status))).slice(0, 12)) {
    pushRule(ruleActions, {
      id: `attempt-${attempt.id}`,
      title: "Notification attempt needs attention",
      reason: "Notification delivery attempt is failed, blocked, or skipped.",
      priority: "high",
      category: "Communications",
      blockers: [formatKey(attempt.status)],
      href: "/staff/communications#attention",
      actionLabel: "Review Attempt",
      mode: "review-only",
      related: [],
    });
  }

  for (const application of applications.filter((row) => !communicationEventExists(events, row.id)).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `app-follow-${application.id}`,
      title: "Application needs follow-up review",
      reason: "Application has no communication/follow-up signal in the current event window.",
      priority: "normal",
      category: "Communications",
      blockers: [],
      href: `/staff/applications/${application.id}`,
      actionLabel: "Open Application",
      mode: "review-only",
      related: [{ label: "Communications", href: "/staff/communications" }],
    });
  }

  for (const summary of reservations.filter((row) => row.go_home_planned_at && normalized(row.go_home_checklist_status) !== "complete").slice(0, 20)) {
    pushRule(ruleActions, {
      id: `go-home-${summary.reservation_id}`,
      title: `${summaryPuppyName(summary)} go-home needs final review`,
      reason: "Go-home scheduled but checklist is incomplete.",
      priority: "urgent",
      category: "Go-Home",
      blockers: [
        normalized(summary.go_home_checklist_status) !== "complete" ? "Checklist incomplete" : "",
        (summary.balance_due_cents ?? 0) > 0 ? "Blocked by payment" : "",
        !hasDocumentType(docsForReservation(documents, summary), ["health"]) ? "Blocked by document readiness" : "",
      ].filter(Boolean),
      href: "/staff/go-home/handoff",
      actionLabel: "Open Handoff",
      mode: "action-available",
      related: [{ label: "Reservation", href: `/staff/reservations/${summary.reservation_id}` }],
    });
  }

  for (const puppy of puppies.filter((row) => ["watch", "needs_review", "attention", "sick", "medical"].some((word) => normalizedText(row.health_status).includes(word))).slice(0, 12)) {
    pushRule(ruleActions, {
      id: `puppy-care-${puppy.id}`,
      title: `${puppyName(puppy)} health/care status needs review`,
      reason: "Puppy health/care status contains an owner attention marker.",
      priority: "urgent",
      category: "Kennel / Care",
      blockers: [formatKey(puppy.health_status)],
      href: `/staff/puppies/${puppy.id}`,
      actionLabel: "Open Puppy",
      mode: "action-available",
      related: [],
    });
  }

  for (const puppy of puppies.filter((row) => !row.litter_id || !row.sex || !row.color || !row.coat_type).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `puppy-profile-${puppy.id}`,
      title: `${puppyName(puppy)} profile missing key info`,
      reason: "Puppy profile is missing litter, sex, color, or coat facts needed for readiness/matching.",
      priority: "watch",
      category: "Kennel / Care",
      blockers: [!puppy.litter_id ? "Litter missing" : "", !puppy.sex ? "Sex missing" : "", !puppy.color ? "Color missing" : "", !puppy.coat_type ? "Coat missing" : ""].filter(Boolean),
      href: `/staff/puppies/${puppy.id}`,
      actionLabel: "Open Puppy",
      mode: "review-only",
      related: [],
    });
  }

  for (const dog of dogs.filter((row) => !row.sex || !row.status || (!row.call_name && !row.registered_name)).slice(0, 15)) {
    pushRule(ruleActions, {
      id: `dog-profile-${dog.id}`,
      title: `${dogName(dog)} profile missing key info`,
      reason: "Dog profile is missing name, sex, or status facts needed for kennel readiness.",
      priority: "watch",
      category: "Kennel / Care",
      blockers: [!dog.sex ? "Sex missing" : "", !dog.status ? "Status missing" : "", !dog.call_name && !dog.registered_name ? "Name missing" : ""].filter(Boolean),
      href: `/staff/dogs/${dog.id}`,
      actionLabel: "Open Dog",
      mode: "review-only",
      related: [],
    });
  }

  for (const puppy of puppies.filter((row) => {
    const latestWeight = latestDate((weightsByPuppyId.get(row.id) ?? []).map((weight) => weight.measured_at));
    return row.birth_at && (daysSince(row.birth_at) ?? 999) <= 14 && (!latestWeight || (daysSince(latestWeight) ?? 0) > 1);
  }).slice(0, 12)) {
    pushRule(ruleActions, {
      id: `puppy-weight-${puppy.id}`,
      title: `${puppyName(puppy)} recent weight review needed`,
      reason: "Recent puppy appears to be missing a current weight observation.",
      priority: "high",
      category: "Kennel / Care",
      blockers: ["Recent weight signal missing"],
      href: `/staff/puppies/${puppy.id}`,
      actionLabel: "Open Puppy",
      mode: "action-available",
      related: [],
    });
  }

  const sortedRuleActions = sortRules(ruleActions);
  const categoryRows = (category: RuleCategory) => sortedRuleActions.filter((row) => row.category === category);
  const urgentRows = sortedRuleActions.filter((row) => row.priority === "urgent" || row.blockers.length >= 3);
  const needsReviewCount = countByStatus(proposedActions, "needs_review");
  const approvedCount = countByStatus(proposedActions, "approved");
  const rejectedCount = countByStatus(proposedActions, "rejected");
  const highOrBlockedCount = proposedActions.filter((row) =>
    ["high", "blocked"].includes(normalized(row.risk_level)),
  ).length;
  const statusMessage = StatusMessage(params);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Intelligence"
          title="Readiness Rules / Proposed Actions"
          summary="Deterministic owner/operator awareness from existing Core records. Rule rows explain why they appear, what is blocked, and which workspace to open next. This is not AI and does not execute business decisions."
          status={`${sortedRuleActions.length} rule signal(s)`}
          blockers={urgentRows.length}
          nextAction={urgentRows[0]?.title ?? sortedRuleActions[0]?.title ?? "Review Core readiness rules"}
          links={[
            { href: "/staff/actions", label: "Actions" },
            { href: "/staff/command", label: "Command" },
            { href: "/staff/matching", label: "Matching" },
            { href: "/staff/communications", label: "Communications" },
            { href: "/staff/documents", label: "Documents" },
            { href: "/staff/media", label: "Media" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 shadow-sm">
          <p className="font-bold">Safety boundary</p>
          <p className="mt-1">
            This page only reviews rule-derived readiness signals and persisted
            proposed action records. Approved proposed actions do not execute
            business changes yet. No AI provider, write tool, payment movement,
            message sending, document generation, public publishing, or external
            system call is connected here.
          </p>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {warnings.join(" ")}
          </section>
        ) : null}

        {statusMessage ? (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold leading-6 text-blue-950 shadow-sm">
            {statusMessage}
          </section>
        ) : null}

        <ActionPanel
          nextAction={urgentRows[0]?.title ?? (needsReviewCount > 0 ? "Review proposed action records" : "Review central action queue")}
          blockers={urgentRows.length + highOrBlockedCount}
          mode="review-only"
          href="/staff/actions#proposed"
          detail="Core intelligence rows are review prompts. Persisted proposed actions remain review records only; approval updates proposal state and does not execute business changes."
        />

        <ProposedActionPanel
          nextAction={urgentRows[0]?.title ?? sortedRuleActions[0]?.title ?? "Review rule-based readiness signals"}
          blockers={urgentRows.length}
          priority={urgentRows.length > 0 ? "urgent" : sortedRuleActions.length > 0 ? "normal" : "watch"}
          detail="Rule-based intelligence uses existing Core data only and does not create records or execute decisions."
        />

        <BreedingCarePanel
          title="Breeding / Care Rule Signals"
          dogSignals={categoryRows("Kennel / Care").length}
          litterSignals={categoryRows("Media").length}
          puppyCareSignals={categoryRows("Kennel / Care").length}
          taskSignals={urgentRows.length}
          href="/staff/breeding"
          detail="Proposed-action integration stays deterministic and review-only; kennel/care rows link back to the breeding center."
        />

        <EmailReadinessPanel
          templateStatus={categoryRows("Communications").length > 0 ? "review_required" : "available"}
          notificationStatus={categoryRows("Communications").length > 0 ? "needs_review" : "not_recorded"}
          href="/staff/email"
          detail="Email proposed-action integration is review-only; no proposed action approval sends messages or activates templates."
        />

        <SummaryStrip
          items={[
            { label: "Rule signals", value: sortedRuleActions.length, note: `${urgentRows.length} urgent/high-blocker` },
            { label: "Applications", value: categoryRows("Applications").length, note: "buyer/family readiness" },
            { label: "Reservations", value: categoryRows("Reservations").length, note: "payment/document/go-home blockers" },
            { label: "Communications", value: categoryRows("Communications").length, note: "follow-up and queue review" },
            { label: "Persisted proposals", value: proposedActions.length, note: `${needsReviewCount} need review` },
          ]}
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview", count: sortedRuleActions.length },
            { href: "#urgent", label: "Urgent", count: urgentRows.length },
            { href: "#applications", label: "Applications", count: categoryRows("Applications").length },
            { href: "#matching", label: "Matching", count: categoryRows("Matching").length },
            { href: "#reservations", label: "Reservations", count: categoryRows("Reservations").length },
            { href: "#payments", label: "Payments", count: categoryRows("Payments").length },
            { href: "#documents", label: "Documents", count: categoryRows("Documents").length },
            { href: "#media", label: "Media", count: categoryRows("Media").length },
            { href: "#communications", label: "Communications", count: categoryRows("Communications").length },
            { href: "#go-home", label: "Go-Home", count: categoryRows("Go-Home").length },
            { href: "#kennel", label: "Kennel / Care", count: categoryRows("Kennel / Care").length },
            { href: "#resolved", label: "Resolved / Recent", count: proposedActions.length },
          ]}
        />

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total proposed" value={proposedActions.length} note="Recent proposal records loaded read-only" />
          <MetricCard label="Needs review" value={needsReviewCount} note="Waiting for owner/admin review" />
          <MetricCard label="Approved" value={approvedCount} note="Approved state only, not executed" />
          <MetricCard label="Rejected" value={rejectedCount} note="Rejected proposal records" />
          <MetricCard label="High/blocked" value={highOrBlockedCount} note="Higher-risk proposals need stricter review" />
        </section>

        <RuleLane id="urgent" title="Urgent" rows={urgentRows} empty="No urgent rule-based readiness rows were found." />
        <RuleLane id="applications" title="Applications" rows={categoryRows("Applications")} empty="No application/buyer/family readiness signals found." />
        <RuleLane id="matching" title="Matching" rows={categoryRows("Matching")} empty="No matching or assignment review signals found." />
        <RuleLane id="reservations" title="Reservations" rows={categoryRows("Reservations")} empty="No reservation blocker signals found." />
        <RuleLane id="payments" title="Payments" rows={categoryRows("Payments")} empty="No payment readiness signals found." />
        <RuleLane id="documents" title="Documents" rows={categoryRows("Documents")} empty="No document readiness signals found." />
        <RuleLane id="media" title="Media" rows={categoryRows("Media")} empty="No media readiness signals found." />
        <RuleLane id="communications" title="Communications" rows={categoryRows("Communications")} empty="No communication or notification readiness signals found." />
        <RuleLane id="go-home" title="Go-Home" rows={categoryRows("Go-Home")} empty="No go-home or handoff readiness signals found." />
        <RuleLane id="kennel" title="Kennel / Care" rows={categoryRows("Kennel / Care")} empty="No kennel or care readiness signals found." />

        <section id="resolved" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

