import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../../operator-ui";
import { CommunicationPanel } from "../../communication-panel";
import { PortalStatusPanel } from "../../portal-status-panel";

export const dynamic = "force-dynamic";

type BuyerRow = {
  id: string;
  external_reference: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  approval_status: string | null;
  source: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type FamilyRow = { id: string; name: string | null; status: string | null; notes: string | null };
type FamilyMemberRow = { id: string; family_id: string | null; buyer_id: string | null; relationship: string | null; is_primary_contact: boolean | null; portal_access_status: string | null };
type ApplicationRow = { id: string; family_id: string | null; buyer_id: string | null; status: string | null; submitted_at: string | null; reviewed_at: string | null; source: string | null; decision_notes: string | null };
type ReservationRow = { reservation_id: string; reservation_status: string | null; reserved_at: string | null; buyer_id: string | null; family_id: string | null; family_name: string | null; puppy_id: string | null; puppy_name: string | null; puppy_collar_color: string | null; puppy_status: string | null; contract_total_cents: number | null; posted_ledger_total_cents: number | null; balance_due_cents: number | null; go_home_planned_at: string | null; go_home_status: string | null; go_home_method: string | null };
type LedgerRow = { id: string; reservation_id: string | null; entry_type: string | null; status: string | null; amount_cents: number | null; occurred_at: string | null; payment_method: string | null; description: string | null };
type DocumentRow = { id: string; title: string | null; document_type: string | null; status: string | null; reservation_id: string | null; family_id: string | null; buyer_id: string | null; puppy_id: string | null; updated_at: string | null };
type ConversationRow = { id: string; family_id: string | null; buyer_id: string | null; channel: string | null; subject: string | null; status: string | null; last_message_at: string | null };
type MessageRow = { id: string; conversation_id: string | null; buyer_id: string | null; direction: string | null; channel: string | null; status: string | null; sent_at: string | null; received_at: string | null; created_at: string | null };
type EventRow = { id: string; event_type: string | null; event_at: string | null; summary: string | null; source: string | null; related_table: string | null; related_id: string | null };
type AuditRow = { id: string; source: string | null; action: string | null; entity_table: string | null; entity_id: string | null; outcome: string | null; created_at: string | null };

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
  if (!response.ok) return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${await response.text().catch(() => "")}`.trim() };
  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatKey(value: string | null | undefined) {
  return display(value).replaceAll("_", " ");
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "none";
}

function buyerName(buyer: BuyerRow) {
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${shortId(buyer.id)}`;
}

