import { PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalReservationPage() {
  return (
    <PortalMain
      eyebrow="Reservation"
      title="Reservation details"
      summary="Reservation status, puppy, deposit, and contract total can display here once the portal can safely identify your private records."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalStatusCard label="Reservation" value="Waiting" note="No private reservation details are available before account linking." />
        <PortalStatusCard label="Puppy" value="Waiting" note="Assigned puppy details will display only when safe." />
        <PortalStatusCard label="Deposit" value="Waiting" note="Deposit details will be read-only when available." />
        <PortalStatusCard label="Contract Total" value="Waiting" note="Contract totals will display from linked reservation records." />
      </section>
      <PortalEmptyState title="Reservation record not connected" />
    </PortalMain>
  );
}
