import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffProfile } from "@/lib/staff-auth";
import type { KennelMediaRow } from "@/lib/kennel-media";
import { recordPuppyCareObservation, recordPuppyWeight } from "./actions";
import { ActionPanel } from "../action-panel";

export const dynamic = "force-dynamic";

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
  created_at: string | null;
  updated_at: string | null;
};

type DogRow = {
  id: string;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  status: string | null;
};

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
  updated_at: string | null;
};

type WeightLogRow = {
  id: string;
  puppy_id: string | null;
  measured_at: string | null;
  weight_grams: number | null;
  notes: string | null;
};

type PuppyEventRow = {
  id: string;
  puppy_id: string | null;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
};

const NEONATAL_WINDOW_DAYS = 21;
const ATTENTION_TERMS = ["weak", "watch", "fading", "not nursing", "cold", "losing", "loss", "risk", "concern"];

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

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function dogName(dog: DogRow | undefined) {
  if (!dog) {
    return "Not linked";
  }

  return dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
}

function litterName(litter: LitterRow) {
  return display(litter.litter_name, `Litter ${litter.id.slice(0, 8)}`);
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.external_reference || `Puppy ${puppy.id.slice(0, 8)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatAgeDays(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 0) return "Expected";
  if (days === 0) return "Born today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

function isSameLocalDay(value: string | null, comparison = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === comparison.getFullYear() && date.getMonth() === comparison.getMonth() && date.getDate() === comparison.getDate();
}

function daysSince(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function isUpcoming(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDate - startOfToday) / 86_400_000);
}

function daysUntilLabel(value: string | null) {
  const days = daysUntil(value);
  if (days === null) return "Not recorded";
  if (days < 0) return `${Math.abs(days)} days past expected date`;
  if (days === 0) return "Expected today";
  if (days === 1) return "1 day until expected birth";
  return `${days} days until expected birth`;
}

function isNeonatalLitter(litter: LitterRow) {
  const age = daysSince(litter.birth_at);
  const status = normalizeText(litter.status);
  return (age !== null && age >= 0 && age <= NEONATAL_WINDOW_DAYS) || ["born", "active", "newborn", "neonatal"].includes(status);
}

function isExpectedLitter(litter: LitterRow) {
  return !litter.birth_at && Boolean(litter.expected_birth_at);
}

function isPlannedOrExpectedLitter(litter: LitterRow) {
  const status = normalizeText(litter.status);
  return !litter.birth_at && (Boolean(litter.expected_birth_at) || ["planned", "expected", "pending"].includes(status));
}

function isActiveStatus(status: string | null) {
  return ["born", "active", "newborn", "neonatal", "expected", "planned", "pending"].includes(normalizeText(status));
}

function statusTone(status: string | null) {
  const normalized = normalizeText(status);

  if (["born", "active", "available", "newborn", "neonatal"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["planned", "expected", "pending"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["closed", "completed", "archived"].includes(normalized)) {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  if (["deceased", "watch", "at risk", "at_risk"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function weightLabel(weight: WeightLogRow | null | undefined) {
  if (!weight || weight.weight_grams === null || weight.weight_grams === undefined) {
    return "Not recorded";
  }

  return `${weight.weight_grams} g`;
}

function sortWeightsAscending(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => new Date(a.measured_at ?? 0).getTime() - new Date(b.measured_at ?? 0).getTime());
}

function latestWeight(weights: WeightLogRow[]) {
  return [...weights].sort((a, b) => new Date(b.measured_at ?? 0).getTime() - new Date(a.measured_at ?? 0).getTime())[0] ?? null;
}

function birthWeightForPuppy(puppy: PuppyRow, litter: LitterRow | undefined, weights: WeightLogRow[]) {
  const birthAt = puppy.birth_at ?? litter?.birth_at ?? null;
  if (!birthAt) return sortWeightsAscending(weights)[0] ?? null;
  const sameDay = sortWeightsAscending(weights).find((weight) => isSameLocalDay(weight.measured_at, new Date(birthAt)));
  return sameDay ?? sortWeightsAscending(weights)[0] ?? null;
}

function linkedPuppies(litter: LitterRow, puppiesByLitter: Map<string, PuppyRow[]>) {
  return puppiesByLitter.get(litter.id) ?? [];
}

function hasAttentionText(...values: Array<string | null | undefined>) {
  const text = normalizeText(values.filter(Boolean).join(" "));
  return ATTENTION_TERMS.some((term) => text.includes(term));
}

function watchSignalsForPuppy(puppy: PuppyRow, litter: LitterRow | undefined, weights: WeightLogRow[], events: PuppyEventRow[]) {
  const signals: string[] = [];
  const latest = latestWeight(weights);
  const birth = birthWeightForPuppy(puppy, litter, weights);
  const age = daysSince(puppy.birth_at ?? litter?.birth_at ?? null);
  const status = normalizeText(puppy.status);

  if (!birth) signals.push("No birth weight recorded.");
  if (age !== null && age >= 0 && age <= 7 && !weights.some((weight) => isSameLocalDay(weight.measured_at))) {
    signals.push("No weight recorded today.");
  }
  if (["unavailable", "deceased", "watch", "at risk", "at_risk"].includes(status)) {
    signals.push(`Puppy status is ${display(puppy.status, "unknown")}.`);
  }
  if (hasAttentionText(puppy.health_status, puppy.notes)) {
    signals.push("Health marker or notes contain watch terms.");
  }
  if (events.some((event) => hasAttentionText(event.event_type, event.summary, JSON.stringify(event.details ?? {})))) {
    signals.push("Recent puppy event contains watch terms.");
  }
  if (latest?.weight_grams !== null && latest?.weight_grams !== undefined && latest.weight_grams <= 0) {
    signals.push("Latest weight value needs review.");
  }

  return signals;
}

function missingSetupForLitter(litter: LitterRow, puppies: PuppyRow[], weightsByPuppy: Map<string, WeightLogRow[]>) {
  const blockers: string[] = [];

  if (!litter.expected_birth_at && !litter.birth_at) blockers.push("Expected date is missing.");
  if (!litter.dam_id) blockers.push("Dam is not linked.");
  if (!litter.sire_id) blockers.push("Sire is not linked.");
  if (!litter.status) blockers.push("Litter status is unclear.");
  if (litter.notes !== null && !litter.notes.trim()) blockers.push("No notes/context recorded.");

  const expectedDays = daysUntil(litter.expected_birth_at);
  const bornDays = daysSince(litter.birth_at);

  if (expectedDays !== null && expectedDays < 0 && !litter.birth_at && puppies.length === 0) {
    blockers.push("Expected date has passed and no birth date or puppy rows are recorded.");
  }

  if (bornDays !== null && bornDays >= 0 && puppies.length === 0) {
    blockers.push("Birth date is recorded but no puppies are linked.");
  }

  if (bornDays !== null && bornDays >= 0 && bornDays <= 14) {
    const puppiesWithoutWeights = puppies.filter((puppy) => (weightsByPuppy.get(puppy.id) ?? []).length === 0).length;
    if (puppies.length > 0 && puppiesWithoutWeights > 0) {
      blockers.push(`${puppiesWithoutWeights} newborn puppy weight log${puppiesWithoutWeights === 1 ? " is" : "s are"} missing.`);
    }
  }

  return blockers;
}

function recentlyBornFlags(puppies: PuppyRow[], weightsByPuppy: Map<string, WeightLogRow[]>) {
  const flags: string[] = [];

  if (puppies.length === 0) {
    flags.push("No puppies linked.");
    return flags;
  }

  const missingIdentity = puppies.filter((puppy) => !puppy.sex || !puppy.color || !puppy.status).length;
  const missingWeights = puppies.filter((puppy) => (weightsByPuppy.get(puppy.id) ?? []).length === 0).length;

  if (missingIdentity > 0) flags.push(`${missingIdentity} puppy identity/status detail${missingIdentity === 1 ? " is" : "s are"} incomplete.`);
  if (missingWeights > 0) flags.push(`${missingWeights} puppy weight log${missingWeights === 1 ? " is" : "s are"} missing.`);

  return flags;
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

function ResultMessage({ searchParams }: { searchParams: { litter?: string; weight_recorded?: string; observation_recorded?: string; error?: string } }) {
  if (searchParams.litter === "success") {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">Litter record created in Core.</section>;
  }

  if (searchParams.litter === "updated") {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">Litter record updated in Core.</section>;
  }

  if (searchParams.litter === "deleted") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Litter record was archived in Core.</section>;
  }

  if (searchParams.litter === "unauthorized") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Only owner/admin can change litter records.</section>;
  }

  if (searchParams.litter === "invalid_input" || searchParams.litter === "same_parents" || searchParams.litter === "invalid_counts") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Check litter form values, parent links, counts, dates, and field lengths.</section>;
  }

  if (searchParams.litter === "config_missing") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">Core server action configuration is incomplete for litter actions.</section>;
  }

  if (searchParams.litter === "rpc_missing_or_failed") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">Litter RPC failed or is not available. Check the deployed Core action before retrying.</section>;
  }

  if (searchParams.litter === "save_failed" || searchParams.litter === "error") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">Litter action failed. Review the server action log for safe details.</section>;
  }

  if (searchParams.weight_recorded === "1") {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">Puppy weight recorded. Core stored the observation only and did not message customers, publish puppies, diagnose, or call external providers.</section>;
  }

  if (searchParams.observation_recorded === "1") {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">Puppy care observation recorded. Core stored the observation only and did not message customers, publish puppies, diagnose, or call external providers.</section>;
  }

  if (searchParams.error === "unauthorized") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Only owner/admin can record puppy weight and care observations.</section>;
  }

  if (searchParams.error === "invalid") {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Check the puppy, weight, date/time, observation type, and note length.</section>;
  }

  if (searchParams.error === "failed") {
    return <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">The neonatal log action failed. Review the server action log for details.</section>;
  }

  return null;
}

export default async function StaffLittersPage({ searchParams }: { searchParams: Promise<{ litter?: string; weight_recorded?: string; observation_recorded?: string; error?: string }> }) {
  const staff = await requireStaffProfile();
  const resolvedSearchParams = await searchParams;
  const { litter } = resolvedSearchParams;
  const canLogCare = staff.role === "owner" || staff.role === "admin";

  const [litterResult, dogResult, puppyResult, weightResult, puppyEventResult, mediaResult] = await Promise.all([
    readRows<LitterRow>("core_litters", {
      select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes,created_at,updated_at",
      order: "created_at.desc",
      limit: "100",
    }),
    readRows<DogRow>("core_dogs", {
      select: "id,registered_name,call_name,sex,status",
      limit: "500",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,public_listing_status,notes,updated_at",
      limit: "1000",
    }),
    readRows<WeightLogRow>("core_weight_logs", {
      select: "id,puppy_id,measured_at,weight_grams,notes",
      order: "measured_at.desc",
      limit: "2000",
    }),
    readRows<PuppyEventRow>("core_puppy_events", {
      select: "id,puppy_id,event_type,event_at,summary,details",
      order: "event_at.desc",
      limit: "1000",
    }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,title,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,is_primary,visibility,notes,uploaded_at,uploaded_by_profile_id",
      entity_type: "eq.puppy",
      order: "uploaded_at.desc.nullslast",
      limit: "1000",
    }),
  ]);

  const litters = litterResult.rows;
  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));
  const puppiesByLitter = new Map<string, PuppyRow[]>();
  const weightsByPuppy = new Map<string, WeightLogRow[]>();
  const eventsByPuppy = new Map<string, PuppyEventRow[]>();
  const mediaByPuppy = new Map<string, KennelMediaRow[]>();

  for (const puppy of puppyResult.rows) {
    if (!puppy.litter_id) {
      continue;
    }

    puppiesByLitter.set(puppy.litter_id, [...(puppiesByLitter.get(puppy.litter_id) ?? []), puppy]);
  }

  for (const weight of weightResult.rows) {
    if (!weight.puppy_id) continue;
    weightsByPuppy.set(weight.puppy_id, [...(weightsByPuppy.get(weight.puppy_id) ?? []), weight]);
  }

  for (const event of puppyEventResult.rows) {
    if (!event.puppy_id) continue;
    eventsByPuppy.set(event.puppy_id, [...(eventsByPuppy.get(event.puppy_id) ?? []), event]);
  }

  for (const media of mediaResult.rows) {
    if (!media.puppy_id) continue;
    mediaByPuppy.set(media.puppy_id, [...(mediaByPuppy.get(media.puppy_id) ?? []), media]);
  }

  const litterById = new Map(litters.map((row) => [row.id, row]));
  const bornCount = litters.filter((row) => Boolean(row.birth_at)).length;
  const expectedCount = litters.filter((row) => !row.birth_at && Boolean(row.expected_birth_at)).length;
  const totalPuppies = litters.reduce((sum, row) => sum + (row.total_puppies ?? puppiesByLitter.get(row.id)?.length ?? 0), 0);
  const todayBornLitters = litters.filter((row) => isSameLocalDay(row.birth_at));
  const expectedLitters = litters.filter(isExpectedLitter).sort((a, b) => new Date(a.expected_birth_at ?? 0).getTime() - new Date(b.expected_birth_at ?? 0).getTime());
  const plannedExpectedLitters = litters
    .filter(isPlannedOrExpectedLitter)
    .sort((a, b) => new Date(a.expected_birth_at ?? "9999-12-31").getTime() - new Date(b.expected_birth_at ?? "9999-12-31").getTime());
  const missingDueDateCount = plannedExpectedLitters.filter((row) => !row.expected_birth_at).length;
  const upcomingWithin7 = expectedLitters.filter((row) => {
    const days = daysUntil(row.expected_birth_at);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const upcomingWithin14 = expectedLitters.filter((row) => {
    const days = daysUntil(row.expected_birth_at);
    return days !== null && days >= 0 && days <= 14;
  }).length;
  const expectedSetupRows = plannedExpectedLitters.map((row) => ({
    litter: row,
    blockers: missingSetupForLitter(row, linkedPuppies(row, puppiesByLitter), weightsByPuppy),
  }));
  const recentlyBornLitters = litters
    .filter((row) => {
      const age = daysSince(row.birth_at);
      return age !== null && age >= 0 && age <= 14;
    })
    .sort((a, b) => new Date(b.birth_at ?? 0).getTime() - new Date(a.birth_at ?? 0).getTime());
  const neonatalLitters = litters.filter((row) => isNeonatalLitter(row) || isActiveStatus(row.status));
  const neonatalPuppies = puppyResult.rows.filter((puppy) => {
    const litterRow = puppy.litter_id ? litterById.get(puppy.litter_id) : undefined;
    return litterRow ? isNeonatalLitter(litterRow) || isActiveStatus(litterRow.status) : daysSince(puppy.birth_at) !== null && (daysSince(puppy.birth_at) ?? 99) <= NEONATAL_WINDOW_DAYS;
  });
  const todayWeights = weightResult.rows.filter((weight) => isSameLocalDay(weight.measured_at)).length;
  const littersMissingMedia = litters.filter((row) => {
    const puppies = linkedPuppies(row, puppiesByLitter);
    return puppies.length === 0 || !puppies.some((puppy) => (mediaByPuppy.get(puppy.id) ?? []).length > 0);
  });
  const puppiesMissingMedia = puppyResult.rows.filter((puppy) => (mediaByPuppy.get(puppy.id) ?? []).length === 0);
  const puppiesMissingPrimaryMedia = puppyResult.rows.filter((puppy) => !(mediaByPuppy.get(puppy.id) ?? []).some((media) => media.is_primary));
  const puppyWatchRows = neonatalPuppies
    .map((puppy) => {
      const litterRow = puppy.litter_id ? litterById.get(puppy.litter_id) : undefined;
      return {
        puppy,
        litter: litterRow,
        signals: watchSignalsForPuppy(puppy, litterRow, weightsByPuppy.get(puppy.id) ?? [], eventsByPuppy.get(puppy.id) ?? []),
      };
    })
    .filter((row) => row.signals.length > 0);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Litters</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Litters Workspace</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Real Core litter records with sire, dam, birth timing, puppy counts, and linked puppy context. No fake/demo data and no outside systems.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media#litters" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Media Center</Link>
              <Link href="/staff/litters/new" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add Litter</Link>
              <Link href="/staff/puppies/new" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Add Puppy</Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Safety boundary</p>
          <p className="mt-2 text-sm leading-6">This workspace tracks internal breeder observations and neonatal care tasks only. It does not diagnose puppies, replace veterinary care, publish puppies, message customers, update the portal, or call external providers.</p>
        </section>

        {litter ? <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">Litter action result: {litter}</section> : null}
        <ResultMessage searchParams={resolvedSearchParams} />

        <ActionPanel
          nextAction={neonatalLitters.length > 0 ? "Review neonatal litter care and linked puppy readiness" : expectedSetupRows.length > 0 ? "Review expected litter setup blockers" : "Review litter media and record readiness"}
          blockers={missingDueDateCount + littersMissingMedia.length + puppiesMissingMedia.length + puppiesMissingPrimaryMedia.length}
          mode={canLogCare ? "available" : "review-only"}
          href="/staff/actions#media"
          detail="Litter actions use existing litter, puppy care, and media-readiness workflows only; direct litter uploads, public publishing, messaging, payments, documents, and provider calls remain disconnected."
        />

        {litterResult.warning || dogResult.warning || puppyResult.warning || weightResult.warning || puppyEventResult.warning || mediaResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {litterResult.warning ?? dogResult.warning ?? puppyResult.warning ?? weightResult.warning ?? puppyEventResult.warning ?? mediaResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Litters" value={litters.length} note="Core litter records" />
          <StatCard label="Born" value={bornCount} note="Have birth date" />
          <StatCard label="Expected" value={expectedCount} note="Expected, not born" />
          <StatCard label="Puppies" value={totalPuppies} note="Recorded/linked count" />
          <StatCard label="Litter media gaps" value={littersMissingMedia.length} note="Derived from puppy photos" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Internal Media Readiness</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Litter Gallery Signals</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">The current private media table stores dog and puppy photos. Litter readiness is derived from linked puppy media and primary puppy photo markers; no direct litter gallery upload path is added here.</p>
            </div>
            <Link href="/staff/media#litters" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Open Media Center</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatCard label="Puppy media rows" value={mediaResult.rows.length} note="Private kennel-media rows linked to puppies" />
            <StatCard label="Puppies missing photos" value={puppiesMissingMedia.length} note="No puppy media record found" />
            <StatCard label="Puppies missing primary" value={puppiesMissingPrimaryMedia.length} note="Primary image not recorded" />
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {litters.slice(0, 12).map((row) => {
              const puppies = linkedPuppies(row, puppiesByLitter);
              const photoCount = puppies.reduce((count, puppy) => count + (mediaByPuppy.get(puppy.id) ?? []).length, 0);
              const primaryCount = puppies.filter((puppy) => (mediaByPuppy.get(puppy.id) ?? []).some((media) => media.is_primary)).length;
              const blockers = [
                puppies.length === 0 ? "No puppies linked." : null,
                photoCount === 0 ? "No linked puppy photos found." : null,
                puppies.length > 0 && primaryCount < puppies.length ? `${puppies.length - primaryCount} puppy primary image marker(s) missing.` : null,
              ].filter(Boolean);

              return (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{litterName(row)}</p>
                      <p className="mt-1 text-sm text-slate-600">Dam: {dogName(row.dam_id ? dogsById.get(row.dam_id) : undefined)} / Sire: {dogName(row.sire_id ? dogsById.get(row.sire_id) : undefined)}</p>
                    </div>
                    <Badge tone={blockers.length ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}>{blockers.length ? "Needs media" : "Media signal ready"}</Badge>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <InfoItem label="Puppies" value={puppies.length} />
                    <InfoItem label="Gallery photos" value={photoCount} />
                    <InfoItem label="Primary puppy photos" value={`${primaryCount} / ${puppies.length}`} />
                  </dl>
                  {blockers.length > 0 ? <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">{blockers.join(" ")}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/staff/litters/${row.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open litter media readiness</Link>
                    {puppies.slice(0, 3).map((puppy) => <Link key={puppy.id} href={`/staff/puppies/${puppy.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">{puppyName(puppy)}</Link>)}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Internal Planning</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Expected Litters & Whelping Prep</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">This workspace tracks internal breeder planning and whelping preparation only. It does not diagnose pregnancy, predict medical outcomes, publish puppies, message customers, update the portal, or call external providers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/litters/new" className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Add Litter</Link>
              <Link href="/staff/puppies/new" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Add Puppy</Link>
              <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Dogs</Link>
              <Link href="/staff/kennel-logs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Kennel Logs</Link>
              <Link href="/staff/events" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Events</Link>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-950">Expected / Upcoming Litter Summary</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Summary is calculated only from existing `core_litters`, `core_dogs`, `core_puppies`, and weight log rows.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Expected/planned" value={plannedExpectedLitters.length} note="No birth date and expected/planned status or date" />
              <StatCard label="Missing due date" value={missingDueDateCount} note="Planned/expected rows without expected date" />
              <StatCard label="Within 7 days" value={upcomingWithin7} note="Expected birth date recorded" />
              <StatCard label="Within 14 days" value={upcomingWithin14} note="Expected birth date recorded" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-700">Pregnancy status field: not available in the current kennel schema, so Core does not label dams pregnant from dog rows.</div>
              <div className="rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-700">Expected dates: available through `core_litters.expected_birth_at` and existing Add/Edit Litter forms.</div>
              <div className="rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-700">Planning statuses: current schema supports planned, expected, born, active, closed, and archived litter statuses.</div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Upcoming Expected Litters List</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Planned or expected litter rows that have not been marked born.</p>
              {plannedExpectedLitters.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {plannedExpectedLitters.map((row) => {
                    const puppies = linkedPuppies(row, puppiesByLitter);
                    const dam = row.dam_id ? dogsById.get(row.dam_id) : undefined;
                    const sire = row.sire_id ? dogsById.get(row.sire_id) : undefined;
                    return (
                      <article key={row.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-slate-950">{litterName(row)}</p>
                            <p className="mt-1 text-sm text-slate-600">Dam: {dogName(dam)} / Sire: {dogName(sire)}</p>
                          </div>
                          <Badge tone={statusTone(row.status)}>{display(row.status, "Status unknown")}</Badge>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          <InfoItem label="Expected date" value={formatDate(row.expected_birth_at)} />
                          <InfoItem label="Countdown" value={daysUntilLabel(row.expected_birth_at)} />
                          <InfoItem label="Linked puppies" value={puppies.length} />
                          <InfoItem label="External ref" value={display(row.external_reference)} />
                          <InfoItem label="Details pending" value={row.details_pending ? "Yes" : "No"} />
                          <InfoItem label="Updated" value={formatDate(row.updated_at)} />
                        </dl>
                        {row.notes ? <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-600">{row.notes}</p> : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link>
                          {row.dam_id ? <Link href={`/staff/dogs/${row.dam_id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Dam</Link> : <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Dogs</Link>}
                          {row.sire_id ? <Link href={`/staff/dogs/${row.sire_id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Sire</Link> : null}
                          <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Puppies</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <EmptyState text="No expected/upcoming litters are recorded. Expected litters can be tracked when planned or expected litter records have a due date/status in the current schema." />}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Whelping Prep Checklist Panel</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Prep reminders are owner/operator reminders only and are not medical diagnosis.</p>
              <div className="mt-4 grid gap-3">
                {[
                  "Confirm dam record is current.",
                  "Confirm sire is linked if known.",
                  "Confirm expected date is recorded.",
                  "Prepare clean whelping area.",
                  "Prepare clean towels / bedding.",
                  "Prepare scale for weights.",
                  "Prepare puppy identifiers.",
                  "Prepare notebook/Core logging routine.",
                  "Monitor dam behavior.",
                  "Contact veterinarian for concerning symptoms.",
                ].map((task) => (
                  <div key={task} className="rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-700">{task}</div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Missing Setup / Data Quality Panel</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Deterministic setup blockers from current kennel metadata only.</p>
              {expectedSetupRows.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {expectedSetupRows.map(({ litter: row, blockers }) => (
                    <article key={row.id} className="rounded-2xl border border-amber-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-bold text-slate-950">{litterName(row)}</p>
                        <Badge tone={blockers.length > 0 ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}>{blockers.length} flag{blockers.length === 1 ? "" : "s"}</Badge>
                      </div>
                      {blockers.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                      ) : <p className="mt-3 text-sm leading-6 text-emerald-800">No setup blockers found from available fields.</p>}
                    </article>
                  ))}
                </div>
              ) : <EmptyState text="Not enough kennel metadata to evaluate this item." />}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Born Recently / Transition To Neonatal</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Litters with birth dates in the last 14 days, linked to neonatal and puppy records.</p>
              {recentlyBornLitters.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {recentlyBornLitters.map((row) => {
                    const puppies = linkedPuppies(row, puppiesByLitter);
                    const flags = recentlyBornFlags(puppies, weightsByPuppy);
                    return (
                      <article key={row.id} className="rounded-2xl border border-emerald-100 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-950">{litterName(row)}</p>
                            <p className="mt-1 text-sm text-slate-600">{formatAgeDays(row.birth_at)} / {puppies.length} linked puppies</p>
                          </div>
                          <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-100">Neonatal transition</Badge>
                        </div>
                        {flags.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
                        ) : <p className="mt-3 text-sm leading-6 text-emerald-800">No newborn data flags found from available fields.</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link>
                          <Link href="/staff/puppies/new" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Add Puppy</Link>
                          <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Puppies</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <EmptyState text="No litters have a birth date in the last 14 days." />}
            </section>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Internal Workflow</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Neonatal Litter Command</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Read-only command view for newborn and expected litter readiness using existing Core litter, puppy, dog, weight, and puppy event rows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Dogs</Link>
              <Link href="/staff/kennel-logs" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Kennel Logs</Link>
              <Link href="/staff/events" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">Events</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Newborn/active litters" value={neonatalLitters.length} note={`${todayBornLitters.length} born today`} />
            <StatCard label="Newborn puppy cards" value={neonatalPuppies.length} note="Linked to newborn/active litters" />
            <StatCard label="Weights today" value={todayWeights} note="Observed core_weight_logs today" />
            <StatCard label="Watch signals" value={puppyWatchRows.length} note="Deterministic owner-review flags" />
          </div>

          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-emerald-950">Daily Weight & Care Log</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-emerald-900">This log stores owner observations only. It does not diagnose puppies, replace veterinary care, message customers, publish puppies, or call external providers.</p>
              </div>
              <Badge tone="bg-white text-emerald-800 ring-emerald-200">Owner/Admin</Badge>
            </div>

            {canLogCare ? (
              neonatalPuppies.length > 0 ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <form action={recordPuppyWeight} className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-base font-bold text-slate-950">Record Weight</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Weights are stored as integer grams in `core_weight_logs`.</p>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">Puppy<select name="puppyId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select puppy</option>{neonatalPuppies.map((puppy) => <option key={puppy.id} value={puppy.id}>{puppyName(puppy)} / {puppy.litter_id ? litterName(litterById.get(puppy.litter_id) ?? ({ id: puppy.litter_id } as LitterRow)) : "Unlinked litter"}</option>)}</select></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">Weight (grams)<input type="number" name="weightGrams" min="1" max="10000" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                      <label className="block text-sm font-medium text-slate-700">Observation time<input type="datetime-local" name="measuredAt" defaultValue={dateTimeInput(new Date().toISOString())} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">Internal note<textarea name="notes" maxLength={1000} rows={3} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                    <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record weight</button>
                  </form>

                  <form action={recordPuppyCareObservation} className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-base font-bold text-slate-950">Record Observation</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Observation types are factual care markers stored in `core_puppy_events`.</p>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">Puppy<select name="puppyId" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="">Select puppy</option>{neonatalPuppies.map((puppy) => <option key={puppy.id} value={puppy.id}>{puppyName(puppy)} / {puppy.litter_id ? litterName(litterById.get(puppy.litter_id) ?? ({ id: puppy.litter_id } as LitterRow)) : "Unlinked litter"}</option>)}</select></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">Observation type<select name="observationType" required className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="nursing_observed">Nursing observed</option><option value="bottle_feeding">Bottle feeding</option><option value="weight_check">Weight check</option><option value="dam_note">Dam note</option><option value="general_note">General note</option><option value="watch_note">Watch note</option></select></label>
                      <label className="block text-sm font-medium text-slate-700">Observation time<input type="datetime-local" name="observedAt" defaultValue={dateTimeInput(new Date().toISOString())} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">Observation note<textarea name="note" maxLength={1000} rows={3} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" /></label>
                    <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record observation</button>
                  </form>
                </div>
              ) : <EmptyState text="No newborn or active puppies are available for weight or care logging yet." />
            ) : <EmptyState text="Daily puppy weight and care logging is owner/admin only during this phase." />}

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5">
              <h4 className="text-base font-bold text-slate-950">Latest Weight History</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">Most recent observed weights and care observations for newborn/active puppies.</p>
              {neonatalPuppies.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {neonatalPuppies.map((puppy) => {
                    const weights = weightsByPuppy.get(puppy.id) ?? [];
                    const events = eventsByPuppy.get(puppy.id) ?? [];
                    const latestWeights = [...weights].sort((a, b) => new Date(b.measured_at ?? 0).getTime() - new Date(a.measured_at ?? 0).getTime()).slice(0, 3);
                    const latestEvents = [...events].sort((a, b) => new Date(b.event_at ?? 0).getTime() - new Date(a.event_at ?? 0).getTime()).slice(0, 3);
                    return (
                      <article key={puppy.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-950">{puppyName(puppy)}</p>
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Recent weights</p>
                            {latestWeights.length > 0 ? <ul className="mt-2 space-y-1 text-slate-700">{latestWeights.map((weight) => <li key={weight.id}>{weightLabel(weight)} / {formatDateTime(weight.measured_at)}</li>)}</ul> : <p className="mt-2 text-slate-500">No weight logs yet.</p>}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Care observations</p>
                            {latestEvents.length > 0 ? <ul className="mt-2 space-y-1 text-slate-700">{latestEvents.map((event) => <li key={event.id}>{display(event.event_type, "Observation")} / {formatDateTime(event.event_at)}</li>)}</ul> : <p className="mt-2 text-slate-500">No care observations yet.</p>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <EmptyState text="No newborn puppy history is available yet." />}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Today Born Litter Panel</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Birth date matches the current local day.</p>
              {todayBornLitters.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {todayBornLitters.map((row) => {
                    const puppies = linkedPuppies(row, puppiesByLitter);
                    return (
                      <article key={row.id} className="rounded-2xl border border-emerald-100 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-slate-950">{litterName(row)}</p>
                            <p className="mt-1 text-sm text-slate-600">{dogName(row.dam_id ? dogsById.get(row.dam_id) : undefined)} / {dogName(row.sire_id ? dogsById.get(row.sire_id) : undefined)}</p>
                          </div>
                          <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-100">Born today</Badge>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <InfoItem label="Birth date" value={formatDate(row.birth_at)} />
                          <InfoItem label="Puppy count" value={row.total_puppies ?? puppies.length} />
                          <InfoItem label="Female / Male" value={`${row.female_count ?? "?"} / ${row.male_count ?? "?"}`} />
                          <InfoItem label="Status" value={display(row.status, "Unknown")} />
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link>
                          <Link href="/staff/puppies/new" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Add Puppy</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <EmptyState text="No litter recorded with today's birth date yet." />}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Upcoming Expected Litters</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Expected birth dates from current Core litter rows.</p>
              {expectedLitters.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {expectedLitters.map((row) => (
                    <article key={row.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{litterName(row)}</p>
                          <p className="mt-1 text-sm text-slate-600">{dogName(row.dam_id ? dogsById.get(row.dam_id) : undefined)} / {dogName(row.sire_id ? dogsById.get(row.sire_id) : undefined)}</p>
                        </div>
                        <Badge tone={isUpcoming(row.expected_birth_at) ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-amber-50 text-amber-700 ring-amber-100"}>{formatDate(row.expected_birth_at)}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState text="No expected litters are recorded from current litter rows." />}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-950">Puppy Newborn Cards</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Identity, age, observed weights, status, and notes for puppies in newborn or active litter context.</p>
            {neonatalPuppies.length > 0 ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                {neonatalPuppies.map((puppy) => {
                  const litterRow = puppy.litter_id ? litterById.get(puppy.litter_id) : undefined;
                  const weights = weightsByPuppy.get(puppy.id) ?? [];
                  const events = eventsByPuppy.get(puppy.id) ?? [];
                  const latest = latestWeight(weights);
                  const birth = birthWeightForPuppy(puppy, litterRow, weights);
                  const signals = watchSignalsForPuppy(puppy, litterRow, weights, events);
                  return (
                    <article key={puppy.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-slate-950">{puppyName(puppy)}</p>
                          <p className="mt-1 text-sm text-slate-500">{litterRow ? litterName(litterRow) : "Unlinked litter"}</p>
                        </div>
                        <Badge tone={statusTone(puppy.status)}>{display(puppy.status, "Unknown")}</Badge>
                      </div>
                      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                        <InfoItem label="Sex" value={display(puppy.sex)} />
                        <InfoItem label="Color / coat" value={`${display(puppy.color)} / ${display(puppy.coat_type)}`} />
                        <InfoItem label="Age" value={formatAgeDays(puppy.birth_at ?? litterRow?.birth_at ?? null)} />
                        <InfoItem label="Collar" value={display(puppy.collar_color)} />
                        <InfoItem label="Birth weight" value={weightLabel(birth)} />
                        <InfoItem label="Latest weight" value={weightLabel(latest)} />
                        <InfoItem label="Health marker" value={display(puppy.health_status)} />
                        <InfoItem label="Last weight date" value={latest ? formatDate(latest.measured_at) : "Not recorded"} />
                      </dl>
                      {signals.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                          <p className="font-semibold">Owner review</p>
                          <ul className="mt-2 space-y-1">{signals.slice(0, 3).map((signal) => <li key={signal}>{signal}</li>)}</ul>
                        </div>
                      ) : null}
                      {puppy.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{puppy.notes}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Puppy</Link>
                        {litterRow ? <Link href={`/staff/litters/${litterRow.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Litter</Link> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <EmptyState text="No newborn or active puppy rows are available yet. Add litters and puppies through the existing Add Litter and Add Puppy workflows." />}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Weight / Growth Readiness</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Observed weight rows from core_weight_logs. This panel does not create weight entries.</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="Weight rows read" value={weightResult.rows.length} />
                <InfoItem label="Weights today" value={todayWeights} />
                <InfoItem label="Puppies missing birth weight" value={neonatalPuppies.filter((puppy) => !birthWeightForPuppy(puppy, puppy.litter_id ? litterById.get(puppy.litter_id) : undefined, weightsByPuppy.get(puppy.id) ?? [])).length} />
                <InfoItem label="Puppies missing today weight" value={neonatalPuppies.filter((puppy) => !(weightsByPuppy.get(puppy.id) ?? []).some((weight) => isSameLocalDay(weight.measured_at))).length} />
              </dl>
              <p className="mt-4 rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-600">Weights are factual observations only. Any concerning trend should be physically checked by the owner and escalated to a veterinarian when appropriate.</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">24-72 Hour Neonatal Task Panel</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Care tasks are owner reminders only and are not medical diagnosis.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  "Confirm every puppy is identified and linked to the litter.",
                  "Record observed birth weights and today weights.",
                  "Review nursing, warmth, and dam behavior observations.",
                  "Check that weak/watch notes are reflected in puppy health markers.",
                  "Keep litter count, sex counts, and notes current.",
                  "Contact a veterinarian for concerning observations or owner uncertainty.",
                ].map((task) => (
                  <div key={task} className="rounded-2xl border border-white bg-white p-4 text-sm leading-6 text-slate-700">{task}</div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-950">Watch / Risk Signals</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Deterministic attention flags from existing status, notes, event text, and weight presence. These are not medical conclusions.</p>
            {puppyWatchRows.length > 0 ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {puppyWatchRows.map(({ puppy, litter: litterRow, signals }) => (
                  <article key={puppy.id} className="rounded-2xl border border-amber-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{puppyName(puppy)}</p>
                        <p className="mt-1 text-sm text-slate-600">{litterRow ? litterName(litterRow) : "Unlinked litter"}</p>
                      </div>
                      <Badge tone={statusTone(puppy.status)}>{display(puppy.status, "Unknown")}</Badge>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">{signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/staff/puppies/${puppy.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit Puppy</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState text="No newborn puppy watch signals were found from current Core rows." />}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-lg font-semibold">Litter Records</h2><p className="mt-1 text-sm leading-6 text-slate-500">Current Core litter rows with linked sire, dam, and puppy records when present.</p></div>
          {litters.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {litters.map((row) => {
                const puppies = puppiesByLitter.get(row.id) ?? [];
                const dam = row.dam_id ? dogsById.get(row.dam_id) : undefined;
                const sire = row.sire_id ? dogsById.get(row.sire_id) : undefined;
                return (
                  <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-bold text-slate-950">{litterName(row)}</p><p className="mt-1 text-sm text-slate-500">ID {row.id.slice(0, 8)}</p></div><div className="flex flex-wrap gap-2"><Badge tone={statusTone(row.status)}>{display(row.status, "Unknown")}</Badge>{row.details_pending ? <Badge tone="bg-amber-50 text-amber-700 ring-amber-100">Details pending</Badge> : null}</div></div>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><InfoItem label="Dam" value={dogName(dam)} /><InfoItem label="Sire" value={dogName(sire)} /><InfoItem label="Expected birth" value={formatDate(row.expected_birth_at)} /><InfoItem label="Birth date" value={formatDate(row.birth_at)} /><InfoItem label="Total puppies" value={row.total_puppies ?? puppies.length} /><InfoItem label="Female / Male" value={`${row.female_count ?? "?"} / ${row.male_count ?? "?"}`} /></dl>
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Linked puppies</p>{puppies.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{puppies.map((puppy) => <Badge key={puppy.id} tone="bg-white text-blue-800 ring-blue-100">{puppyName(puppy)} / {display(puppy.status, "status unknown")}</Badge>)}</div> : <p className="mt-1 text-blue-800">No linked puppy rows yet.</p>}</div>
                    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/staff/litters/${row.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit</Link></div>
                    {row.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{row.notes}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : <EmptyState text="No litter records found in Core yet." />}
        </section>
      </div>
    </main>
  );
}


