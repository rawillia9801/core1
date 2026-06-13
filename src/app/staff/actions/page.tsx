import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, OperatorStatusPill, SectionNav, SummaryStrip } from "../operator-ui";
import { ActionPanel } from "../action-panel";
import { CommunicationPanel } from "../communication-panel";
import { ProposedActionPanel } from "../proposed-action-panel";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };

type ApplicationRow = {
  id: string;
  status: string | null;
  buyer_id: string | null;
  family_id: string | null;
  submitted_at: string | null;
  created_at: string | null;
  source: string | null;
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

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  status: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
};

type DogRow = {
  id: string;
  call_name: string | null;
  registered_name: string | null;
  status: string | null;
};

type LitterRow = {
  id: string;
  litter_name: string | null;
  status: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
};

type ReservationSummaryRow = {
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
  balance_due_cents: number | null;
  go_home_planned_at: string | null;
  go_home_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
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

type ProposedActionRow = {
  id: string;
  title: string | null;
  action_type: string | null;
  risk_level: string | null;
  status: string | null;
  target_table: string | null;
  target_id: string | null;
  created_at: string | null;
};

type ActionRow = {
  id: string;
  lane: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  status: string;
  href: string;
  actionLabel: string;
  mode: "Action available" | "Review only" | "Blocked";
  blockers: string[];
};

const COMPLETE_DOCUMENT_STATUSES = new Set(["signed", "completed", "complete", "filed", "approved", "accepted", "ready"]);
const ACTIVE_RESERVATION_BLOCKLIST = new Set(["cancelled", "void", "released"]);

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

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) return "Unlinked buyer";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || buyer.phone || `Buyer ${buyer.id.slice(0, 8)}`;
}

function familyName(family: FamilyRow | undefined) {
  return family?.name || (family ? `Family ${family.id.slice(0, 8)}` : "Unlinked family");
}

function puppyName(puppy: PuppyRow | undefined | null) {
  if (!puppy) return "Unlinked puppy";
  return puppy.name || puppy.collar_color || `Puppy ${puppy.id.slice(0, 8)}`;
}

function summaryPuppyName(summary: ReservationSummaryRow) {
  return display(summary.puppy_name || summary.puppy_collar_color, "Unlinked puppy");
}

function isActiveReservation(row: ReservationSummaryRow) {
  return !ACTIVE_RESERVATION_BLOCKLIST.has(normalized(row.reservation_status));
}

function isCompleteDocument(row: DocumentRow) {
  return COMPLETE_DOCUMENT_STATUSES.has(normalized(row.status));
}

