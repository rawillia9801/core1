import { PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalDocumentsPage() {
  return (
    <PortalMain
      eyebrow="Documents"
      title="Document readiness"
      summary="Customer-safe document status can display here after private account linking is complete."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PortalStatusCard label="Documents" value="Waiting" note="Document status is unavailable until account linking is complete." />
        <PortalStatusCard label="Signature" value="Waiting" note="Signature readiness can appear here when supported by linked records." />
        <PortalStatusCard label="Filed Copies" value="Waiting" note="Filed document status can display when it is ready for your portal." />
      </section>
      <PortalEmptyState title="No document record connected" />
    </PortalMain>
  );
}
