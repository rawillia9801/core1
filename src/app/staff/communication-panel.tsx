import Link from "next/link";
import { OperatorStatusPill } from "./operator-ui";

type CommunicationPanelProps = {
  title?: string;
  latestStatus: string;
  nextFollowUp: string;
  blockers: number;
  mode: "current" | "review" | "attention" | "blocked";
  href?: string;
  linkLabel?: string;
  detail?: string;
};

function modeTone(mode: CommunicationPanelProps["mode"]) {
  if (mode === "current") return "green";
  if (mode === "blocked") return "red";
  if (mode === "attention") return "amber";
  return "blue";
}

function modeLabel(mode: CommunicationPanelProps["mode"]) {
  if (mode === "current") return "Current";
  if (mode === "blocked") return "Blocked";
  if (mode === "attention") return "Attention";
  return "Review";
}

export function CommunicationPanel({
  title = "Communication / Follow-Up",
  latestStatus,
  nextFollowUp,
  blockers,
  mode,
  href = "/staff/communications",
  linkLabel = "Open Communications",
  detail,
}: CommunicationPanelProps) {
  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
              {title}
            </p>
            <OperatorStatusPill tone={modeTone(mode)}>{modeLabel(mode)}</OperatorStatusPill>
            <OperatorStatusPill tone={blockers > 0 ? "amber" : "green"}>
              {blockers} blocker{blockers === 1 ? "" : "s"}
            </OperatorStatusPill>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-950">{latestStatus}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{nextFollowUp}</p>
          {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
        </div>
        <Link
          href={href}
          className="inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
        >
          {linkLabel}
        </Link>
      </div>
    </section>
  );
}
