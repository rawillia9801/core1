import { PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalPaymentsPage() {
  return (
    <PortalMain
      eyebrow="Payments"
      title="Read-only payment summary"
      summary="Payment totals and balance information can display here after your portal account is safely connected."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PortalStatusCard label="Total" value="Waiting" note="Contract and payment totals are unavailable before account linking." />
        <PortalStatusCard label="Paid" value="Waiting" note="Paid amounts can display as read-only summary information." />
        <PortalStatusCard label="Balance" value="Waiting" note="Balance details can display from linked reservation records." />
      </section>
      <PortalEmptyState title="Payment summary not connected" />
    </PortalMain>
  );
}
