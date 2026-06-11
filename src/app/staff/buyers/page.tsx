import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SectionNav, SummaryStrip } from "../operator-ui";

export const dynamic = "force-dynamic";

type BuyerRow = {
  id: string;
  external_reference: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  approval_status: string | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
};

type FamilyMemberRow = {
  family_id: string | null;
  buyer_id: string | null;
  relationship: string | null;
  is_primary_contact: boolean | null;
  portal_access_status: string | null;
};

type ReservationRow = {
  buyer_id: string | null;
  reservation_status: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  balance_due_cents: number | null;
};

type ApplicationRow = {
  buyer_id: string | null;
  status: string | null;
  submitted_at: string | null;
};

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

function buyerName(buyer: BuyerRow) {
  const preferred = buyer.preferred_name?.trim();
  const full = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ").trim();
  return preferred || full || buyer.email || `Buyer ${buyer.id.slice(0, 8)}`;
}

function puppyDisplay(reservation: ReservationRow) {
  return reservation.puppy_name || reservation.puppy_collar_color || "Puppy not named";
}

function formatMoney(cents: number | null) {
  if (typeof cents !== "number") return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  if (["approved", "active", "completed"].includes(normalized)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["pending", "received", "review"].includes(normalized)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (["declined", "cancelled", "inactive"].includes(normalized)) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

export default async function StaffBuyersPage() {
  await requireStaffProfile();

  const [buyerResult, familyMemberResult, reservationResult, applicationResult] = await Promise.all([
    readRows<BuyerRow>("core_buyers", {
      select: "id,external_reference,first_name,last_name,preferred_name,email,phone,city,state,approval_status,source,notes,created_at",
      order: "created_at.desc",
      limit: "150",
    }),
    readRows<FamilyMemberRow>("core_family_members", {
      select: "family_id,buyer_id,relationship,is_primary_contact,portal_access_status",
      limit: "1000",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select: "buyer_id,reservation_status,puppy_name,puppy_collar_color,balance_due_cents",
      limit: "1000",
    }),
    readRows<ApplicationRow>("core_applications", {
      select: "buyer_id,status,submitted_at",
      order: "created_at.desc",
      limit: "1000",
    }),
  ]);

  const buyers = buyerResult.rows;
  const familyMembersByBuyer = new Map<string, FamilyMemberRow[]>();
  const reservationsByBuyer = new Map<string, ReservationRow[]>();
  const applicationsByBuyer = new Map<string, ApplicationRow[]>();

  for (const member of familyMemberResult.rows) {
    if (!member.buyer_id) continue;
    familyMembersByBuyer.set(member.buyer_id, [...(familyMembersByBuyer.get(member.buyer_id) ?? []), member]);
  }

  for (const reservation of reservationResult.rows) {
    if (!reservation.buyer_id) continue;
    reservationsByBuyer.set(reservation.buyer_id, [...(reservationsByBuyer.get(reservation.buyer_id) ?? []), reservation]);
  }

  for (const application of applicationResult.rows) {
    if (!application.buyer_id) continue;
    applicationsByBuyer.set(application.buyer_id, [...(applicationsByBuyer.get(application.buyer_id) ?? []), application]);
  }

  const approvedCount = buyers.filter((buyer) => buyer.approval_status?.toLowerCase() === "approved").length;
  const pendingCount = buyers.filter((buyer) => buyer.approval_status?.toLowerCase() === "pending").length;
  const withReservationsCount = buyers.filter((buyer) => reservationsByBuyer.has(buyer.id)).length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Buyers"
          title="Buyers Workspace"
          summary="Internal owner/operator workspace for customer contact records, family membership, application context, reservation links, puppy assignment visibility, and ledger-derived balance signals."
          status={`${buyers.length} buyers`}
          blockers={pendingCount > 0 ? `${pendingCount} pending` : "No pending buyer marker"}
          nextAction="Open a buyer 360, edit contact details, or review linked family/reservation context"
          links={[
            { href: "/staff/buyers/new", label: "Create Buyer" },
            { href: "/staff/families", label: "Families" },
            { href: "/staff/applications", label: "Applications" },
            { href: "/staff/reservations", label: "Reservations" },
            { href: "/staff/command", label: "Command" },
          ]}
        />

        <section id="boundary" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read-first safety boundary</p>
          <p className="mt-2 text-sm leading-6">Buyers are people/contact records. Financial truth remains on reservations and ledger rows, never copied onto buyer records.</p>
        </section>

        {buyerResult.warning || familyMemberResult.warning || reservationResult.warning || applicationResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {buyerResult.warning ?? familyMemberResult.warning ?? reservationResult.warning ?? applicationResult.warning}
          </section>
        ) : null}

        <SummaryStrip
          items={[
            { label: "Buyers", value: buyers.length, note: "Core buyer records" },
            { label: "Approved", value: approvedCount, note: "Approval marker only" },
            { label: "Pending", value: pendingCount, note: "Awaiting decision/follow-up" },
            { label: "With reservations", value: withReservationsCount, note: "Linked transaction context" },
          ]}
        />

        <SectionNav
          items={[
            { href: "#boundary", label: "Boundary" },
            { href: "#buyer-records", label: "Buyer Records", count: buyers.length },
            { href: "/staff/families", label: "Families" },
            { href: "/staff/applications", label: "Applications" },
            { href: "/staff/reservations", label: "Reservations" },
          ]}
        />

        <section id="buyer-records" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-lg font-semibold">Buyer Records</h2><p className="mt-1 text-sm leading-6 text-slate-500">Current Core buyer rows with linked family/application/reservation context when present.</p></div>
          {buyers.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {buyers.map((buyer) => {
                const familyMembers = familyMembersByBuyer.get(buyer.id) ?? [];
                const reservations = reservationsByBuyer.get(buyer.id) ?? [];
                const applications = applicationsByBuyer.get(buyer.id) ?? [];
                const primaryMember = familyMembers.find((member) => member.is_primary_contact) ?? familyMembers[0];
                const latestReservation = reservations[0];
                const latestApplication = applications[0];

                return (
                  <article key={buyer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{buyerName(buyer)}</p>
                        <p className="mt-1 text-sm text-slate-500">{display(buyer.email)} · {display(buyer.phone)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2"><Badge tone={statusTone(buyer.approval_status)}>{display(buyer.approval_status, "Unknown")}</Badge><Badge>{display(buyer.source, "Source unknown")}</Badge></div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Location</dt><dd className="mt-1 text-slate-700">{[buyer.city, buyer.state].filter(Boolean).join(", ") || "Not recorded"}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Family link</dt><dd className="mt-1 text-slate-700">{primaryMember?.family_id ? primaryMember.family_id.slice(0, 8) : "Not linked"}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Portal access</dt><dd className="mt-1 text-slate-700">{display(primaryMember?.portal_access_status)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Created</dt><dd className="mt-1 text-slate-700">{formatDate(buyer.created_at)}</dd></div>
                    </dl>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Application context</p><p className="mt-1 text-blue-800">{latestApplication ? `${display(latestApplication.status, "status unknown")} · ${formatDate(latestApplication.submitted_at)}` : "No linked application found."}</p></div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-semibold">Reservation context</p><p className="mt-1 text-emerald-800">{latestReservation ? `${puppyDisplay(latestReservation)} · ${display(latestReservation.reservation_status, "status unknown")} · ${formatMoney(latestReservation.balance_due_cents)}` : "No linked reservation found."}</p></div>
                    </div>

                    {buyer.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{buyer.notes}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/staff/buyers/${buyer.id}`} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Open buyer</Link>
                      <Link href={`/staff/buyers/${buyer.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Edit buyer</Link>
                      {primaryMember?.family_id ? <Link href={`/staff/families/${primaryMember.family_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open family</Link> : null}
                      <Link href={`/staff/buyers/${buyer.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open 360</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState text="No buyer records found in Core yet." />}
        </section>
      </div>
    </main>
  );
}