function ActionRowCard({ row }: { row: ActionRow }) {
  const tone = row.mode === "Action available" ? "green" : row.mode === "Blocked" ? "red" : "blue";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <OperatorStatusPill tone={row.priority === "High" ? "red" : row.priority === "Medium" ? "amber" : "blue"}>{row.priority}</OperatorStatusPill>
            <OperatorStatusPill tone={tone}>{row.mode}</OperatorStatusPill>
            <OperatorStatusPill tone={row.blockers.length > 0 ? "amber" : "green"}>{row.blockers.length} blockers</OperatorStatusPill>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-950">{row.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{row.detail}</p>
          {row.blockers.length > 0 ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">{row.blockers.slice(0, 2).join(" / ")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.status}</span>
          <Link href={row.href} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {row.actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

function LaneSection({ id, title, rows, empty }: { id: string; title: string; rows: ActionRow[]; empty: string }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <OperatorStatusPill tone={rows.length > 0 ? "blue" : "green"}>{rows.length}</OperatorStatusPill>
      </div>
      <div className="grid gap-3">
        {rows.length > 0 ? rows.map((row) => <ActionRowCard key={row.id} row={row} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-600">{empty}</div>}
      </div>
    </section>
  );
}

export default async function StaffActionsPage() {
  const staff = await requireStaffProfile();
  const canUseSensitiveActions = staff.role === "owner" || staff.role === "admin";

  const [applicationResult, buyerResult, familyResult, puppyResult, dogResult, litterResult, reservationResult, documentResult, mediaResult, proposalResult] = await Promise.all([
    readRows<ApplicationRow>("core_applications", { select: "id,status,buyer_id,family_id,submitted_at,created_at,source", order: "created_at.desc", limit: "250" }),
    readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,approval_status", order: "created_at.desc", limit: "500" }),
    readRows<FamilyRow>("core_families", { select: "id,name,status", order: "created_at.desc", limit: "500" }),
    readRows<PuppyRow>("core_puppies", { select: "id,litter_id,name,collar_color,status,sex,color,coat_type", order: "created_at.desc", limit: "500" }),
    readRows<DogRow>("core_dogs", { select: "id,call_name,registered_name,status", order: "created_at.desc", limit: "500" }),
    readRows<LitterRow>("core_litters", { select: "id,litter_name,status,birth_at,expected_birth_at", order: "created_at.desc", limit: "250" }),
    readRows<ReservationSummaryRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,balance_due_cents,go_home_planned_at,go_home_status,go_home_checklist_status,go_home_balance_cleared_status,created_at", order: "created_at.desc", limit: "500" }),
    readRows<DocumentRow>("core_documents", { select: "id,reservation_id,buyer_id,family_id,puppy_id,document_type,title,status,updated_at", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<MediaRow>("core_kennel_media", { select: "id,entity_type,dog_id,puppy_id,is_primary,uploaded_at", order: "uploaded_at.desc.nullslast", limit: "1000" }),
    readRows<ProposedActionRow>("core_proposed_actions", { select: "id,title,action_type,risk_level,status,target_table,target_id,created_at", order: "created_at.desc", limit: "100" }),
  ]);

  const buyersById = new Map(buyerResult.rows.map((row) => [row.id, row]));
  const familiesById = new Map(familyResult.rows.map((row) => [row.id, row]));
  const activeReservations = reservationResult.rows.filter(isActiveReservation);
  const activeReservationByPuppy = new Map(activeReservations.filter((row) => row.puppy_id).map((row) => [row.puppy_id as string, row]));
  const puppiesByLitter = new Map<string, PuppyRow[]>();
  const mediaByDog = new Map<string, MediaRow[]>();
  const mediaByPuppy = new Map<string, MediaRow[]>();
  for (const puppy of puppyResult.rows) {
    if (puppy.litter_id) puppiesByLitter.set(puppy.litter_id, [...(puppiesByLitter.get(puppy.litter_id) ?? []), puppy]);
  }
  for (const media of mediaResult.rows) {
    if (media.entity_type === "dog" && media.dog_id) mediaByDog.set(media.dog_id, [...(mediaByDog.get(media.dog_id) ?? []), media]);
    if (media.entity_type === "puppy" && media.puppy_id) mediaByPuppy.set(media.puppy_id, [...(mediaByPuppy.get(media.puppy_id) ?? []), media]);
  }

  const applicationActions: ActionRow[] = applicationResult.rows
    .filter((row) => ["received", "needs_review"].includes(normalized(row.status)))
    .slice(0, 8)
    .map((application) => ({
      id: `application-${application.id}`,
      lane: "applications",
      priority: "High",
      title: `Review ${buyerName(buyersById.get(application.buyer_id ?? ""))}`,
      detail: `${familyName(familiesById.get(application.family_id ?? ""))} / submitted ${formatDate(application.submitted_at ?? application.created_at)}.`,
      status: formatKey(application.status),
      href: `/staff/applications/${application.id}`,
      actionLabel: "Review Application",
      mode: canUseSensitiveActions ? "Action available" : "Review only",
      blockers: [!application.buyer_id ? "Buyer link missing" : "", !application.family_id ? "Family link missing" : ""].filter(Boolean),
    }));

  const approvedApps = applicationResult.rows.filter((row) => normalized(row.status) === "approved");
  const availablePuppies = puppyResult.rows.filter((row) => normalized(row.status) === "available" && !activeReservationByPuppy.has(row.id));
  const matchingActions: ActionRow[] = [
    ...approvedApps.slice(0, 5).map((application) => ({
      id: `match-app-${application.id}`,
      lane: "matching",
      priority: "Medium" as const,
      title: `Reservation review for ${buyerName(buyersById.get(application.buyer_id ?? ""))}`,
      detail: `${availablePuppies.length} available puppy candidate(s) can be reviewed by owner/operator.`,
      status: "Approved application",
      href: "/staff/matching",
      actionLabel: "Review Match",
      mode: "Review only" as const,
      blockers: availablePuppies.length === 0 ? ["No available puppy candidates"] : [],
    })),
    ...availablePuppies.slice(0, 5).map((puppy) => ({
      id: `match-puppy-${puppy.id}`,
      lane: "matching",
      priority: "Medium" as const,
      title: `${puppyName(puppy)} needs assignment decision`,
      detail: `${display(puppy.sex)} / ${display(puppy.color)} / ${display(puppy.coat_type)}.`,
      status: formatKey(puppy.status),
      href: `/staff/puppies/${puppy.id}`,
      actionLabel: "Review Puppy",
      mode: "Review only" as const,
      blockers: [],
    })),
  ].slice(0, 10);

  const cleanupActions: ActionRow[] = [
    ...buyerResult.rows
      .filter((buyer) => !buyer.email && !buyer.phone || ["needs_review", "pending", "unknown", ""].includes(normalized(buyer.approval_status)))
      .slice(0, 5)
      .map((buyer) => ({
        id: `buyer-cleanup-${buyer.id}`,
        lane: "cleanup",
        priority: (!buyer.email && !buyer.phone ? "High" : "Medium") as "High" | "Medium",
        title: `${buyerName(buyer)} buyer cleanup`,
        detail: `${display(buyer.email, "No email")} / ${display(buyer.phone, "No phone")}.`,
        status: formatKey(buyer.approval_status),
        href: `/staff/buyers/${buyer.id}`,
        actionLabel: "Review Buyer",
        mode: "Review only" as const,
        blockers: [!buyer.email && !buyer.phone ? "No contact method" : "", !buyer.approval_status ? "Approval status missing" : ""].filter(Boolean),
      })),
    ...familyResult.rows
      .filter((family) => !family.name || ["needs_review", "pending", "unknown", ""].includes(normalized(family.status)))
      .slice(0, 5)
      .map((family) => ({
        id: `family-cleanup-${family.id}`,
        lane: "cleanup",
        priority: (!family.name ? "High" : "Medium") as "High" | "Medium",
        title: `${familyName(family)} family cleanup`,
        detail: `Family status ${formatKey(family.status)}.`,
        status: formatKey(family.status),
        href: `/staff/families/${family.id}`,
        actionLabel: "Review Family",
        mode: "Review only" as const,
        blockers: [!family.name ? "Family name missing" : "", !family.status ? "Family status missing" : ""].filter(Boolean),
      })),
  ].slice(0, 10);

  const reservationActions: ActionRow[] = activeReservations
    .filter((summary) => (summary.balance_due_cents ?? 0) > 0 || !summary.go_home_planned_at || !summary.puppy_id || !summary.buyer_id)
    .slice(0, 10)
    .map((summary) => {
      const blockers = [
        (summary.balance_due_cents ?? 0) > 0 ? `Balance due ${formatMoney(summary.balance_due_cents)}` : "",
        !summary.go_home_planned_at ? "Go-home schedule missing" : "",
        !summary.puppy_id ? "Puppy link missing" : "",
        !summary.buyer_id ? "Buyer link missing" : "",
      ].filter(Boolean);
      return {
        id: `reservation-${summary.reservation_id}`,
        lane: "reservations",
        priority: blockers.length > 1 ? "High" as const : "Medium" as const,
        title: `${summaryPuppyName(summary)} reservation readiness`,
        detail: `${display(summary.buyer_name || summary.buyer_email, "Unlinked buyer")} / ${formatKey(summary.reservation_status)}.`,
        status: formatKey(summary.reservation_status),
        href: `/staff/reservations/${summary.reservation_id}`,
        actionLabel: "Review Reservation",
        mode: "Review only" as const,
        blockers,
      };
    });

  const documentActions: ActionRow[] = documentResult.rows
    .filter((row) => !isCompleteDocument(row))
    .slice(0, 10)
    .map((document) => ({
      id: `document-${document.id}`,
      lane: "documents",
      priority: ["missing", "expired"].includes(normalized(document.status)) ? "High" as const : "Medium" as const,
      title: display(document.title || document.document_type, "Document needs review"),
      detail: `${display(document.document_type)} / updated ${formatDate(document.updated_at)}.`,
      status: formatKey(document.status),
      href: `/staff/documents/${document.id}`,
      actionLabel: "Review Document",
      mode: "Review only" as const,
      blockers: [!document.reservation_id && !document.buyer_id && !document.family_id && !document.puppy_id ? "No source record link" : ""].filter(Boolean),
    }));

  const paymentActions: ActionRow[] = activeReservations
    .filter((row) => (row.balance_due_cents ?? 0) > 0)
    .slice(0, 8)
    .map((summary) => ({
      id: `payment-${summary.reservation_id}`,
      lane: "payments",
      priority: "High" as const,
      title: `${display(summary.buyer_name || summary.buyer_email, "Buyer")} payment review`,
      detail: `${summaryPuppyName(summary)} / balance ${formatMoney(summary.balance_due_cents)}.`,
      status: "Open balance",
      href: "/staff/payments",
      actionLabel: canUseSensitiveActions ? "Review / Record Payment" : "Review Account",
      mode: canUseSensitiveActions ? "Action available" as const : "Review only" as const,
      blockers: [`Balance due ${formatMoney(summary.balance_due_cents)}`],
    }));

  const goHomeActions: ActionRow[] = activeReservations
    .filter((row) => !row.go_home_planned_at || ["pending", "needs_review", "not_started", "not_cleared"].some((status) => [normalized(row.go_home_status), normalized(row.go_home_checklist_status), normalized(row.go_home_balance_cleared_status)].includes(status)))
    .slice(0, 10)
    .map((summary) => {
      const blockers = [
        !summary.go_home_planned_at ? "Schedule missing" : "",
        normalized(summary.go_home_checklist_status) !== "complete" ? "Checklist not complete" : "",
        (summary.balance_due_cents ?? 0) > 0 ? "Balance not clear" : "",
      ].filter(Boolean);
      return {
        id: `go-home-${summary.reservation_id}`,
        lane: "go-home",
        priority: blockers.length > 1 ? "High" as const : "Medium" as const,
        title: `${summaryPuppyName(summary)} go-home readiness`,
        detail: `${display(summary.buyer_name || summary.buyer_email, "Buyer")} / planned ${formatDate(summary.go_home_planned_at)}.`,
        status: formatKey(summary.go_home_status),
        href: "/staff/go-home",
        actionLabel: canUseSensitiveActions ? "Update Go-Home" : "Review Go-Home",
        mode: canUseSensitiveActions ? "Action available" as const : "Review only" as const,
        blockers,
      };
    });

  const mediaActions: ActionRow[] = [
    ...dogResult.rows.filter((dog) => !(mediaByDog.get(dog.id) ?? []).some((media) => media.is_primary)).slice(0, 5).map((dog) => ({
      id: `media-dog-${dog.id}`,
      lane: "media",
      priority: "Low" as const,
      title: `${display(dog.call_name || dog.registered_name, "Dog")} missing primary photo`,
      detail: `${formatKey(dog.status)} / media review uses existing private media workflow.`,
      status: "Media review",
      href: `/staff/dogs/${dog.id}`,
      actionLabel: "Review Media",
      mode: "Review only" as const,
      blockers: ["Missing primary media"],
    })),
    ...puppyResult.rows.filter((puppy) => !(mediaByPuppy.get(puppy.id) ?? []).some((media) => media.is_primary)).slice(0, 5).map((puppy) => ({
      id: `media-puppy-${puppy.id}`,
      lane: "media",
      priority: "Low" as const,
      title: `${puppyName(puppy)} missing primary photo`,
      detail: `${formatKey(puppy.status)} / media review uses existing private media workflow.`,
      status: "Media review",
      href: `/staff/puppies/${puppy.id}`,
      actionLabel: "Review Media",
      mode: "Review only" as const,
      blockers: ["Missing primary media"],
    })),
    ...litterResult.rows.filter((litter) => {
      const puppies = puppiesByLitter.get(litter.id) ?? [];
      return puppies.length === 0 || !puppies.some((puppy) => (mediaByPuppy.get(puppy.id) ?? []).length > 0);
    }).slice(0, 5).map((litter) => ({
      id: `media-litter-${litter.id}`,
      lane: "media",
      priority: "Low" as const,
      title: `${display(litter.litter_name, "Litter")} missing gallery signal`,
      detail: "Litter readiness is derived from linked puppy private media rows.",
      status: formatKey(litter.status),
      href: `/staff/litters/${litter.id}`,
      actionLabel: "Review Litter Media",
      mode: "Review only" as const,
      blockers: ["Missing litter gallery signal"],
    })),
  ].slice(0, 10);

  const proposedActions: ActionRow[] = proposalResult.rows
    .filter((row) => ["draft", "needs_review"].includes(normalized(row.status)))
    .slice(0, 8)
    .map((proposal) => ({
      id: `proposal-${proposal.id}`,
      lane: "proposed",
      priority: normalized(proposal.risk_level) === "high" || normalized(proposal.risk_level) === "blocked" ? "High" as const : "Medium" as const,
      title: display(proposal.title || proposal.action_type, "Proposed action review"),
      detail: `${display(proposal.target_table, "No target table")} / ${display(proposal.target_id, "No target ID")}.`,
      status: formatKey(proposal.status),
      href: "/staff/proposed-actions",
      actionLabel: "Review Proposal",
      mode: "Review only" as const,
      blockers: normalized(proposal.risk_level) === "blocked" ? ["Blocked risk level"] : [],
    }));

  const allRows = [...applicationActions, ...matchingActions, ...cleanupActions, ...reservationActions, ...documentActions, ...paymentActions, ...goHomeActions, ...mediaActions, ...proposedActions];
  const blockedRows = allRows.filter((row) => row.blockers.length > 0);
  const recentRows = allRows.filter((row) => row.mode === "Action available").slice(0, 10);
  const warnings = [applicationResult, buyerResult, familyResult, puppyResult, dogResult, litterResult, reservationResult, documentResult, mediaResult, proposalResult].map((result) => result.warning).filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <OperatorHeader
          eyebrow="Core Actions"
          title="Action Command Center"
          summary="Controlled owner/operator action support across Core. Mutations are only available where existing server actions and RPCs already exist; everything else is review-only."
          status={`${allRows.length} action item(s)`}
          blockers={blockedRows.length > 0 ? `${blockedRows.length} blocked/review item(s)` : "No blockers in loaded queue"}
          nextAction={allRows[0]?.title ?? "Review Core workspaces"}
          links={[
            { href: "/staff/command", label: "Command" },
            { href: "/staff/proposed-actions", label: "Proposed Actions" },
            { href: "/staff/applications", label: "Applications" },
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 shadow-sm">
          <p className="font-bold">Safety boundary</p>
          <p className="mt-1">This page does not invent new database writes. It links to existing controlled server actions or review-only workspaces. No auto-approval, puppy auto-assignment, customer messages, email sends, payment movement, document generation, public publishing, AI, or external provider calls are connected here.</p>
        </section>

        <SummaryStrip
          items={[
            { label: "Applications", value: applicationActions.length, note: "review actions" },
            { label: "Matching", value: matchingActions.length, note: "review-only" },
            { label: "Cleanup", value: cleanupActions.length, note: "buyer/family review" },
            { label: "Reservations", value: reservationActions.length, note: "readiness" },
            { label: "Documents", value: documentActions.length, note: "metadata review" },
            { label: "Payments", value: paymentActions.length, note: "controlled ledger action where available" },
            { label: "Blocked", value: blockedRows.length, note: "needs review" },
          ]}
        />

        <ActionPanel
          nextAction={blockedRows[0]?.title ?? recentRows[0]?.title ?? allRows[0]?.title ?? "Review Core action lanes"}
          blockers={blockedRows.length}
          mode={recentRows.length > 0 ? "available" : blockedRows.length > 0 ? "blocked" : "review-only"}
          href={blockedRows[0]?.href ?? recentRows[0]?.href ?? "/staff/command"}
          linkLabel="Open Next"
          detail="This central queue links only to existing server-action/RPC-backed workspaces or review-only pages."
        />

        <CommunicationPanel
          latestStatus="Communication follow-ups are tracked separately from controlled record actions."
          nextFollowUp="Review notification readiness, contact gaps, and follow-up prompts before customer outreach."
          blockers={0}
          mode="review"
          detail="Links only; no email, SMS, portal message, Facebook message, or provider call is triggered here."
        />

        <ProposedActionPanel
          nextAction={proposedActions[0]?.title ?? blockedRows[0]?.title ?? "Review rule-based proposed action signals"}
          blockers={blockedRows.length}
          priority={blockedRows.length > 0 ? "high" : proposedActions.length > 0 ? "normal" : "watch"}
          detail="Use Proposed Actions for deterministic readiness reasons; use Actions for existing safe action entry points."
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview", count: allRows.length },
            { href: "#applications", label: "Application Review", count: applicationActions.length },
            { href: "#matching", label: "Matching / Assignment", count: matchingActions.length },
            { href: "#cleanup", label: "Buyer / Family Cleanup", count: cleanupActions.length },
            { href: "#reservations", label: "Reservations", count: reservationActions.length },
            { href: "#documents", label: "Documents", count: documentActions.length },
            { href: "#payments", label: "Payments", count: paymentActions.length },
            { href: "#go-home", label: "Go-Home", count: goHomeActions.length },
            { href: "#media", label: "Media", count: mediaActions.length },
            { href: "#blocked", label: "Blocked", count: blockedRows.length },
            { href: "#recent", label: "Completed / Recent", count: recentRows.length },
          ]}
        />

        {warnings.length > 0 ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{warnings.join(" ")}</section> : null}

        <LaneSection id="overview" title="Overview Queue" rows={allRows.slice(0, 14)} empty="No action rows were found from current Core metadata." />
        <div className="grid gap-6 xl:grid-cols-2">
          <LaneSection id="applications" title="Application Review" rows={applicationActions} empty="No applications currently need review." />
          <LaneSection id="matching" title="Matching / Assignment" rows={matchingActions} empty="No matching or assignment review rows are currently queued." />
          <LaneSection id="cleanup" title="Buyer / Family Cleanup" rows={cleanupActions} empty="No buyer or family cleanup rows are currently queued." />
          <LaneSection id="reservations" title="Reservations" rows={reservationActions} empty="No reservation readiness items are currently queued." />
          <LaneSection id="documents" title="Documents" rows={documentActions} empty="No document review rows are currently queued." />
          <LaneSection id="payments" title="Payments" rows={paymentActions} empty="No payment account review rows are currently queued." />
          <LaneSection id="go-home" title="Go-Home" rows={goHomeActions} empty="No go-home action rows are currently queued." />
          <LaneSection id="media" title="Media" rows={mediaActions} empty="No media readiness rows are currently queued." />
          <LaneSection id="proposed" title="Proposed Actions" rows={proposedActions} empty="No proposed action review rows are currently queued." />
        </div>
        <LaneSection id="blocked" title="Blocked" rows={blockedRows} empty="No blockers were found in loaded action rows." />
        <LaneSection id="recent" title="Completed / Recent" rows={recentRows} empty="No existing-action rows are currently available from loaded metadata." />
      </div>
    </main>
  );
}
