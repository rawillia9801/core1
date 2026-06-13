import { PortalCard, PortalMain, PortalStatusCard } from "./portal-ui";

export default function PortalHomePage() {
  return (
    <PortalMain
      eyebrow="Welcome"
      title="My Puppy Portal"
      summary="A simple place for your application, reservation, puppy, documents, payments, go-home details, updates, and resources once your portal account is linked."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PortalStatusCard label="Application" value="Waiting" note="Your application status will appear here after your portal account is connected." />
        <PortalStatusCard label="Reservation" value="Waiting" note="Reservation details can display after secure account linking and an active reservation." />
        <PortalStatusCard label="My Puppy" value="Not assigned" note="No puppy assigned yet. Puppy assignment appears after approval and reservation." />
        <PortalStatusCard label="Documents" value="Unavailable" note="Document readiness will appear here when private records can safely display." />
        <PortalStatusCard label="Payments" value="Unavailable" note="Payment summary will be read-only when your account is linked." />
        <PortalStatusCard label="Go-Home" value="Unavailable" note="Schedule and checklist next steps will display after account linking." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <PortalCard title="Latest Update">
          <p className="text-sm leading-6 text-slate-600">
            Updates and messages will appear here after your portal account is securely linked.
          </p>
        </PortalCard>
        <PortalCard title="Next Step" tone="blue">
          <p className="text-sm leading-6 text-slate-700">
            Contact Southwest Virginia Chihuahua if you believe your portal account should already be connected.
          </p>
        </PortalCard>
      </section>
    </PortalMain>
  );
}
