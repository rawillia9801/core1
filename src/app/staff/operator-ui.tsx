import Link from "next/link";
import type { ReactNode } from "react";

type OperatorLink = {
  href: string;
  label: string;
};

type OperatorShellNavGroup = {
  label: string;
  items: ReadonlyArray<{
    href: string;
    label: string;
    badge?: ReactNode;
    ready?: boolean;
  }>;
};

type OperatorShellProps = {
  staffName: string;
  staffRole: string;
  children: ReactNode;
  navGroups: ReadonlyArray<OperatorShellNavGroup>;
  signOutAction: () => void | Promise<void>;
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

export function OperatorShell({
  staffName,
  staffRole,
  children,
  navGroups,
  signOutAction,
}: OperatorShellProps) {
  const readyItems = navGroups.flatMap((group) =>
    group.items.filter((item) => item.ready !== false),
  );

  return (
    <div className="operator-shell min-h-screen text-slate-950 lg:flex">
      <aside className="operator-sidebar hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-y-auto">
        <div className="operator-brand">
          <div className="operator-brand-mark" aria-hidden="true">
            C
          </div>
          <div>
            <strong>Core</strong>
            <span>Command Center</span>
          </div>
        </div>

        <nav className="operator-sidebar-nav" aria-label="Core workspace navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="operator-sidebar-group">
              <p>{group.label}</p>
              {group.items.map((item) =>
                item.ready === false ? (
                  <div
                    key={item.href}
                    className="operator-sidebar-link operator-sidebar-link--disabled"
                    title="Workspace page not built yet"
                  >
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} className="operator-sidebar-link">
                    <span>{item.label}</span>
                    {item.badge ? <small>{item.badge}</small> : null}
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="operator-main min-w-0 flex-1">
        <header className="operator-topbar">
          <div className="operator-search" aria-label="Core search placeholder">
            <span aria-hidden="true">/</span>
            <p>Search Core...</p>
            <kbd>Ctrl K</kbd>
          </div>
          <div className="operator-topbar-actions">
            <span className="operator-icon-button" title="Notifications">!</span>
            <span className="operator-icon-button" title="Messages">...</span>
            <span className="operator-icon-button" title="Calendar">Cal</span>
            <div className="operator-account">
              <span>{staffName}</span>
              <small>{staffRole}</small>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="operator-sign-out">
                Sign Out
              </button>
            </form>
          </div>
        </header>

        <div className="operator-mobile-nav lg:hidden">
          {readyItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

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

export function OperatorPageHeader(props: OperatorHeaderProps) {
  return <OperatorHeader {...props} />;
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

export function OperatorStatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "blue" | "amber" | "red";
}) {
  return <span className={`operator-status-pill operator-status-pill--${tone}`}>{children}</span>;
}

export function OperatorMetricCard({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  return (
    <div className={`operator-metric-card operator-metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
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

export function OperatorSummaryGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; note?: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "slate" }>;
}) {
  return (
    <section className="operator-summary-grid">
      {items.map((item) => (
        <OperatorMetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          note={item.note}
          tone={item.tone}
        />
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

export function OperatorSectionTabs({
  items,
}: {
  items: Array<{ href: string; label: string; count?: ReactNode }>;
}) {
  return <SectionNav items={items} />;
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

export function OperatorPanel({
  id,
  title,
  description,
  action,
  children,
}: {
  id?: string;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="operator-panel">
      {title || description || action ? (
        <div className="operator-panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function OperatorAlertPanel({
  title,
  children,
  tone = "amber",
}: {
  title: string;
  children: ReactNode;
  tone?: "amber" | "red" | "blue" | "green";
}) {
  return (
    <section className={`operator-alert-panel operator-alert-panel--${tone}`}>
      <p>{title}</p>
      <div>{children}</div>
    </section>
  );
}

export function OperatorActivityRow({
  title,
  detail,
  meta,
  href,
}: {
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
      {meta ? <small>{meta}</small> : null}
    </>
  );

  return href ? (
    <Link href={href} className="operator-activity-row">
      {body}
    </Link>
  ) : (
    <div className="operator-activity-row">{body}</div>
  );
}

export function OperatorQuickAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="operator-quick-action">
      {children}
    </Link>
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
