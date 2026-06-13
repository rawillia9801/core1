import { PortalCard, PortalEmptyState, PortalMain } from "../portal-ui";

export default function MyPuppyPage() {
  return (
    <PortalMain
      eyebrow="My Puppy"
      title="Your puppy details will appear here when they are ready."
      summary="Assigned puppy information is private and only displays after secure account linking."
    >
      <PortalEmptyState
        title="No puppy assigned yet"
        message="No puppy assigned yet. Puppy assignment appears after approval and reservation. Portal account linking is required before private records can display."
      />
      <PortalCard title="What Will Show Here">
        <p className="text-sm leading-6 text-slate-600">
          When available, this page can show your assigned puppy name, basic puppy details, reservation connection, and customer-safe go-home timing.
        </p>
      </PortalCard>
    </PortalMain>
  );
}
