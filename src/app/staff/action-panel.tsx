import Link from "next/link";
import { OperatorStatusPill } from "./operator-ui";

type ActionPanelProps = {
  title?: string;
  nextAction: string;
  blockers: number;
  mode: "available" | "review-only" | "blocked";
  href: string;
  linkLabel?: string;
  detail?: string;
};

function modeTone(mode: ActionPanelProps["mode"]) {
  if (mode === "available") return "green";
  if (mode === "blocked") return "red";
  return "blue";
}

function modeLabel(mode: ActionPanelProps["mode"]) {
  if (mode === "available") return "Action available";
  if (mode === "blocked") return "Blocked";
  return "Review only";
}

export function ActionPanel({
  title = "Action Workflow",
  nextAction,
  blockers,
  mode,
  href,
  linkLabel = "Open Actions",
  detail,
}: ActionPanelProps) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              {title}
            </p>
            <OperatorStatusPill tone={modeTone(mode)}>{modeLabel(mode)}</OperatorStatusPill>
            <OperatorStatusPill tone={blockers > 0 ? "amber" : "green"}>
              {blockers} blocker{blockers === 1 ? "" : "s"}
            </OperatorStatusPill>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-950">{nextAction}</p>
          {detail ? <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p> : null}
        </div>
        <Link
          href={href}
          className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800"
        >
          {linkLabel}
        </Link>
      </div>
    </section>
  );
}
