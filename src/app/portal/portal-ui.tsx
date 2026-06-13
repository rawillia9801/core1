import Link from "next/link";
import type { ReactNode } from "react";

export const portalNavItems = [
  { href: "/portal", label: "Home" },
  { href: "/portal/mypuppy", label: "My Puppy" },
  { href: "/portal/application", label: "Application" },
  { href: "/portal/reservation", label: "Reservation" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/go-home", label: "Go-Home" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/updates", label: "Updates" },
  { href: "/portal/resources", label: "Resources" },
] as const;

export const PORTAL_LINKING_MESSAGE =
  "Portal account linking is required before private records can display.";

export type PortalStatusTone = "waiting" | "ready" | "info";

export function PortalChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f3ea] text-slate-950">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/portal" className="text-lg font-semibold tracking-tight text-slate-950">
              Southwest Virginia Chihuahua
            </Link>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              My Puppy Portal
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="My Puppy Portal navigation">
            {portalNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function PortalMain({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{summary}</p>
        </div>
        <PortalCard title="Private Record Access" tone="amber">
          <p className="text-sm leading-6 text-slate-700">{PORTAL_LINKING_MESSAGE}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Once your portal account is securely connected, your application, reservation,
            puppy, document, payment, and go-home details can appear here.
          </p>
        </PortalCard>
      </section>
      <div className="mt-8 space-y-6">{children}</div>
    </main>
  );
}

export function PortalCard({
  title,
  children,
  tone = "plain",
}: {
  title: string;
  children: ReactNode;
  tone?: "plain" | "amber" | "green" | "blue";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50"
          : "border-stone-200 bg-white";

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PortalStatusCard({
  label,
  value,
  note,
  tone = "waiting",
}: {
  label: string;
  value: string;
  note: string;
  tone?: PortalStatusTone;
}) {
  const toneClass =
    tone === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "info"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-900";

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{value}</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

export function PortalEmptyState({
  title,
  message = PORTAL_LINKING_MESSAGE,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white/75 p-6 text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2">{message}</p>
    </div>
  );
}
