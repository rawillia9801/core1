import { PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalApplicationPage() {
  return (
    <PortalMain
      eyebrow="Application"
      title="Application status"
      summary="Your submitted application status can display here after your portal account is linked."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PortalStatusCard label="Status" value="Waiting" note="Application status is unavailable until account linking is complete." />
        <PortalStatusCard label="Submitted" value="Waiting" note="Submitted date can display after secure record access is available." />
        <PortalStatusCard label="Review" value="Waiting" note="Customer-safe review progress can appear here when available." />
      </section>
      <PortalEmptyState title="Application record not connected" />
    </PortalMain>
  );
}
