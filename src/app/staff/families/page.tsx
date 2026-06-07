import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type FamilyRow = {
  id: string;
  name: string | null;
  status: string | null;
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

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  approval_status: string | null;
};

type ReservationRow = {
  family_id: string | null;
  reservation_status: string | null;
  puppy_name: string | null;
  puppy_collar_color: string | null;
  balance_due_cents: number | null;
};

type ApplicationRow = {
  family_id: string | null;
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
  if (!config) return { rows: [] as T[], warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads." };

  const response = await fetch(buildUrl(config.restUrl, table, params), {
    headers: { apikey: config.serviceRoleKey, authorization: `Bearer ${config.serviceRoleKey}` },
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

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) return "Buyer not found";
  const preferred = buyer.preferred_name?.trim();
  const full = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ").trim();
  return preferred || full || buyer.email || `Buyer ${buyer.id.slice(0, 8)}`;
}

function familyName(family: FamilyRow, members: FamilyMemberRow[], buyersById: Map<string, BuyerRow>) {
  if (family.name?.trim()) return family.name;
  const primary = members.find((member) => member.is_primary_contact) ?? members[0];
  const buyer = primary?.buyer_id ? buyersById.get(primary.buyer_id) : undefined;
  return buyer ? `${buyerName(buyer)} Family` : `Family ${family.id.slice(0, 8)}`;
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
  if (["active", "approved", "completed"].includes(normalized)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["pending", "received", "review"].includes(normalized)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (["inactive", "cancelled", "declined"].includes(normalized)) return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

export default async function StaffFamiliesPage() {
  await requireStaffProfile();

  const [familyResult, memberResult, buyerResult, reservationResult, applicationResult] = await Promise.all([
    readRows<FamilyRow>("core_families", {
      select: "id,name,status,notes,created_at",
      order: "created_at.desc",
      limit: "150",
    }),
    readRows<FamilyMemberRow>("core_family_members", {
      select: "family_id,buyer_id,relationship,is_primary_contact,portal_access_status",
      limit: "1000",
    }),
    readRows<BuyerRow>("core_buyers", {
      select: "id,first_name,last_name,preferred_name,email,phone,approval_status",
      limit: "1000",
    }),
    readRows<ReservationRow>("core_reservation_summary_view", {
      select: "family_id,reservation_status,puppy_name,puppy_collar_color,balance_due_cents",
      limit: "1000",
    }),
    readRows<ApplicationRow>("core_applications", {
      select: "family_id,status,submitted_at",
      order: "created_at.desc",
      limit: "1000",
    }),
  ]);

  const families = familyResult.rows;
  const buyersById = new Map(buyerResult.rows.map((buyer) => [buyer.id, buyer]));
  const membersByFamily = new Map<string, FamilyMemberRow[]>();
  const reservationsByFamily = new Map<string, ReservationRow[]>();
  const applicationsByFamily = new Map<string, ApplicationRow[]>();

  for (const member of memberResult.rows) {
    if (!member.family_id) continue;
    membersByFamily.set(member.family_id, [...(membersByFamily.get(member.family_id) ?? []), member]);
  }

  for (const reservation of reservationResult.rows) {
    if (!reservation.family_id) continue;
    reservationsByFamily.set(reservation.family_id, [...(reservationsByFamily.get(reservation.family_id) ?? []), reservation]);
  }

  for (const application of applicationResult.rows) {
    if (!application.family_id) continue;
    applicationsByFamily.set(application.family_id, [...(applicationsByFamily.get(application.family_id) ?? []), application]);
  }

  const activeCount = families.filter((family) => family.status?.toLowerCase() === "active").length;
  const withMembersCount = families.filter((family) => (membersByFamily.get(family.id) ?? []).length > 0).length;
  const withReservationsCount = families.filter((family) => reservationsByFamily.has(family.id)).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Core Families</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Families Workspace</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Real Core household records with buyer members, application context, reservations, puppy context, and portal access markers. This page is read-only and does not invite portal users, send messages, create documents, or touch outside systems.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read-first safety boundary</p>
          <p className="mt-2 text-sm leading-6">Families are household groups. They help connect buyers, applications, reservations, and future portal access, but they are not the financial source of truth.</p>
        </section>

        {familyResult.warning || memberResult.warning || buyerResult.warning || reservationResult.warning || applicationResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {familyResult.warning ?? memberResult.warning ?? buyerResult.warning ?? reservationResult.warning ?? applicationResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Families</p><p className="mt-3 text-3xl font-bold">{families.length}</p><p className="mt-2 text-sm text-slate-500">Core family records</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p><p className="mt-3 text-3xl font-bold">{activeCount}</p><p className="mt-2 text-sm text-slate-500">Marked active</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">With members</p><p className="mt-3 text-3xl font-bold">{withMembersCount}</p><p className="mt-2 text-sm text-slate-500">Buyer/profile links</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">With reservations</p><p className="mt-3 text-3xl font-bold">{withReservationsCount}</p><p className="mt-2 text-sm text-slate-500">Linked transaction context</p></div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-lg font-semibold">Family Records</h2><p className="mt-1 text-sm leading-6 text-slate-500">Current Core family rows with member/application/reservation context when present.</p></div>
          {families.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {families.map((family) => {
                const members = membersByFamily.get(family.id) ?? [];
                const reservations = reservationsByFamily.get(family.id) ?? [];
                const applications = applicationsByFamily.get(family.id) ?? [];
                const latestReservation = reservations[0];
                const latestApplication = applications[0];
                const primaryMember = members.find((member) => member.is_primary_contact) ?? members[0];
                const primaryBuyer = primaryMember?.buyer_id ? buyersById.get(primaryMember.buyer_id) : undefined;

                return (
                  <article key={family.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{familyName(family, members, buyersById)}</p>
                        <p className="mt-1 text-sm text-slate-500">Primary: {buyerName(primaryBuyer)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2"><Badge tone={statusTone(family.status)}>{display(family.status, "Unknown")}</Badge><Badge>{members.length} member{members.length === 1 ? "" : "s"}</Badge></div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Family ID</dt><dd className="mt-1 text-slate-700">{family.id.slice(0, 8)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Created</dt><dd className="mt-1 text-slate-700">{formatDate(family.created_at)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Portal marker</dt><dd className="mt-1 text-slate-700">{display(primaryMember?.portal_access_status)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-400">Primary contact</dt><dd className="mt-1 text-slate-700">{primaryBuyer ? `${display(primaryBuyer.email)} · ${display(primaryBuyer.phone)}` : "Not linked"}</dd></div>
                    </dl>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-950">Members</p>
                      {members.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {members.map((member, index) => <Badge key={`${member.buyer_id ?? "profile"}-${index}`}>{buyerName(member.buyer_id ? buyersById.get(member.buyer_id) : undefined)} · {display(member.relationship, "relationship not recorded")}</Badge>)}
                        </div>
                      ) : <p className="mt-1 text-slate-600">No linked members found.</p>}
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950"><p className="font-semibold">Application context</p><p className="mt-1 text-blue-800">{latestApplication ? `${display(latestApplication.status, "status unknown")} · ${formatDate(latestApplication.submitted_at)}` : "No linked application found."}</p></div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-semibold">Reservation context</p><p className="mt-1 text-emerald-800">{latestReservation ? `${puppyDisplay(latestReservation)} · ${display(latestReservation.reservation_status, "status unknown")} · ${formatMoney(latestReservation.balance_due_cents)}` : "No linked reservation found."}</p></div>
                    </div>

                    {family.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{family.notes}</p> : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/staff/families/${family.id}`} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Open family</Link>
                      {primaryBuyer ? <Link href={`/staff/buyers/${primaryBuyer.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open buyer</Link> : null}
                      <Link href={`/staff/families/${family.id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open 360</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState text="No real family records found in local Core yet." />}
        </section>
      </div>
    </main>
  );
}
