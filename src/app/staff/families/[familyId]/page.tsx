import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../../operator-ui";
import { CommunicationPanel } from "../../communication-panel";

export const dynamic = "force-dynamic";

type FamilyRow = { id: string; name: string | null; status: string | null; notes: string | null; metadata: Record<string, unknown> | null; created_at: string | null; updated_at: string | null };
type FamilyMemberRow = { id: string; family_id: string | null; buyer_id: string | null; relationship: string | null; is_primary_contact: boolean | null; portal_access_status: string | null };
type BuyerRow = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; email: string | null; phone: string | null; city: string | null; state: string | null; approval_status: string | null };
type ApplicationRow = { id: string; family_id: string | null; buyer_id: string | null; status: string | null; submitted_at: string | null; reviewed_at: string | null; source: string | null };
type ReservationRow = { reservation_id: string; reservation_status: string | null; reserved_at: string | null; buyer_id: string | null; buyer_name: string | null; family_id: string | null; puppy_id: string | null; puppy_name: string | null; puppy_collar_color: string | null; puppy_status: string | null; contract_total_cents: number | null; posted_ledger_total_cents: number | null; balance_due_cents: number | null; go_home_planned_at: string | null; go_home_status: string | null; go_home_method: string | null };
type LedgerRow = { id: string; reservation_id: string | null; buyer_id: string | null; entry_type: string | null; status: string | null; amount_cents: number | null; occurred_at: string | null; description: string | null };
type DocumentRow = { id: string; title: string | null; document_type: string | null; status: string | null; reservation_id: string | null; family_id: string | null; buyer_id: string | null; updated_at: string | null };
type ConversationRow = { id: string; family_id: string | null; buyer_id: string | null; channel: string | null; subject: string | null; status: string | null; last_message_at: string | null };
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
  const response = await fetch(url, { headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` }, cache: "no-store" });
  if (!response.ok) return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${await response.text().catch(() => "")}`.trim() };
  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function formatKey(value: string | null | undefined) {
  return display(value).replaceAll("_", " ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "none";
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) return "Buyer not linked";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${shortId(buyer.id)}`;
}

function familyName(family: FamilyRow, members: FamilyMemberRow[], buyersById: Map<string, BuyerRow>) {
  if (family.name) return family.name;
  const primary = members.find((member) => member.is_primary_contact) ?? members[0];
  return primary?.buyer_id ? `${buyerName(buyersById.get(primary.buyer_id))} Family` : `Family ${shortId(family.id)}`;
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

function RowList({ rows }: { rows: Array<{ id: string; title: string; note: string; href?: string }> }) {
  if (!rows.length) return <EmptyState text="No rows found for this section." />;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-semibold text-slate-950">{row.title}</p><p className="mt-1 text-slate-500">{row.note}</p></div>
            {row.href ? <Link href={row.href} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold">Open</Link> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function Family360Page({ params }: { params: Promise<{ familyId: string }> }) {
  const staff = await requireStaffProfile();
  const { familyId } = await params;
  const canViewAudit = staff.role === "owner" || staff.role === "admin";

  const familyResult = await readRows<FamilyRow>("core_families", {
    select: "id,name,status,notes,metadata,created_at,updated_at",
    id: `eq.${familyId}`,
    limit: "1",
  });
  const family = familyResult.rows[0];
  if (!family) notFound();

  const [membersResult, applicationsResult, reservationsResult, documentsResult, conversationsResult, eventsResult, auditResult] = await Promise.all([
    readRows<FamilyMemberRow>("core_family_members", { select: "id,family_id,buyer_id,relationship,is_primary_contact,portal_access_status", family_id: `eq.${family.id}`, limit: "100" }),
    readRows<ApplicationRow>("core_applications", { select: "id,family_id,buyer_id,status,submitted_at,reviewed_at,source", family_id: `eq.${family.id}`, order: "created_at.desc", limit: "100" }),
    readRows<ReservationRow>("core_reservation_summary_view", { select: "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,family_id,puppy_id,puppy_name,puppy_collar_color,puppy_status,contract_total_cents,posted_ledger_total_cents,balance_due_cents,go_home_planned_at,go_home_status,go_home_method", family_id: `eq.${family.id}`, order: "created_at.desc", limit: "100" }),
    readRows<DocumentRow>("core_documents", { select: "id,title,document_type,status,reservation_id,family_id,buyer_id,updated_at", family_id: `eq.${family.id}`, order: "updated_at.desc", limit: "100" }),
    readRows<ConversationRow>("core_conversations", { select: "id,family_id,buyer_id,channel,subject,status,last_message_at", family_id: `eq.${family.id}`, order: "last_message_at.desc.nullslast", limit: "100" }),
    readRows<EventRow>("core_events", { select: "id,event_type,event_at,summary,source,related_table,related_id", family_id: `eq.${family.id}`, order: "event_at.desc", limit: "100" }),
    canViewAudit ? readRows<AuditRow>("core_audit_log", { select: "id,source,action,entity_table,entity_id,outcome,created_at", entity_table: "eq.core_families", entity_id: `eq.${family.id}`, order: "created_at.desc", limit: "100" }) : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const buyerIds = [...new Set(membersResult.rows.map((member) => member.buyer_id).filter((id): id is string => Boolean(id)))];
  const buyerResult = buyerIds.length ? await readRows<BuyerRow>("core_buyers", { select: "id,first_name,last_name,preferred_name,email,phone,city,state,approval_status", id: `in.(${buyerIds.join(",")})`, limit: "100" }) : { rows: [] as BuyerRow[], warning: null };
  const buyersById = new Map(buyerResult.rows.map((buyer) => [buyer.id, buyer]));
  const ledgerBuyerFilter = buyerIds.length ? `in.(${buyerIds.join(",")})` : "eq.00000000-0000-0000-0000-000000000000";
  const ledgerResult = await readRows<LedgerRow>("core_financial_ledger", { select: "id,reservation_id,buyer_id,entry_type,status,amount_cents,occurred_at,description", buyer_id: ledgerBuyerFilter, order: "occurred_at.desc", limit: "100" });
  const primaryMember = membersResult.rows.find((member) => member.is_primary_contact) ?? membersResult.rows[0];
  const primaryBuyer = primaryMember?.buyer_id ? buyersById.get(primaryMember.buyer_id) : undefined;
  const activeReservationCount = reservationsResult.rows.filter((reservation) => !["cancelled", "completed"].includes((reservation.reservation_status ?? "").toLowerCase())).length;
  const balanceDue = reservationsResult.rows.reduce((sum, reservation) => sum + (reservation.balance_due_cents ?? 0), 0);
  const attentionFlags = [
    membersResult.rows.length === 0 ? "No buyer members linked." : null,
    !primaryBuyer ? "No primary buyer/contact resolved." : null,
    applicationsResult.rows.length === 0 ? "No family application linked." : null,
    activeReservationCount > 0 && balanceDue > 0 ? "Active family reservation balance due." : null,
    documentsResult.rows.some((document) => ["draft", "pending", "missing", "review_needed"].includes((document.status ?? "").toLowerCase())) ? "Document metadata needs review." : null,
  ].filter(Boolean);
  const warnings = [familyResult.warning, membersResult.warning, applicationsResult.warning, reservationsResult.warning, documentsResult.warning, conversationsResult.warning, eventsResult.warning, auditResult.warning, buyerResult.warning, ledgerResult.warning].filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Family 360 Command Workspace"
          title={familyName(family, membersResult.rows, buyersById)}
          summary="Internal household command view for members, buyers, applications, reservations, go-home/payment readiness, documents, communications, events, and audit context."
          status={display(family.status, "Unknown")}
          blockers={attentionFlags.length > 0 ? `${attentionFlags.length} attention flag(s)` : "No deterministic flags"}
          nextAction="Use related links to edit the household, open buyer context, assign puppy context, or review readiness lanes."
          links={[
            { href: "/staff/families", label: "Back to Families" },
            { href: `/staff/families/${family.id}/edit`, label: "Edit Family" },
            { href: "/staff/buyers", label: "Buyers" },
            { href: "/staff/puppies", label: "Assign Puppy" },
            ...(primaryBuyer ? [{ href: `/staff/buyers/${primaryBuyer.id}`, label: "Open Buyer" }] : []),
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Internal boundary</p>
          <p className="mt-2 text-sm leading-6">This family 360 workspace is internal owner/operator visibility only. Edit and assignment links stay inside Core. It does not invite portal users, message customers, publish puppies, process payments, generate documents, upload media, call external providers, or change records directly from this page.</p>
        </section>

        {warnings.length ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}

        <SummaryStrip
          items={[
            { label: "Status", value: <Badge>{display(family.status, "Unknown")}</Badge> },
            { label: "Members", value: membersResult.rows.length, note: "Linked buyer/profile rows" },
            { label: "Applications", value: applicationsResult.rows.length, note: "Family-linked records" },
            { label: "Reservations", value: reservationsResult.rows.length, note: `${activeReservationCount} active/open` },
            { label: "Balance due", value: formatMoney(balanceDue), note: "Ledger-derived" },
          ]}
        />

        <CommunicationPanel
          latestStatus={`${conversationsResult.rows.length} family conversation record(s) visible`}
          nextFollowUp={applicationsResult.rows.length > 0 ? "Review family applications, contact history, and reservation context before outreach." : "Review family members and contact context before outreach."}
          blockers={membersResult.rows.length === 0 ? 1 : 0}
          mode={membersResult.rows.length === 0 ? "attention" : "review"}
          detail="This panel uses existing communication metadata only and does not send messages."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Matching Readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Family-level matching signal from household members, linked applications, reservations, and document metadata.
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
            { href: "#household", label: "Household", count: membersResult.rows.length },
            { href: "#applications", label: "Applications", count: applicationsResult.rows.length },
            { href: "#reservations", label: "Reservations", count: reservationsResult.rows.length },
            { href: "#attention", label: "Flags", count: attentionFlags.length },
          ]}
        />

        <section id="links" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Operational Links</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Internal navigation for controlled household correction and buyer/puppy relationship workflows.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/staff/families/${family.id}/edit`} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Edit Family</Link>
            <Link href="/staff/buyers" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">View Linked Buyers</Link>
            <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Assign Puppy</Link>
            <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">View Reservations</Link>
            <Link href="/staff/payments" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Payment Readiness</Link>
            <Link href="/staff/documents" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Document Readiness</Link>
            <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Go-Home Readiness</Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <section id="household" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Household / Member Context</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Family ID" value={shortId(family.id)} />
                <InfoCard label="Primary contact" value={buyerName(primaryBuyer)} note={primaryBuyer?.email || undefined} />
                <InfoCard label="Created / Updated" value={formatDate(family.created_at)} note={formatDate(family.updated_at)} />
              </dl>
              {family.notes ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{family.notes}</p> : null}
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {membersResult.rows.length ? membersResult.rows.map((member) => {
                  const buyer = member.buyer_id ? buyersById.get(member.buyer_id) : undefined;
                  return (
                    <article key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="font-semibold">{buyerName(buyer)}</p>
                      <p className="mt-1 text-slate-500">{formatKey(member.relationship)} / {member.is_primary_contact ? "Primary contact" : "Member"} / {formatKey(member.portal_access_status)}</p>
                      {buyer ? <Link href={`/staff/buyers/${buyer.id}`} className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold">Open buyer</Link> : null}
                    </article>
                  );
                }) : <EmptyState text="No member rows are linked to this family." />}
              </div>
            </section>

            <section id="applications" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Applications</h2>
              <div className="mt-5"><RowList rows={applicationsResult.rows.map((app) => ({ id: app.id, title: `${formatKey(app.status)} application`, note: `${formatDate(app.submitted_at)} / reviewed ${formatDate(app.reviewed_at)} / ${display(app.source, "source unknown")}`, href: `/staff/applications/${app.id}` }))} /></div>
            </section>

            <section id="reservations" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Reservations / Puppies / Go-Home</h2>
              <div className="mt-5"><RowList rows={reservationsResult.rows.map((reservation) => ({ id: reservation.reservation_id, title: `${reservation.puppy_name || reservation.puppy_collar_color || "Puppy"} / ${formatKey(reservation.reservation_status)}`, note: `${display(reservation.buyer_name)} / balance ${formatMoney(reservation.balance_due_cents)} / go-home ${formatKey(reservation.go_home_status)} ${formatDateTime(reservation.go_home_planned_at)}`, href: `/staff/reservations/${reservation.reservation_id}` }))} /></div>
            </section>
          </div>

          <aside className="space-y-6">
            <section id="attention" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Attention Flags</h2>
              <div className="mt-4 space-y-2">{attentionFlags.length ? attentionFlags.map((flag) => <div key={flag} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{flag}</div>) : <EmptyState text="No deterministic family attention flags from current Core metadata." />}</div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Payment / Document Context</h2>
              <div className="mt-5 space-y-5">
                <RowList rows={ledgerResult.rows.slice(0, 5).map((ledger) => ({ id: ledger.id, title: `${formatKey(ledger.entry_type)} / ${formatMoney(ledger.amount_cents)}`, note: `${formatKey(ledger.status)} / ${formatDateTime(ledger.occurred_at)}` }))} />
                <RowList rows={documentsResult.rows.slice(0, 5).map((document) => ({ id: document.id, title: display(document.title, formatKey(document.document_type)), note: `${formatKey(document.status)} / updated ${formatDateTime(document.updated_at)}`, href: `/staff/documents/${document.id}` }))} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Communication Metadata</h2>
              <div className="mt-5"><RowList rows={conversationsResult.rows.slice(0, 8).map((conversation) => ({ id: conversation.id, title: display(conversation.subject, formatKey(conversation.channel)), note: `${formatKey(conversation.status)} / last ${formatDateTime(conversation.last_message_at)}`, href: "/staff/messages" }))} /></div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Events / Audit</h2>
              <div className="mt-5 space-y-5">
                <RowList rows={eventsResult.rows.slice(0, 5).map((event) => ({ id: event.id, title: display(event.summary, formatKey(event.event_type)), note: `${formatDateTime(event.event_at)} / ${display(event.source)}`, href: "/staff/events" }))} />
                {canViewAudit ? <RowList rows={auditResult.rows.slice(0, 5).map((audit) => ({ id: audit.id, title: formatKey(audit.action), note: `${formatKey(audit.outcome)} / ${display(audit.source)} / ${formatDateTime(audit.created_at)}`, href: "/staff/events" }))} /> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Related Links</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <Link href="/staff/families" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Family list</Link>
                <Link href="/staff/buyers" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Buyers</Link>
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

