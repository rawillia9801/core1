import Link from "next/link";
import { OperatorStatusPill } from "./operator-ui";

type BreedingCarePanelProps = {
  title?: string;
  dogSignals?: number;
  litterSignals?: number;
  puppyCareSignals?: number;
  taskSignals?: number;
  alertSignals?: number;
  href?: string;
  detail?: string;
};

export function BreedingCarePanel({
  title = "Breeding / care readiness",
  dogSignals = 0,
  litterSignals = 0,
  puppyCareSignals = 0,
  taskSignals = 0,
  alertSignals = 0,
  href = "/staff/breeding",
  detail = "Internal breeding, kennel care, and puppy growth readiness. Review-only unless an existing protected care action is already available on the linked detail page.",
}: BreedingCarePanelProps) {
  const attention = dogSignals + litterSignals + puppyCareSignals + taskSignals + alertSignals;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Breeding care</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{detail}</p>
        </div>
        <OperatorStatusPill tone={attention > 0 ? "amber" : "green"}>
          {attention > 0 ? `${attention} review signal(s)` : "No review signals"}
        </OperatorStatusPill>
      </div>
      <dl className="mt-5 grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dogs</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{dogSignals}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Litters</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{litterSignals}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Puppy care</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{puppyCareSignals}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tasks</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{taskSignals}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alerts</dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">{alertSignals}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <Link href={href} className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
          Open Breeding Program
        </Link>
      </div>
    </section>
  );
}
