import { PortalEmptyState, PortalMain, PortalStatusCard } from "../portal-ui";

export default function PortalMessagesPage() {
  return (
    <PortalMain
      eyebrow="Messages"
      title="Messages"
      summary="Customer messages can appear here after portal account linking is available."
    >
      <PortalStatusCard label="Inbox" value="Waiting" note="No message history can display until private account linking is complete." />
      <PortalEmptyState title="Messages not connected" />
    </PortalMain>
  );
}
