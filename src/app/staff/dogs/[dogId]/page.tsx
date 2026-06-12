import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";
import { uploadKennelMediaFile } from "@/app/staff/kennel-media-actions";
import { type KennelMediaRow, withKennelMediaSignedUrls } from "@/lib/kennel-media";
import {
  openPrivateDogDocumentFile,
  recordDogDocumentMetadata,
  recordDogHealthEvent,
  updateDogProfileMetadata,
  uploadDogDocumentFile,
} from "./actions";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;

type DogRow = {
  id: string;
  external_reference: string | null;
  registered_name: string | null;
  call_name: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  birth_at: string | null;
  status: string | null;
  notes: string | null;
  metadata: JsonMap | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  notes: string | null;
};

type PuppyRow = {
  id: string;
  litter_id: string | null;
  name: string | null;
  collar_color: string | null;
  sex: string | null;
  color: string | null;
  coat_type: string | null;
  status: string | null;
};

type ReservationRow = {
  id: string;
  puppy_id: string | null;
  buyer_id: string | null;
  family_id: string | null;
  status: string | null;
  sale_type: string | null;
};

type BuyerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
};

type FamilyRow = {
  id: string;
  name: string | null;
};

type HealthEventRow = {
  id: string;
  dog_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  veterinarian_or_clinic: string | null;
  cost_cents: number | null;
  follow_up_date: string | null;
  severity: string | null;
  metadata: JsonMap | null;
};

type DogDocumentRow = {
  id: string;
  dog_id: string;
  document_type: string;
  title: string;
  registry: string | null;
  document_status: string | null;
  report_source: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  uploaded_at: string | null;
  uploaded_by_profile_id: string | null;
  notes: string | null;
  metadata: JsonMap | null;
};

type EventRow = {
  id: string;
  event_type: string | null;
  event_at: string | null;
  summary: string | null;
  source: string | null;
  related_table: string | null;
  related_id: string | null;
};

