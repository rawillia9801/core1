import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";
import { ActionPanel } from "../action-panel";

export const dynamic = "force-dynamic";

type ApplicationRow = {
  id: string;
  family_id: string | null;
  buyer_id: string | null;
  external_reference: string | null;
  status: string | null;
  submitted_at: string | null;
  source: string | null;
};

type SectionRow = {
  application_id: string | null;
  section_key: string | null;
  responses: Record<string, unknown> | null;
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
  preference_notes: string | null;
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
};

type DogRow = {
  id: string;
  call_name: string | null;
  registered_name: string | null;
};

type ReservationRow = {
  reservation_id: string;
  reservation_status: string | null;
  reserved_at: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  family_id: string | null;
  family_name: string | null;
  puppy_id: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  puppy_status: string | null;
  application_id: string | null;
  balance_due_cents: number | null;
  go_home_status: string | null;
  go_home_planned_at: string | null;
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
};

type MediaRow = {
  id: string;
  puppy_id: string | null;
  is_primary: boolean | null;
  uploaded_at: string | null;
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
};

type ApplicantCandidate = {
  application: ApplicationRow;
  buyer: BuyerRow | null;
  family: FamilyRow | null;
  preference: PreferenceState;
  activeReservation: ReservationRow | null;
  documents: DocumentRow[];
};

type PuppyCandidate = {
  puppy: PuppyRow;
  litter: LitterRow | null;
  dam: DogRow | null;
  sire: DogRow | null;
  activeReservation: ReservationRow | null;
  documents: DocumentRow[];
  media: MediaRow[];
};

type PreferenceState = {
  gender: string | null;
  coat: string | null;
  color: string | null;
  timing: string | null;
  notes: string | null;
  source: string;
};

type MatchCandidate = {
  applicant: ApplicantCandidate;
  puppy: PuppyCandidate;
  score: number;
  indicators: Array<{ label: string; value: string; tone: "green" | "blue" | "amber" | "red" | "slate" }>;
  blockers: string[];
  label: "Strong Fit" | "Possible Fit" | "Needs Review" | "Blocked" | "Already Reserved" | "Missing Preference Data" | "Missing Puppy Data";
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();
  if (!config) return { rows: [] as T[], warning: "Core read configuration is not available for server-side operational reads." };
  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }
  return { rows: (await response.json()) as T[], warning: null };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function buyerName(buyer: BuyerRow | null) {
  if (!buyer) return "Unlinked applicant";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || buyer.phone || `Buyer ${shortId(buyer.id)}`;
}

function familyName(family: FamilyRow | null) {
  return family?.name || (family ? `Family ${shortId(family.id)}` : "Family not linked");
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || `Puppy ${shortId(puppy.id)}`;
}

function litterName(litter: LitterRow | null) {
  return litter?.litter_name || (litter ? `Litter ${shortId(litter.id)}` : "No litter linked");
}

function dogName(dog: DogRow | null) {
  return dog?.call_name || dog?.registered_name || (dog ? `Dog ${shortId(dog.id)}` : "Not linked");
}

