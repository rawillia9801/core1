import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, OperatorStatusPill, SectionNav, SummaryStrip } from "../operator-ui";

export const dynamic = "force-dynamic";

type SectionKey = "overview" | "dogs" | "pairings" | "pregnancies" | "whelping" | "litters" | "puppy-care" | "calendar" | "tasks" | "alerts";
type ReadResult<T> = { rows: T[]; warning: string | null };
type AnyRow = Record<string, unknown>;

type CoreDog = { id: string; registered_name: string | null; call_name: string | null; sex: string | null; color: string | null; coat_type: string | null; birth_at: string | null; status: string | null; metadata: Record<string, unknown> | null };
type CoreLitter = { id: string; litter_name: string | null; dam_id: string | null; sire_id: string | null; expected_birth_at: string | null; birth_at: string | null; total_puppies: number | null; status: string | null; details_pending: boolean | null };
type CorePuppy = { id: string; litter_id: string | null; name: string | null; collar_color: string | null; birth_at: string | null; status: string | null; health_status: string | null };
type WeightLog = { id: string; puppy_id: string | null; measured_at: string | null; weight_grams: number | null };
type FeedingLog = { id: string; puppy_id: string | null; fed_at: string | null; feeding_type: string | null; amount: string | null };
type MedicationLog = { id: string; puppy_id: string | null; administered_at: string | null; medication_name: string | null; status: string | null };
type PuppyEvent = { id: string; puppy_id: string | null; event_type: string | null; event_at: string | null; summary: string | null };
type MediaRow = { id: string; dog_id: string | null; puppy_id: string | null; is_primary: boolean | null };

const sections: Array<{ key: SectionKey; href: string; label: string }> = [
  { key: "overview", href: "/staff/breeding#overview", label: "Overview" },
  { key: "dogs", href: "/staff/breeding/dogs#dogs", label: "Dogs" },
  { key: "pairings", href: "/staff/breeding/pairings#pairings", label: "Pairings" },
  { key: "pregnancies", href: "/staff/breeding/pregnancies#pregnancies", label: "Pregnancies" },
  { key: "whelping", href: "/staff/breeding/whelping#whelping", label: "Whelping" },
  { key: "litters", href: "/staff/breeding/litters#litters", label: "Litters" },
  { key: "puppy-care", href: "/staff/breeding/puppy-care#puppy-care", label: "Puppy Growth" },
  { key: "calendar", href: "/staff/breeding/calendar#calendar", label: "Calendar" },
  { key: "tasks", href: "/staff/breeding/tasks#tasks", label: "Tasks" },
  { key: "alerts", href: "/staff/breeding/alerts#alerts", label: "Alerts" },
];

const breedingTables = [
  "breeding_dogs",
  "breeding_health_records",
  "breeding_genetic_records",
  "breeding_pedigree_notes",
  "breeding_heat_cycles",
  "breeding_pairings",
  "breeding_pairing_reviews",
  "breeding_pairing_notes",
  "breeding_pregnancies",
  "breeding_whelping_events",
  "litters",
  "puppies",
  "breeding_calendar_events",
  "breeding_tasks",
  "breeding_alerts",
  "breeding_program_notes",
  "breeder_tasks",
  "breeder_events",
] as const;

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

