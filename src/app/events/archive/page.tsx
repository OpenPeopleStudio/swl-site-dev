import Image from "next/image";
import { listCompletedEvents } from "@/apps/events/lib/queries";

export const dynamic = "force-dynamic";

export default async function EventArchivePage() {
  const events = await listCompletedEvents();

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Cortex Archive
          </p>
          <h1 className="text-3xl font-light text-white">
            Private Event Memory Vault
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Every completed ritual feeds culture, forecasting, and gratitude.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.id}
              className="glass-morphic flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/5 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
            >
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-purple-900/70 to-indigo-900/70">
                <span className="text-4xl">✨</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="text-xl font-light text-white">
                  {event.guest_name}
                </h2>
                <p className="text-xs text-white/60">
                  {event.event_type ?? "Private Experience"} •{" "}
                  {event.party_size ?? "TBD"} guests
                </p>
                {event.preferred_date && (
                  <p className="text-xs text-white/40">
                    {new Date(event.preferred_date).toLocaleDateString()}
                  </p>
                )}
                {Array.isArray(event.photos) && event.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {event.photos.slice(0, 3).map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-lg object-cover"
                        unoptimized
                      />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          {events.length === 0 && (
            <p className="col-span-full text-center text-sm text-white/60">
              No archived events yet. The vault opens after your first private
              dinner.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
