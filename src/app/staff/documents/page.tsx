import Link from "next/link";
import { requireStaffProfile } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  family_id: string | null;
  buyer_id: string | null;
  puppy_id: string | null;
  reservation_id: string | null;
  document_type: string | null;
  title: string | null;
  status: string | null;
  current_version_number: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentVersionRow = {
  id: string;
  document_id: string | null;
  version_number: number | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: string | null;
  generated_at: string | null;
  signed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReservationSummaryRow = {
  reservation_id: string;
  reservation_status: string | null;
  reserved_at: string | null;
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
  go_home_method: string | null;
  go_home_status: string | null;
  go_home_detail_status: string | null;
  go_home_checklist_status: string | null;
  go_home_balance_cleared_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReservationRow = {
  id: string;
  sale_type: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

type ApplicationRow = {
  id: string;
  external_reference: string | null;
  status: string | null;
};

type ChecklistItemRow = {
  id: string;
  reservation_id: string | null;
  item_key: string | null;
  label: string | null;
  status: string | null;
};

type RequirementState = {
  label: string;
  required: boolean;
  present: boolean;
  complete: boolean;
  status: "ready" | "missing" | "incomplete" | "not_required" | "unknown";
  note: string;
  document: DocumentRow | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return supabaseUrl && serviceRoleKey
    ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey }
    : null;
}

function buildUrl(
  restUrl: string,
  table: string,
  params: Record<string, string>,
) {
  const url = new URL(`${restUrl}/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      rows: [] as T[],
      warning:
        "Core read configuration is not available for server-side operational reads.",
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
      rows: [] as T[],
      warning: `${table} read failed: ${response.status} ${body}`.trim(),
    };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function formatFileSize(bytes: number | null) {
  if (typeof bytes !== "number") return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function documentSearchText(document: DocumentRow) {
  return normalizeText(`${document.document_type ?? ""} ${document.title ?? ""}`);
}

function documentName(document: DocumentRow) {
  return (
    document.title ||
    document.document_type ||
    `Document ${document.id.slice(0, 8)}`
  );
}

function statusTone(status: string | null | undefined) {
  const normalized = normalizeText(status);

  if (["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["draft", "pending", "generated", "review", "in review", "needs review"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["failed", "missing", "void", "cancelled", "expired", "blocked", "rejected"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isPendingStatus(status: string | null) {
  return ["draft", "pending", "generated", "review", "in review", "needs review"].includes(
    normalizeText(status),
  );
}

function isCompleteStatus(status: string | null) {
  return ["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(
    normalizeText(status),
  );
}

function isAttentionStatus(status: string | null) {
  return ["failed", "missing", "void", "cancelled", "expired", "blocked", "rejected"].includes(
    normalizeText(status),
  );
}

function safeMetadataKeys(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return [];
  return Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("url") &&
        !lowered.includes("path") &&
        !lowered.includes("token") &&
        !lowered.includes("secret") &&
        !lowered.includes("password") &&
        !lowered.includes("signature") &&
        !lowered.includes("hash")
      );
    })
    .slice(0, 8);
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  const keys = safeMetadataKeys(metadata);
  if (!metadata || Object.keys(metadata).length === 0) return "No metadata keys recorded";
  return keys.length > 0
    ? `Metadata keys: ${keys.join(", ")}`
    : "Metadata present, hidden from readiness view";
}

function latestVersion(versions: DocumentVersionRow[]) {
  return versions
    .slice()
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0] ?? null;
}

function linkGroup(document: DocumentRow) {
  if (document.reservation_id) return "reservation";
  if (document.buyer_id || document.family_id) return "buyer_family";
  if (document.puppy_id) return "puppy";
  return "unknown";
}

function groupLabel(group: string) {
  if (group === "reservation") return "Reservation-related";
  if (group === "buyer_family") return "Buyer / family-related";
  if (group === "puppy") return "Puppy-related";
  return "Unknown / unlinked";
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function matchesRequirement(document: DocumentRow, label: string) {
  const text = documentSearchText(document);
  const normalizedLabel = normalizeText(label);

  if (normalizedLabel === "deposit agreement") {
    return includesAny(text, ["deposit agreement", "deposit contract", "reservation agreement"]);
  }

  if (normalizedLabel === "bill of sale") {
    return includesAny(text, ["bill of sale", "sale agreement"]);
  }

  if (normalizedLabel === "health guarantee") {
    return includesAny(text, ["health guarantee", "health warranty"]);
  }

  if (normalizedLabel === "financing addendum") {
    return includesAny(text, ["financing addendum", "finance addendum", "payment plan", "financing agreement"]);
  }

  if (normalizedLabel === "transport agreement") {
    return includesAny(text, ["transport agreement", "delivery agreement", "transport addendum"]);
  }

  if (normalizedLabel === "application copy") {
    return includesAny(text, ["application copy", "application"]);
  }

  return text.includes(normalizedLabel);
}

function metadataText(metadata: Record<string, unknown> | null) {
  if (!metadata) return "";
  return normalizeText(JSON.stringify(metadata));
}

function hasKnownFinancing(reservation: ReservationRow | null) {
  const text = normalizeText(
    `${reservation?.sale_type ?? ""} ${reservation?.notes ?? ""} ${metadataText(reservation?.metadata ?? null)}`,
  );
  if (!text) return null;
  if (includesAny(text, ["finance", "financing", "payment plan", "installment"])) return true;
  if (includesAny(text, ["cash", "paid in full", "standard"])) return false;
  return null;
}

function hasKnownTransport(summary: ReservationSummaryRow) {
  const text = normalizeText(`${summary.go_home_method ?? ""} ${summary.go_home_status ?? ""}`);
  if (!text) return null;
  if (includesAny(text, ["transport", "delivery", "deliver", "meetup", "ship"])) return true;
  if (includesAny(text, ["pickup", "pick up"])) return false;
  return null;
}

function linkedDocumentsForReservation(
  summary: ReservationSummaryRow,
  documents: DocumentRow[],
) {
  return documents.filter((document) => {
    if (document.reservation_id && document.reservation_id === summary.reservation_id) return true;
    if (document.buyer_id && document.buyer_id === summary.buyer_id) return true;
    if (document.family_id && document.family_id === summary.family_id) return true;
    if (document.puppy_id && document.puppy_id === summary.puppy_id) return true;
    return false;
  });
}

function buildRequirement(
  label: string,
  required: boolean | null,
  documents: DocumentRow[],
  unknownNote: string,
) {
  if (required === null) {
    return {
      label,
      required: false,
      present: false,
      complete: false,
      status: "unknown",
      note: unknownNote,
      document: null,
    } satisfies RequirementState;
  }

  if (!required) {
    return {
      label,
      required: false,
      present: false,
      complete: false,
      status: "not_required",
      note: "Not required from available metadata.",
      document: null,
    } satisfies RequirementState;
  }

  const document = documents.find((candidate) => matchesRequirement(candidate, label)) ?? null;
  const complete = Boolean(document && isCompleteStatus(document.status));

  return {
    label,
    required: true,
    present: Boolean(document),
    complete,
    status: !document ? "missing" : complete ? "ready" : "incomplete",
    note: !document
      ? `${label} is missing from linked document metadata.`
      : complete
        ? `${label} appears ready from metadata status.`
        : `${label} exists but status is ${formatKey(document.status)}.`,
    document,
  } satisfies RequirementState;
}

function requirementStates({
  summary,
  reservation,
  documents,
}: {
  summary: ReservationSummaryRow;
  reservation: ReservationRow | null;
  documents: DocumentRow[];
}) {
  const financing = hasKnownFinancing(reservation);
  const transport = hasKnownTransport(summary);

  return [
    buildRequirement("Deposit Agreement", (summary.deposit_required_cents ?? 0) > 0, documents, ""),
    buildRequirement("Bill of Sale", true, documents, ""),
    buildRequirement("Health Guarantee", true, documents, ""),
    buildRequirement(
      "Financing Addendum",
      financing,
      documents,
      "Financing requirement cannot be evaluated from available metadata.",
    ),
    buildRequirement(
      "Transport Agreement",
      transport,
      documents,
      "Transport requirement cannot be evaluated from available metadata.",
    ),
    buildRequirement("Application Copy", Boolean(summary.application_id), documents, ""),
  ];
}

function documentBlockers(requirements: RequirementState[]) {
  const blockers: string[] = [];

  for (const requirement of requirements) {
    if (requirement.status === "missing") {
      blockers.push(`Missing ${requirement.label.toLowerCase()}.`);
    }

    if (requirement.status === "incomplete") {
      blockers.push(`${requirement.label} status is incomplete.`);
    }
  }

  return blockers;
}

function requirementTone(status: RequirementState["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (status === "missing" || status === "incomplete") return "border-amber-200 bg-amber-50 text-amber-950";
  if (status === "unknown") return "border-blue-200 bg-blue-50 text-blue-950";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Badge({
  children,
  tone = "bg-slate-100 text-slate-700 ring-slate-200",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function RestrictedState() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Documents
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Document Readiness
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This internal document readiness workspace is restricted to owner/admin while
            document visibility, storage, signature, and portal rules remain unfinished.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Staff-role access is intentionally blocked from this document readiness surface.
            No document rows were fetched for this view.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function StaffDocumentsPage() {
  const staff = await requireStaffProfile();
  const canViewDocuments = staff.role === "owner" || staff.role === "admin";

  if (!canViewDocuments) {
    return <RestrictedState />;
  }

  const [
    documentResult,
    versionResult,
    reservationSummaryResult,
    reservationResult,
    applicationResult,
    checklistResult,
  ] = await Promise.all([
    readRows<DocumentRow>("core_documents", {
      select:
        "id,family_id,buyer_id,puppy_id,reservation_id,document_type,title,status,current_version_number,metadata,created_at,updated_at",
      order: "updated_at.desc",
      limit: "250",
    }),
    readRows<DocumentVersionRow>("core_document_versions", {
      select:
        "id,document_id,version_number,file_name,mime_type,file_size_bytes,status,generated_at,signed_at,metadata,created_at,updated_at",
      order: "updated_at.desc",
      limit: "500",
    }),
    readRows<ReservationSummaryRow>("core_reservation_summary_view", {
      select:
        "reservation_id,reservation_status,reserved_at,buyer_id,buyer_name,buyer_email,family_id,family_name,puppy_id,puppy_name,puppy_collar_color,puppy_status,application_id,contract_total_cents,deposit_required_cents,balance_due_cents,go_home_method,go_home_status,go_home_detail_status,go_home_checklist_status,go_home_balance_cleared_status,created_at,updated_at",
      order: "reserved_at.desc.nullslast,created_at.desc",
      limit: "250",
    }),
    readRows<ReservationRow>("core_reservations", {
      select: "id,sale_type,notes,metadata",
      order: "updated_at.desc",
      limit: "250",
    }),
    readRows<ApplicationRow>("core_applications", {
      select: "id,external_reference,status",
      order: "updated_at.desc",
      limit: "250",
    }),
    readRows<ChecklistItemRow>("core_go_home_checklist_items", {
      select: "id,reservation_id,item_key,label,status",
      order: "updated_at.desc",
      limit: "500",
    }),
  ]);

  const documents = documentResult.rows;
  const versions = versionResult.rows;
  const activeReservations = reservationSummaryResult.rows.filter(
    (reservation) =>
      !["cancelled", "void", "released"].includes(
        normalizeText(reservation.reservation_status),
      ),
  );
  const versionsByDocument = new Map<string, DocumentVersionRow[]>();
  const reservationById = new Map(reservationResult.rows.map((row) => [row.id, row]));
  const applicationById = new Map(applicationResult.rows.map((row) => [row.id, row]));
  const checklistByReservation = new Map<string, ChecklistItemRow[]>();

  for (const version of versions) {
    if (!version.document_id) continue;
    versionsByDocument.set(version.document_id, [
      ...(versionsByDocument.get(version.document_id) ?? []),
      version,
    ]);
  }

  for (const item of checklistResult.rows) {
    if (!item.reservation_id) continue;
    checklistByReservation.set(item.reservation_id, [
      ...(checklistByReservation.get(item.reservation_id) ?? []),
      item,
    ]);
  }

  const completedCount = documents.filter((document) =>
    isCompleteStatus(document.status),
  ).length;
  const pendingCount = documents.filter((document) =>
    isPendingStatus(document.status),
  ).length;
  const attentionCount = documents.filter((document) =>
    isAttentionStatus(document.status),
  ).length;
  const latestVersionCount = documents.filter((document) =>
    versions.some(
      (version) =>
        version.document_id === document.id &&
        version.version_number === document.current_version_number,
    ),
  ).length;
  const signedVersionCount = versions.filter(
    (version) => Boolean(version.signed_at) || isCompleteStatus(version.status),
  ).length;

  const groupedDocuments = new Map<string, DocumentRow[]>();
  for (const document of documents) {
    const group = linkGroup(document);
    groupedDocuments.set(group, [...(groupedDocuments.get(group) ?? []), document]);
  }

  const readinessRows = activeReservations.map((summary) => {
    const linkedDocuments = linkedDocumentsForReservation(summary, documents);
    const requirements = requirementStates({
      summary,
      reservation: reservationById.get(summary.reservation_id) ?? null,
      documents: linkedDocuments,
    });
    const blockers = documentBlockers(requirements);
    const checklistItems = checklistByReservation.get(summary.reservation_id) ?? [];
    const documentPacketChecklist = checklistItems.find((item) =>
      includesAny(normalizeText(`${item.item_key ?? ""} ${item.label ?? ""}`), [
        "document packet",
        "documents",
      ]),
    );

    if (documentPacketChecklist && !isCompleteStatus(documentPacketChecklist.status)) {
      blockers.push("Document packet checklist item is not complete.");
    }

    return { summary, linkedDocuments, requirements, blockers, documentPacketChecklist };
  });

  const totalBlockers = readinessRows.reduce(
    (count, row) => count + row.blockers.length,
    0,
  );
  const warning =
    documentResult.warning ??
    versionResult.warning ??
    reservationSummaryResult.warning ??
    reservationResult.warning ??
    applicationResult.warning ??
    checklistResult.warning;

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                Core Documents
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Document Readiness
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Internal Core document requirement and readiness workspace for reservations,
                buyers, families, puppies, and linked application context. This page uses
                metadata only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/reservations" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/go-home" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Go-Home
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This workspace tracks internal Core document readiness only. It does not generate documents, upload files, create signing requests, email customers, send portal links, or call external providers.
          </p>
        </section>

        {warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Documents" value={documents.length} note="Core metadata records" />
          <StatCard label="Ready / Complete" value={completedCount} note="Signed, accepted, filed, or ready statuses" />
          <StatCard label="Pending / Draft" value={pendingCount} note="Draft, pending, generated, or review statuses" />
          <StatCard label="Attention" value={attentionCount} note="Expired, blocked, missing, failed, void, or rejected statuses" />
          <StatCard label="Latest Versions" value={latestVersionCount} note={`${signedVersionCount} signed/complete version marker(s)`} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Document Records</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Rows from `core_documents` with version metadata from `core_document_versions`.
                Storage paths, content hashes, signed URLs, downloads, and provider links are not displayed.
              </p>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-4">
                {documents.map((document) => {
                  const documentVersions = versionsByDocument.get(document.id) ?? [];
                  const newestVersion = latestVersion(documentVersions);
                  const linkedReservation = document.reservation_id
                    ? reservationSummaryResult.rows.find(
                        (reservation) => reservation.reservation_id === document.reservation_id,
                      )
                    : null;
                  const linkedApplication = linkedReservation?.application_id
                    ? applicationById.get(linkedReservation.application_id)
                    : null;

                  return (
                    <article key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-slate-950">{documentName(document)}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatKey(document.document_type)} / Document {shortId(document.id)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={statusTone(document.status)}>{formatKey(document.status)}</Badge>
                          <Badge>{groupLabel(linkGroup(document))}</Badge>
                        </div>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <dt className="text-xs font-semibold uppercase text-slate-400">Buyer / Family</dt>
                          <dd className="mt-1 text-slate-700">{shortId(document.buyer_id)} / {shortId(document.family_id)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase text-slate-400">Reservation / Puppy</dt>
                          <dd className="mt-1 text-slate-700">{shortId(document.reservation_id)} / {shortId(document.puppy_id)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase text-slate-400">Current version</dt>
                          <dd className="mt-1 text-slate-700">{document.current_version_number ?? "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase text-slate-400">Updated</dt>
                          <dd className="mt-1 text-slate-700">{formatDateTime(document.updated_at)}</dd>
                        </div>
                      </dl>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="font-semibold text-slate-950">Linked context</p>
                          <dl className="mt-3 grid gap-2">
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">Reservation</dt>
                              <dd className="mt-1">{linkedReservation ? `${display(linkedReservation.puppy_name || linkedReservation.puppy_collar_color)} / ${display(linkedReservation.buyer_name || linkedReservation.buyer_email)}` : "Not linked by reservation"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">Application</dt>
                              <dd className="mt-1">{linkedApplication?.external_reference || shortId(linkedReservation?.application_id)}</dd>
                            </div>
                          </dl>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {document.reservation_id ? (
                              <Link href={`/staff/reservations/${document.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                                Reservation readiness
                              </Link>
                            ) : null}
                            {linkedReservation?.application_id ? (
                              <Link href={`/staff/applications/${linkedReservation.application_id}`} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                                Application
                              </Link>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                          <p className="font-semibold text-slate-950">Latest version metadata</p>
                          {newestVersion ? (
                            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">Version</dt>
                                <dd className="mt-1">{newestVersion.version_number ?? "Not recorded"}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">Status</dt>
                                <dd className="mt-1">{formatKey(newestVersion.status)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">File name</dt>
                                <dd className="mt-1">{display(newestVersion.file_name)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">Size</dt>
                                <dd className="mt-1">{formatFileSize(newestVersion.file_size_bytes)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">Generated</dt>
                                <dd className="mt-1">{formatDateTime(newestVersion.generated_at)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase text-slate-400">Signed</dt>
                                <dd className="mt-1">{formatDateTime(newestVersion.signed_at)}</dd>
                              </div>
                            </dl>
                          ) : (
                            <p className="mt-2 text-slate-500">No version rows linked to this document yet.</p>
                          )}
                          <p className="mt-3 leading-6">{metadataSummary(document.metadata)}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="No Core document metadata exists yet. No document generation, upload, signing, storage write, customer portal delivery, or provider connection is active." />
            )}
          </section>

          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Readiness Grouping</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Documents grouped by existing link fields only. There is no application_id on
                `core_documents`, so application context is inferred only through linked reservations.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["reservation", "buyer_family", "puppy", "unknown"].map((group) => (
                  <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{groupLabel(group)}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {groupedDocuments.get(group)?.length ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">metadata record(s)</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Go-Home Document Blockers</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Read-only blockers derived from linked document metadata, reservation details,
                and go-home checklist records.
              </p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active reservations checked</p>
                  <p className="mt-2 text-3xl font-bold">{readinessRows.length}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Document blockers</p>
                  <p className="mt-2 text-3xl font-bold">{totalBlockers}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                These blockers do not update the database, stop a go-home workflow, send
                messages, or create customer-visible state.
              </p>
            </section>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Reservation Document Requirements</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Common Core requirements are evaluated only when linked reservation metadata
                supports the requirement.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/reservations" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Reservations
              </Link>
              <Link href="/staff/go-home" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Go-Home
              </Link>
            </div>
          </div>

          {readinessRows.length > 0 ? (
            <div className="space-y-5">
              {readinessRows.map(({ summary, linkedDocuments, requirements, blockers, documentPacketChecklist }) => {
                const application = summary.application_id
                  ? applicationById.get(summary.application_id)
                  : null;

                return (
                  <article key={summary.reservation_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-950">
                          {display(summary.puppy_name || summary.puppy_collar_color, "Unnamed puppy")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {display(summary.buyer_name || summary.buyer_email, "Unlinked buyer")} / {display(summary.family_name, "Unlinked family")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone={statusTone(summary.reservation_status)}>{formatKey(summary.reservation_status)}</Badge>
                          <Badge>{linkedDocuments.length} linked document(s)</Badge>
                          <Badge>{formatCurrency(summary.balance_due_cents)} balance due</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/staff/reservations/${summary.reservation_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                          Open readiness
                        </Link>
                        {summary.application_id ? (
                          <Link href={`/staff/applications/${summary.application_id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                            Application
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">Reservation</dt>
                        <dd className="mt-1 text-slate-700">{shortId(summary.reservation_id)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">Application</dt>
                        <dd className="mt-1 text-slate-700">{application?.external_reference || shortId(summary.application_id)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">Deposit required</dt>
                        <dd className="mt-1 text-slate-700">{formatCurrency(summary.deposit_required_cents)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">Go-home method</dt>
                        <dd className="mt-1 text-slate-700">{formatKey(summary.go_home_method)}</dd>
                      </div>
                    </dl>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {requirements.map((requirement) => (
                        <div key={requirement.label} className={`rounded-2xl border p-4 text-sm ${requirementTone(requirement.status)}`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold">{requirement.label}</p>
                            <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">
                              {formatKey(requirement.status)}
                            </span>
                          </div>
                          <p className="mt-2 leading-6">{requirement.note}</p>
                          {requirement.document ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide">
                              {documentName(requirement.document)} / {formatKey(requirement.document.status)}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-sm font-bold text-slate-950">Document packet checklist</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {documentPacketChecklist
                            ? `${display(documentPacketChecklist.label || documentPacketChecklist.item_key)} is ${formatKey(documentPacketChecklist.status)}.`
                            : "No document packet checklist item is linked to this reservation yet."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-sm font-bold text-slate-950">Document blockers</p>
                        {blockers.length > 0 ? (
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-900">
                            {blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-emerald-700">
                            No document-specific blockers were found from current metadata.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No active reservation rows are available for document requirement evaluation." />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Readiness Boundary</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Metadata records are readable.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No document generation is connected.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No signing, upload, download, or storage write is connected.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No email, SMS, portal link, or external provider is connected.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