function familyName(family: FamilyRow | undefined) {
  return family?.name || (family ? `Family ${shortId(family.id)}` : "Family not linked");
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

function InfoCard({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function TimelineList({ events }: { events: Array<{ id: string; title: string; note: string; href?: string }> }) {
  if (!events.length) return <EmptyState text="No rows found for this section." />;
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-semibold text-slate-950">{event.title}</p><p className="mt-1 text-slate-500">{event.note}</p></div>
            {event.href ? <Link href={event.href} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold">Open</Link> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function Buyer360Page({ params }: { params: Promise<{ buyerId: string }> }) {
  const staff = await requireStaffProfile();
  const { buyerId } = await params;
  const canViewAudit = staff.role === "owner" || staff.role === "admin";

  const buyerResult = await readRows<BuyerRow>("core_buyers", {
    select: "id,external_reference,first_name,last_name,preferred_name,email,phone,alternate_phone,street_address,city,state,postal_code,approval_status,source,notes,metadata,created_at,updated_at",
    id: `eq.${buyerId}`,
    limit: "1",
  });
  const buyer = buyerResult.rows[0];
  if (!buyer) notFound();

  const [membersResult, applicationsResult, reservationsResult, ledgerResult, documentsResult, conversationsResult, messagesResult, eventsResult, auditResult] = await Promise.all([
    readRows<FamilyMemberRow>("core_family_members", { select: "id,family_id,buyer_id,relationship,is_primary_contact,portal_access_status", buyer_id: `eq.${buyer.id}`, limit: "50" }),
    readRows<ApplicationRow>("core_applications", { select: "id,family_id,buyer_id,status,submitted_at,reviewed_at,source,decision_notes", buyer_id: `eq.${buyer.id}`, order: "created_at.desc", limit: "100" }),
    readRows<ReservationRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,reserved_at,buyer_id,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,contract_total_cents,posted_ledger_total_cents,balance_due_cents,go_home_planned_at,go_home_status,go_home_method", buyer_id: `eq.${buyer.id}`, order: "created_at.desc", limit: "100" }),
    readRows<LedgerRow>("core_financial_ledger", { select: "id,reservation_id,entry_type,status,amount_cents,occurred_at,payment_method,description", buyer_id: `eq.${buyer.id}`, order: "occurred_at.desc", limit: "100" }),
    readRows<DocumentRow>("core_documents", { select: "id,title,document_type,status,reservation_id,family_id,buyer_id,puppy_id,updated_at", buyer_id: `eq.${buyer.id}`, order: "updated_at.desc", limit: "100" }),
    readRows<ConversationRow>("core_conversations", { select: "id,family_id,buyer_id,channel,subject,status,last_message_at", buyer_id: `eq.${buyer.id}`, order: "last_message_at.desc.nullslast", limit: "100" }),
    readRows<MessageRow>("core_messages", { select: "id,conversation_id,buyer_id,direction,channel,status,sent_at,received_at,created_at", buyer_id: `eq.${buyer.id}`, order: "created_at.desc", limit: "100" }),
    readRows<EventRow>("core_events", { select: "id,event_type,event_at,summary,source,related_table,related_id", buyer_id: `eq.${buyer.id}`, order: "event_at.desc", limit: "100" }),
    canViewAudit ? readRows<AuditRow>("core_audit_log", { select: "id,source,action,entity_table,entity_id,outcome,created_at", entity_table: "eq.core_buyers", entity_id: `eq.${buyer.id}`, order: "created_at.desc", limit: "100" }) : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const familyIds = [...new Set(membersResult.rows.map((member) => member.family_id).filter((id): id is string => Boolean(id)))];
  const familyResult = familyIds.length ? await readRows<FamilyRow>("core_families", { select: "id,name,status,notes", id: `in.(${familyIds.join(",")})`, limit: "50" }) : { rows: [] as FamilyRow[], warning: null };
  const familiesById = new Map(familyResult.rows.map((family) => [family.id, family]));
  const activeReservationCount = reservationsResult.rows.filter((reservation) => !["cancelled", "completed"].includes((reservation.reservation_status ?? "").toLowerCase())).length;
  const balanceDue = reservationsResult.rows.reduce((sum, reservation) => sum + (reservation.balance_due_cents ?? 0), 0);
  const portalAccessStatus = membersResult.rows.find((member) => member.portal_access_status && member.portal_access_status !== "not_invited")?.portal_access_status ?? membersResult.rows[0]?.portal_access_status;
  const portalReadyDocuments = documentsResult.rows.filter((document) => ["signed", "complete", "filed"].includes((document.status ?? "").toLowerCase())).length;
  const portalGoHomeReady = reservationsResult.rows.some((reservation) => ["scheduled", "ready", "complete", "completed"].includes((reservation.go_home_status ?? "").toLowerCase()));
  const attentionFlags = [
    !buyer.email && !buyer.phone ? "No email or primary phone recorded." : null,
    !buyer.approval_status ? "Approval status missing." : null,
    membersResult.rows.length === 0 ? "No family membership linked." : null,
    applicationsResult.rows.length === 0 ? "No application linked." : null,
    activeReservationCount > 0 && balanceDue > 0 ? "Active reservation balance due." : null,
    documentsResult.rows.some((document) => ["draft", "pending", "missing", "review_needed"].includes((document.status ?? "").toLowerCase())) ? "Document metadata needs review." : null,
  ].filter(Boolean);
  const warnings = [buyerResult.warning, membersResult.warning, applicationsResult.warning, reservationsResult.warning, ledgerResult.warning, documentsResult.warning, conversationsResult.warning, messagesResult.warning, eventsResult.warning, auditResult.warning, familyResult.warning].filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Buyer 360 Command Workspace"
          title={buyerName(buyer)}
          summary="Internal owner/operator workspace for contact, family, applications, reservations, ledger-derived readiness, documents, communication metadata, events, and audit context."
          status={display(buyer.approval_status, "Unknown")}
          blockers={attentionFlags.length > 0 ? `${attentionFlags.length} attention flag(s)` : "No deterministic flags"}
          nextAction="Use related links to edit the buyer, open household context, assign puppy context, or review readiness lanes."
          links={[
            { href: "/staff/buyers", label: "Back to Buyers" },
            { href: `/staff/buyers/${buyer.id}/edit`, label: "Edit Buyer" },
            { href: "/staff/puppies", label: "Assign Buyer to Puppy" },
            { href: "/staff/reservations", label: "Reservations" },
            ...(familyIds[0] ? [{ href: `/staff/families/${familyIds[0]}`, label: "Open Family" }] : []),
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Internal boundary</p>
          <p className="mt-2 text-sm leading-6">This 360 workspace is internal owner/operator visibility only. Edit and assignment links stay inside Core. It does not message customers, invite portal users, publish puppies, process payments, generate documents, upload media, call external providers, or change records directly from this page.</p>
        </section>

        {warnings.length ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}

        <SummaryStrip
          items={[
            { label: "Status", value: <Badge>{display(buyer.approval_status, "Unknown")}</Badge>, note: display(buyer.source, "Source unknown") },
            { label: "Families", value: familyIds.length, note: "Linked household records" },
            { label: "Applications", value: applicationsResult.rows.length, note: "Buyer-linked records" },
            { label: "Reservations", value: reservationsResult.rows.length, note: `${activeReservationCount} active/open` },
            { label: "Balance due", value: formatMoney(balanceDue), note: "Ledger-derived" },
          ]}
        />

        <CommunicationPanel
          latestStatus={buyer.email || buyer.phone ? "Buyer contact detail is available for review" : "Buyer is missing email and phone"}
          nextFollowUp={applicationsResult.rows.length > 0 ? "Review linked application/reservation context before customer outreach." : "Review buyer contact and family links before outreach."}
          blockers={buyer.email || buyer.phone ? 0 : 1}
          mode={buyer.email || buyer.phone ? "review" : "blocked"}
          detail="This panel links to readiness only; it does not invite portal users or send messages."
        />

        <PortalStatusPanel
          accountStatus={portalAccessStatus}
          puppyAssigned={reservationsResult.rows.some((reservation) => Boolean(reservation.puppy_id))}
          documentReadyCount={portalReadyDocuments}
          documentTotalCount={documentsResult.rows.length}
          goHomeReady={portalGoHomeReady}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Matching Readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Buyer-level matching signal from linked applications, reservations, document metadata, and active assignment context.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{applicationsResult.rows.length ? `${applicationsResult.rows.length} application(s)` : "No application linked"}</Badge>
                <Badge>{activeReservationCount ? `${activeReservationCount} active reservation(s)` : "No active reservation"}</Badge>
                <Badge>{documentsResult.rows.length ? `${documentsResult.rows.length} document(s)` : "No document record found"}</Badge>
                <Badge>{attentionFlags.length} blocker(s)</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/matching" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Matching</Link>
              {applicationsResult.rows[0]?.id ? <Link href={`/staff/applications/${applicationsResult.rows[0].id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Application</Link> : null}
              {reservationsResult.rows[0]?.reservation_id ? <Link href={`/staff/reservations/${reservationsResult.rows[0].reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Reservation</Link> : null}
            </div>
          </div>
        </section>

        <SectionNav
          items={[
            { href: "#links", label: "Links" },
            { href: "#identity", label: "Identity" },
            { href: "#family", label: "Family", count: membersResult.rows.length },
            { href: "#applications", label: "Applications", count: applicationsResult.rows.length },
            { href: "#reservations", label: "Reservations", count: reservationsResult.rows.length },
            { href: "#attention", label: "Flags", count: attentionFlags.length },
          ]}
        />

        <section id="links" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Operational Links</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Internal navigation for controlled correction and reservation assignment workflows.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/staff/buyers/${buyer.id}/edit`} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Edit Buyer</Link>
            <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Assign Buyer to Puppy</Link>
            <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">View Active Reservations</Link>
            <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Payment Readiness</Link>
            <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Document Readiness</Link>
            <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Go-Home Readiness</Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <section id="identity" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Buyer Identity</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Email" value={display(buyer.email)} />
                <InfoCard label="Phone" value={display(buyer.phone)} note={buyer.alternate_phone ? `Alt ${buyer.alternate_phone}` : undefined} />
                <InfoCard label="Location" value={[buyer.city, buyer.state].filter(Boolean).join(", ") || "Not recorded"} note={buyer.postal_code || undefined} />
                <InfoCard label="Address" value={display(buyer.street_address)} />
                <InfoCard label="External ref" value={display(buyer.external_reference)} />
                <InfoCard label="Created / Updated" value={formatDate(buyer.created_at)} note={formatDate(buyer.updated_at)} />
              </dl>
              {buyer.notes ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{buyer.notes}</p> : null}
            </section>

            <section id="family" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Family Context</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {membersResult.rows.length ? membersResult.rows.map((member) => {
                  const family = member.family_id ? familiesById.get(member.family_id) : undefined;
                  return (
                    <article key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="font-semibold">{familyName(family)}</p>
                      <p className="mt-1 text-slate-500">{formatKey(member.relationship)} / {member.is_primary_contact ? "Primary contact" : "Member"} / {formatKey(member.portal_access_status)}</p>
                      {member.family_id ? <Link href={`/staff/families/${member.family_id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold">Open family</Link> : null}
                    </article>
                  );
                }) : <EmptyState text="No family membership rows are linked to this buyer." />}
              </div>
            </section>

            <section id="applications" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Applications</h2>
              <div className="mt-5">
                <TimelineList events={applicationsResult.rows.map((app) => ({ id: app.id, title: `${formatKey(app.status)} application`, note: `${formatDate(app.submitted_at)} / reviewed ${formatDate(app.reviewed_at)} / ${display(app.source, "source unknown")}`, href: `/staff/applications/${app.id}` }))} />
              </div>
            </section>

            <section id="reservations" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Reservations / Puppies / Go-Home</h2>
              <div className="mt-5">
                <TimelineList events={reservationsResult.rows.map((reservation) => ({ id: reservation.reservation_id, title: `${reservation.puppy_name || reservation.puppy_collar_color || "Puppy"} / ${formatKey(reservation.reservation_status)}`, note: `Balance ${formatMoney(reservation.balance_due_cents)} / go-home ${formatKey(reservation.go_home_status)} ${formatDateTime(reservation.go_home_planned_at)}`, href: `/staff/reservations/${reservation.reservation_id}` }))} />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section id="attention" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Attention Flags</h2>
              <div className="mt-4 space-y-2">{attentionFlags.length ? attentionFlags.map((flag) => <div key={flag} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{flag}</div>) : <EmptyState text="No deterministic buyer attention flags from current Core metadata." />}</div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Payment / Document Context</h2>
              <div className="mt-5 space-y-5">
                <TimelineList events={ledgerResult.rows.slice(0, 5).map((ledger) => ({ id: ledger.id, title: `${formatKey(ledger.entry_type)} / ${formatMoney(ledger.amount_cents)}`, note: `${formatKey(ledger.status)} / ${formatDateTime(ledger.occurred_at)} / ${display(ledger.payment_method)}` }))} />
                <TimelineList events={documentsResult.rows.slice(0, 5).map((document) => ({ id: document.id, title: display(document.title, formatKey(document.document_type)), note: `${formatKey(document.status)} / updated ${formatDateTime(document.updated_at)}`, href: `/staff/documents/${document.id}` }))} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Communication Metadata</h2>
              <div className="mt-5 space-y-5">
                <TimelineList events={conversationsResult.rows.slice(0, 5).map((conversation) => ({ id: conversation.id, title: display(conversation.subject, formatKey(conversation.channel)), note: `${formatKey(conversation.status)} / last ${formatDateTime(conversation.last_message_at)}`, href: "/staff/messages" }))} />
                <TimelineList events={messagesResult.rows.slice(0, 5).map((message) => ({ id: message.id, title: `${formatKey(message.direction)} ${formatKey(message.channel)}`, note: `${formatKey(message.status)} / ${formatDateTime(message.sent_at ?? message.received_at ?? message.created_at)}`, href: "/staff/messages" }))} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Events / Audit</h2>
              <div className="mt-5 space-y-5">
                <TimelineList events={eventsResult.rows.slice(0, 5).map((event) => ({ id: event.id, title: display(event.summary, formatKey(event.event_type)), note: `${formatDateTime(event.event_at)} / ${display(event.source)}`, href: "/staff/events" }))} />
                {canViewAudit ? <TimelineList events={auditResult.rows.slice(0, 5).map((audit) => ({ id: audit.id, title: formatKey(audit.action), note: `${formatKey(audit.outcome)} / ${display(audit.source)} / ${formatDateTime(audit.created_at)}`, href: "/staff/events" }))} /> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Related Links</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <Link href="/staff/buyers" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Buyer list</Link>
                <Link href="/staff/families" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Families</Link>
                <Link href="/staff/applications" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Applications</Link>
                <Link href="/staff/reservations" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Reservations</Link>
                <Link href="/staff/go-home" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Go-home</Link>
                <Link href="/staff/events" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Events</Link>
                <Link href="/staff/command" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Command</Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

