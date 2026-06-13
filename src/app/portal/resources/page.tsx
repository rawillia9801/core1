import { PortalCard, PortalMain } from "../portal-ui";

const resources = [
  {
    title: "Bringing Your Chihuahua Home",
    text: "Keep the first day quiet, warm, and predictable. Small puppies need gentle handling, short play sessions, frequent potty chances, and plenty of rest.",
  },
  {
    title: "Food And Routine",
    text: "Use the food and schedule provided at go-home, then make any changes slowly. Tiny puppies do best with steady meals and close observation.",
  },
  {
    title: "Safety",
    text: "Block stairs, watch furniture edges, keep cords and small objects out of reach, and supervise interactions with children and other pets.",
  },
  {
    title: "Questions",
    text: "Reach out to Southwest Virginia Chihuahua if you are unsure about setup, food, timing, or what to bring on go-home day.",
  },
];

export default function PortalResourcesPage() {
  return (
    <PortalMain
      eyebrow="Resources"
      title="Helpful puppy resources"
      summary="A small starter guide for preparing your home and keeping your Chihuahua puppy comfortable."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <PortalCard key={resource.title} title={resource.title}>
            <p className="text-sm leading-6 text-slate-600">{resource.text}</p>
          </PortalCard>
        ))}
      </section>
    </PortalMain>
  );
}
