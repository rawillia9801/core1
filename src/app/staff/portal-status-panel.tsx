import { OperatorStatusPill } from "./operator-ui";

type PortalStatusPanelProps = {
  accountStatus?: string | null;
  puppyAssigned?: boolean;
  documentReadyCount?: number;
  documentTotalCount?: number;
  goHomeReady?: boolean;
  detail?: string;
};

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "not_invited").toLowerCase().replaceAll("_", " ");
}

function isLinkedStatus(value: string | null | undefined) {
  const normalized = normalizeStatus(value);
  return ["active", "linked", "invited", "enabled"].includes(normalized);
}

export function PortalStatusPanel({
  accountStatus,
  puppyAssigned = false,
  documentReadyCount = 0,
  documentTotalCount = 0,
  goHomeReady = false,
  detail = "Portal account linking is required before private records can display.",
}: PortalStatusPanelProps) {
  const linked = isLinkedStatus(accountStatus);
  const documentLabel =
    documentTotalCount > 0 ? `${documentReadyCount} / ${documentTotalCount} ready` : "No document records";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Portal readiness</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Buyer portal status</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{detail}</p>
        </div>
        <OperatorStatusPill tone={linked ? "green" : "amber"}>
          {linked ? "Account link recorded" : "Account link required"}
        </OperatorStatusPill>
      </div>
      <dl className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account</dt>
          <dd className="mt-2 text-sm font-semibold capitalize text-slate-900">{normalizeStatus(accountStatus)}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puppy</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{puppyAssigned ? "Assigned" : "Not assigned"}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{documentLabel}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Go-home</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{goHomeReady ? "Ready signal" : "Not ready"}</dd>
        </div>
      </dl>
    </section>
  );
}
