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
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url;
}

async function readRows<T>(table: string, params: Record<string, string>) {
  const config = getSupabaseRestConfig();

  if (!config) {
    return {
      rows: [] as T[],
      warning:
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for local Core reads.",
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
  return value ? value.slice(0, 8) : "-";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatFileSize(bytes: number | null) {
  if (typeof bytes !== "number") {
    return "Not recorded";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatKey(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function documentName(document: DocumentRow) {
  return (
    document.title ||
    document.document_type ||
    `Document ${document.id.slice(0, 8)}`
  );
}

function statusTone(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";

  if (["signed", "completed", "complete", "filed", "approved"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["draft", "pending", "generated", "ready", "review"].includes(normalized)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (["failed", "missing", "void", "cancelled", "needs_review"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isDraftOrPending(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  return ["draft", "pending", "generated", "ready", "review"].includes(normalized);
}

function isSignedOrCompleted(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  return ["signed", "completed", "complete", "filed", "approved"].includes(normalized);
}

function needsReview(status: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  return ["failed", "missing", "void", "cancelled", "needs_review"].includes(normalized);
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No metadata keys recorded";
  }

  const safeKeys = Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return (
        !lowered.includes("url") &&
        !lowered.includes("path") &&
        !lowered.includes("token") &&
        !lowered.includes("secret") &&
        !lowered.includes("signature")
      );
    })
    .slice(0, 6);

  return safeKeys.length > 0
    ? `Metadata keys: ${safeKeys.join(", ")}`
    : "Metadata present, hidden from preview";
}

function latestVersion(versions: DocumentVersionRow[]) {
  return versions
    .slice()
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0];
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}

function RestrictedState() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Documents
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Documents Workspace
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This internal document inventory is restricted to owner/admin while
            document visibility, storage, signature, and portal rules remain
            unfinished.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Restricted to owner/admin
          </p>
          <p className="mt-2 text-sm leading-6">
            Staff-role access is intentionally blocked from this first document
            inventory surface. No document rows were fetched for this view.
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

  const [documentResult, versionResult] = await Promise.all([
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
  ]);

  const documents = documentResult.rows;
  const versionsByDocument = new Map<string, DocumentVersionRow[]>();

  for (const version of versionResult.rows) {
    if (!version.document_id) {
      continue;
    }

    versionsByDocument.set(version.document_id, [
      ...(versionsByDocument.get(version.document_id) ?? []),
      version,
    ]);
  }

  const draftOrPendingCount = documents.filter((document) =>
    isDraftOrPending(document.status),
  ).length;
  const signedOrCompletedCount = documents.filter((document) =>
    isSignedOrCompleted(document.status),
  ).length;
  const needsReviewCount = documents.filter((document) =>
    needsReview(document.status),
  ).length;
  const signedVersionCount = versionResult.rows.filter(
    (version) => Boolean(version.signed_at) || isSignedOrCompleted(version.status),
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Core Documents
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Documents Workspace
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Read-only internal Core document inventory for applications, buyers,
            families, reservations, and puppies. This page reviews metadata only.
          </p>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Safety boundary
          </p>
          <p className="mt-2 text-sm leading-6">
            This page only reads Core document metadata. It does not generate
            documents, request signatures, upload files, send emails, expose
            portal links, write file storage, or contact external systems.
          </p>
        </section>

        {documentResult.warning || versionResult.warning ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {documentResult.warning ?? versionResult.warning}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Documents
            </p>
            <p className="mt-3 text-3xl font-bold">{documents.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Core document containers
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Draft / Pending
            </p>
            <p className="mt-3 text-3xl font-bold">{draftOrPendingCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              Statuses needing workflow review
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Signed / Completed
            </p>
            <p className="mt-3 text-3xl font-bold">{signedOrCompletedCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              Document-level completion markers
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Needs review
            </p>
            <p className="mt-3 text-3xl font-bold">{needsReviewCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              Missing, failed, void, or review statuses
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Document Records</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Rows from `core_documents` with version counts from
              `core_document_versions`. Storage paths, signed URLs, and external
              provider links are not displayed.
            </p>
          </div>

          {documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((document) => {
                const versions = versionsByDocument.get(document.id) ?? [];
                const newestVersion = latestVersion(versions);

                return (
                  <article
                    key={document.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-950">
                          {documentName(document)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatKey(document.document_type)} / Document{" "}
                          {shortId(document.id)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(document.status)}>
                          {formatKey(document.status)}
                        </Badge>
                        <Badge>{versions.length} version(s)</Badge>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Buyer / Family
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(document.buyer_id)} / {shortId(document.family_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Reservation / Puppy
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {shortId(document.reservation_id)} /{" "}
                          {shortId(document.puppy_id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Current version
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {document.current_version_number ?? "Not recorded"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-slate-400">
                          Updated
                        </dt>
                        <dd className="mt-1 text-slate-700">
                          {formatDateTime(document.updated_at)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Latest version context
                        </p>
                        {newestVersion ? (
                          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                Version
                              </dt>
                              <dd className="mt-1">
                                {newestVersion.version_number ?? "Not recorded"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                Status
                              </dt>
                              <dd className="mt-1">{formatKey(newestVersion.status)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                File
                              </dt>
                              <dd className="mt-1">
                                {display(newestVersion.file_name)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                Size
                              </dt>
                              <dd className="mt-1">
                                {formatFileSize(newestVersion.file_size_bytes)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                Generated
                              </dt>
                              <dd className="mt-1">
                                {formatDateTime(newestVersion.generated_at)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase text-slate-400">
                                Signed
                              </dt>
                              <dd className="mt-1">
                                {formatDateTime(newestVersion.signed_at)}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-2 text-slate-500">
                            No version rows linked to this document yet.
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-950">
                          Safe metadata summary
                        </p>
                        <p className="mt-2 leading-6">
                          {metadataSummary(document.metadata)}
                        </p>
                        {newestVersion?.metadata ? (
                          <p className="mt-2 leading-6">
                            Latest version {metadataSummary(newestVersion.metadata)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No Core document metadata rows found yet. This page is ready to review document inventory when real Core document records exist." />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Readiness Lane</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This workspace confirms internal metadata visibility only. It is
              not a document workflow engine.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Document metadata readable
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              Version metadata readable: {versionResult.rows.length}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No document generation connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No signature provider connected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No customer email sent
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No portal visibility enabled
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Signed/completed version markers visible here: {signedVersionCount}.
            This count is metadata only and does not request or verify signatures.
          </p>
        </section>
      </div>
    </main>
  );
}
