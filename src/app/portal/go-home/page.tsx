import { PortalCard, PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalGoHomePage() {
  return (
    <PortalMain
      eyebrow="Go-Home"
      title="Go-home schedule and next steps"
      summary="Customer-safe go-home timing and checklist details can display here after account linking."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PortalStatusCard label="Schedule" value="Waiting" note="Pickup or delivery timing will appear when available." />
        <PortalStatusCard label="Checklist" value="Waiting" note="Customer-ready checklist progress can display here." />
        <PortalStatusCard label="Next Step" value="Waiting" note="Your next go-home step will appear after linking." />
      </section>
      <PortalCard title="Common Preparation Notes" tone="green">
        <p className="text-sm leading-6 text-slate-700">
          Plan for a calm first day, a safe ride home, familiar food, a cozy crate or play area, and a quiet spot for rest.
        </p>
      </PortalCard>
      <PortalEmptyState title="Go-home details not connected" />
    </PortalMain>
  );
}