async function readRows<T>(table: string, params: Record<string, string>): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [], warning: "Core read configuration is not available for server-side operational reads." };
  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { rows: [], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }
  return { rows: (await response.json()) as T[], warning: null };
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(row: AnyRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(row: AnyRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatKey(value: string | null | undefined) {
  return display(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function isOpenStatus(value: string | null | undefined) {
  const status = normalized(value);
  return !["complete", "completed", "closed", "resolved", "done", "cancelled", "archived"].includes(status);
}

function isActiveStatus(value: string | null | undefined) {
  const status = normalized(value);
  return !["retired", "archived", "inactive", "deceased", "cancelled", "completed"].includes(status);
}

function statusTone(status: string | null | undefined): "neutral" | "green" | "blue" | "amber" | "red" {
  const value = normalized(status);
  if (["active", "ready", "complete", "completed", "normal", "resolved"].includes(value)) return "green";
  if (["pregnant", "reserved", "scheduled", "planned"].includes(value)) return "blue";
  if (["watch", "pending", "due", "draft", "open", "review"].includes(value)) return "amber";
  if (["critical", "overdue", "blocked", "failed", "missing"].includes(value)) return "red";
  return "neutral";
}

function dogName(dog: CoreDog | undefined | null) {
  if (!dog) return "Dog not linked";
  return dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
}

function puppyName(puppy: CorePuppy | undefined | null) {
  if (!puppy) return "Puppy not linked";
  return puppy.name || puppy.collar_color || `Puppy ${puppy.id.slice(0, 8)}`;
}

function rowName(row: AnyRow, fallback: string) {
  return firstString(row, ["name", "title", "summary", "litter_name", "call_name", "registered_name", "event_type", "task_title", "alert_title"]) ?? fallback;
}

function rowStatus(row: AnyRow) {
  return firstString(row, ["status", "state", "review_status", "severity", "priority"]) ?? "unknown";
}

function rowDate(row: AnyRow) {
  return firstString(row, ["due_date", "due_at", "scheduled_at", "event_at", "planned_at", "breeding_date", "actual_breeding_date", "confirmed_at", "whelped_at", "created_at"]);
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GenericRow({ row, table }: { row: AnyRow; table: string }) {
  const status = rowStatus(row);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{rowName(row, `${table} row`)}</p>
          <p className="mt-1 text-slate-500">{table} / {formatDate(rowDate(row))}</p>
        </div>
        <OperatorStatusPill tone={statusTone(status)}>{formatKey(status)}</OperatorStatusPill>
      </div>
    </article>
  );
}

export async function BreedingReadinessPage({ focus = "overview" }: { focus?: SectionKey }) {
  await requireStaffProfile();

  const [dogsResult, littersResult, puppiesResult, weightResult, feedingResult, medicationResult, puppyEventsResult, mediaResult, ...legacyResults] = await Promise.all([
    readRows<CoreDog>("core_dogs", { select: "id,registered_name,call_name,sex,color,coat_type,birth_at,status,metadata", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<CoreLitter>("core_litters", { select: "id,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,status,details_pending", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<CorePuppy>("core_puppies", { select: "id,litter_id,name,collar_color,birth_at,status,health_status", order: "updated_at.desc.nullslast", limit: "750" }),
    readRows<WeightLog>("core_weight_logs", { select: "id,puppy_id,measured_at,weight_grams", order: "measured_at.desc.nullslast", limit: "1000" }),
    readRows<FeedingLog>("core_feeding_logs", { select: "id,puppy_id,fed_at,feeding_type,amount", order: "fed_at.desc.nullslast", limit: "1000" }),
    readRows<MedicationLog>("core_medication_logs", { select: "id,puppy_id,administered_at,medication_name,status", order: "administered_at.desc.nullslast", limit: "1000" }),
    readRows<PuppyEvent>("core_puppy_events", { select: "id,puppy_id,event_type,event_at,summary", order: "event_at.desc.nullslast", limit: "1000" }),
    readRows<MediaRow>("core_kennel_media", { select: "id,dog_id,puppy_id,is_primary", order: "uploaded_at.desc.nullslast", limit: "1000" }),
    ...breedingTables.map((table) => readRows<AnyRow>(table, { select: "*", limit: "500" })),
  ]);

  const legacy = Object.fromEntries(breedingTables.map((table, index) => [table, legacyResults[index]?.rows ?? []])) as Record<(typeof breedingTables)[number], AnyRow[]>;
  const warnings = [dogsResult, littersResult, puppiesResult, weightResult, feedingResult, medicationResult, puppyEventsResult, mediaResult, ...legacyResults].map((result) => result.warning).filter(Boolean);
  const dogs = dogsResult.rows;
  const litters = littersResult.rows;
  const puppies = puppiesResult.rows;
  const dogById = new Map(dogs.map((dog) => [dog.id, dog]));
  const litterById = new Map(litters.map((litter) => [litter.id, litter]));
  const activeDams = dogs.filter((dog) => normalized(dog.sex) === "female" && isActiveStatus(dog.status));
  const activeSires = dogs.filter((dog) => normalized(dog.sex) === "male" && isActiveStatus(dog.status));
  const plannedPairings = legacy.breeding_pairings.filter((row) => ["planned", "pending", "in progress", "active"].includes(normalized(rowStatus(row))));
  const pregnantRows = legacy.breeding_pregnancies.filter((row) => ["pregnant", "confirmed", "suspected", "active"].includes(normalized(rowStatus(row))));
  const dueSoonPregnancies = legacy.breeding_pregnancies.filter((row) => {
    const days = daysUntil(firstString(row, ["due_date", "expected_due_date", "whelping_due_date"]));
    return days !== null && days >= 0 && days <= 14;
  });
  const overduePregnancies = legacy.breeding_pregnancies.filter((row) => {
    const days = daysUntil(firstString(row, ["due_date", "expected_due_date", "whelping_due_date"]));
    return days !== null && days < 0 && isOpenStatus(rowStatus(row));
  });
  const activeLitters = litters.filter((litter) => isActiveStatus(litter.status));
  const openTasks = [...legacy.breeding_tasks, ...legacy.breeder_tasks].filter((row) => isOpenStatus(rowStatus(row)));
  const openAlerts = legacy.breeding_alerts.filter((row) => isOpenStatus(rowStatus(row)));
  const upcomingCalendar = legacy.breeding_calendar_events.filter((row) => {
    const days = daysUntil(rowDate(row));
    return days !== null && days >= 0 && days <= 7;
  });
  const latestWeightByPuppy = new Map<string, WeightLog>();
  for (const log of weightResult.rows) if (log.puppy_id && !latestWeightByPuppy.has(log.puppy_id)) latestWeightByPuppy.set(log.puppy_id, log);
  const latestFeedingByPuppy = new Map<string, FeedingLog>();
  for (const log of feedingResult.rows) if (log.puppy_id && !latestFeedingByPuppy.has(log.puppy_id)) latestFeedingByPuppy.set(log.puppy_id, log);
  const latestMedicationByPuppy = new Map<string, MedicationLog>();
  for (const log of medicationResult.rows) if (log.puppy_id && !latestMedicationByPuppy.has(log.puppy_id)) latestMedicationByPuppy.set(log.puppy_id, log);
  const latestEventByPuppy = new Map<string, PuppyEvent>();
  for (const event of puppyEventsResult.rows) if (event.puppy_id && !latestEventByPuppy.has(event.puppy_id)) latestEventByPuppy.set(event.puppy_id, event);
  const puppiesNeedingWeight = puppies.filter((puppy) => !latestWeightByPuppy.has(puppy.id));
  const puppiesNeedingFeeding = puppies.filter((puppy) => ["newborn", "active", "watch"].includes(normalized(puppy.status)) && !latestFeedingByPuppy.has(puppy.id));
  const puppiesWithMedication = puppies.filter((puppy) => latestMedicationByPuppy.has(puppy.id));
  const puppiesWithHealthAttention = puppies.filter((puppy) => ["watch", "concern", "needs review", "critical"].includes(normalized(puppy.health_status)));
  const missingPuppyRosterLitters = litters.filter((litter) => (litter.total_puppies ?? 0) > 0 && puppies.filter((puppy) => puppy.litter_id === litter.id).length === 0);
  const attention = [
    ...overduePregnancies.map((row) => ({ title: rowName(row, "Pregnancy overdue"), detail: "Pregnancy due date is past and outcome is still open.", href: "/staff/breeding/pregnancies" })),
    ...dueSoonPregnancies.map((row) => ({ title: rowName(row, "Pregnancy due soon"), detail: "Pregnancy/whelping date is due within 14 days.", href: "/staff/breeding/whelping" })),
    ...missingPuppyRosterLitters.map((litter) => ({ title: display(litter.litter_name, `Litter ${litter.id.slice(0, 8)}`), detail: "Litter count exists but no linked puppy roster was found.", href: `/staff/litters/${litter.id}` })),
    ...puppiesNeedingWeight.slice(0, 12).map((puppy) => ({ title: puppyName(puppy), detail: "No recent weight row was found in available Core weight logs.", href: `/staff/puppies/${puppy.id}` })),
    ...openAlerts.slice(0, 12).map((row) => ({ title: rowName(row, "Open breeding alert"), detail: "Open breeding/care alert needs owner/operator review.", href: "/staff/breeding/alerts" })),
  ];
  const visibleSections = focus === "overview" ? sections.map((section) => section.key) : ["overview", focus, "alerts"];

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <OperatorHeader
          eyebrow="Breeding Program"
          title="Breeding Program / Kennel Care / Puppy Growth Command Center"
          summary="Internal owner/operator readiness for breeding dogs, pairings, pregnancies, whelping, litters, puppy growth, feeding, medication, calendar, tasks, and alerts. Read-only unless existing protected care actions already exist on related pages."
          status={`${activeDams.length} active dams / ${activeSires.length} active sires`}
          blockers={`${attention.length} attention item(s)`}
          nextAction="Review due pregnancies, whelping readiness, puppy growth gaps, open breeding tasks, and alerts."
          links={[
            { href: "/staff/breeding/puppy-care", label: "Puppy Care" },
            { href: "/staff/breeding/calendar", label: "Calendar" },
            { href: "/staff/breeding/tasks", label: "Tasks" },
            { href: "/staff/breeding/alerts", label: "Alerts" },
          ]}
        />

        {warnings.length ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Some breeding/care tables could not be read in this environment. The command center stays read-only and shows available Core/legacy rows only.</section> : null}

        <SummaryStrip
          items={[
            { label: "Active dams", value: activeDams.length, note: "Core dog rows" },
            { label: "Active sires", value: activeSires.length, note: "Core dog rows" },
            { label: "Pregnancies", value: pregnantRows.length, note: `${dueSoonPregnancies.length} due soon / ${overduePregnancies.length} overdue` },
            { label: "Active litters", value: activeLitters.length, note: `${puppies.length} puppy rows` },
            { label: "Open alerts", value: openAlerts.length, note: `${openTasks.length} open task(s)` },
          ]}
        />

        <SectionNav items={sections.map((section) => ({ href: section.href, label: section.label }))} />

        {visibleSections.includes("overview") ? <Section id="overview" title="Overview"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><MetricCard label="Pairings planned/active" value={plannedPairings.length} note="breeding_pairings" /><MetricCard label="Upcoming calendar" value={upcomingCalendar.length} note="due within 7 days" /><MetricCard label="Puppies needing weight" value={puppiesNeedingWeight.length} note="missing available weight row" /><MetricCard label="Puppies needing feeding" value={puppiesNeedingFeeding.length} note="active/newborn/watch without feeding row" /><MetricCard label="Medication logs" value={medicationResult.rows.length} note={`${puppiesWithMedication.length} puppy signal(s)`} /><MetricCard label="Health attention" value={puppiesWithHealthAttention.length} note="watch/concern/critical markers" /></div></Section> : null}

        {visibleSections.includes("dogs") ? <Section id="dogs" title="Dog Breeding Profile Readiness"><div className="grid gap-4 xl:grid-cols-2">{dogs.length ? dogs.map((dog) => {
          const dogMedia = mediaResult.rows.filter((row) => row.dog_id === dog.id);
          const health = legacy.breeding_health_records.filter((row) => firstString(row, ["dog_id", "core_dog_id", "breeding_dog_id"]) === dog.id);
          const genetics = legacy.breeding_genetic_records.filter((row) => firstString(row, ["dog_id", "core_dog_id", "breeding_dog_id"]) === dog.id);
          const heatCycles = legacy.breeding_heat_cycles.filter((row) => firstString(row, ["dog_id", "dam_id", "core_dog_id"]) === dog.id);
          return <article key={dog.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{dogName(dog)}</p><p className="mt-1 text-sm text-slate-500">{formatKey(dog.sex)} / {formatKey(dog.status)} / {display(dog.color)} {display(dog.coat_type, "")}</p></div><OperatorStatusPill tone={statusTone(dog.status)}>{formatKey(dog.status)}</OperatorStatusPill></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-4"><div><dt className="text-slate-400">Health</dt><dd className="font-semibold">{health.length} row(s)</dd></div><div><dt className="text-slate-400">Genetics</dt><dd className="font-semibold">{genetics.length} row(s)</dd></div><div><dt className="text-slate-400">Heat cycles</dt><dd className="font-semibold">{heatCycles.length}</dd></div><div><dt className="text-slate-400">Photos</dt><dd className="font-semibold">{dogMedia.length}</dd></div></dl><Link href={`/staff/dogs/${dog.id}`} className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Dog detail</Link></article>;
        }) : <EmptyState text="No Core dog rows found." />}</div></Section> : null}

        {visibleSections.includes("pairings") ? <Section id="pairings" title="Pairing Readiness"><div className="grid gap-4 xl:grid-cols-2">{legacy.breeding_pairings.length ? legacy.breeding_pairings.map((row, index) => <GenericRow key={`pairing-${index}`} row={row} table="breeding_pairings" />) : <EmptyState text="No breeding_pairings rows found." />}</div></Section> : null}
        {visibleSections.includes("pregnancies") ? <Section id="pregnancies" title="Pregnancy Readiness"><div className="grid gap-4 xl:grid-cols-2">{legacy.breeding_pregnancies.length ? legacy.breeding_pregnancies.map((row, index) => <GenericRow key={`pregnancy-${index}`} row={row} table={`due ${formatDate(firstString(row, ["due_date", "expected_due_date", "whelping_due_date"]))}`} />) : <EmptyState text="No breeding_pregnancies rows found." />}</div></Section> : null}
        {visibleSections.includes("whelping") ? <Section id="whelping" title="Whelping Readiness"><div className="grid gap-4 xl:grid-cols-2">{legacy.breeding_whelping_events.length ? legacy.breeding_whelping_events.map((row, index) => <GenericRow key={`whelping-${index}`} row={row} table={`born ${firstNumber(row, ["total_born", "live_born", "puppy_count"]) ?? "not recorded"}`} />) : <EmptyState text="No breeding_whelping_events rows found." />}</div></Section> : null}
        {visibleSections.includes("litters") ? <Section id="litters" title="Litter Readiness"><div className="grid gap-4 xl:grid-cols-2">{litters.length ? litters.map((litter) => { const roster = puppies.filter((puppy) => puppy.litter_id === litter.id); return <article key={litter.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{display(litter.litter_name, `Litter ${litter.id.slice(0, 8)}`)}</p><p className="mt-1 text-sm text-slate-500">Dam: {dogName(litter.dam_id ? dogById.get(litter.dam_id) : null)} / Sire: {dogName(litter.sire_id ? dogById.get(litter.sire_id) : null)}</p></div><OperatorStatusPill tone={statusTone(litter.status)}>{formatKey(litter.status)}</OperatorStatusPill></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-4"><div><dt className="text-slate-400">Expected</dt><dd className="font-semibold">{formatDate(litter.expected_birth_at)}</dd></div><div><dt className="text-slate-400">Whelped</dt><dd className="font-semibold">{formatDate(litter.birth_at)}</dd></div><div><dt className="text-slate-400">Puppies</dt><dd className="font-semibold">{roster.length} / {litter.total_puppies ?? "?"}</dd></div><div><dt className="text-slate-400">Details</dt><dd className="font-semibold">{litter.details_pending ? "Pending" : "Ready signal"}</dd></div></dl><Link href={`/staff/litters/${litter.id}`} className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Litter detail</Link></article>; }) : <EmptyState text="No Core litter rows found." />}</div></Section> : null}
        {visibleSections.includes("puppy-care") ? <Section id="puppy-care" title="Puppy Growth / Care"><div className="grid gap-4 xl:grid-cols-2">{puppies.length ? puppies.map((puppy) => { const litter = puppy.litter_id ? litterById.get(puppy.litter_id) : null; const weight = latestWeightByPuppy.get(puppy.id); const feeding = latestFeedingByPuppy.get(puppy.id); const medication = latestMedicationByPuppy.get(puppy.id); const event = latestEventByPuppy.get(puppy.id); const needsCare = !weight || !feeding || ["watch", "concern", "critical"].includes(normalized(puppy.health_status)); return <article key={puppy.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{puppyName(puppy)}</p><p className="mt-1 text-sm text-slate-500">{display(litter?.litter_name, "Litter not linked")} / {formatKey(puppy.health_status)}</p></div><OperatorStatusPill tone={needsCare ? "amber" : "green"}>{needsCare ? "Care review" : "Current signal"}</OperatorStatusPill></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-4"><div><dt className="text-slate-400">Weight</dt><dd className="font-semibold">{weight ? `${weight.weight_grams ?? "?"}g / ${formatDate(weight.measured_at)}` : "Missing"}</dd></div><div><dt className="text-slate-400">Feeding</dt><dd className="font-semibold">{feeding ? formatDate(feeding.fed_at) : "Missing"}</dd></div><div><dt className="text-slate-400">Medication</dt><dd className="font-semibold">{medication ? display(medication.medication_name) : "None logged"}</dd></div><div><dt className="text-slate-400">Event</dt><dd className="font-semibold">{event ? formatKey(event.event_type) : "No event"}</dd></div></dl><Link href={`/staff/puppies/${puppy.id}`} className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Puppy detail</Link></article>; }) : <EmptyState text="No Core puppy rows found." />}</div></Section> : null}
        {visibleSections.includes("calendar") ? <Section id="calendar" title="Calendar Events"><div className="grid gap-4 xl:grid-cols-2">{legacy.breeding_calendar_events.length ? legacy.breeding_calendar_events.map((row, index) => <GenericRow key={`calendar-${index}`} row={row} table="breeding_calendar_events" />) : <EmptyState text="No breeding_calendar_events rows found." />}</div></Section> : null}
        {visibleSections.includes("tasks") ? <Section id="tasks" title="Breeding Tasks"><div className="grid gap-4 xl:grid-cols-2">{[...legacy.breeding_tasks, ...legacy.breeder_tasks].length ? [...legacy.breeding_tasks, ...legacy.breeder_tasks].map((row, index) => <GenericRow key={`task-${index}`} row={row} table="breeding/breeder tasks" />) : <EmptyState text="No breeding task rows found." />}</div></Section> : null}
        {visibleSections.includes("alerts") ? <Section id="alerts" title="Alerts And Attention"><div className="space-y-3">{attention.length ? attention.map((item, index) => <article key={`${item.href}-${index}`} className="rounded-2xl border border-amber-200 bg-white p-4 text-sm shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-slate-600">{item.detail}</p></div><Link href={item.href} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Review</Link></div></article>) : <EmptyState text="No breeding/care attention items from available rows." />}</div></Section> : null}
      </div>
    </main>
  );
}
