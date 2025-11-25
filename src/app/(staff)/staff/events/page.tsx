import { listEventPipeline } from "@/domains/events/lib/queries";
import { EventsPageClient } from "./EventsPageClient";

export default async function StaffEventsPage() {
  const events = await listEventPipeline(90);

  return (
    <div className="w-full max-w-6xl">
      <EventsPageClient events={events} />
    </div>
  );
}