function responseText(responses: Record<string, unknown> | null, key: string) {
  const value = responses?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function applicationPreference(applicationId: string, sections: SectionRow[], preference: PreferenceRow | undefined): PreferenceState {
  const section = sections.find((row) => row.application_id === applicationId && row.section_key === "puppy_preferences");
  const fallbackSection = sections.find((row) => row.application_id === applicationId && row.responses);
  const responses = section?.responses ?? fallbackSection?.responses ?? null;
  const coat = responseText(responses, "preferredCoatType") ?? preference?.preferred_coat_types?.[0] ?? null;
  const gender = responseText(responses, "preferredGender") ?? preference?.preferred_sex ?? null;
  const color = responseText(responses, "colorPreference") ?? preference?.preferred_colors?.join(", ") ?? null;
  const timing = responseText(responses, "desiredAdoptionDate") ?? preference?.desired_timing ?? null;
  const notes = responseText(responses, "interestType") ?? preference?.preference_notes ?? null;
  return {
    gender,
    coat,
    color,
    timing,
    notes,
    source: section ? "application answers" : preference ? "buyer preferences" : "not recorded",
  };
}

function isActiveReservation(status: string | null | undefined) {
  return !["cancelled", "void", "released", "completed"].includes(normalizeText(status));
}

function isAvailablePuppy(puppy: PuppyRow, reservation: ReservationRow | null) {
  return normalizeText(puppy.status) === "available" && !reservation;
}

function isReviewReadyApplication(status: string | null | undefined) {
  return ["approved", "received", "needs review", "needs_review", "waitlisted", "waitlist"].includes(normalizeText(status));
}

function isApprovedApplication(status: string | null | undefined) {
  return normalizeText(status) === "approved";
}

function isWaitlistStatus(status: string | null | undefined) {
  return ["waitlisted", "waitlist"].includes(normalizeText(status));
}

function isCompleteDocument(status: string | null | undefined) {
  return ["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(normalizeText(status));
}

function documentReadiness(documents: DocumentRow[]) {
  if (documents.length === 0) return "No document record found";
  const complete = documents.filter((document) => isCompleteDocument(document.status)).length;
  return `${complete} of ${documents.length} ready`;
}

function mediaReadiness(media: MediaRow[]) {
  if (media.length === 0) return "No media record found";
  return media.some((row) => row.is_primary) ? `${media.length} photo(s), primary set` : `${media.length} photo(s), primary missing`;
}

function paymentReadiness(reservation: ReservationRow | null) {
  if (!reservation) return "No active reservation balance";
  if (reservation.balance_due_cents === null || reservation.balance_due_cents === undefined) return "Balance not recorded";
  if (reservation.balance_due_cents > 0) return "Open balance";
  return "Balance clear";
}

function listHasPreference(value: string | null) {
  const normalized = normalizeText(value);
  return Boolean(normalized && !["no preference", "undecided", "not recorded"].includes(normalized));
}

function fitIndicator(label: string, passed: boolean | null): { label: string; value: string; tone: "green" | "blue" | "amber" | "red" | "slate" } {
  if (passed === true) return { label, value: "Match", tone: "green" };
  if (passed === false) return { label, value: "Review", tone: "amber" };
  return { label, value: "Missing", tone: "slate" };
}

function textMatchesPreference(preference: string | null, value: string | null | undefined) {
  if (!listHasPreference(preference)) return null;
  if (!value) return false;
  return normalizeText(preference).includes(normalizeText(value)) || normalizeText(value).includes(normalizeText(preference));
}

function timingMatches(preference: string | null, puppy: PuppyRow) {
  if (!listHasPreference(preference)) return null;
  if (!puppy.birth_at) return null;
  return "review";
}

function buildMatch(applicant: ApplicantCandidate, puppy: PuppyCandidate): MatchCandidate {
  const gender = textMatchesPreference(applicant.preference.gender, puppy.puppy.sex);
  const coat = textMatchesPreference(applicant.preference.coat, puppy.puppy.coat_type);
  const color = textMatchesPreference(applicant.preference.color, puppy.puppy.color);
  const timing = timingMatches(applicant.preference.timing, puppy.puppy);
  const puppyAvailable = isAvailablePuppy(puppy.puppy, puppy.activeReservation);
  const appReady = isReviewReadyApplication(applicant.application.status);
  const docsVisible = applicant.documents.length + puppy.documents.length > 0;
  const mediaReady = puppy.media.some((row) => row.is_primary);
  const indicators = [
    fitIndicator("Gender", gender),
    fitIndicator("Coat", coat),
    fitIndicator("Color", color),
    timing === "review" ? { label: "Timing", value: "Review", tone: "blue" as const } : fitIndicator("Timing", timing),
    { label: "Readiness", value: appReady && puppyAvailable ? "Match" : "Review", tone: appReady && puppyAvailable ? "green" as const : "amber" as const },
  ];
  const score =
    indicators.filter((indicator) => indicator.value === "Match").length +
    (docsVisible ? 1 : 0) +
    (mediaReady ? 1 : 0);
  const blockers = [
    !applicant.application.buyer_id ? "Buyer record is not linked." : null,
    !applicant.application.family_id ? "Family record is not linked." : null,
    !appReady ? `Application status is ${formatKey(applicant.application.status)}.` : null,
    !puppyAvailable ? "Puppy is not available or has an active reservation." : null,
    !applicant.preference.gender && !applicant.preference.coat && !applicant.preference.color ? "Preference not recorded." : null,
    !puppy.puppy.sex || !puppy.puppy.coat_type || !puppy.puppy.color ? "Puppy sex, coat, or color data is incomplete." : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
  let label: MatchCandidate["label"] = "Needs Review";
  if (puppy.activeReservation) label = "Already Reserved";
  else if (blockers.some((blocker) => blocker.includes("not available") || blocker.includes("not linked"))) label = "Blocked";
  else if (!applicant.preference.gender && !applicant.preference.coat && !applicant.preference.color) label = "Missing Preference Data";
  else if (!puppy.puppy.sex || !puppy.puppy.coat_type || !puppy.puppy.color) label = "Missing Puppy Data";
  else if (score >= 5) label = "Strong Fit";
  else if (score >= 3) label = "Possible Fit";
  return { applicant, puppy, score, indicators, blockers, label };
}

function pillTone(label: MatchCandidate["label"]): "green" | "blue" | "amber" | "red" | "slate" {
  if (label === "Strong Fit") return "green";
  if (label === "Possible Fit") return "blue";
  if (label === "Blocked" || label === "Already Reserved") return "red";
  if (label.includes("Missing")) return "amber";
  return "slate";
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "blue" | "amber" | "red" | "slate" }) {
  const classes = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[tone]}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function MatchCard({ match }: { match: MatchCandidate }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-950">{buyerName(match.applicant.buyer)}</p>
            <Badge tone={pillTone(match.label)}>{match.label}</Badge>
            <Badge>{match.blockers.length} blocker(s)</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {familyName(match.applicant.family)} / {formatKey(match.applicant.application.status)} / preferences from {match.applicant.preference.source}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/staff/applications/${match.applicant.application.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Application</Link>
          {match.applicant.buyer ? <Link href={`/staff/buyers/${match.applicant.buyer.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Buyer</Link> : null}
          {match.applicant.family ? <Link href={`/staff/families/${match.applicant.family.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Family</Link> : null}
          <Link href={`/staff/puppies/${match.puppy.puppy.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Puppy</Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white bg-white p-4 text-sm">
          <p className="font-bold text-slate-950">Applicant / Family</p>
          <dl className="mt-3 grid gap-2">
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Preferred gender</dt><dd>{display(match.applicant.preference.gender, "Preference not recorded")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Preferred coat</dt><dd>{display(match.applicant.preference.coat, "Preference not recorded")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Color preference</dt><dd>{display(match.applicant.preference.color, "Preference not recorded")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Desired timing</dt><dd>{display(match.applicant.preference.timing, "Preference not recorded")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Payment / documents</dt><dd>{paymentReadiness(match.applicant.activeReservation)} / {documentReadiness(match.applicant.documents)}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl border border-white bg-white p-4 text-sm">
          <p className="font-bold text-slate-950">{puppyName(match.puppy.puppy)}</p>
          <dl className="mt-3 grid gap-2">
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Litter</dt><dd>{litterName(match.puppy.litter)} / Dam {dogName(match.puppy.dam)} / Sire {dogName(match.puppy.sire)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Sex / coat / color</dt><dd>{formatKey(match.puppy.puppy.sex)} / {display(match.puppy.puppy.coat_type)} / {display(match.puppy.puppy.color)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Age / status</dt><dd>{formatDate(match.puppy.puppy.birth_at)} / {formatKey(match.puppy.puppy.status)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-400">Media / documents</dt><dd>{mediaReadiness(match.puppy.media)} / {documentReadiness(match.puppy.documents)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {match.indicators.map((indicator) => <Badge key={indicator.label} tone={indicator.tone}>{indicator.label}: {indicator.value}</Badge>)}
      </div>
      {match.blockers.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          {match.blockers.join(" ")}
        </div>
      ) : null}
    </article>
  );
}

export default async function MatchingPage() {
  await requireStaffProfile();

  const [applicationResult, sectionResult, buyerResult, familyResult, preferenceResult, puppyResult, litterResult, dogResult, reservationResult, documentResult, mediaResult, eventResult] = await Promise.all([
    readRows<ApplicationRow>("core_applications", { select: "id,family_id,buyer_id,external_reference,status,submitted_at,source", order: "submitted_at.desc.nullslast,created_at.desc", limit: "200" }),
    readRows<SectionRow>("core_application_sections", { select: "application_id,section_key,responses", order: "updated_at.desc", limit: "500" }),
    readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,approval_status", order: "updated_at.desc", limit: "500" }),
    readRows<FamilyRow>("core_families", { select: "id,name,status", order: "updated_at.desc", limit: "500" }),
    readRows<PreferenceRow>("core_buyer_preferences", { select: "buyer_id,preferred_sex,preferred_colors,preferred_coat_types,desired_timing,preference_notes", order: "updated_at.desc", limit: "500" }),
    readRows<PuppyRow>("core_puppies", { select: "id,litter_id,name,collar_color,sex,color,coat_type,birth_at,status,health_status,updated_at", order: "created_at.desc", limit: "500" }),
    readRows<LitterRow>("core_litters", { select: "id,litter_name,dam_id,sire_id,birth_at,expected_birth_at,status", order: "created_at.desc", limit: "500" }),
    readRows<DogRow>("core_dogs", { select: "id,call_name,registered_name", order: "created_at.desc", limit: "500" }),
    readRows<ReservationRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,balance_due_cents,go_home_status,go_home_planned_at", order: "reserved_at.desc.nullslast,created_at.desc", limit: "500" }),
    readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status", order: "updated_at.desc", limit: "500" }),
    readRows<MediaRow>("core_kennel_media", { select: "id,puppy_id,is_primary,uploaded_at", entity_type: "eq.puppy", order: "uploaded_at.desc", limit: "500" }),
    readRows<EventRow>("core_events", { select: "id,event_type,summary,event_at,buyer_id,family_id,puppy_id,reservation_id,application_id", order: "event_at.desc", limit: "20" }),
  ]);

  const buyersById = new Map(buyerResult.rows.map((buyer) => [buyer.id, buyer]));
  const familiesById = new Map(familyResult.rows.map((family) => [family.id, family]));
  const preferencesByBuyer = new Map(preferenceResult.rows.filter((row) => row.buyer_id).map((row) => [row.buyer_id as string, row]));
  const littersById = new Map(litterResult.rows.map((litter) => [litter.id, litter]));
  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));
  const activeReservations = reservationResult.rows.filter((row) => isActiveReservation(row.reservation_status));
  const reservationByPuppy = new Map(activeReservations.filter((row) => row.puppy_id).map((row) => [row.puppy_id as string, row]));
  const reservationByApplication = new Map(activeReservations.filter((row) => row.application_id).map((row) => [row.application_id as string, row]));
  const reservationByBuyer = new Map(activeReservations.filter((row) => row.buyer_id).map((row) => [row.buyer_id as string, row]));

  const applicantCandidates = applicationResult.rows
    .filter((application) => isReviewReadyApplication(application.status))
    .map((application) => {
      const buyer = application.buyer_id ? buyersById.get(application.buyer_id) ?? null : null;
      const family = application.family_id ? familiesById.get(application.family_id) ?? null : null;
      const documents = documentResult.rows.filter((document) =>
        document.buyer_id === application.buyer_id ||
        document.family_id === application.family_id ||
        document.reservation_id === reservationByApplication.get(application.id)?.reservation_id,
      );
      return {
        application,
        buyer,
        family,
        preference: applicationPreference(application.id, sectionResult.rows, application.buyer_id ? preferencesByBuyer.get(application.buyer_id) : undefined),
        activeReservation: reservationByApplication.get(application.id) ?? (application.buyer_id ? reservationByBuyer.get(application.buyer_id) ?? null : null),
        documents,
      };
    });

  const puppyCandidates = puppyResult.rows.map((puppy) => {
    const litter = puppy.litter_id ? littersById.get(puppy.litter_id) ?? null : null;
    return {
      puppy,
      litter,
      dam: litter?.dam_id ? dogsById.get(litter.dam_id) ?? null : null,
      sire: litter?.sire_id ? dogsById.get(litter.sire_id) ?? null : null,
      activeReservation: reservationByPuppy.get(puppy.id) ?? null,
      documents: documentResult.rows.filter((document) => document.puppy_id === puppy.id || document.reservation_id === reservationByPuppy.get(puppy.id)?.reservation_id),
      media: mediaResult.rows.filter((media) => media.puppy_id === puppy.id),
    };
  });

  const availablePuppies = puppyCandidates.filter((candidate) => isAvailablePuppy(candidate.puppy, candidate.activeReservation));
  const unmatchedApprovedApplicants = applicantCandidates.filter((candidate) => isApprovedApplication(candidate.application.status) && !candidate.activeReservation);
  const waitlistApplicants = applicantCandidates.filter((candidate) => isWaitlistStatus(candidate.application.status));
  const recentReserved = activeReservations.slice(0, 8);
  const allMatches = applicantCandidates
    .flatMap((applicant) => availablePuppies.map((puppy) => buildMatch(applicant, puppy)))
    .sort((a, b) => b.score - a.score || a.blockers.length - b.blockers.length)
    .slice(0, 30);
  const reservationReady = allMatches.filter((match) =>
    isApprovedApplication(match.applicant.application.status) &&
    isAvailablePuppy(match.puppy.puppy, match.puppy.activeReservation) &&
    match.score >= 3 &&
    !match.blockers.some((blocker) => blocker.includes("not linked") || blocker.includes("not available")),
  );
  const blockedMatches = allMatches.filter((match) => match.blockers.length > 0);
  const warnings = [applicationResult, sectionResult, buyerResult, familyResult, preferenceResult, puppyResult, litterResult, dogResult, reservationResult, documentResult, mediaResult, eventResult].map((result) => result.warning).filter(Boolean) as string[];

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <OperatorHeader
          eyebrow="Core Matching"
          title="Matchmaking Command Center"
          summary="Internal owner/operator decision-support view for matching applicants and waitlist families to available puppies using existing Core records only."
          status={`${allMatches.length} visible fit candidates`}
          blockers={blockedMatches.length ? `${blockedMatches.length} candidate blocker(s)` : "No deterministic match blockers"}
          nextAction={reservationReady.length ? `${reservationReady.length} reservation-ready candidate(s) to review` : "Review missing preferences and available puppy data"}
          links={[
            { href: "/staff/applications", label: "Applications" },
            { href: "/staff/puppies", label: "Puppies" },
            { href: "/staff/reservations", label: "Reservations" },
            { href: "/staff/documents", label: "Documents" },
            { href: "/staff/media", label: "Media" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Decision-support only</p>
          <p className="mt-2 text-sm leading-6">
            This page does not approve, deny, assign puppies, create reservations, send messages, move money, create contracts, generate documents, or call outside services.
          </p>
        </section>

        {warnings.length ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{warnings[0]}</section> : null}

        <SummaryStrip
          items={[
            { label: "Available puppies", value: availablePuppies.length, note: "Available and unreserved" },
            { label: "Applicants", value: applicantCandidates.length, note: "Approved/review/waitlist" },
            { label: "Waitlist", value: waitlistApplicants.length, note: "Waitlist statuses" },
            { label: "Unmatched approved", value: unmatchedApprovedApplicants.length, note: "Approved without active reservation" },
            { label: "Reservation ready", value: reservationReady.length, note: "Readiness signal only" },
          ]}
        />

        <ActionPanel
          nextAction={reservationReady.length ? "Review reservation-ready match candidates" : "Review match blockers and missing preference data"}
          blockers={blockedMatches.length}
          mode="review-only"
          href="/staff/actions#matching"
          detail="Matching actions remain review-only; reservation creation stays in existing operator-confirmed workflows."
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            { href: "#match-queue", label: "Match Queue", count: allMatches.length },
            { href: "#available-puppies", label: "Available Puppies", count: availablePuppies.length },
            { href: "#applicants", label: "Applicants", count: applicantCandidates.length },
            { href: "#waitlist", label: "Waitlist", count: waitlistApplicants.length },
            { href: "#reservation-ready", label: "Reservation Ready", count: reservationReady.length },
            { href: "#blockers", label: "Blockers", count: blockedMatches.length },
            { href: "#recent-activity", label: "Recent Activity", count: recentReserved.length + eventResult.rows.length },
          ]}
        />

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Preference source</p><p className="mt-2 text-2xl font-bold">{sectionResult.rows.filter((row) => row.section_key === "puppy_preferences").length}</p><p className="mt-1 text-sm text-slate-500">application preference sections</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Buyer preference rows</p><p className="mt-2 text-2xl font-bold">{preferenceResult.rows.length}</p><p className="mt-1 text-sm text-slate-500">canonical preference metadata</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Recently reserved</p><p className="mt-2 text-2xl font-bold">{recentReserved.length}</p><p className="mt-1 text-sm text-slate-500">active reservation rows</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Missing preference data</p><p className="mt-2 text-2xl font-bold">{applicantCandidates.filter((row) => !row.preference.gender && !row.preference.coat && !row.preference.color).length}</p><p className="mt-1 text-sm text-slate-500">needs owner review</p></div>
        </section>

        <section id="match-queue" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Match Queue</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {allMatches.length ? allMatches.map((match) => <MatchCard key={`${match.applicant.application.id}-${match.puppy.puppy.id}`} match={match} />) : <EmptyState text="No match candidates can be built from current available puppies and review-ready applicants." />}
          </div>
        </section>

        <section id="available-puppies" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Available Puppies</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availablePuppies.length ? availablePuppies.map((candidate) => (
              <article key={candidate.puppy.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-slate-950">{puppyName(candidate.puppy)}</p><p className="mt-1 text-slate-500">{litterName(candidate.litter)}</p></div>
                  <Badge tone="green">{formatKey(candidate.puppy.status)}</Badge>
                </div>
                <p className="mt-3 leading-6">{formatKey(candidate.puppy.sex)} / {display(candidate.puppy.coat_type)} / {display(candidate.puppy.color)} / born {formatDate(candidate.puppy.birth_at)}</p>
                <p className="mt-2 text-slate-600">{mediaReadiness(candidate.media)} / {documentReadiness(candidate.documents)}</p>
                <p className="mt-2 text-slate-600">Candidate count: {allMatches.filter((match) => match.puppy.puppy.id === candidate.puppy.id).length}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/staff/puppies/${candidate.puppy.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Puppy detail</Link>
                  <Link href="/staff/applications" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Review reservation</Link>
                </div>
              </article>
            )) : <EmptyState text="No available and unreserved puppy rows were found." />}
          </div>
        </section>

        <section id="applicants" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Applicants</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {applicantCandidates.length ? applicantCandidates.map((candidate) => (
              <article key={candidate.application.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold text-slate-950">{buyerName(candidate.buyer)}</p><p className="mt-1 text-slate-500">{familyName(candidate.family)} / submitted {formatDate(candidate.application.submitted_at)}</p></div>
                  <Badge tone={isApprovedApplication(candidate.application.status) ? "green" : isWaitlistStatus(candidate.application.status) ? "blue" : "amber"}>{formatKey(candidate.application.status)}</Badge>
                </div>
                <p className="mt-3 leading-6">Gender {display(candidate.preference.gender, "preference not recorded")} / coat {display(candidate.preference.coat, "preference not recorded")} / color {display(candidate.preference.color, "preference not recorded")} / timing {display(candidate.preference.timing, "preference not recorded")}</p>
                <p className="mt-2 text-slate-600">{paymentReadiness(candidate.activeReservation)} / {documentReadiness(candidate.documents)} / suggested puppies {allMatches.filter((match) => match.applicant.application.id === candidate.application.id && match.label !== "Blocked").length}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/staff/applications/${candidate.application.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Application</Link>
                  {candidate.buyer ? <Link href={`/staff/buyers/${candidate.buyer.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Buyer</Link> : null}
                  {candidate.family ? <Link href={`/staff/families/${candidate.family.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Family</Link> : null}
                  <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Documents</Link>
                  <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Payments</Link>
                </div>
              </article>
            )) : <EmptyState text="No approved, review-ready, or waitlist application rows were found." />}
          </div>
        </section>

        <section id="waitlist" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Waitlist</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {waitlistApplicants.length ? waitlistApplicants.map((candidate) => (
              <article key={candidate.application.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                <p className="font-bold text-slate-950">{buyerName(candidate.buyer)}</p>
                <p className="mt-2 leading-6">{familyName(candidate.family)} / {display(candidate.preference.notes, "Waitlist notes not recorded")} / {display(candidate.preference.timing, "timing not recorded")}</p>
                <Link href={`/staff/applications/${candidate.application.id}`} className="mt-3 inline-flex rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold">Open application</Link>
              </article>
            )) : <EmptyState text="No waitlist application statuses were found from current Core rows." />}
          </div>
        </section>

        <section id="reservation-ready" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Reservation Ready</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {reservationReady.length ? reservationReady.map((match) => <MatchCard key={`ready-${match.applicant.application.id}-${match.puppy.puppy.id}`} match={match} />) : <EmptyState text="No candidates meet the reservation-ready signal yet. This signal requires an approved application, linked buyer/family, available puppy, and no severe deterministic blocker." />}
          </div>
        </section>

        <section id="blockers" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Blockers</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blockedMatches.slice(0, 12).length ? blockedMatches.slice(0, 12).map((match) => (
              <div key={`blocker-${match.applicant.application.id}-${match.puppy.puppy.id}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-bold text-slate-950">{buyerName(match.applicant.buyer)} / {puppyName(match.puppy.puppy)}</p>
                <p className="mt-2">{match.blockers.join(" ")}</p>
              </div>
            )) : <EmptyState text="No deterministic matching blockers were found." />}
          </div>
        </section>

        <section id="recent-activity" className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Recently Assigned / Reserved</h2>
            <div className="mt-5 space-y-3">
              {recentReserved.length ? recentReserved.map((reservation) => (
                <Link key={reservation.reservation_id} href={`/staff/reservations/${reservation.reservation_id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <strong>{display(reservation.puppy_name || reservation.puppy_collar_color, "Puppy")}</strong>
                  <p className="mt-1 text-slate-600">{display(reservation.buyer_name)} / {formatKey(reservation.reservation_status)} / {formatDate(reservation.reserved_at)}</p>
                </Link>
              )) : <EmptyState text="No active reservation rows were found." />}
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
            <div className="mt-5 space-y-3">
              {eventResult.rows.length ? eventResult.rows.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-bold text-slate-950">{formatKey(event.event_type)}</p>
                  <p className="mt-1 text-slate-600">{display(event.summary, "Core event recorded")} / {formatDate(event.event_at)}</p>
                </div>
              )) : <EmptyState text="No recent Core events were found." />}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
