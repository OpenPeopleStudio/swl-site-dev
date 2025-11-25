import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { listEventPipeline } from "@/domains/events/lib/queries";
import { EventsPageClient } from "./EventsPageClient";

export default async function StaffEventsPage() {
  const events = await listEventPipeline(60);

  return (
    <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1400px" }}>
      <PageHeader
        title="Events"
        subtitle="Private Experience Pipeline"
      />

      <GlassSection delay={0.3}>
        <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-10 sm:mb-12 md:mb-16">
          Draft proposals, send contracts, and browse archived rituals. Track guest inquiries through the full event lifecycle.
        </p>

        <EventsPageClient events={events} />
      </GlassSection>
    </div>
  );
}
