import { PortalCard, PortalEmptyState, PortalMain } from "../portal-ui";

export default function PortalUpdatesPage() {
  return (
    <PortalMain
      eyebrow="Updates"
      title="Puppy and reservation updates"
      summary="Updates can display here after your portal account is safely connected to your records."
    >
      <PortalEmptyState title="No private updates connected" />
      <PortalCard title="What To Expect">
        <p className="text-sm leading-6 text-slate-600">
          Once linked, this page can hold customer-safe status updates about your application, reservation, puppy, documents, and go-home timing.
        </p>
      </PortalCard>
    </PortalMain>
  );
}
