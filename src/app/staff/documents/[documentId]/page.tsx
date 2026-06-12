import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";
import { OperatorHeader, SummaryStrip } from "../../operator-ui";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { rows: [] as T[], warning: `${table} read failed: ${response.status} ${body}`.trim() };
  }

  return { rows: (await response.json()) as T[], warning: null };
}

function display(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim() ? value : fallback;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "Not linked";
}

function formatKey(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatFileSize(bytes: number | null) {
  if (typeof bytes !== "number") return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentName(document: DocumentRow) {
  return document.title || document.document_type || `Document ${shortId(document.id)}`;
}

function safeMetadataKeys(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  return Object.keys(metadata)
    .filter((key) => {
      const lowered = key.toLowerCase();
      return !lowered.includes("url") && !lowered.includes("path") && !lowered.includes("token") && !lowered.includes("secret") && !lowered.includes("password") && !lowered.includes("signature") && !lowered.includes("hash");
    })
    .slice(0, 10);
}

function statusTone(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();
  if (["signed", "completed", "complete", "filed", "approved", "accepted", "ready"].includes(value)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["draft", "pending", "sent", "generated", "review", "needs_review"].includes(value)) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (["missing", "blocked", "failed", "expired", "replaced", "stale", "void", "cancelled", "rejected"].includes(value)) return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{children}</span>;
}

function InfoCard({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</div>
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function RestrictedState() {
  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Owner/admin only</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Document Detail Restricted</h1>
        <p className="mt-3 text-sm leading-6">Document metadata detail is restricted while document visibility, storage, signature, and portal rules remain unfinished.</p>
        <Link href="/staff/documents" className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">Back to Documents</Link>
      </section>
    </main>
  );
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ documentId: string }> }) {
  const staff = await requireStaffProfile();
  const { documentId } = await params;

  if (staff.role !== "owner" && staff.role !== "admin") return <RestrictedState />;
  if (!UUID_PATTERN.test(documentId)) notFound();

  const [documentResult, versionResult] = await Promise.all([
    readRows<DocumentRow>("core_documents", {
      select: "id,family_id,buyer_id,puppy_id,reservation_id,document_type,title,status,current_version_number,metadata,created_at,updated_at",
      id: `eq.${documentId}`,
      limit: "1",
    }),
    readRows<DocumentVersionRow>("core_document_versions", {
      select: "id,document_id,version_number,file_name,mime_type,file_size_bytes,status,generated_at,signed_at,metadata,created_at,updated_at",
      document_id: `eq.${documentId}`,
      order: "version_number.desc.nullslast,updated_at.desc",
      limit: "50",
    }),
  ]);

  const document = documentResult.rows[0] ?? null;
  if (!document) notFound();

  const warning = documentResult.warning ?? versionResult.warning;
  const latestVersion = versionResult.rows[0] ?? null;
  const metadataKeys = safeMetadataKeys(document.metadata);

  return (
    <main className="operator-workspace min-h-screen px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1300px] space-y-6">
        <OperatorHeader
          eyebrow="Document / Contract Detail"
          title={documentName(document)}
          summary="Internal metadata-only document detail. Storage paths, content hashes, signed URLs, downloads, provider links, customer portal visibility, and generated files are not exposed here."
          status={<Badge tone={statusTone(document.status)}>{formatKey(document.status)}</Badge>}
          blockers={!latestVersion ? "No version metadata" : latestVersion.signed_at ? "No detail blocker" : "Signature/filed state needs review"}
          nextAction="Review linked source records and version metadata before go-home or contract handoff."
          links={[
            { href: "/staff/documents", label: "Document Center" },
            ...(document.reservation_id ? [{ href: `/staff/reservations/${document.reservation_id}`, label: "Reservation" }] : []),
            ...(document.buyer_id ? [{ href: `/staff/buyers/${document.buyer_id}`, label: "Buyer" }] : []),
            ...(document.family_id ? [{ href: `/staff/families/${document.family_id}`, label: "Family" }] : []),
            ...(document.puppy_id ? [{ href: `/staff/puppies/${document.puppy_id}`, label: "Puppy" }] : []),
          ]}
        />

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">Read-only boundary</p>
          <p className="mt-2 text-sm leading-6">This detail page reads existing Core metadata only. It does not generate documents, upload files, request signatures, expose private storage, email customers, or update portal state.</p>
        </section>

        {warning ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{warning}</section> : null}

        <SummaryStrip
          items={[
            { label: "Type", value: formatKey(document.document_type), note: `Document ${shortId(document.id)}` },
            { label: "Status", value: <Badge tone={statusTone(document.status)}>{formatKey(document.status)}</Badge>, note: `Current version ${document.current_version_number ?? "not recorded"}` },
            { label: "Versions", value: versionResult.rows.length, note: latestVersion ? `Latest ${latestVersion.version_number ?? "unversioned"}` : "No version record" },
            { label: "Signed", value: formatDateTime(latestVersion?.signed_at), note: "From latest version metadata" },
          ]}
        />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Linked Context</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoCard label="Reservation" value={shortId(document.reservation_id)} note={document.reservation_id ? <Link href={`/staff/reservations/${document.reservation_id}`}>Open reservation</Link> : "No reservation link"} />
              <InfoCard label="Buyer" value={shortId(document.buyer_id)} note={document.buyer_id ? <Link href={`/staff/buyers/${document.buyer_id}`}>Open buyer</Link> : "No buyer link"} />
              <InfoCard label="Family" value={shortId(document.family_id)} note={document.family_id ? <Link href={`/staff/families/${document.family_id}`}>Open family</Link> : "No family link"} />
              <InfoCard label="Puppy" value={shortId(document.puppy_id)} note={document.puppy_id ? <Link href={`/staff/puppies/${document.puppy_id}`}>Open puppy</Link> : "No puppy link"} />
              <InfoCard label="Created" value={formatDateTime(document.created_at)} />
              <InfoCard label="Updated" value={formatDateTime(document.updated_at)} />
            </dl>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {metadataKeys.length ? `Safe metadata keys: ${metadataKeys.join(", ")}` : "No safe metadata keys are recorded or metadata is intentionally hidden from this readiness view."}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Version Metadata</h2>
            <div className="mt-5 space-y-3">
              {versionResult.rows.length ? versionResult.rows.map((version) => (
                <article key={version.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">Version {version.version_number ?? "not recorded"}</p>
                      <p className="mt-1 text-sm text-slate-600">{display(version.file_name)} / {display(version.mime_type)} / {formatFileSize(version.file_size_bytes)}</p>
                    </div>
                    <Badge tone={statusTone(version.status)}>{formatKey(version.status)}</Badge>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Generated" value={formatDateTime(version.generated_at)} />
                    <InfoCard label="Signed" value={formatDateTime(version.signed_at)} />
                    <InfoCard label="Created" value={formatDateTime(version.created_at)} />
                    <InfoCard label="Updated" value={formatDateTime(version.updated_at)} />
                  </dl>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  No version rows are linked to this document yet.
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
