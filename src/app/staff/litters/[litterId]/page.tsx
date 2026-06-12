import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";
import type { KennelMediaRow } from "@/lib/kennel-media";
import { OperatorAlertPanel, OperatorHeader, OperatorPanel, SectionNav, SummaryStrip } from "../../operator-ui";
import { ActionPanel } from "../../action-panel";

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
  status: string | null;
  public_listing_status: string | null;
  updated_at: string | null;
};

type ReadResult<T> = {
  rows: T[];
  warning: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(restUrl: string, table: string, params: Record<string, string>) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>): Promise<ReadResult<T>> {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      rows: [],
      warning: "Core read configuration is not available for server-side operational reads.",
    };
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
    return {
      rows: [],
      warning: `${table} read failed: ${response.status} ${body}`.trim(),
    };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function litterName(litter: LitterRow) {
  return litter.litter_name || litter.external_reference || `Litter ${litter.id.slice(0, 8)}`;
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.external_reference || `Puppy ${puppy.id.slice(0, 8)}`;
}

function dogName(dog: DogRow | undefined | null) {
  if (!dog) return "Not linked";
  return dog.call_name || dog.registered_name || `Dog ${dog.id.slice(0, 8)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function mediaForPuppy(media: KennelMediaRow[], puppyId: string) {
  return media.filter((row) => row.puppy_id === puppyId);
}

function hasPrimary(rows: KennelMediaRow[]) {
  return rows.some((row) => row.is_primary);
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "blue" }) {
  const toneClass = tone === "green"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClass}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}

export default async function LitterDetailPage({ params }: { params: Promise<{ litterId: string }> }) {
  await requireStaffProfile();
  const { litterId } = await params;

  const litterResult = await readRows<LitterRow>("core_litters", {
    select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,details_pending,notes,created_at,updated_at",
    id: `eq.${litterId}`,
    limit: "1",
  });
  const litter = litterResult.rows[0] ?? null;

  if (!litter) {
    notFound();
  }

  const [dogResult, puppyResult, mediaResult] = await Promise.all([
    readRows<DogRow>("core_dogs", {
      select: "id,registered_name,call_name,sex,status",
      or: `(id.eq.${litter.dam_id ?? "00000000-0000-0000-0000-000000000000"},id.eq.${litter.sire_id ?? "00000000-0000-0000-0000-000000000000"})`,
      limit: "2",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,sex,color,status,public_listing_status,updated_at",
      litter_id: `eq.${litter.id}`,
      order: "created_at.asc",
      limit: "200",
    }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,title,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,is_primary,visibility,notes,uploaded_at,uploaded_by_profile_id",
      entity_type: "eq.puppy",
      order: "uploaded_at.desc.nullslast",
      limit: "1000",
    }),
  ]);

  const dogsById = new Map(dogResult.rows.map((dog) => [dog.id, dog]));
  const puppies = puppyResult.rows;
  const media = mediaResult.rows.filter((row) => row.puppy_id && puppies.some((puppy) => puppy.id === row.puppy_id));
  const availablePuppies = puppies.filter((puppy) => puppy.status?.toLowerCase() === "available");
  const puppiesWithMedia = puppies.filter((puppy) => mediaForPuppy(media, puppy.id).length > 0).length;
  const puppiesWithPrimary = puppies.filter((puppy) => hasPrimary(mediaForPuppy(media, puppy.id))).length;
  const blockers = [
    puppies.length === 0 ? "No puppies are linked to this litter." : null,
    puppies.length > 0 && puppiesWithMedia === 0 ? "No linked puppy photo records found." : null,
    puppies.length > 0 && puppiesWithPrimary < puppies.length ? `${puppies.length - puppiesWithPrimary} puppy primary image marker(s) missing.` : null,
    "Direct litter photo records are not supported by the current core_kennel_media table.",
  ].filter(Boolean);
  const warnings = [litterResult.warning, dogResult.warning, puppyResult.warning, mediaResult.warning].filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <OperatorHeader
          eyebrow="Core Litters"
          title={litterName(litter)}
          summary="Internal litter media readiness derived from linked puppy media, dam/sire context, and existing Core litter records."
          status={blockers.length <= 1 ? "Media signal ready" : "Media review needed"}
          blockers={`${Math.max(blockers.length - 1, 0)} actionable media gap(s)`}
          nextAction="Review linked puppy galleries and primary photo markers"
          links={[
            { href: "/staff/media#litters", label: "Media Center" },
            { href: "/staff/litters", label: "Litters" },
            { href: "/staff/puppies", label: "Puppies" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Puppies", value: puppies.length, note: "Linked to this litter" },
            { label: "Gallery photos", value: media.length, note: "Linked puppy media rows" },
            { label: "Puppies with photos", value: `${puppiesWithMedia} / ${puppies.length}`, note: "Any private photo" },
            { label: "Puppies with primary", value: `${puppiesWithPrimary} / ${puppies.length}`, note: "Primary image marker" },
            { label: "Direct litter upload", value: "Not available", note: "Current media table supports dog/puppy only" },
          ]}
        />

        <ActionPanel
          nextAction={blockers.length > 1 ? "Review litter media and linked puppy primary-photo gaps" : "Review litter matching and puppy readiness"}
          blockers={Math.max(blockers.length - 1, 0)}
          mode="review-only"
          href="/staff/actions#media"
          detail="Litter detail actions are review-only links into existing puppy, media, and matching workspaces; no direct litter upload or public publishing behavior is added."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Matching Readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Litter-level matching signal from linked puppy availability, sex counts, media readiness, and parent context.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={availablePuppies.length ? "green" : "slate"}>{availablePuppies.length} available puppy(ies)</Badge>
                <Badge>{puppies.length} linked puppy(ies)</Badge>
                <Badge>{puppiesWithPrimary} with primary photo</Badge>
                <Badge>{Math.max(blockers.length - 1, 0)} blocker(s)</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/matching" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Matching</Link>
              <Link href="/staff/puppies" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Puppies</Link>
            </div>
          </div>
        </section>

        <SectionNav
          items={[
            { href: "#readiness", label: "Readiness" },
            { href: "#puppies", label: "Puppy Photos", count: puppies.length },
            { href: "#context", label: "Litter Context" },
          ]}
        />

        {warnings.length > 0 ? (
          <OperatorAlertPanel title="Read warning" tone="red">
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </OperatorAlertPanel>
        ) : null}

        <OperatorPanel id="readiness" title="Litter Media Readiness" description="Read-only media readiness based on existing Core rows. No upload, storage, or public publishing behavior is added here.">
          <div className="grid gap-3 md:grid-cols-2">
            {blockers.map((blocker) => (
              <div key={blocker} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{blocker}</div>
            ))}
          </div>
        </OperatorPanel>

        <OperatorPanel id="puppies" title="Puppy Photo Readiness" description="Each row links to the puppy detail page where existing private dog/puppy media actions already live.">
          {puppies.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {puppies.map((puppy) => {
                const puppyMedia = mediaForPuppy(media, puppy.id);
                const primary = hasPrimary(puppyMedia);
                return (
                  <Link key={puppy.id} href={`/staff/puppies/${puppy.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950 no-underline">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{puppyName(puppy)}</p>
                        <p className="mt-1 text-sm text-slate-600">{display(puppy.sex, "Sex not recorded")} / {display(puppy.color, "Color not recorded")} / {display(puppy.status, "Status not recorded")}</p>
                      </div>
                      <Badge tone={primary ? "green" : puppyMedia.length ? "amber" : "slate"}>{primary ? "Primary ready" : puppyMedia.length ? "Needs primary" : "No photo"}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{puppyMedia.length} private photo record(s). Public listing marker: {display(puppy.public_listing_status, "Not recorded")}.</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No puppies are linked to this litter yet." />
          )}
        </OperatorPanel>

        <OperatorPanel id="context" title="Litter Context" description="Core litter facts used to interpret media readiness.">
          <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <Info label="Status" value={display(litter.status)} />
            <Info label="Birth date" value={formatDate(litter.birth_at)} />
            <Info label="Expected date" value={formatDate(litter.expected_birth_at)} />
            <Info label="Details pending" value={litter.details_pending ? "Yes" : "No"} />
            <Info label="Dam" value={dogName(litter.dam_id ? dogsById.get(litter.dam_id) : null)} href={litter.dam_id ? `/staff/dogs/${litter.dam_id}` : undefined} />
            <Info label="Sire" value={dogName(litter.sire_id ? dogsById.get(litter.sire_id) : null)} href={litter.sire_id ? `/staff/dogs/${litter.sire_id}` : undefined} />
            <Info label="Recorded total" value={String(litter.total_puppies ?? "Not recorded")} />
            <Info label="Female / male" value={`${litter.female_count ?? "?"} / ${litter.male_count ?? "?"}`} />
          </dl>
          {litter.notes ? <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{litter.notes}</p> : null}
        </OperatorPanel>
      </div>
    </main>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">
        {href ? <Link href={href} className="text-blue-700">{value}</Link> : value}
      </dd>
    </div>
  );
}
