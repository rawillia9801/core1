import Link from "next/link";
import type { ReactNode } from "react";
import { deleteKennelMediaFile, uploadKennelMediaFile } from "@/app/staff/kennel-media-actions";
import {
  createPuppyReservationAssignment,
  recordPuppyCareObservationFromDetail,
  recordPuppyWeightFromDetail,
  updatePuppyWeightLog,
} from "./actions";
import { type KennelMediaRow, withKennelMediaSignedUrls } from "@/lib/kennel-media";
import { requireStaffProfile } from "@/lib/staff-auth";
import { ActionPanel } from "../../action-panel";
import { CommunicationPanel } from "../../communication-panel";
import { ProposedActionPanel } from "../../proposed-action-panel";
import { PortalStatusPanel } from "../../portal-status-panel";

export const dynamic = "force-dynamic";

type PuppyRow = {
  id: string;
  external_reference: string | null;
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
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type LitterRow = {
  id: string;
  external_reference: string | null;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  expected_birth_at: string | null;
  birth_at: string | null;
  total_puppies: number | null;
  female_count: number | null;
  male_count: number | null;
  status: string | null;
  details_pending: boolean | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type DogRow = {
  id: string;
  external_reference: string | null;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type WeightLogRow = {
  id: string;
  puppy_id: string | null;
  measured_at: string | null;
  weight_grams: number | null;
  notes: string | null;
  recorded_by_profile_id: string | null;
  metadata: Record<string, unknown> | null;
};

type PuppyEventRow = {
  id: string;
  puppy_id: string | null;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
  recorded_by_profile_id: string | null;
  created_at: string | null;
};

type LitterPuppySummaryRow = {
  id: string;
  sex: string | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
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

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  contract_total_cents: number | null;
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
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

type ApplicationRow = {
  id: string;
  status: string | null;
  buyer_id: string | null;
  family_id: string | null;
  submitted_at: string | null;
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

const ATTENTION_TERMS = ["weak", "watch", "fading", "not nursing", "cold", "losing", "loss", "risk", "concern"];

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey };
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as T[], warning: "Core read configuration is not available for server-side operational reads." };
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
  return value ? value.slice(0, 8) : "-";
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function buyerName(buyer: BuyerRow | null | undefined) {
  if (!buyer) return "Buyer not found";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${shortId(buyer.id)}`;
}

function familyLabel(family: FamilyRow | null | undefined) {
  if (!family) return "Family not found";
  return family.name || `Family ${shortId(family.id)}`;
}

function daysSince(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function formatAge(value: string | null) {
  const days = daysSince(value);
  if (days === null) return "Not recorded";
  if (days < 0) return "Expected";
  if (days === 0) return "Born today";
  if (days === 1) return "1 day old";
  if (days < 28) return `${days} days old`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} old`;
}

function isSameLocalDay(value: string | null, comparison = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === comparison.getFullYear() && date.getMonth() === comparison.getMonth() && date.getDate() === comparison.getDate();
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.external_reference || `Puppy ${shortId(puppy.id)}`;
}

function litterName(litter: LitterRow | null | undefined) {
  if (!litter) return "Not linked";
  return display(litter.litter_name, `Litter ${shortId(litter.id)}`);
}

function dogName(dog: DogRow | null | undefined) {
  if (!dog) return "Not linked";
  return dog.call_name || dog.registered_name || dog.external_reference || `Dog ${shortId(dog.id)}`;
}

function statusTone(status: string | null) {
  const normalized = normalizeText(status);
  if (["available", "ready", "active", "newborn", "neonatal"].includes(normalized)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["reserved", "hold", "pending", "planned", "expected"].includes(normalized)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (["sold", "completed", "placed", "kept"].includes(normalized)) return "bg-violet-50 text-violet-700 ring-violet-100";
  if (["deceased", "watch", "at risk", "at_risk"].includes(normalized)) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function outcomeTone(outcome: string | null) {
  const normalized = normalizeText(outcome);
  if (normalized === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["blocked", "unauthorized", "rejected"].includes(normalized)) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (["error", "failed"].includes(normalized)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function weightLabel(weight: WeightLogRow | null | undefined) {
  if (!weight || typeof weight.weight_grams !== "number") return "Not recorded";
  return `${weight.weight_grams} g`;
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sortWeightsAscending(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => new Date(a.measured_at ?? 0).getTime() - new Date(b.measured_at ?? 0).getTime());
}

function latestWeight(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => new Date(b.measured_at ?? 0).getTime() - new Date(a.measured_at ?? 0).getTime())[0] ?? null;
}

function birthWeightForPuppy(puppy: PuppyRow, litter: LitterRow | null | undefined, weights: WeightLogRow[]) {
  const birthAt = puppy.birth_at ?? litter?.birth_at ?? null;
  const sorted = sortWeightsAscending(weights);
  if (!birthAt) return sorted[0] ?? null;
  return sorted.find((weight) => isSameLocalDay(weight.measured_at, new Date(birthAt))) ?? sorted[0] ?? null;
}

function hasAttentionText(...values: Array<string | null | undefined>) {
  const text = normalizeText(values.filter(Boolean).join(" "));
  return ATTENTION_TERMS.some((term) => text.includes(term));
}

function metadataText(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return null;
}

function registryValue(metadata: Record<string, unknown> | null | undefined) {
  return metadataText(metadata, ["registry", "registration"]);
}

function registrationNumberValue(metadata: Record<string, unknown> | null | undefined) {
  return metadataText(metadata, ["registration_number", "registry_number", "akc_registration", "akc_number"]);
}

function centsFromMetadata(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  }

  return null;
}

function formatMoney(cents: number | null) {
  if (cents === null) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function countBySex(puppies: LitterPuppySummaryRow[], sex: "female" | "male") {
  return puppies.filter((puppy) => normalizeText(puppy.sex) === sex).length;
}

function safeDetails(details: Record<string, unknown> | null | undefined) {
  if (!details || Object.keys(details).length === 0) return "No detail keys recorded";
  const safePairs = Object.entries(details)
    .filter(([key]) => {
      const lowered = key.toLowerCase();
      return !lowered.includes("secret") && !lowered.includes("token") && !lowered.includes("key") && !lowered.includes("password");
    })
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return safePairs.length > 0 ? safePairs.join(" / ") : "Details present, hidden from preview";
}

function isCompleteDocumentStatus(status: string | null | undefined) {
  return ["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(
    normalizeText(status),
  );
}

function watchSignalsForPuppy(puppy: PuppyRow, litter: LitterRow | null | undefined, weights: WeightLogRow[], events: PuppyEventRow[]) {
  const signals: string[] = [];
  const latest = latestWeight(weights);
  const birth = birthWeightForPuppy(puppy, litter, weights);
  const age = daysSince(puppy.birth_at ?? litter?.birth_at ?? null);
  const status = normalizeText(puppy.status);

  if (!puppy.litter_id) signals.push("Puppy is not linked to a litter.");
  if (!puppy.birth_at && !litter?.birth_at) signals.push("Birth date is not recorded.");
  if (!puppy.sex || !puppy.color || !puppy.status) signals.push("Identity or status details are incomplete.");
  if (!birth) signals.push("No birth weight recorded.");
  if (age !== null && age >= 0 && age <= 7 && !weights.some((weight) => isSameLocalDay(weight.measured_at))) signals.push("No weight recorded today.");
  if (["unavailable", "deceased", "watch", "at risk", "at_risk"].includes(status)) signals.push(`Puppy status is ${display(puppy.status, "unknown")}.`);
  if (hasAttentionText(puppy.health_status, puppy.notes)) signals.push("Health marker or notes contain watch terms.");
  if (events.some((event) => hasAttentionText(event.event_type, event.summary, JSON.stringify(event.details ?? {})))) signals.push("Care history contains watch terms.");
  if (latest?.weight_grams !== null && latest?.weight_grams !== undefined && latest.weight_grams <= 0) signals.push("Latest weight value needs owner review.");

  return signals;
}

function uniqueEvents(events: EventRow[]) {
  const byId = new Map<string, EventRow>();
  for (const event of events) {
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => new Date(b.event_at ?? 0).getTime() - new Date(a.event_at ?? 0).getTime());
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function StatCard({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-700">{value}</dd>
    </div>
  );
}

function PuppyActionResult({ outcome }: { outcome?: string }) {
  if (outcome === "updated") return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">Puppy record updated in Core. No public listing, payment, document, message, portal, or external provider action was triggered.</section>;
  if (outcome === "unauthorized") return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Only owner/admin can change puppy records.</section>;
  if (outcome === "invalid_input") return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Check puppy form values, allowed status/sex/listing options, dates, money amounts, and field lengths.</section>;
  if (outcome === "missing_identifier") return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Enter at least one puppy identifier: name, collar color, or external reference.</section>;
  if (outcome === "config_missing") return <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">Core server action configuration is incomplete for puppy actions.</section>;
  if (outcome === "rpc_missing_or_failed") return <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">Puppy RPC failed or is not available. Check the deployed Core action before retrying.</section>;
  if (outcome === "save_failed" || outcome === "error") return <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">Puppy action failed. Review the server action log for safe details.</section>;
  return null;
}

export default async function StaffPuppyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ puppyId: string }>;
  searchParams: Promise<{ puppy?: string }>;
}) {
  const staff = await requireStaffProfile();
  const { puppyId } = await params;
  const { puppy: puppyOutcome } = await searchParams;
  const canViewAudit = staff.role === "owner" || staff.role === "admin";

  const puppyResult = await readRows<PuppyRow>("core_puppies", {
    select: "id,external_reference,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,notes,metadata,created_at,updated_at",
    id: `eq.${puppyId}`,
    limit: "1",
  });
  const puppy = puppyResult.rows[0] ?? null;

  if (!puppy) {
    return (
      <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Puppy not found</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">No current Core puppy row matched {shortId(puppyId)}.</p>
            <Link href="/staff/puppies" className="mt-5 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Puppies</Link>
          </section>
          {puppyResult.warning ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{puppyResult.warning}</section> : null}
        </div>
      </main>
    );
  }

  const [litterResult, litterPuppyResult, weightResult, puppyEventResult, mediaResult, directEventResult, relatedEventResult, reservationResult, buyerResult, familyResult, applicationResult, documentResult, auditResult] = await Promise.all([
    puppy.litter_id
      ? readRows<LitterRow>("core_litters", {
          select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes,metadata,created_at,updated_at",
          id: `eq.${puppy.litter_id}`,
          limit: "1",
        })
      : Promise.resolve({ rows: [] as LitterRow[], warning: null }),
    puppy.litter_id
      ? readRows<LitterPuppySummaryRow>("core_puppies", {
          select: "id,sex",
          litter_id: `eq.${puppy.litter_id}`,
          limit: "200",
        })
      : Promise.resolve({ rows: [{ id: puppy.id, sex: puppy.sex }] as LitterPuppySummaryRow[], warning: null }),
    readRows<WeightLogRow>("core_weight_logs", {
      select: "id,puppy_id,measured_at,weight_grams,notes,recorded_by_profile_id,metadata",
      puppy_id: `eq.${puppy.id}`,
      order: "measured_at.desc",
      limit: "200",
    }),
    readRows<PuppyEventRow>("core_puppy_events", {
      select: "id,puppy_id,event_type,event_at,summary,details,recorded_by_profile_id,created_at",
      puppy_id: `eq.${puppy.id}`,
      order: "event_at.desc",
      limit: "100",
    }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,title,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,is_primary,visibility,notes,uploaded_at,uploaded_by_profile_id",
      entity_type: "eq.puppy",
      puppy_id: `eq.${puppy.id}`,
      order: "is_primary.desc,uploaded_at.desc",
      limit: "50",
    }),
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,puppy_id,reservation_id,related_table,related_id,source,details,created_by_profile_id,created_at",
      puppy_id: `eq.${puppy.id}`,
      order: "event_at.desc",
      limit: "100",
    }),
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,puppy_id,reservation_id,related_table,related_id,source,details,created_by_profile_id,created_at",
      related_table: "eq.core_puppies",
      related_id: `eq.${puppy.id}`,
      order: "event_at.desc",
      limit: "100",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select: "reservation_id,reservation_status,buyer_id,buyer_name,family_id,family_name,puppy_id,contract_total_cents,balance_due_cents,go_home_planned_at,go_home_status",
      puppy_id: `eq.${puppy.id}`,
      order: "reserved_at.desc.nullslast",
      limit: "20",
    }),
    readRows<BuyerRow>("core_buyers", {
      select: "id,first_name,last_name,preferred_name,email,phone,approval_status",
      order: "updated_at.desc",
      limit: "500",
    }),
    readRows<FamilyRow>("core_families", {
      select: "id,name,status",
      order: "updated_at.desc",
      limit: "500",
    }),
    readRows<ApplicationRow>("core_applications", {
      select: "id,status,buyer_id,family_id,submitted_at",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<DocumentRow>("core_documents", {
      select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at",
      puppy_id: `eq.${puppy.id}`,
      order: "updated_at.desc",
      limit: "50",
    }),
    canViewAudit
      ? readRows<AuditRow>("core_audit_log", {
          select: "id,actor_type,actor_profile_id,actor_identifier,source,action,entity_table,entity_id,request_context,outcome,error_message,created_at",
          entity_table: "eq.core_puppies",
          entity_id: `eq.${puppy.id}`,
          order: "created_at.desc",
          limit: "100",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const litter = litterResult.rows[0] ?? null;
  const dogIds = [litter?.dam_id, litter?.sire_id].filter((id): id is string => Boolean(id));
  const dogResult = dogIds.length > 0
    ? await readRows<DogRow>("core_dogs", {
        select: "id,external_reference,registered_name,call_name,sex,color,coat_type,birth_at,status,notes,metadata",
        id: `in.(${dogIds.join(",")})`,
        limit: "2",
      })
    : { rows: [] as DogRow[], warning: null };

  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));
  const dam = litter?.dam_id ? dogsById.get(litter.dam_id) : null;
  const sire = litter?.sire_id ? dogsById.get(litter.sire_id) : null;
  const weights = weightResult.rows;
  const careEvents = puppyEventResult.rows;
  const litterPuppies = litterPuppyResult.rows.length > 0 ? litterPuppyResult.rows : [{ id: puppy.id, sex: puppy.sex }];
  const derivedFemaleCount = countBySex(litterPuppies, "female");
  const derivedMaleCount = countBySex(litterPuppies, "male");
  const femaleMaleCountLabel = litter ? `${litter.female_count ?? derivedFemaleCount} / ${litter.male_count ?? derivedMaleCount}` : "Not linked";
  const reservations = reservationResult.rows;
  const activeReservation = reservations.find((reservation) => !["cancelled", "void", "released"].includes((reservation.reservation_status ?? "").toLowerCase())) ?? null;
  const buyers = buyerResult.rows;
  const families = familyResult.rows;
  const applications = applicationResult.rows;
  const mediaPreviews = await withKennelMediaSignedUrls(mediaResult.rows);
  const completeDocumentCount = documentResult.rows.filter((document) =>
    isCompleteDocumentStatus(document.status),
  ).length;
  const mediaWarning = mediaResult.warning ? "Private photo storage is not available from the current Core schema yet." : null;
  const primaryPuppyPhoto = mediaPreviews.find((media) => media.is_primary) ?? null;
  const latestPuppyPhotoAt = mediaPreviews.map((media) => media.uploaded_at).filter(Boolean).sort().at(-1) ?? null;
  const latestPuppyPhotoAge = daysSince(latestPuppyPhotoAt);
  const mediaBlockers = [
    mediaPreviews.length === 0 ? "No media record found for this puppy." : null,
    !primaryPuppyPhoto ? "Primary image not recorded." : null,
    latestPuppyPhotoAt === null || (latestPuppyPhotoAge !== null && latestPuppyPhotoAge > 30) ? "Recent photo refresh needed." : null,
    activeReservation && mediaPreviews.length === 0 ? "Assigned puppy has no internal photo for go-home review." : null,
  ].filter(Boolean);
  const operationalEvents = uniqueEvents([...directEventResult.rows, ...relatedEventResult.rows]);
  const latest = latestWeight(weights);
  const birth = birthWeightForPuppy(puppy, litter, weights);
  const watchSignals = watchSignalsForPuppy(puppy, litter, weights, careEvents);
  const ageSource = puppy.birth_at ?? litter?.birth_at ?? null;
  const priceCents = centsFromMetadata(puppy.metadata, ["price_cents", "asking_price_cents", "sale_price_cents"]);
  const depositAmountCents = centsFromMetadata(puppy.metadata, ["deposit_amount_cents", "deposit_cents", "deposit_required_cents"]);
  const internalCostCents = centsFromMetadata(puppy.metadata, ["internal_cost_cents", "cost_cents", "expense_basis_cents"]);
  const warnings = [puppyResult.warning, litterResult.warning, litterPuppyResult.warning, weightResult.warning, puppyEventResult.warning, mediaWarning, directEventResult.warning, relatedEventResult.warning, reservationResult.warning, buyerResult.warning, familyResult.warning, applicationResult.warning, documentResult.warning, auditResult.warning, dogResult.warning].filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Puppies</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Individual Puppy Detail / Neonatal Growth Timeline</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Internal owner/operator review for one puppy using existing Core puppy, litter, weight, care, event, and audit rows only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Media Center</Link>
              <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Puppies</Link>
              <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Edit Puppy</Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Observation boundary</p>
          <p className="mt-2 text-sm leading-6">
            This timeline is internal owner/operator observation review only. It does not diagnose puppies, message customers, publish puppies, update a portal, connect smart-home/cameras/devices, call external providers, create documents, or process payments.
          </p>
        </section>

        <PuppyActionResult outcome={puppyOutcome} />

        {warnings.length > 0 ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{warnings[0]}</section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Puppy" value={puppyName(puppy)} note={`Core ID ${shortId(puppy.id)}`} />
          <StatCard label="Age" value={formatAge(ageSource)} note={`Birth date ${formatDate(ageSource)}`} />
          <StatCard label="Latest weight" value={weightLabel(latest)} note={latest ? formatDateTime(latest.measured_at) : "No weight logs"} />
          <StatCard label="Watch flags" value={watchSignals.length} note="Deterministic owner attention flags" />
          <StatCard label="Photos" value={mediaPreviews.length} note="Private kennel-media only" />
          <StatCard label="Documents" value={`${completeDocumentCount} / ${documentResult.rows.length}`} note="Puppy-linked metadata" />
        </section>

        <ActionPanel
          nextAction={activeReservation ? "Review active reservation and handoff readiness" : "Review matching and reservation assignment"}
          blockers={watchSignals.length}
          mode={activeReservation ? "review-only" : "available"}
          href="/staff/actions#matching"
          detail="Puppy actions use existing reservation assignment, media, care, and detail workflows only."
        />

        <CommunicationPanel
          latestStatus={activeReservation ? "Active reservation context available for follow-up review" : "No active reservation communication context"}
          nextFollowUp={activeReservation ? "Review reservation, documents, balance, and go-home status before puppy-specific outreach." : "Review matching candidates before any customer follow-up."}
          blockers={watchSignals.length}
          mode={watchSignals.length > 0 ? "attention" : "review"}
          detail="No puppy update, portal message, media publish, email, or SMS is sent from this panel."
        />

        <ProposedActionPanel
          nextAction={watchSignals.length > 0 ? "Puppy health/care status needs review" : activeReservation ? "Review puppy reservation readiness" : "Review puppy matching/media intelligence"}
          blockers={watchSignals.length}
          priority={watchSignals.length > 0 ? "urgent" : "watch"}
          detail="Puppy intelligence can point to care, media, matching, reservation, document, and go-home review only."
        />

        <PortalStatusPanel
          accountStatus="not_invited"
          puppyAssigned={Boolean(activeReservation)}
          documentReadyCount={completeDocumentCount}
          documentTotalCount={documentResult.rows.length}
          goHomeReady={activeReservation ? ["scheduled", "ready", "complete", "completed"].includes((activeReservation.go_home_status ?? "").toLowerCase()) : false}
          detail="Puppy portal visibility remains gated by a linked buyer portal account and customer-safe reservation context."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Matching Readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Puppy-level matching signal from availability, active reservation context, media, documents, and litter identity.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={statusTone(puppy.status)}>{formatKey(puppy.status)}</Badge>
                <Badge>{activeReservation ? "Already reserved" : "No active reservation"}</Badge>
                <Badge>{mediaPreviews.length ? `${mediaPreviews.length} photo(s)` : "No media record found"}</Badge>
                <Badge>{documentResult.rows.length ? `${completeDocumentCount} of ${documentResult.rows.length} docs` : "No document record found"}</Badge>
                <Badge>{watchSignals.length} blocker(s)</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/matching" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Matching</Link>
              {activeReservation ? <Link href={`/staff/reservations/${activeReservation.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Reservation</Link> : null}
              {puppy.litter_id ? <Link href={`/staff/litters/${puppy.litter_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Litter</Link> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Puppy Identity</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Current values stored on `core_puppies`; registry appears only if present in metadata.</p>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-950">{puppyName(puppy)}</p>
                <p className="mt-1 text-sm text-slate-500">External reference {display(puppy.external_reference, "Not recorded")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(puppy.status)}>{display(puppy.status, "Unknown")}</Badge>
                <Badge>{display(puppy.public_listing_status, "Private")}</Badge>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Sex" value={display(puppy.sex)} />
              <InfoItem label="Color" value={display(puppy.color)} />
              <InfoItem label="Coat" value={display(puppy.coat_type)} />
              <InfoItem label="Collar" value={display(puppy.collar_color)} />
              <InfoItem label="Health marker" value={display(puppy.health_status)} />
              <InfoItem label="Registry" value={display(registryValue(puppy.metadata), "Not recorded")} />
              <InfoItem label="Registry number" value={display(registrationNumberValue(puppy.metadata), "Not recorded")} />
              <InfoItem label="Price amount" value={formatMoney(priceCents)} />
              <InfoItem label="Deposit amount" value={formatMoney(depositAmountCents)} />
              <InfoItem label="Internal cost amount" value={formatMoney(internalCostCents)} />
              <InfoItem label="Created" value={formatDateTime(puppy.created_at)} />
              <InfoItem label="Updated" value={formatDateTime(puppy.updated_at)} />
              <InfoItem label="Litter ID" value={shortId(puppy.litter_id)} />
            </dl>
            {puppy.notes ? <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{puppy.notes}</p> : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Litter And Parents</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Context from linked litter, dam, and sire records when available.</p>
            </div>
            {litter ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{litterName(litter)}</p>
                      <p className="mt-1 text-sm text-slate-500">ID {shortId(litter.id)}</p>
                    </div>
                    <Badge tone={statusTone(litter.status)}>{display(litter.status, "Unknown")}</Badge>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <InfoItem label="Expected birth" value={formatDate(litter.expected_birth_at)} />
                    <InfoItem label="Birth date" value={formatDate(litter.birth_at)} />
                    <InfoItem label="Puppy count" value={litter.total_puppies ?? "Not recorded"} />
                    <InfoItem label="Female / Male" value={femaleMaleCountLabel} />
                  </dl>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[{ label: "Dam", dog: dam }, { label: "Sire", dog: sire }].map(({ label, dog }) => (
                    <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                      <p className="mt-2 font-bold text-slate-950">{dogName(dog)}</p>
                      <dl className="mt-3 grid gap-2 text-sm">
                        <InfoItem label="Status" value={display(dog?.status)} />
                        <InfoItem label="Color / coat" value={`${display(dog?.color)} / ${display(dog?.coat_type)}`} />
                        <InfoItem label="Registry" value={display(registryValue(dog?.metadata), "Not recorded")} />
                      </dl>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="This puppy is not linked to a litter row yet." />
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Document / Contract Readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Puppy-linked document metadata only. Reservation, buyer, and family documents are reviewed from their own source records or the Document Command Center.
              </p>
            </div>
            <Link href="/staff/documents#puppy-docs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Document Center
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {documentResult.rows.length > 0 ? (
              documentResult.rows.slice(0, 6).map((document) => (
                <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{document.title || formatKey(document.document_type)}</p>
                      <p className="mt-1 text-slate-500">Updated {formatDateTime(document.updated_at)}</p>
                    </div>
                    <Badge tone={statusTone(document.status)}>{formatKey(document.status)}</Badge>
                  </div>
                  <Link href={`/staff/documents/${document.id}`} className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">
                    Open document detail
                  </Link>
                </article>
              ))
            ) : (
              <EmptyState text="No puppy-linked document record found. Review reservation, buyer, and family records if this puppy has a document packet through another relationship." />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Buyer / Reservation Assignment</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Buyer-to-puppy assignment follows the Core reservation model. This section does not process payments, send messages, generate documents, publish puppies, or invite portal users.</p>
            </div>
            <Badge>{activeReservation ? "Assigned" : "No buyer assigned"}</Badge>
          </div>

          {activeReservation ? (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-950">
              <p className="font-bold">Current active reservation</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoItem label="Buyer" value={activeReservation.buyer_id ? <Link href={`/staff/buyers/${activeReservation.buyer_id}`} className="font-semibold text-blue-700">{display(activeReservation.buyer_name)}</Link> : "Not linked"} />
                <InfoItem label="Family" value={activeReservation.family_id ? <Link href={`/staff/families/${activeReservation.family_id}`} className="font-semibold text-blue-700">{display(activeReservation.family_name)}</Link> : "Not linked"} />
                <InfoItem label="Reservation" value={<Link href={`/staff/reservations/${activeReservation.reservation_id}`} className="font-semibold text-blue-700">{shortId(activeReservation.reservation_id)}</Link>} />
                <InfoItem label="Status" value={formatKey(activeReservation.reservation_status)} />
                <InfoItem label="Contract" value={typeof activeReservation.contract_total_cents === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(activeReservation.contract_total_cents / 100) : "Not recorded"} />
                <InfoItem label="Balance" value={typeof activeReservation.balance_due_cents === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(activeReservation.balance_due_cents / 100) : "Not recorded"} />
                <InfoItem label="Go-home" value={`${formatKey(activeReservation.go_home_status)} / ${formatDateTime(activeReservation.go_home_planned_at)}`} />
              </dl>
              <p className="mt-4 rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs font-semibold leading-5 text-emerald-900">Manual assignment is blocked while an active reservation exists. Use an approved cancellation/reassignment workflow before creating a different active reservation.</p>
            </div>
          ) : canViewAudit ? (
            <form action={createPuppyReservationAssignment} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <input type="hidden" name="puppyId" value={puppy.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">Existing buyer<select name="buyerId" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Select buyer</option>{buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyerName(buyer)} / {buyer.email ?? buyer.phone ?? "no contact"}</option>)}</select></label>
                <label className="text-sm font-medium">Existing family<select name="familyId" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Select family</option>{families.map((family) => <option key={family.id} value={family.id}>{familyLabel(family)} / {family.status ?? "status unknown"}</option>)}</select></label>
                <label className="text-sm font-medium">Optional application<select name="applicationId" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">No application link</option>{applications.map((application) => <option key={application.id} value={application.id}>{shortId(application.id)} / {formatKey(application.status)} / {formatDate(application.submitted_at)}</option>)}</select></label>
                <label className="text-sm font-medium">Reservation status<select name="reservationStatus" defaultValue="reserved" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="reserved">Reserved</option><option value="pending">Pending marker</option></select></label>
                <label className="text-sm font-medium">Contract total dollars<input name="contractTotalDollars" required inputMode="decimal" placeholder="2000.00" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                <label className="text-sm font-medium">Deposit required dollars<input name="depositRequiredDollars" inputMode="decimal" placeholder="500.00" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                <label className="text-sm font-medium md:col-span-2">Sale type / internal label<input name="saleType" maxLength={100} placeholder="manual reservation" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
              </div>
              <label className="block text-sm font-medium">Reservation notes<textarea name="notes" rows={3} maxLength={1000} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Create Reservation Assignment</button>
            </form>
          ) : (
            <div className="mt-5"><EmptyState text="Only owner/admin can assign a buyer to a puppy." /></div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Media Readiness / Private Puppy Photos</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Internal owner/operator puppy media only. Photos render through short-lived signed URLs and are not public listings.</p>
            </div>
            <Badge>{mediaPreviews.length} photo{mediaPreviews.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Primary photo</p>
              <p className="mt-2 font-bold text-slate-950">{primaryPuppyPhoto ? "Recorded" : "Not recorded"}</p>
              <p className="mt-1 text-slate-500">{primaryPuppyPhoto?.title || primaryPuppyPhoto?.file_name || "Primary image not recorded"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Recent photo</p>
              <p className="mt-2 font-bold text-slate-950">{formatDateTime(latestPuppyPhotoAt)}</p>
              <p className="mt-1 text-slate-500">{latestPuppyPhotoAge === null ? "No media record found" : `${latestPuppyPhotoAge} day(s) old`}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Gallery count</p>
              <p className="mt-2 font-bold text-slate-950">{mediaPreviews.length}</p>
              <p className="mt-1 text-slate-500">Private kennel-media rows</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Go-home media</p>
              <p className="mt-2 font-bold text-slate-950">{activeReservation ? "Reservation linked" : "No active reservation"}</p>
              <p className="mt-1 text-slate-500">{activeReservation ? formatDateTime(activeReservation.go_home_planned_at) : "Go-home media need depends on assignment"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            {mediaBlockers.length > 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-bold">Media attention</p>
                <ul className="mt-2 space-y-1">
                  {mediaBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Puppy media readiness is clear from current Core rows.</div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media#puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Media Center</Link>
              {activeReservation ? <Link href={`/staff/reservations/${activeReservation.reservation_id}/handoff`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Reservation Handoff</Link> : null}
              <Link href={`/staff/puppies/${puppy.id}/handoff`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Puppy Handoff</Link>
            </div>
          </div>
          {mediaPreviews.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mediaPreviews.map((media) => (
                <article key={media.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {media.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.signedUrl} alt={media.title || "Private puppy photo"} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-slate-200 px-4 text-center text-sm text-slate-600">Private preview unavailable</div>
                  )}
                  <div className="space-y-2 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-950">{media.title || media.file_name}</p>
                      {media.is_primary ? <Badge>Primary</Badge> : null}
                    </div>
                    <p className="text-slate-500">{formatDateTime(media.uploaded_at)} / {formatFileSize(media.file_size_bytes)}</p>
                    {media.notes ? <p className="leading-6 text-slate-600">{media.notes}</p> : null}
                    {canViewAudit ? (
                      <form action={deleteKennelMediaFile} className="pt-2">
                        <input type="hidden" name="entityType" value="puppy" />
                        <input type="hidden" name="entityId" value={puppy.id} />
                        <input type="hidden" name="mediaId" value={media.id} />
                        <button type="submit" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700">Delete photo</button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5"><EmptyState text="No private puppy photos are attached yet." /></div>
          )}
          {canViewAudit ? (
            <form action={uploadKennelMediaFile} encType="multipart/form-data" className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="entityType" value="puppy" />
              <input type="hidden" name="entityId" value={puppy.id} />
              <label className="block text-sm font-medium">Photo title<input name="title" maxLength={160} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm font-medium">Private photo<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-slate-300" /> Mark as primary internal photo</label>
              <label className="block text-sm font-medium">Notes<textarea name="notes" rows={3} maxLength={600} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
              <p className="text-xs leading-5 text-slate-500">JPG, PNG, or WEBP only. Max 10 MB. Private storage only; no public puppy publishing, customer portal media, customer message, or external provider call.</p>
              <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Upload private photo</button>
            </form>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Weight Summary</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Observed weights from `core_weight_logs`, stored as integer grams.</p>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <InfoItem label="Birth weight" value={weightLabel(birth)} />
              <InfoItem label="Latest weight" value={weightLabel(latest)} />
              <InfoItem label="Weight rows" value={weights.length} />
              <InfoItem label="Last weight date" value={latest ? formatDateTime(latest.measured_at) : "Not recorded"} />
            </dl>
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Weight entries are factual observations only. This page does not interpret trends as medical conclusions.
            </p>
            {canViewAudit ? (
              <form action={recordPuppyWeightFromDetail} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="puppyId" value={puppy.id} />
                <h3 className="text-sm font-bold text-slate-950">Add new weight</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">Weight grams<input name="weightGrams" required inputMode="numeric" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                  <label className="text-sm font-medium">Measured at<input name="measuredAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                </div>
                <label className="block text-sm font-medium">Notes<textarea name="notes" rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record Weight</button>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Weight History / Timeline</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Newest Core observations remain available for review; no new rows are created here.</p>
            </div>
            {weights.length > 0 ? (
              <div className="space-y-3">
                {weights.map((weight) => (
                  <article key={weight.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{weightLabel(weight)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(weight.measured_at)}</p>
                      </div>
                      <Badge>Weight</Badge>
                    </div>
                    {weight.notes ? <p className="mt-3 text-sm leading-6 text-slate-700">{weight.notes}</p> : null}
                    {canViewAudit ? (
                      <form action={updatePuppyWeightLog} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                        <input type="hidden" name="puppyId" value={puppy.id} />
                        <input type="hidden" name="weightLogId" value={weight.id} />
                        <label className="text-xs font-semibold uppercase text-slate-500">Weight grams<input name="weightGrams" defaultValue={weight.weight_grams ?? ""} inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm normal-case" /></label>
                        <label className="text-xs font-semibold uppercase text-slate-500">Measured at<input name="measuredAt" type="datetime-local" defaultValue={dateTimeInput(weight.measured_at)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm normal-case" /></label>
                        <label className="text-xs font-semibold uppercase text-slate-500 sm:col-span-2">Correction notes<textarea name="notes" defaultValue={weight.notes ?? ""} rows={2} maxLength={1000} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm normal-case" /></label>
                        <button type="submit" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white sm:col-span-2">Save Weight Correction</button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No weight history has been recorded for this puppy yet." />
            )}
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Care / Observation History</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Factual puppy care rows from `core_puppy_events`.</p>
            </div>
            {careEvents.length > 0 ? (
              <div className="space-y-3">
                {careEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{display(event.summary, formatKey(event.event_type))}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(event.event_at)} / actor {shortId(event.recorded_by_profile_id)}</p>
                      </div>
                      <Badge>{formatKey(event.event_type)}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{safeDetails(event.details)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No care or observation history has been recorded for this puppy yet." />
            )}
            {canViewAudit ? (
              <form action={recordPuppyCareObservationFromDetail} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="puppyId" value={puppy.id} />
                <h3 className="text-sm font-bold text-slate-950">Add care observation</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">Observation type<select name="observationType" defaultValue="general_note" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="nursing_observed">Nursing observed</option><option value="bottle_feeding">Bottle feeding</option><option value="weight_check">Weight check</option><option value="dam_note">Dam note</option><option value="general_note">General note</option><option value="watch_note">Watch note</option></select></label>
                  <label className="text-sm font-medium">Observed at<input name="observedAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                </div>
                <label className="block text-sm font-medium">Observation note<textarea name="note" rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" /></label>
                <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record Observation</button>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Watch / Attention Flags</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Deterministic owner review flags from existing Core status, identity, notes, events, and weight presence.</p>
            </div>
            {watchSignals.length > 0 ? (
              <div className="space-y-3">
                {watchSignals.map((signal) => (
                  <div key={signal} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{signal}</div>
                ))}
              </div>
            ) : (
              <EmptyState text="No deterministic watch flags were found from current Core rows." />
            )}
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Event Context</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Safely linked `core_events` rows by puppy id or related puppy entity.</p>
            </div>
            {operationalEvents.length > 0 ? (
              <div className="space-y-3">
                {operationalEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{display(event.summary, formatKey(event.event_type))}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(event.event_at)} / {display(event.source, "source unknown")}</p>
                      </div>
                      <Badge>{formatKey(event.event_type)}</Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <InfoItem label="Related" value={`${display(event.related_table)} / ${shortId(event.related_id)}`} />
                      <InfoItem label="Reservation" value={shortId(event.reservation_id)} />
                    </dl>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{safeDetails(event.details)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No linked operational event rows were found for this puppy." />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Audit Context</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Owner/admin review of safely linked `core_audit_log` rows for this puppy.</p>
            </div>
            {!canViewAudit ? (
              <EmptyState text="Audit context is restricted to owner/admin profiles." />
            ) : auditResult.rows.length > 0 ? (
              <div className="space-y-3">
                {auditResult.rows.map((audit) => (
                  <article key={audit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{formatKey(audit.action)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(audit.created_at)} / {display(audit.source, "source unknown")}</p>
                      </div>
                      <Badge tone={outcomeTone(audit.outcome)}>{display(audit.outcome, "Unknown")}</Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <InfoItem label="Actor" value={`${shortId(audit.actor_profile_id)} / ${display(audit.actor_type)}`} />
                      <InfoItem label="Entity" value={`${display(audit.entity_table)} / ${shortId(audit.entity_id)}`} />
                      <InfoItem label="Context" value={safeDetails(audit.request_context)} />
                      <InfoItem label="Error" value={display(audit.error_message, "None")} />
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No linked audit rows were found for this puppy." />
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Related Links</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Internal navigation only. These links do not change records or contact outside systems.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Puppy List</Link>
            <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Puppy</Link>
            {litter ? <Link href={`/staff/litters/${litter.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link> : null}
            {dam ? <Link href={`/staff/dogs/${dam.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Dam</Link> : null}
            {sire ? <Link href={`/staff/dogs/${sire.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Sire</Link> : null}
            <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Dogs</Link>
            <Link href="/staff/litters" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Litters</Link>
            <Link href="/staff/kennel-logs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Kennel Logs</Link>
            <Link href="/staff/events" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Events</Link>
            <Link href="/staff/command" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Command</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

