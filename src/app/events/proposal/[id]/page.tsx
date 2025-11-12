import { ProposalGenerator } from "@/apps/events/components/ProposalGenerator";
import { ContractFlow } from "@/apps/events/components/ContractFlow";
import { getEventById } from "@/apps/events/lib/queries";

type PageProps = {
  params: { id: string };
};

const ALLOWED_STATUSES = new Set([
  "inquiry",
  "proposal_drafting",
  "proposal_sent",
]);

export const dynamic = "force-dynamic";

export default async function EventProposalPage({ params }: PageProps) {
  const event = await getEventById(params.id);

  if (!event || !ALLOWED_STATUSES.has(event.status)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-black text-center text-white/60">
        The ritual is not ready.
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-black px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black opacity-80" />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-8">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Snow White Laundry
          </p>
          <h1 className="mt-2 text-3xl font-light text-white">
            Proposal for {event.guest_name}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {event.event_type ?? "Private Experience"} •{" "}
            {event.party_size ?? "TBD"} guests
          </p>
        </header>

        <ProposalGenerator event={event} user={null} />

        {event.status === "proposal_sent" && <ContractFlow event={event} />}
      </div>
    </main>
  );
}
