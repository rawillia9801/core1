import Link from "next/link";
import type { ReactNode } from "react";

type OperatorLink = {
  href: string;
  label: string;
};

type OperatorHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  summary: ReactNode;
  status?: ReactNode;
  blockers?: ReactNode;
  nextAction?: ReactNode;
  links?: OperatorLink[];
};

export function OperatorHeader({
  eyebrow,
  title,
  summary,
  status,
  blockers,
  nextAction,
  links = [],
}: OperatorHeaderProps) {
  return (
    <section className="operator-command-header">
      <div className="operator-command-header__main">
        <p className="operator-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      <div className="operator-command-header__aside">
        {status ? <CommandSignal label="Status">{status}</CommandSignal> : null}
        {blockers ? <CommandSignal label="Urgent blockers" tone="amber">{blockers}</CommandSignal> : null}
        {nextAction ? <CommandSignal label="Next action" tone="blue">{nextAction}</CommandSignal> : null}
        {links.length > 0 ? (
          <div className="operator-link-row">
            {links.map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CommandSignal({
  label,
  children,
  tone = "slate",
}: {
  label: string;
  children: ReactNode;
  tone?: "slate" | "amber" | "blue";
}) {
  return (
    <div className={`operator-command-signal operator-command-signal--${tone}`}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function SummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; note?: ReactNode }>;
}) {
  return (
    <section className="operator-summary-strip">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <small>{item.note}</small> : null}
        </div>
      ))}
    </section>
  );
}

export function SectionNav({
  items,
}: {
  items: Array<{ href: string; label: string; count?: ReactNode }>;
}) {
  return (
    <nav className="operator-section-nav" aria-label="Workspace sections">
      {items.map((item) => (
        <a key={item.href} href={item.href}>
          <span>{item.label}</span>
          {item.count !== undefined ? <small>{item.count}</small> : null}
        </a>
      ))}
    </nav>
  );
}

export function OperatorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="operator-section">
      <div className="operator-section__heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CompactDisclosure({
  title,
  meta,
  children,
  defaultOpen = false,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="operator-disclosure" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {meta ? <small>{meta}</small> : null}
      </summary>
      <div>{children}</div>
    </details>
  );
}