type AuditRow = {
  id: string;
  source: string | null;
  action: string | null;
  entity_table: string | null;
  entity_id: string | null;
  outcome: string | null;
  created_at: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { rows: [] as T[], warning: "Core read configuration is not available for server-side operational reads." };
  }

  const url = new URL(`${config.restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
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

function display(value: unknown, fallback = "Not recorded") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function dogName(dog: DogRow | undefined | null) {
  if (!dog) return "Dog";
  return dog.call_name || dog.registered_name || dog.external_reference || `Dog ${dog.id.slice(0, 8)}`;
}

function formatKey(value: string | null | undefined) {
  return display(value).replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function calculateAge(value: string | null) {
  if (!value) return "Not recorded";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "Invalid date";
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths ? `${years} yr ${remainingMonths} mo` : `${years} yr`;
}

function formatMoney(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function metadataText(metadata: JsonMap | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function metadataNumber(metadata: JsonMap | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "none";
}

function buyerName(buyer: BuyerRow | undefined) {
  if (!buyer) return "Buyer not linked";
  return buyer.preferred_name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.email || `Buyer ${buyer.id.slice(0, 8)}`;
}

function familyName(family: FamilyRow | undefined) {
  return family?.name || (family ? `Family ${family.id.slice(0, 8)}` : "Family not linked");
}

function ResultMessage({ value }: { value?: string }) {
  if (!value) return null;
  const success = value.endsWith("_updated") || value.endsWith("_recorded");
  return (
    <section className={`rounded-3xl border p-4 text-sm shadow-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      Dog profile action result: {formatKey(value)}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{text}</div>;
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

export default async function DogProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ dogId: string }>;
  searchParams: Promise<{ dog?: string }>;
}) {
  const staff = await requireStaffProfile();
  const { dogId } = await params;
  const { dog: resultValue } = await searchParams;
  const canEdit = staff.role === "owner" || staff.role === "admin";

  const dogResult = await readRows<DogRow>("core_dogs", {
    select: "id,external_reference,registered_name,call_name,sex,color,coat_type,birth_at,status,notes,metadata,created_at,updated_at",
    id: `eq.${dogId}`,
    limit: "1",
  });
  const dog = dogResult.rows[0];

  if (!dog) {
    notFound();
  }

  const [littersResult, puppiesResult, reservationsResult, buyersResult, familiesResult, healthResult, documentsResult, mediaResult, eventsResult, auditResult] = await Promise.all([
    readRows<LitterRow>("core_litters", {
      select: "id,external_reference,litter_name,dam_id,sire_id,expected_birth_at,birth_at,total_puppies,female_count,male_count,status,notes",
      or: `(dam_id.eq.${dog.id},sire_id.eq.${dog.id})`,
      order: "birth_at.desc.nullslast",
      limit: "200",
    }),
    readRows<PuppyRow>("core_puppies", {
      select: "id,litter_id,name,collar_color,sex,color,coat_type,status",
      order: "created_at.asc",
      limit: "500",
    }),
    readRows<ReservationRow>("core_reservations", {
      select: "id,puppy_id,buyer_id,family_id,status,sale_type",
      order: "created_at.desc",
      limit: "500",
    }),
    readRows<BuyerRow>("core_buyers", {
      select: "id,first_name,last_name,preferred_name,email",
      order: "updated_at.desc",
      limit: "500",
    }),
    readRows<FamilyRow>("core_families", {
      select: "id,name",
      order: "updated_at.desc",
      limit: "500",
    }),
    readRows<HealthEventRow>("core_dog_health_events", {
      select: "id,dog_id,event_type,event_date,title,description,veterinarian_or_clinic,cost_cents,follow_up_date,severity,metadata",
      dog_id: `eq.${dog.id}`,
      order: "event_date.desc",
      limit: "100",
    }),
    readRows<DogDocumentRow>("core_dog_documents", {
      select: "id,dog_id,document_type,title,registry,document_status,report_source,issued_at,expires_at,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,uploaded_at,uploaded_by_profile_id,notes,metadata",
      dog_id: `eq.${dog.id}`,
      order: "updated_at.desc",
      limit: "100",
    }),
    readRows<KennelMediaRow>("core_kennel_media", {
      select: "id,entity_type,dog_id,puppy_id,title,file_name,file_mime_type,file_size_bytes,storage_bucket,storage_path,is_primary,visibility,notes,uploaded_at,uploaded_by_profile_id",
      entity_type: "eq.dog",
      dog_id: `eq.${dog.id}`,
      order: "is_primary.desc,uploaded_at.desc",
      limit: "50",
    }),
    readRows<EventRow>("core_events", {
      select: "id,event_type,event_at,summary,source,related_table,related_id",
      related_table: "eq.core_dogs",
      related_id: `eq.${dog.id}`,
      order: "event_at.desc",
      limit: "25",
    }),
    canEdit
      ? readRows<AuditRow>("core_audit_log", {
          select: "id,source,action,entity_table,entity_id,outcome,created_at",
          entity_table: "eq.core_dogs",
          entity_id: `eq.${dog.id}`,
          order: "created_at.desc",
          limit: "25",
        })
      : Promise.resolve({ rows: [] as AuditRow[], warning: null }),
  ]);

  const mediaPreviews = await withKennelMediaSignedUrls(mediaResult.rows);
  const mediaWarning = mediaResult.warning ? "Private photo storage is not available from the current Core schema yet." : null;
  const primaryDogPhoto = mediaPreviews.find((media) => media.is_primary) ?? null;
  const latestDogPhotoAt = mediaPreviews.map((media) => media.uploaded_at).filter(Boolean).sort().at(-1) ?? null;
  const mediaBlockers = [
    mediaPreviews.length === 0 ? "No media record found for this dog." : null,
    !primaryDogPhoto ? "Primary image not recorded." : null,
    documentsResult.rows.length === 0 ? "No dog document metadata recorded." : null,
  ].filter(Boolean);
  const warnings = [dogResult, littersResult, puppiesResult, reservationsResult, buyersResult, familiesResult, healthResult, documentsResult, { warning: mediaWarning }, eventsResult, auditResult]
    .map((result) => result.warning)
    .filter(Boolean);
  const litters = littersResult.rows;
  const litterIds = new Set(litters.map((litter) => litter.id));
  const puppies = puppiesResult.rows.filter((puppy) => puppy.litter_id && litterIds.has(puppy.litter_id));
  const reservationsByPuppy = new Map(reservationsResult.rows.filter((reservation) => reservation.puppy_id).map((reservation) => [reservation.puppy_id as string, reservation]));
  const buyersById = new Map(buyersResult.rows.map((buyer) => [buyer.id, buyer]));
  const familiesById = new Map(familiesResult.rows.map((family) => [family.id, family]));
  const dogMetadata = dog.metadata ?? {};
  const role = metadataText(dogMetadata, "profile_role");
  const acquisitionPrice = metadataNumber(dogMetadata, "acquisition_price_cents");
  const attentionFlags = [
    !role ? "Role not recorded" : null,
    !dog.birth_at ? "Birth date missing" : null,
    !metadataText(dogMetadata, "primary_registry") && !metadataText(dogMetadata, "registration_number") ? "Registry metadata missing" : null,
    healthResult.rows.some((event) => event.severity === "emergency" || event.event_type === "birth_complication") ? "High-attention health history present" : null,
    documentsResult.rows.length === 0 ? "No dog document metadata recorded" : null,
  ].filter(Boolean);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">Breeding Dog Profile</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{dogName(dog)}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Internal owner/operator profile for identity, registry, health history, dog documents, and dam/sire litter context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/media" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Media Center</Link>
              <Link href="/staff/dogs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Back to Dogs</Link>
              <Link href={`/staff/dogs/${dog.id}/edit`} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Edit dog</Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Dog detail internal safety boundary</p>
          <p className="mt-2 text-sm leading-6">
            This workspace stores internal breeding dog records, health history, registry metadata, private photos, and lineage context only. It does not diagnose animals, replace veterinary care, publish listings, message customers, generate documents, expose public media, or call external providers.
          </p>
        </section>

        <ResultMessage value={resultValue} />

        {warnings.length ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <InfoCard label="Status" value={<Badge>{display(dog.status, "Unknown")}</Badge>} />
          <InfoCard label="Sex / Role" value={`${display(dog.sex)} / ${role || "Not recorded"}`} />
          <InfoCard label="Age" value={calculateAge(dog.birth_at)} note={formatDate(dog.birth_at)} />
          <InfoCard label="Litters" value={litters.length} note={`${litters.filter((litter) => litter.dam_id === dog.id).length} dam / ${litters.filter((litter) => litter.sire_id === dog.id).length} sire`} />
          <InfoCard label="Documents" value={documentsResult.rows.length} note="Metadata-only records" />
          <InfoCard label="Photos" value={mediaPreviews.length} note="Private kennel-media only" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Identity</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Call name" value={display(dog.call_name)} />
                <InfoCard label="Registered name" value={display(dog.registered_name)} />
                <InfoCard label="External ref" value={display(dog.external_reference)} />
                <InfoCard label="Color" value={display(dog.color)} />
                <InfoCard label="Coat" value={display(dog.coat_type)} />
                <InfoCard label="Created / Updated" value={formatDate(dog.created_at)} note={formatDate(dog.updated_at)} />
              </dl>
              {dog.notes ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{dog.notes}</p> : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Registry / Genetic Testing / Certificates</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Primary registry" value={metadataText(dogMetadata, "primary_registry") || "Not recorded"} note={metadataText(dogMetadata, "registration_number") || undefined} />
                <InfoCard label="Secondary registry" value={metadataText(dogMetadata, "secondary_registry") || "Not recorded"} note={metadataText(dogMetadata, "secondary_registration_number") || undefined} />
                <InfoCard label="Microchip" value={metadataText(dogMetadata, "microchip_number") || "Not recorded"} />
                <InfoCard label="Certificate notes" value={metadataText(dogMetadata, "certificate_notes") || "Not recorded"} />
                <InfoCard label="Genetic testing" value={metadataText(dogMetadata, "genetic_testing_summary") || "Not recorded"} />
                <InfoCard label="Color/coat genetics" value={metadataText(dogMetadata, "color_coat_genetics_notes") || "Not recorded"} />
                <InfoCard label="COI notes" value={metadataText(dogMetadata, "coi_notes") || "Not recorded"} />
                <InfoCard label="Storage boundary" value="Private dog-document storage only; no public links." />
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Acquisition</h2>
              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Acquired from" value={metadataText(dogMetadata, "acquired_from_name") || "Not recorded"} note={metadataText(dogMetadata, "acquired_from_state") || undefined} />
                <InfoCard label="Contact" value={metadataText(dogMetadata, "acquired_from_contact") || "Not recorded"} />
                <InfoCard label="Acquisition date" value={formatDate(metadataText(dogMetadata, "acquisition_date") || null)} />
                <InfoCard label="Acquisition price" value={formatMoney(acquisitionPrice)} />
              </dl>
              {metadataText(dogMetadata, "acquisition_notes") ? <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{metadataText(dogMetadata, "acquisition_notes")}</p> : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Media Readiness / Private Dog Photos</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Internal kennel-media photos only. Images render through short-lived signed URLs; raw storage paths stay hidden.</p>
                </div>
                <Badge>{mediaPreviews.length} photo{mediaPreviews.length === 1 ? "" : "s"}</Badge>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <InfoCard label="Primary photo" value={primaryDogPhoto ? "Recorded" : "Not recorded"} note={primaryDogPhoto?.title || primaryDogPhoto?.file_name || undefined} />
                <InfoCard label="Gallery count" value={mediaPreviews.length} note="Private kennel-media rows" />
                <InfoCard label="Latest photo" value={formatDateTime(latestDogPhotoAt)} note="Internal upload timestamp" />
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                {mediaBlockers.length > 0 ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <p className="font-bold">Media attention</p>
                    <ul className="mt-2 space-y-1">
                      {mediaBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Dog media readiness is clear from current Core rows.</div>
                )}
                <Link href="/staff/media#dogs" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Open Media Center</Link>
              </div>
              {mediaPreviews.length ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {mediaPreviews.map((media) => (
                    <article key={media.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {media.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={media.signedUrl} alt={media.title || "Private dog photo"} className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-slate-200 px-4 text-center text-sm text-slate-600">Private preview unavailable</div>
                      )}
                      <div className="space-y-2 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-950">{media.title || media.file_name}</p>
                          {media.is_primary ? <Badge>Primary</Badge> : null}
                        </div>
                        <p className="text-slate-500">{formatDateTime(media.uploaded_at)} / {formatFileSize(media.file_size_bytes)}</p>
                        {media.notes ? <p className="leading-6 text-slate-600">{media.notes}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5"><EmptyState text="No private dog photos are attached yet." /></div>
              )}
              {canEdit ? (
                <form action={uploadKennelMediaFile} encType="multipart/form-data" className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="entityType" value="dog" />
                  <input type="hidden" name="entityId" value={dog.id} />
                  <label className="block text-sm font-medium">Photo title<input name="title" maxLength={160} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Private photo<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
                  <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-slate-300" /> Mark as primary internal photo</label>
                  <label className="block text-sm font-medium">Notes<textarea name="notes" rows={3} maxLength={600} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <p className="text-xs leading-5 text-slate-500">JPG, PNG, or WEBP only. Max 10 MB. Private storage only; no public URL, listing publish, customer message, or external provider call.</p>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Upload private photo</button>
                </form>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Health / Medical History</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Factual internal records only: vet visits, vaccines, surgeries, reproductive events, injuries, and notes.</p>
                </div>
                <Badge>{healthResult.rows.length} records</Badge>
              </div>
              {healthResult.rows.length ? (
                <div className="mt-5 space-y-3">
                  {healthResult.rows.map((event) => (
                    <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{event.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{formatKey(event.event_type)} / {formatDate(event.event_date)}</p>
                        </div>
                        <Badge>{event.severity || "severity not recorded"}</Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Vet / clinic</dt><dd>{display(event.veterinarian_or_clinic)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Cost</dt><dd>{formatMoney(event.cost_cents)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Follow-up</dt><dd>{formatDate(event.follow_up_date)}</dd></div>
                      </dl>
                      {event.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5"><EmptyState text="No dog health history records exist yet." /></div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
              <h2 className="text-lg font-semibold">Dog Documents / Reports / Certificates</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Dog-linked metadata and private owner/operator file attachments for genetic reports, registries, pedigrees, vaccines, health certificates, and acquisition records.</p>
            </div>
                <Badge>Private storage</Badge>
              </div>
              {documentsResult.rows.length ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {documentsResult.rows.map((document) => (
                    <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{document.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{formatKey(document.document_type)} / {formatKey(document.document_status)}</p>
                        </div>
                        <Badge>{document.storage_bucket && document.storage_path ? "private file attached" : "no file"}</Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Registry</dt><dd>{display(document.registry)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Source</dt><dd>{display(document.report_source)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Issued</dt><dd>{formatDate(document.issued_at)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Expires</dt><dd>{formatDate(document.expires_at)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Attached</dt><dd>{document.file_name ? document.file_name : "No file attached"}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">File type</dt><dd>{display(document.file_mime_type)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">File size</dt><dd>{formatFileSize(document.file_size_bytes)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Uploaded</dt><dd>{formatDateTime(document.uploaded_at)}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase text-slate-400">Storage</dt><dd>{document.storage_bucket && document.storage_path ? "Private bucket; path hidden" : "No private file attached"}</dd></div>
                      </dl>
                      {document.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{document.notes}</p> : null}
                      {canEdit ? (
                        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                          <form action={uploadDogDocumentFile} encType="multipart/form-data" className="space-y-3">
                            <input type="hidden" name="dogId" value={dog.id} />
                            <input type="hidden" name="dogDocumentId" value={document.id} />
                            <label className="block text-sm font-medium">
                              Attach private file
                              <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                            </label>
                            <p className="text-xs leading-5 text-slate-500">Private bucket only. PDF, JPG, PNG, WEBP, TXT, or CSV. Max 10 MB. No public URL is created.</p>
                            <button type="submit" className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Upload private file</button>
                          </form>
                          {document.storage_bucket && document.storage_path ? (
                            <form action={openPrivateDogDocumentFile}>
                              <input type="hidden" name="dogId" value={dog.id} />
                              <input type="hidden" name="dogDocumentId" value={document.id} />
                              <button type="submit" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open private file</button>
                              <p className="mt-2 text-xs leading-5 text-slate-500">Creates a short-lived internal signed URL only when clicked.</p>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5"><EmptyState text="No dog document metadata exists yet. Create metadata first, then attach a private file from this section." /></div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Dam/Sire Litter History</h2>
              {litters.length ? (
                <div className="mt-5 space-y-4">
                  {litters.map((litter) => {
                    const litterPuppies = puppies.filter((puppy) => puppy.litter_id === litter.id);
                    const dogRole = litter.dam_id === dog.id ? "Dam" : "Sire";
                    return (
                      <article key={litter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold">{litter.litter_name || litter.external_reference || `Litter ${litter.id.slice(0, 8)}`}</p>
                            <p className="mt-1 text-sm text-slate-500">{dogRole} context / {formatDate(litter.birth_at || litter.expected_birth_at)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2"><Badge>{formatKey(litter.status)}</Badge><Badge>{litterPuppies.length} puppies</Badge></div>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                          <div><dt className="text-xs font-semibold uppercase text-slate-400">Expected</dt><dd>{formatDate(litter.expected_birth_at)}</dd></div>
                          <div><dt className="text-xs font-semibold uppercase text-slate-400">Born</dt><dd>{formatDate(litter.birth_at)}</dd></div>
                          <div><dt className="text-xs font-semibold uppercase text-slate-400">Recorded count</dt><dd>{litter.total_puppies ?? "Not recorded"}</dd></div>
                          <div><dt className="text-xs font-semibold uppercase text-slate-400">Female / male</dt><dd>{litter.female_count ?? "?"} / {litter.male_count ?? "?"}</dd></div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/staff/litters/${litter.id}/edit`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Open litter edit</Link>
                          <Link href="/staff/litters" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Litters</Link>
                        </div>
                        {litterPuppies.length ? (
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {litterPuppies.map((puppy) => {
                              const reservation = reservationsByPuppy.get(puppy.id);
                              const buyer = reservation?.buyer_id ? buyersById.get(reservation.buyer_id) : undefined;
                              const family = reservation?.family_id ? familiesById.get(reservation.family_id) : undefined;
                              return (
                                <div key={puppy.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-semibold">{puppy.name || puppy.collar_color || `Puppy ${puppy.id.slice(0, 8)}`}</p>
                                      <p className="mt-1 text-slate-500">{display(puppy.sex)} / {display(puppy.color)} / {display(puppy.status)}</p>
                                    </div>
                                    <Link href={`/staff/puppies/${puppy.id}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold">Open puppy</Link>
                                  </div>
                                  <p className="mt-3 text-slate-600">Reservation: {reservation ? formatKey(reservation.status) : "Not linked"}</p>
                                  {reservation ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <Link href={`/staff/reservations/${reservation.id}`} className="text-xs font-semibold text-blue-700">Reservation {shortId(reservation.id)}</Link>
                                      <span className="text-xs text-slate-500">{buyerName(buyer)} / {familyName(family)}</span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-4"><EmptyState text="No puppy records are linked to this litter yet." /></div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5"><EmptyState text="No litter history is linked to this dog yet." /></div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Watch / Attention Flags</h2>
              {attentionFlags.length ? (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {attentionFlags.map((flag) => <li key={flag} className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{flag}</li>)}
                </ul>
              ) : (
                <div className="mt-4"><EmptyState text="No deterministic attention flags from current dog metadata." /></div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Related Links</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <Link href="/staff/dogs" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Dog list</Link>
                <Link href={`/staff/dogs/${dog.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Edit dog</Link>
                <Link href="/staff/litters" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Litters</Link>
                <Link href="/staff/puppies" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Puppies</Link>
                <Link href="/staff/kennel-logs" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Kennel logs</Link>
                <Link href="/staff/events" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Events</Link>
                <Link href="/staff/command" className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Command</Link>
              </div>
            </section>

            {canEdit ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Update Registry / Acquisition Metadata</h2>
                <form action={updateDogProfileMetadata} className="mt-4 space-y-3">
                  <input type="hidden" name="dogId" value={dog.id} />
                  <label className="block text-sm font-medium">Role
                    <select name="role" defaultValue={role} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                      <option value="">Not recorded</option>
                      <option value="dam">Dam</option>
                      <option value="sire">Sire</option>
                      <option value="active">Active</option>
                      <option value="retired">Retired</option>
                      <option value="breeding_candidate">Breeding candidate</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Primary registry<input name="primaryRegistry" defaultValue={metadataText(dogMetadata, "primary_registry")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Registration #<input name="registrationNumber" defaultValue={metadataText(dogMetadata, "registration_number")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Secondary registry<input name="secondaryRegistry" defaultValue={metadataText(dogMetadata, "secondary_registry")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Secondary #<input name="secondaryRegistrationNumber" defaultValue={metadataText(dogMetadata, "secondary_registration_number")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Microchip<input name="microchipNumber" defaultValue={metadataText(dogMetadata, "microchip_number")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Acquisition price<input name="acquisitionPrice" defaultValue={acquisitionPrice ? String(acquisitionPrice / 100) : ""} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Acquired from<input name="acquiredFromName" defaultValue={metadataText(dogMetadata, "acquired_from_name")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">State<input name="acquiredFromState" defaultValue={metadataText(dogMetadata, "acquired_from_state")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Contact<input name="acquiredFromContact" defaultValue={metadataText(dogMetadata, "acquired_from_contact")} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Acquisition date<input type="date" name="acquisitionDate" defaultValue={dateInput(metadataText(dogMetadata, "acquisition_date"))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  </div>
                  <label className="block text-sm font-medium">Genetic testing summary<textarea name="geneticTestingSummary" defaultValue={metadataText(dogMetadata, "genetic_testing_summary")} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Color/coat genetics notes<textarea name="colorCoatGeneticsNotes" defaultValue={metadataText(dogMetadata, "color_coat_genetics_notes")} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">COI notes<textarea name="coiNotes" defaultValue={metadataText(dogMetadata, "coi_notes")} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Certificate notes<textarea name="certificateNotes" defaultValue={metadataText(dogMetadata, "certificate_notes")} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Acquisition notes<textarea name="acquisitionNotes" defaultValue={metadataText(dogMetadata, "acquisition_notes")} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Save metadata</button>
                </form>
              </section>
            ) : null}

            {canEdit ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Record Health Event</h2>
                <form action={recordDogHealthEvent} className="mt-4 space-y-3">
                  <input type="hidden" name="dogId" value={dog.id} />
                  <label className="block text-sm font-medium">Type
                    <select name="eventType" defaultValue="general_health_note" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                      <option value="vet_visit">Vet visit</option>
                      <option value="vaccine">Vaccine / shot</option>
                      <option value="surgery">Surgery</option>
                      <option value="birth_complication">Birth complication</option>
                      <option value="reproductive">Reproductive event</option>
                      <option value="medication">Medication</option>
                      <option value="injury">Injury</option>
                      <option value="general_health_note">General health note</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Event date<input type="date" name="eventDate" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Title<input name="title" required maxLength={180} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Description<textarea name="description" rows={3} maxLength={1600} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Vet / clinic<input name="veterinarianOrClinic" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Cost<input name="cost" placeholder="0.00" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Follow-up date<input type="date" name="followUpDate" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Severity
                      <select name="severity" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                        <option value="">Not recorded</option>
                        <option value="low">Low</option>
                        <option value="watch">Watch</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>
                  </div>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record health event</button>
                </form>
              </section>
            ) : null}

            {canEdit ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Record Dog Document Metadata</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Create the internal metadata record first, then attach a private file from the document vault card.</p>
                <form action={recordDogDocumentMetadata} className="mt-4 space-y-3">
                  <input type="hidden" name="dogId" value={dog.id} />
                  <label className="block text-sm font-medium">Type
                    <select name="documentType" defaultValue="genetic_test" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                      <option value="genetic_test">Genetic test</option>
                      <option value="embark_report">Embark report</option>
                      <option value="pedigree">Pedigree</option>
                      <option value="akc_registration">AKC registration</option>
                      <option value="ckc_registration">CKC registration</option>
                      <option value="aca_registration">ACA registration</option>
                      <option value="dual_registration">Dual registration</option>
                      <option value="vaccine_record">Vaccine record</option>
                      <option value="health_certificate">Health certificate</option>
                      <option value="surgery_record">Surgery record</option>
                      <option value="emergency_vet_record">Emergency vet record</option>
                      <option value="acquisition_record">Acquisition record</option>
                      <option value="microchip_record">Microchip record</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Title<input name="title" required maxLength={180} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Registry<input name="registry" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Status
                      <select name="documentStatus" defaultValue="metadata_only" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                        <option value="metadata_only">Metadata only</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="archived">Archived</option>
                        <option value="review_needed">Review needed</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">Report source<input name="reportSource" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">File name metadata<input name="fileName" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Issued<input type="date" name="issuedAt" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">Expires<input type="date" name="expiresAt" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">MIME type<input name="fileMimeType" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                    <label className="text-sm font-medium">File size bytes<input name="fileSizeBytes" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  </div>
                  <label className="block text-sm font-medium">Notes<textarea name="notes" rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Record document metadata</button>
                </form>
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Event / Audit Context</h2>
              {eventsResult.rows.length ? (
                <div className="mt-4 space-y-3">
                  {eventsResult.rows.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="font-semibold">{formatKey(event.event_type)}</p>
                      <p className="mt-1 text-slate-500">{event.source || "core_events"} / {formatDateTime(event.event_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4"><EmptyState text="No safely linked dog event rows yet." /></div>
              )}
              {canEdit ? (
                auditResult.rows.length ? (
                  <div className="mt-5 space-y-3">
                    {auditResult.rows.map((audit) => (
                      <div key={audit.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <p className="font-semibold">{formatKey(audit.action)}</p>
                        <p className="mt-1 text-slate-500">{audit.source || "core_audit_log"} / {formatKey(audit.outcome)} / {formatDateTime(audit.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5"><EmptyState text="No owner/admin audit rows linked to this dog yet." /></div>
                )
              ) : null}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

