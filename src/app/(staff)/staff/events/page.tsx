import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { listEventPipeline } from "@/domains/events/lib/queries";
import { EventsPageClient } from "./EventsPageClient";

export default async function StaffEventsPage() {
  const events = await listEventPipeline(60);

  return (
    <SiteShell>
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-6 2xl:px-8 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100%", width: "100%" }}>
        <PageHeader
          title="Events"
          subtitle="Private Experience Pipeline"
        />

        <GlassSection delay={0.3}>
          <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
            Draft proposals, send contracts, and browse archived rituals. Track guest inquiries through the full event lifecycle.
          </p>

          <EventsPageClient events={events} />
        </GlassSection>
      </div>
    </SiteShell>
  );
}
