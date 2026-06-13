import Link from "next/link";
import { OperatorStatusPill } from "./operator-ui";

type ProposedActionPanelProps = {
  title?: string;
  nextAction: string;
  blockers: number;
  priority: "urgent" | "high" | "normal" | "watch";
  href?: string;
  linkLabel?: string;
  detail?: string;
};

function priorityTone(priority: ProposedActionPanelProps["priority"]) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  if (priority === "normal") return "blue";
  return "neutral";
}

export function ProposedActionPanel({
  title = "Core Intelligence",
  nextAction,
  blockers,
  priority,
  href = "/staff/proposed-actions",
  linkLabel = "Open Proposed Actions",
  detail,
}: ProposedActionPanelProps) {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-700">
              {title}
            </p>
            <OperatorStatusPill tone={priorityTone(priority)}>{priority}</OperatorStatusPill>
            <OperatorStatusPill tone={blockers > 0 ? "amber" : "green"}>
              {blockers} blocker{blockers === 1 ? "" : "s"}
            </OperatorStatusPill>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-950">{nextAction}</p>
          {detail ? <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p> : null}
        </div>
        <Link
          href={href}
          className="inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800"
        >
          {linkLabel}
        </Link>
      </div>
    </section>
  );
}
