import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, OperatorStatusPill, SectionNav, SummaryStrip } from "../operator-ui";

export const dynamic = "force-dynamic";

type ReadResult<T> = { rows: T[]; warning: string | null };
type AnyRow = Record<string, unknown>;
type SectionKey = "overview" | "buyers" | "puppies" | "documents" | "payments" | "transport" | "messages" | "updates" | "resources" | "attention";

type CoreBuyer = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; email: string | null; phone: string | null; approval_status: string | null };
type CorePuppy = { id: string; name: string | null; collar_color: string | null; status: string | null; public_listing_status: string | null };
type CoreReservation = { reservation_id: string; reservation_status: string | null; buyer_id: string | null; buyer_name: string | null; buyer_email: string | null; family_id: string | null; puppy_id: string | null; puppy_name: string | null; puppy_collar_color: string | null; balance_due_cents: number | null; go_home_planned_at: string | null; go_home_status: string | null };
type CoreDocument = { id: string; buyer_id: string | null; family_id: string | null; puppy_id: string | null; reservation_id: string | null; document_type: string | null; title: string | null; status: string | null };
type CoreMedia = { id: string; puppy_id: string | null; is_primary: boolean | null; uploaded_at: string | null };

const sections: Array<{ key: SectionKey; href: string; label: string }> = [
  { key: "overview", href: "/staff/portal#overview", label: "Overview" },
  { key: "buyers", href: "/staff/portal/buyers#buyers", label: "Buyer Accounts" },
  { key: "puppies", href: "/staff/portal/puppies#puppies", label: "Puppies" },
  { key: "documents", href: "/staff/portal/documents#documents", label: "Documents" },
  { key: "payments", href: "/staff/portal/payments#payments", label: "Payments" },
  { key: "transport", href: "/staff/portal#transport", label: "Transportation / Go-Home" },
  { key: "messages", href: "/staff/portal/messages#messages", label: "Messages" },
  { key: "updates", href: "/staff/portal/updates#updates", label: "Updates" },
  { key: "resources", href: "/staff/portal/resources#resources", label: "Resources" },
  { key: "attention", href: "/staff/portal#attention", label: "Attention" },
];

