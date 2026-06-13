import Link from "next/link";
import { OperatorStatusPill } from "./operator-ui";

type EmailReadinessPanelProps = {
  title?: string;
  recipientEmail?: string | null;
  templateStatus?: string | null;
  notificationStatus?: string | null;
  href?: string;
  detail?: string;
};

function statusTone(value: string | null | undefined): "neutral" | "green" | "blue" | "amber" | "red" {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (["sent", "ready", "available", "configured"].includes(normalized)) return "green";
  if (["queued", "pending", "previewed", "draft", "review_required", "needs_review"].includes(normalized)) return "amber";
  if (["failed", "blocked", "missing", "missing_recipient", "missing_template", "config_missing"].includes(normalized)) return "red";
  if (["not_found", "not_recorded"].includes(normalized)) return "neutral";
  return "blue";
}

function format(value: string | null | undefined, fallback = "Not recorded") {
  if (!value) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function EmailReadinessPanel({
  title = "Email / Notification Readiness",
  recipientEmail,
  templateStatus = "review_required",
  notificationStatus = "not_recorded",
  href = "/staff/email",
  detail = "Review SMTP readiness, notification queue state, customer-safe templates, and safe delivery logs before any outreach.",
}: EmailReadinessPanelProps) {
  const recipientStatus = recipientEmail ? "recipient present" : "missing_recipient";
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OperatorStatusPill tone={recipientEmail ? "green" : "red"}>{format(recipientStatus)}</OperatorStatusPill>
            <OperatorStatusPill tone={statusTone(templateStatus)}>{format(templateStatus)}</OperatorStatusPill>
            <OperatorStatusPill tone={statusTone(notificationStatus)}>{format(notificationStatus)}</OperatorStatusPill>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Recipient: {recipientEmail || "No email on file"}</p>
        </div>
        <Link href={href} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Open Email Center</Link>
      </div>
    </section>
  );
}
