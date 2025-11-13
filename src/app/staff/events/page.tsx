import { listEventPipeline, type PrivateEvent } from "@/apps/events/lib/queries";
import { StaffEventsBoard, type StaffEventCard, type EventLane } from "@/components/staff/StaffEventsBoard";

export default async function StaffEventsPage() {
  const events = await listEventPipeline(60);

  return (
    <div className="flex w-full flex-col gap-8">
      <StaffEventsBoard requests={events.map(toEventCard)} />
    </div>
  );
}

function toEventCard(event: PrivateEvent): StaffEventCard {
  return {
    id: event.id,
    guestName: event.guest_name ?? "Unknown Guest",
    guestEmail: event.guest_email ?? undefined,
    partySize: event.party_size ?? 0,
    status: mapStatus(event.status),
    date: event.preferred_date,
    budgetRange: event.budget_range ?? null,
    notes: event.special_requests ?? event.proposal_text ?? null,
    lastTouched: event.updated_at ?? event.created_at ?? new Date().toISOString(),
  };
}

function mapStatus(status?: string | null): EventLane {
  switch (status) {
    case "curation":
      return "curation";
    case "awaiting_guest":
      return "awaiting_guest";
    case "proposal_sent":
    case "contract_out":
      return "contract_out";
    case "contract_signed":
    case "deposit_paid":
    case "confirmed":
    case "completed":
      return "confirmed";
    default:
      return "inquiry";
  }
}
