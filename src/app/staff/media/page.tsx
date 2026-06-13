import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";
import { type KennelMediaRow, withKennelMediaSignedUrls } from "@/lib/kennel-media";
import {
  OperatorActivityRow,
  OperatorAlertPanel,
  OperatorHeader,
  OperatorPanel,
  OperatorStatusPill,
  SectionNav,
  SummaryStrip,
} from "../operator-ui";
import { ActionPanel } from "../action-panel";
import { ProposedActionPanel } from "../proposed-action-panel";
import { BreedingCarePanel } from "../breeding-care-panel";

export const dynamic = "force-dynamic";

type DogRow = {
  id: string;
  external_reference: string | null;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  status: string | null;
  updated_at: string | null;
};

type PuppyRow = {
  id: string;
  external_reference: string | null;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  status: string | null;
  public_listing_status: string | null;
  updated_at: string | null;
};

type LitterRow = {
  id: string;
  external_reference: string | null;
  litter_name: string | null;
  dam_id: string | null;
  sire_id: string | null;
  birth_at: string | null;
  expected_birth_at: string | null;
  status: string | null;
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

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dogName(dog: DogRow) {
  return dog.call_name || dog.registered_name || dog.external_reference || `Dog ${dog.id.slice(0, 8)}`;
}

function puppyName(puppy: PuppyRow) {
  return puppy.name || puppy.collar_color || puppy.external_reference || `Puppy ${puppy.id.slice(0, 8)}`;
}

function litterName(litter: LitterRow) {
  return litter.litter_name || litter.external_reference || `Litter ${litter.id.slice(0, 8)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function mediaForDog(media: KennelMediaRow[], dogId: string) {
  return media.filter((row) => row.entity_type === "dog" && row.dog_id === dogId);
}

function mediaForPuppy(media: KennelMediaRow[], puppyId: string) {
  return media.filter((row) => row.entity_type === "puppy" && row.puppy_id === puppyId);
}

function hasPrimary(rows: KennelMediaRow[]) {
  return rows.some((row) => row.is_primary);
}

function latestMediaAt(rows: KennelMediaRow[]) {
  return rows.map((row) => row.uploaded_at).filter(Boolean).sort().at(-1) ?? null;
}

export default async function StaffMediaPage() {
  await requireStaffProfile();

  const [dogResult, puppyResult, litterResult, mediaResult] = await Promise.all([
    readRows<DogRow>("core_dogs", {
      select: "id,external_reference,registered_name,call_name,sex,status,updated_at",
      order: "updated_at.desc.nullslast",
      limit: "500",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,external_reference,litter_id,name,collar_color,status,public_listing_status,updated_at",
      order: "updated_at.desc.nullslast",
      limit: "1000",
    }),
    readRows<LitterRow>("core_litters", {
      select: "id,external_reference,litter_name,dam_id,sire_id,birth_at,expected_birth_at,status,updated_at",
      order: "updated_at.desc.nullslast",
      limit: "500",
    }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,title,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,is_primary,visibility,notes,uploaded_at,uploaded_by_profile_id",
      order: "uploaded_at.desc.nullslast",
      limit: "1000",
    }),
  ]);

  const warnings = [dogResult.warning, puppyResult.warning, litterResult.warning, mediaResult.warning].filter(Boolean);
  const dogs = dogResult.rows;
  const puppies = puppyResult.rows;
  const litters = litterResult.rows;
  const media = mediaResult.rows;
  const mediaPreviews = await withKennelMediaSignedUrls(media.slice(0, 12));

  const activeDogs = dogs.filter((dog) => !["inactive", "retired", "archived"].includes(normalize(dog.status)));
  const activePuppies = puppies.filter((puppy) => !["sold", "placed", "deceased", "archived", "hidden"].includes(normalize(puppy.status)));
  const dogsMissingPrimary = activeDogs.filter((dog) => !hasPrimary(mediaForDog(media, dog.id)));
  const puppiesMissingPrimary = activePuppies.filter((puppy) => !hasPrimary(mediaForPuppy(media, puppy.id)));
  const recordsWithMediaNoPrimary = [
    ...activeDogs
      .map((dog) => ({ type: "dog" as const, id: dog.id, label: dogName(dog), href: `/staff/dogs/${dog.id}`, rows: mediaForDog(media, dog.id) }))
      .filter((row) => row.rows.length > 0 && !hasPrimary(row.rows)),
    ...activePuppies
      .map((puppy) => ({ type: "puppy" as const, id: puppy.id, label: puppyName(puppy), href: `/staff/puppies/${puppy.id}`, rows: mediaForPuppy(media, puppy.id) }))
      .filter((row) => row.rows.length > 0 && !hasPrimary(row.rows)),
  ];
  const puppiesWithNoRecentPhotos = activePuppies.filter((puppy) => {
    const latest = latestMediaAt(mediaForPuppy(media, puppy.id));
    const age = daysSince(latest);
    return latest === null || (age !== null && age > 30);
  });
  const puppiesByLitter = new Map<string, PuppyRow[]>();
  for (const puppy of puppies) {
    if (!puppy.litter_id) continue;
    puppiesByLitter.set(puppy.litter_id, [...(puppiesByLitter.get(puppy.litter_id) ?? []), puppy]);
  }
  const littersMissingGallery = litters.filter((litter) => {
    const litterPuppies = puppiesByLitter.get(litter.id) ?? [];
    return litterPuppies.length === 0 || !litterPuppies.some((puppy) => mediaForPuppy(media, puppy.id).length > 0);
  });
  const primaryCount = media.filter((row) => row.is_primary).length;
  const readinessTotal = activeDogs.length + activePuppies.length;
  const readyRecords = readinessTotal - dogsMissingPrimary.length - puppiesMissingPrimary.length;
  const readinessPercent = readinessTotal > 0 ? Math.round((readyRecords / readinessTotal) * 100) : 0;
  const attentionCount = dogsMissingPrimary.length + puppiesMissingPrimary.length + littersMissingGallery.length + recordsWithMediaNoPrimary.length + puppiesWithNoRecentPhotos.length;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <OperatorHeader
          eyebrow="Core Media"
          title="Media Command Center"
          summary="Internal owner/operator media readiness for dogs, puppies, and litters. This page reads private Core kennel-media metadata and never publishes images publicly."
          status={`${readinessPercent}% primary-photo readiness`}
          blockers={`${attentionCount} media attention item(s)`}
          nextAction="Resolve missing primary photos and stale puppy galleries"
          links={[
            { href: "/staff/dogs", label: "Dogs" },
            { href: "/staff/puppies", label: "Puppies" },
            { href: "/staff/litters", label: "Litters" },
          ]}
        />

        <SummaryStrip
          items={[
            { label: "Private media rows", value: media.length, note: "core_kennel_media records" },
            { label: "Primary images", value: primaryCount, note: "Dog/puppy primary markers" },
            { label: "Dogs missing primary", value: dogsMissingPrimary.length, note: "Active dog records" },
            { label: "Puppies missing primary", value: puppiesMissingPrimary.length, note: "Active puppy records" },
            { label: "Litters missing gallery", value: littersMissingGallery.length, note: "Derived from linked puppy photos" },
          ]}
        />

        <ActionPanel
          nextAction={attentionCount > 0 ? "Review missing primary photos and stale puppy galleries" : "Review media readiness queue"}
          blockers={attentionCount}
          mode="review-only"
          href="/staff/actions#media"
          detail="Media actions link to existing private dog and puppy media workflows only; no upload behavior, storage policy, public URL, or portal publishing changes are added."
        />

        <ProposedActionPanel
          nextAction={attentionCount > 0 ? "Media readiness has missing primary or stale photo signals" : "Review media intelligence"}
          blockers={attentionCount}
          priority={attentionCount > 0 ? "high" : "watch"}
          detail="Media intelligence uses existing private metadata only and cannot upload, publish, or change storage policy."
        />

        <BreedingCarePanel
          dogSignals={dogsMissingPrimary.length}
          litterSignals={littersMissingGallery.length}
          puppyCareSignals={puppiesMissingPrimary.length}
          href="/staff/breeding"
          detail="Breeding care media readiness connects dog, litter, and puppy photo gaps to the broader kennel-care command center."
        />

        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            { href: "#puppies", label: "Puppies", count: puppiesMissingPrimary.length },
            { href: "#dogs", label: "Dogs", count: dogsMissingPrimary.length },
            { href: "#litters", label: "Litters", count: littersMissingGallery.length },
            { href: "#missing-media", label: "Missing Media", count: attentionCount },
            { href: "#primary-images", label: "Primary Images", count: recordsWithMediaNoPrimary.length },
            { href: "#recent-activity", label: "Recent Activity", count: media.length },
          ]}
        />

        <OperatorAlertPanel title="Internal media boundary" tone="amber">
          Media management is internal only. Core does not create public media URLs, publish listings, expose private storage paths, update customer portals, message customers, or call outside providers from this page.
        </OperatorAlertPanel>

        {warnings.length > 0 ? (
          <OperatorAlertPanel title="Read warning" tone="red">
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </OperatorAlertPanel>
        ) : null}

        <section id="overview" className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <OperatorPanel title="Media Readiness" description="Readiness is deterministic from existing private media rows. Litter readiness is derived from linked puppy photos because the current media table supports dog and puppy entities only.">
            <div className="grid gap-3 md:grid-cols-2">
              <ReadinessRow label="Dog primary coverage" total={activeDogs.length} missing={dogsMissingPrimary.length} />
              <ReadinessRow label="Puppy primary coverage" total={activePuppies.length} missing={puppiesMissingPrimary.length} />
              <ReadinessRow label="Recent puppy photos" total={activePuppies.length} missing={puppiesWithNoRecentPhotos.length} />
              <ReadinessRow label="Litter gallery signal" total={litters.length} missing={littersMissingGallery.length} />
            </div>
          </OperatorPanel>

          <OperatorPanel title="Recent Private Previews" description="Signed internal previews are short-lived. Missing previews mean the private storage client is unavailable, not that the record is public.">
            {mediaPreviews.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {mediaPreviews.slice(0, 4).map((row) => (
                  <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {row.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.signedUrl} alt={row.title || "Private kennel media"} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-slate-200 px-3 text-center text-sm text-slate-600">Private preview unavailable</div>
                    )}
                    <div className="p-3 text-sm">
                      <p className="font-semibold text-slate-950">{row.title || row.file_name}</p>
                      <p className="mt-1 text-slate-500">{row.entity_type} / {formatDateTime(row.uploaded_at)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="No private media records found." />
            )}
          </OperatorPanel>
        </section>

        <section id="puppies" className="grid gap-6 xl:grid-cols-2">
          <OperatorPanel title="Puppies Missing Primary Photo" description="Active puppy records without a primary internal photo marker.">
            <CompactEntityList rows={puppiesMissingPrimary.slice(0, 12).map((puppy) => ({
              id: puppy.id,
              title: puppyName(puppy),
              detail: `${display(puppy.status, "Status unknown")} / ${display(puppy.public_listing_status, "Listing marker not recorded")}`,
              href: `/staff/puppies/${puppy.id}`,
              pill: mediaForPuppy(media, puppy.id).length ? `${mediaForPuppy(media, puppy.id).length} photo(s), no primary` : "No media record found",
            }))} emptyText="No active puppies are missing a primary internal photo." />
          </OperatorPanel>

          <OperatorPanel title="Puppies With No Recent Photos" description="Active puppies with no photo or no photo uploaded in the last 30 days.">
            <CompactEntityList rows={puppiesWithNoRecentPhotos.slice(0, 12).map((puppy) => ({
              id: puppy.id,
              title: puppyName(puppy),
              detail: `Latest photo: ${formatDateTime(latestMediaAt(mediaForPuppy(media, puppy.id)))}`,
              href: `/staff/puppies/${puppy.id}`,
              pill: "Needs refresh",
            }))} emptyText="No stale puppy photo rows were found." />
          </OperatorPanel>
        </section>

        <section id="dogs" className="grid gap-6 xl:grid-cols-2">
          <OperatorPanel title="Dogs Missing Primary Photo" description="Active dog records without a primary internal photo marker.">
            <CompactEntityList rows={dogsMissingPrimary.slice(0, 12).map((dog) => ({
              id: dog.id,
              title: dogName(dog),
              detail: `${display(dog.sex, "Sex not recorded")} / ${display(dog.status, "Status unknown")}`,
              href: `/staff/dogs/${dog.id}`,
              pill: mediaForDog(media, dog.id).length ? `${mediaForDog(media, dog.id).length} photo(s), no primary` : "No media record found",
            }))} emptyText="No active dogs are missing a primary internal photo." />
          </OperatorPanel>

          <OperatorPanel title="Records With Media But No Primary" description="A photo exists, but no primary image has been selected in Core metadata.">
            <CompactEntityList rows={recordsWithMediaNoPrimary.slice(0, 12).map((row) => ({
              id: row.id,
              title: row.label,
              detail: `${row.type} / ${row.rows.length} private photo record(s)`,
              href: row.href,
              pill: "Primary image not recorded",
            }))} emptyText="Every record with media has a primary marker." />
          </OperatorPanel>
        </section>

        <OperatorPanel id="litters" title="Litter Media Readiness" description="The current media table supports dog and puppy photos. Litter gallery readiness is derived from linked puppy photos.">
          <div className="grid gap-3 xl:grid-cols-2">
            {littersMissingGallery.length > 0 ? littersMissingGallery.slice(0, 16).map((litter) => {
              const litterPuppies = puppiesByLitter.get(litter.id) ?? [];
              const photoCount = litterPuppies.reduce((count, puppy) => count + mediaForPuppy(media, puppy.id).length, 0);
              return (
                <Link key={litter.id} href={`/staff/litters/${litter.id}`} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-950 no-underline">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{litterName(litter)}</p>
                      <p className="mt-1">Puppies: {litterPuppies.length} / gallery photos: {photoCount}</p>
                    </div>
                    <OperatorStatusPill tone="amber">Missing gallery signal</OperatorStatusPill>
                  </div>
                  <p className="mt-2 text-xs leading-5">Direct litter photo records are not supported by the current media table; add puppy photos or review linked litter context.</p>
                </Link>
              );
            }) : <EmptyState text="Every litter has at least one linked puppy photo signal." />}
          </div>
        </OperatorPanel>

        <section id="missing-media" className="grid gap-6 xl:grid-cols-2">
          <OperatorPanel title="Media Blockers / Attention List" description="Highest-signal gaps for owner/operator review.">
            <div className="space-y-1">
              <OperatorActivityRow title="Dogs missing primary photo" detail={`${dogsMissingPrimary.length} active dog record(s)`} href="#dogs" />
              <OperatorActivityRow title="Puppies missing primary photo" detail={`${puppiesMissingPrimary.length} active puppy record(s)`} href="#puppies" />
              <OperatorActivityRow title="Litters missing gallery signal" detail={`${littersMissingGallery.length} litter record(s)`} href="#litters" />
              <OperatorActivityRow title="Media rows without primary assignment" detail={`${recordsWithMediaNoPrimary.length} dog/puppy record(s)`} href="#primary-images" />
              <OperatorActivityRow title="Puppies needing recent photo refresh" detail={`${puppiesWithNoRecentPhotos.length} active puppy record(s)`} href="#puppies" />
            </div>
          </OperatorPanel>

          <OperatorPanel title="Quick Links" description="Jump back to the source records that own media workflows.">
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/dogs" className="operator-quick-action">Dog records</Link>
              <Link href="/staff/puppies" className="operator-quick-action">Puppy records</Link>
              <Link href="/staff/litters" className="operator-quick-action">Litter records</Link>
              <Link href="/staff/go-home/handoff" className="operator-quick-action">Go-home handoff</Link>
            </div>
          </OperatorPanel>
        </section>

        <OperatorPanel id="primary-images" title="Primary Image Review" description="Records where media exists but no primary internal photo is selected.">
          <CompactEntityList rows={recordsWithMediaNoPrimary.map((row) => ({
            id: row.id,
            title: row.label,
            detail: `${row.type} / latest photo ${formatDateTime(latestMediaAt(row.rows))}`,
            href: row.href,
            pill: "Primary image not recorded",
          }))} emptyText="No primary-image gaps found." />
        </OperatorPanel>

        <OperatorPanel id="recent-activity" title="Recent Media Activity" description="Latest private kennel-media metadata rows, newest first.">
          <div className="space-y-1">
            {media.length > 0 ? media.slice(0, 20).map((row) => (
              <OperatorActivityRow
                key={row.id}
                title={row.title || row.file_name}
                detail={`${row.entity_type} / ${row.is_primary ? "primary" : "gallery"} / ${formatDateTime(row.uploaded_at)}`}
                meta={row.entity_type === "dog" && row.dog_id ? "Dog" : row.entity_type === "puppy" && row.puppy_id ? "Puppy" : "Media"}
                href={row.entity_type === "dog" && row.dog_id ? `/staff/dogs/${row.dog_id}` : row.entity_type === "puppy" && row.puppy_id ? `/staff/puppies/${row.puppy_id}` : undefined}
              />
            )) : <EmptyState text="No private media activity found." />}
          </div>
        </OperatorPanel>
      </div>
    </main>
  );
}

function ReadinessRow({ label, total, missing }: { label: string; total: number; missing: number }) {
  const ready = Math.max(total - missing, 0);
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <OperatorStatusPill tone={missing > 0 ? "amber" : "green"}>{percent}% ready</OperatorStatusPill>
      </div>
      <p className="mt-2 text-sm text-slate-600">{ready} ready / {missing} missing / {total} total</p>
    </div>
  );
}

function CompactEntityList({
  rows,
  emptyText,
}: {
  rows: Array<{ id: string; title: string; detail: string; href: string; pill: string }>;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Link key={row.id} href={row.href} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-950 no-underline sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{row.title}</p>
            <p className="mt-1 text-sm text-slate-600">{row.detail}</p>
          </div>
          <OperatorStatusPill tone={row.pill.includes("No media") || row.pill.includes("not recorded") ? "amber" : "blue"}>{row.pill}</OperatorStatusPill>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{text}</div>;
}