const portalTables = [
  "buyer_portal_profiles",
  "buyer_documents",
  "buyer_messages",
  "buyer_payment_accounts",
  "buyer_payments",
  "buyer_payment_plans",
  "buyer_transportation_requests",
  "portal_updates",
  "portal_resources",
  "breeder_portal_content",
  "breeder_settings",
  "breeder_policies",
  "breeder_branding",
  "buyers",
  "buyer_applications",
  "puppies",
  "contracts",
  "documents",
  "payments",
  "payment_plans",
  "transportation",
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

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(row: AnyRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = asString(row[key]);
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

function firstBoolean(row: AnyRow | undefined, keys: string[]) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string" && ["true", "false"].includes(value.toLowerCase())) return value.toLowerCase() === "true";
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

function formatMoney(centsOrDollars: number | null | undefined) {
  if (typeof centsOrDollars !== "number") return "Not recorded";
  const value = Math.abs(centsOrDollars) > 1000 ? centsOrDollars / 100 : centsOrDollars;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function buyerName(buyer: CoreBuyer | undefined) {
  if (!buyer) return "Core record not connected to portal record";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || buyer.phone || `Buyer ${buyer.id.slice(0, 8)}`;
}

function puppyName(puppy: CorePuppy | undefined | null, fallback = "Core record not connected to portal record") {
  if (!puppy) return fallback;
  return puppy.name || puppy.collar_color || `Puppy ${puppy.id.slice(0, 8)}`;
}

function portalName(row: AnyRow) {
  return (
    firstString(row, ["display_name", "name", "full_name", "buyer_name", "customer_name", "first_name"]) ??
    firstString(row, ["email", "phone"]) ??
    `Portal row ${String(firstString(row, ["id", "uuid"]) ?? "").slice(0, 8) || "unknown"}`
  );
}

function rowStatus(row: AnyRow) {
  return firstString(row, ["status", "portal_status", "account_status", "state", "visibility_status", "billing_status"]) ?? "unknown";
}

function isVisible(row: AnyRow) {
  const explicit = firstBoolean(row, ["portal_visible", "visible_to_buyer", "visible_to_user", "is_visible", "visible", "published", "is_published"]);
  if (explicit !== null) return explicit;
  const status = normalized(rowStatus(row));
  return ["active", "published", "visible", "sent", "signed", "complete", "completed", "ready"].includes(status);
}

function rowBuyerKey(row: AnyRow) {
  return firstString(row, ["core_buyer_id", "buyer_id", "customer_id", "owner_id", "profile_id", "user_id"]);
}

function rowPuppyKey(row: AnyRow) {
  return firstString(row, ["core_puppy_id", "puppy_id", "dog_id", "pet_id"]);
}

function byEmailOrPhone(row: AnyRow, buyer: CoreBuyer) {
  const email = firstString(row, ["email", "buyer_email", "customer_email"]);
  const phone = firstString(row, ["phone", "buyer_phone", "customer_phone"]);
  return Boolean((email && buyer.email && normalized(email) === normalized(buyer.email)) || (phone && buyer.phone && normalized(phone) === normalized(buyer.phone)));
}

function findPortalProfile(buyer: CoreBuyer, profiles: AnyRow[], portalBuyers: AnyRow[]) {
  return (
    profiles.find((row) => rowBuyerKey(row) === buyer.id || byEmailOrPhone(row, buyer)) ??
    portalBuyers.find((row) => rowBuyerKey(row) === buyer.id || byEmailOrPhone(row, buyer))
  );
}

function findPortalPuppy(puppy: CorePuppy, portalPuppies: AnyRow[]) {
  return portalPuppies.find((row) => rowPuppyKey(row) === puppy.id || normalized(firstString(row, ["name", "puppy_name", "collar_color"])) === normalized(puppy.name ?? puppy.collar_color));
}

function statusTone(status: string | null | undefined): "neutral" | "green" | "blue" | "amber" | "red" {
  const value = normalized(status);
  if (["active", "linked", "published", "visible", "signed", "complete", "completed", "ready", "paid"].includes(value)) return "green";
  if (["invited", "pending", "review", "draft", "unread"].includes(value)) return "amber";
  if (["missing", "failed", "blocked", "cancelled", "void"].includes(value)) return "red";
  if (["reserved", "sent", "scheduled"].includes(value)) return "blue";
  return "neutral";
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

function GenericRowCard({ row, table }: { row: AnyRow; table: string }) {
  const status = rowStatus(row);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{portalName(row)}</p>
          <p className="mt-1 text-slate-500">{table} / {formatKey(status)}</p>
        </div>
        <OperatorStatusPill tone={statusTone(status)}>{formatKey(status)}</OperatorStatusPill>
      </div>
    </article>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export async function PortalReadinessPage({ focus = "overview" }: { focus?: SectionKey }) {
  await requireStaffProfile();

  const [coreBuyers, corePuppies, coreReservations, coreDocuments, coreMedia, ...portalResults] = await Promise.all([
    readRows<CoreBuyer>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,approval_status", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<CorePuppy>("core_puppies", { select: "id,name,collar_color,status,public_listing_status", order: "updated_at.desc.nullslast", limit: "500" }),
    readRows<CoreReservation>("core_reservation_summary_view", { select: "reservation_id,reservation_status,buyer_id,buyer_name,buyer_email,family_id,puppy_id,puppy_name,puppy_collar_color,balance_due_cents,go_home_planned_at,go_home_status", order: "created_at.desc", limit: "500" }),
    readRows<CoreDocument>("core_documents", { select: "id,buyer_id,family_id,puppy_id,reservation_id,document_type,title,status", order: "updated_at.desc.nullslast", limit: "750" }),
    readRows<CoreMedia>("core_kennel_media", { select: "id,puppy_id,is_primary,uploaded_at", entity_type: "eq.puppy", order: "uploaded_at.desc.nullslast", limit: "500" }),
    ...portalTables.map((table) => readRows<AnyRow>(table, { select: "*", limit: "500" })),
  ]);

  const portal = Object.fromEntries(portalTables.map((table, index) => [table, portalResults[index]?.rows ?? []])) as Record<(typeof portalTables)[number], AnyRow[]>;
  const warnings = [coreBuyers.warning, corePuppies.warning, coreReservations.warning, coreDocuments.warning, coreMedia.warning, ...portalResults.map((result) => result.warning)].filter(Boolean);
  const profiles = portal.buyer_portal_profiles;
  const portalBuyers = portal.buyers;
  const portalPuppies = portal.puppies;
  const visibleDocs = [...portal.buyer_documents, ...portal.documents, ...portal.contracts].filter(isVisible);
  const pendingDocs = [...portal.buyer_documents, ...portal.documents, ...portal.contracts].filter((row) => ["pending", "draft", "review", "sent"].includes(normalized(rowStatus(row))));
  const signedDocs = [...portal.buyer_documents, ...portal.documents, ...portal.contracts].filter((row) => ["signed", "complete", "completed", "filed"].includes(normalized(rowStatus(row))));
  const unreadMessages = portal.buyer_messages.filter((row) => firstBoolean(row, ["is_read", "read"]) === false || ["unread", "open", "unresolved"].includes(normalized(rowStatus(row))));
  const publishedUpdates = portal.portal_updates.filter(isVisible);
  const draftUpdates = portal.portal_updates.filter((row) => ["draft", "hidden", "unpublished"].includes(normalized(rowStatus(row))));
  const visibleResources = [...portal.portal_resources, ...portal.breeder_portal_content].filter(isVisible);
  const hiddenResources = [...portal.portal_resources, ...portal.breeder_portal_content].filter((row) => !isVisible(row));
  const linkedProfileCount = profiles.filter((row) => firstString(row, ["auth_user_id", "user_id", "supabase_user_id"]) || ["linked", "active"].includes(normalized(rowStatus(row)))).length;
  const invitedProfileCount = profiles.filter((row) => normalized(rowStatus(row)).includes("invited")).length;
  const activeProfileCount = profiles.filter((row) => normalized(rowStatus(row)) === "active").length;
  const buyersWithoutPortal = coreBuyers.rows.filter((buyer) => !findPortalProfile(buyer, profiles, portalBuyers));
  const buyerRows = coreBuyers.rows.map((buyer) => {
    const profile = findPortalProfile(buyer, profiles, portalBuyers);
    const reservation = coreReservations.rows.find((row) => row.buyer_id === buyer.id);
    const docs = coreDocuments.rows.filter((doc) => doc.buyer_id === buyer.id || doc.reservation_id === reservation?.reservation_id);
    const messages = portal.buyer_messages.filter((row) => rowBuyerKey(row) === buyer.id || byEmailOrPhone(row, buyer));
    return { buyer, profile, reservation, docs, messages };
  });
  const puppyRows = corePuppies.rows.map((puppy) => {
    const portalPuppy = findPortalPuppy(puppy, portalPuppies);
    const reservation = coreReservations.rows.find((row) => row.puppy_id === puppy.id);
    const media = coreMedia.rows.filter((row) => row.puppy_id === puppy.id);
    const docs = coreDocuments.rows.filter((doc) => doc.puppy_id === puppy.id || doc.reservation_id === reservation?.reservation_id);
    const updates = portal.portal_updates.filter((row) => rowPuppyKey(row) === puppy.id);
    return { puppy, portalPuppy, reservation, media, docs, updates };
  });
  const visiblePortalPuppies = portalPuppies.filter(isVisible).length;
  const nonVisiblePortalPuppies = portalPuppies.filter((row) => !isVisible(row)).length;
  const buyersWithProfileNoPuppy = buyerRows.filter((row) => row.profile && !row.reservation?.puppy_id).length;
  const attention = [
    ...buyersWithoutPortal.slice(0, 12).map((buyer) => ({ title: buyerName(buyer), detail: "Core buyer has no established portal profile.", href: `/staff/buyers/${buyer.id}` })),
    ...buyerRows.filter((row) => row.profile && !row.reservation?.puppy_id).slice(0, 12).map((row) => ({ title: buyerName(row.buyer), detail: "Portal profile exists but no assigned Core puppy reservation was found.", href: `/staff/buyers/${row.buyer.id}` })),
    ...puppyRows.filter((row) => !row.portalPuppy).slice(0, 12).map((row) => ({ title: puppyName(row.puppy), detail: "Core puppy is not connected to an existing portal puppy record.", href: `/staff/puppies/${row.puppy.id}` })),
    ...puppyRows.filter((row) => row.portalPuppy && !isVisible(row.portalPuppy)).slice(0, 12).map((row) => ({ title: puppyName(row.puppy), detail: "Portal puppy record exists but is not buyer-visible.", href: `/staff/puppies/${row.puppy.id}` })),
  ];

  const visibleSections = focus === "overview" ? sections.map((section) => section.key) : ["overview", focus, "attention"];

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <OperatorHeader
          eyebrow="Portal Readiness"
          title="Core-to-Buyer Portal Bridge"
          summary="Internal readiness layer connecting Core records to existing buyer/puppy portal tables. Read-only mapping only; no portal accounts, messages, payment actions, documents, or customer visibility changes are created here."
          status={`${profiles.length} portal profile row(s)`}
          blockers={`${attention.length} attention item(s)`}
          nextAction="Review unlinked buyers, portal-visible puppy state, buyer documents, payment plan readiness, go-home/transport rows, messages, updates, and resources."
          links={[
            { href: "/staff/portal/buyers", label: "Buyer Accounts" },
            { href: "/staff/portal/puppies", label: "Puppies" },
            { href: "/staff/portal/documents", label: "Documents" },
            { href: "/staff/portal/payments", label: "Payments" },
          ]}
        />

        {warnings.length ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Some portal/Core tables could not be read in this environment. The bridge stays read-only and shows available rows only.</section> : null}

        <SummaryStrip
          items={[
            { label: "Portal profiles", value: profiles.length, note: `${linkedProfileCount} linked / ${invitedProfileCount} invited` },
            { label: "Active profiles", value: activeProfileCount, note: "Existing buyer_portal_profiles" },
            { label: "Buyers without portal", value: buyersWithoutPortal.length, note: "Core buyer mapping review" },
            { label: "Visible puppies", value: visiblePortalPuppies, note: `${nonVisiblePortalPuppies} not visible` },
            { label: "Buyer documents", value: visibleDocs.length, note: `${pendingDocs.length} pending / ${signedDocs.length} signed` },
          ]}
        />

        <SectionNav items={sections.map((section) => ({ href: section.href, label: section.label }))} />

        {visibleSections.includes("overview") ? (
          <Section id="overview" title="Overview">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Messages unread/unresolved" value={unreadMessages.length} note="buyer_messages" />
              <MetricCard label="Updates published" value={publishedUpdates.length} note={`${draftUpdates.length} draft/hidden`} />
              <MetricCard label="Resources visible" value={visibleResources.length} note={`${hiddenResources.length} hidden`} />
              <MetricCard label="Profile without puppy" value={buyersWithProfileNoPuppy} note="Portal profile plus no Core puppy reservation" />
            </div>
          </Section>
        ) : null}

        {visibleSections.includes("buyers") ? (
          <Section id="buyers" title="Buyer Accounts">
            <div className="grid gap-4 xl:grid-cols-2">
              {buyerRows.length ? buyerRows.slice(0, 80).map(({ buyer, profile, reservation, docs, messages }) => (
                <article key={buyer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{buyerName(buyer)}</p>
                      <p className="mt-1 text-sm text-slate-500">{display(buyer.email)} / {display(buyer.phone)}</p>
                    </div>
                    <OperatorStatusPill tone={profile ? "green" : "amber"}>{profile ? formatKey(rowStatus(profile)) : "Portal link not established"}</OperatorStatusPill>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div><dt className="text-slate-400">Auth user</dt><dd className="font-semibold">{profile && firstString(profile, ["auth_user_id", "user_id", "supabase_user_id"]) ? "Linked" : "Not linked"}</dd></div>
                    <div><dt className="text-slate-400">Welcome seen</dt><dd className="font-semibold">{profile && firstBoolean(profile, ["welcome_seen", "has_seen_welcome", "onboarding_complete"]) ? "Seen" : "Not seen"}</dd></div>
                    <div><dt className="text-slate-400">Last sign-in</dt><dd className="font-semibold">{profile ? display(firstString(profile, ["last_sign_in_at", "last_login_at", "last_seen_at"])) : "Not recorded"}</dd></div>
                    <div><dt className="text-slate-400">Assigned puppy</dt><dd className="font-semibold">{display(reservation?.puppy_name ?? reservation?.puppy_collar_color, "No puppy assigned")}</dd></div>
                    <div><dt className="text-slate-400">Documents</dt><dd className="font-semibold">{docs.length} Core / {visibleDocs.filter((doc) => rowBuyerKey(doc) === buyer.id).length} portal visible</dd></div>
                    <div><dt className="text-slate-400">Messages</dt><dd className="font-semibold">{messages.length}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/staff/buyers/${buyer.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Core buyer</Link>
                    {reservation ? <Link href={`/staff/reservations/${reservation.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Reservation</Link> : null}
                  </div>
                </article>
              )) : <EmptyState text="No Core buyer rows found." />}
            </div>
          </Section>
        ) : null}

        {visibleSections.includes("puppies") ? (
          <Section id="puppies" title="Puppy Portal Visibility">
            <div className="grid gap-4 xl:grid-cols-2">
              {puppyRows.length ? puppyRows.slice(0, 80).map(({ puppy, portalPuppy, reservation, media, docs, updates }) => (
                <article key={puppy.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{puppyName(puppy)}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatKey(puppy.status)} / {formatKey(puppy.public_listing_status)}</p>
                    </div>
                    <OperatorStatusPill tone={portalPuppy && isVisible(portalPuppy) ? "green" : "amber"}>{portalPuppy ? (isVisible(portalPuppy) ? "Portal visible" : "Not portal-visible") : "Portal link not established"}</OperatorStatusPill>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div><dt className="text-slate-400">Buyer</dt><dd className="font-semibold">{display(reservation?.buyer_name, "Not assigned")}</dd></div>
                    <div><dt className="text-slate-400">Photos</dt><dd className="font-semibold">{media.length} / {media.some((row) => row.is_primary) ? "primary" : "no primary"}</dd></div>
                    <div><dt className="text-slate-400">Documents</dt><dd className="font-semibold">{docs.length}</dd></div>
                    <div><dt className="text-slate-400">Updates</dt><dd className="font-semibold">{updates.length}</dd></div>
                    <div><dt className="text-slate-400">Reservation</dt><dd className="font-semibold">{formatKey(reservation?.reservation_status)}</dd></div>
                    <div><dt className="text-slate-400">Go-home</dt><dd className="font-semibold">{formatKey(reservation?.go_home_status)}</dd></div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/staff/puppies/${puppy.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Core puppy</Link>
                    {reservation ? <Link href={`/staff/reservations/${reservation.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Reservation</Link> : null}
                  </div>
                </article>
              )) : <EmptyState text="No Core puppy rows found." />}
            </div>
          </Section>
        ) : null}

        {visibleSections.includes("documents") ? <Section id="documents" title="Portal Documents"><div className="grid gap-4 xl:grid-cols-2">{[...portal.buyer_documents, ...portal.documents, ...portal.contracts].slice(0, 80).map((row, index) => <GenericRowCard key={`doc-${index}`} row={row} table="documents/contracts" />)}{visibleDocs.length + pendingDocs.length + signedDocs.length === 0 ? <EmptyState text="No portal document rows found." /> : null}</div></Section> : null}
        {visibleSections.includes("payments") ? <Section id="payments" title="Portal Payments And Plans"><div className="grid gap-4 xl:grid-cols-2">{[...portal.buyer_payment_accounts, ...portal.buyer_payments, ...portal.buyer_payment_plans, ...portal.payments, ...portal.payment_plans].slice(0, 80).map((row, index) => <GenericRowCard key={`pay-${index}`} row={row} table={`balance ${formatMoney(firstNumber(row, ["balance", "balance_due", "balance_cents", "amount", "amount_cents"]))}`} />)}{portal.buyer_payment_accounts.length + portal.buyer_payments.length + portal.buyer_payment_plans.length + portal.payments.length + portal.payment_plans.length === 0 ? <EmptyState text="No portal payment or payment-plan rows found." /> : null}</div></Section> : null}
        {visibleSections.includes("transport") ? <Section id="transport" title="Transportation / Go-Home Portal Readiness"><div className="grid gap-4 xl:grid-cols-2">{[...portal.buyer_transportation_requests, ...portal.transportation].slice(0, 80).map((row, index) => <GenericRowCard key={`transport-${index}`} row={row} table="transportation" />)}{portal.buyer_transportation_requests.length + portal.transportation.length === 0 ? <EmptyState text="No portal transportation rows found." /> : null}</div></Section> : null}
        {visibleSections.includes("messages") ? <Section id="messages" title="Portal Messages"><div className="grid gap-4 xl:grid-cols-2">{portal.buyer_messages.slice(0, 80).map((row, index) => <GenericRowCard key={`message-${index}`} row={row} table="buyer_messages" />)}{portal.buyer_messages.length === 0 ? <EmptyState text="No buyer message rows found." /> : null}</div></Section> : null}
        {visibleSections.includes("updates") ? <Section id="updates" title="Portal Updates"><div className="grid gap-4 xl:grid-cols-2">{portal.portal_updates.slice(0, 80).map((row, index) => <GenericRowCard key={`update-${index}`} row={row} table="portal_updates" />)}{portal.portal_updates.length === 0 ? <EmptyState text="No portal update rows found." /> : null}</div></Section> : null}
        {visibleSections.includes("resources") ? <Section id="resources" title="Portal Resources And Content"><div className="grid gap-4 xl:grid-cols-2">{[...portal.portal_resources, ...portal.breeder_portal_content, ...portal.breeder_settings, ...portal.breeder_policies, ...portal.breeder_branding].slice(0, 80).map((row, index) => <GenericRowCard key={`resource-${index}`} row={row} table="portal content" />)}{visibleResources.length + hiddenResources.length + portal.breeder_settings.length + portal.breeder_policies.length + portal.breeder_branding.length === 0 ? <EmptyState text="No portal resource/content rows found." /> : null}</div></Section> : null}

        {visibleSections.includes("attention") ? (
          <Section id="attention" title="Attention">
            <div className="space-y-3">
              {attention.length ? attention.slice(0, 60).map((item, index) => (
                <article key={`${item.href}-${index}`} className="rounded-2xl border border-amber-200 bg-white p-4 text-sm shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-slate-600">{item.detail}</p></div>
                    <Link href={item.href} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Review Core record</Link>
                  </div>
                </article>
              )) : <EmptyState text="No portal bridge attention items from available rows." />}
            </div>
          </Section>
        ) : null}
      </div>
    </main>
  );
}
