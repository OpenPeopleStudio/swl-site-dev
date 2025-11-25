import Link from "next/link";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";

export default function CustomerHomePage() {
  // No authentication required - customers can browse freely
  const events: never[] = [];
  const upcomingEvents: never[] = [];

  return (
    <>
      <header className="mb-16 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.5em] text-cyan-400/60">
          Guest Portal
        </p>
        <h1 className="font-['Eurostile',_sans-serif] text-4xl font-light tracking-wide text-white sm:text-5xl">
          Private Events & Reservations
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-white/60">
          Plan your private dining experience or reserve opening week seating. No sign-in required.
        </p>
      </header>

      <div className="space-y-8">
        {/* Quick Stats */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="size-5 text-cyan-400/70" />
              <h2 className="text-lg font-light text-white/90">Active Events</h2>
            </div>
            <p className="text-3xl font-light text-white mb-2">{upcomingEvents.length}</p>
            <p className="text-sm text-white/60">
              {upcomingEvents.length === 1
                ? "event in progress"
                : upcomingEvents.length === 0
                  ? "no active events"
                  : "events in progress"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="size-5 text-cyan-400/70" />
              <h2 className="text-lg font-light text-white/90">Total Events</h2>
            </div>
            <p className="text-3xl font-light text-white mb-2">{events.length}</p>
            <p className="text-sm text-white/60">
              {events.length === 1 ? "event total" : "events total"}
            </p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm">
          <h2 className="text-2xl font-light mb-6 text-white/90">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/customer/events"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
            >
              <div>
                <h3 className="text-lg font-light text-white mb-2">View Events</h3>
                <p className="text-sm text-white/60">
                  See all your event plans, proposals, and reservations
                </p>
              </div>
              <ArrowRight className="size-5 text-white/40 transition group-hover:translate-x-1 group-hover:text-cyan-400/70" />
            </Link>

            <Link
              href="/customer/events#plan-new"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
            >
              <div>
                <h3 className="text-lg font-light text-white mb-2">Plan New Experience</h3>
                <p className="text-sm text-white/60">
                  Start planning your next private event or celebration
                </p>
              </div>
              <ArrowRight className="size-5 text-white/40 transition group-hover:translate-x-1 group-hover:text-cyan-400/70" />
            </Link>
          </div>
        </section>

        {/* Recent Events Preview */}
        {upcomingEvents.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-white/90">Upcoming Events</h2>
              <Link
                href="/customer/events"
                className="text-sm uppercase tracking-[0.3em] text-cyan-400/70 hover:text-cyan-400 transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-400/30"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                    <h3 className="text-xl font-light text-white">{event.event_type}</h3>
                    <span className="text-sm uppercase tracking-[0.4em] text-white/50">
                      {event.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {event.preferred_date && (
                    <p className="mt-3 text-sm text-white/60">
                      {new Date(event.preferred_date).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {event.party_size && (
                    <p className="mt-1 text-sm text-white/60">
                      Party size: {event.party_size}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm text-center">
          <p className="text-lg text-white/70 mb-4">
            Plan your private dining experience.
          </p>
          <p className="text-sm text-white/60 mb-6">
            Submit a request and we'll craft a personalized proposal for your event.
          </p>
          <Link
            href="/customer/events"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 px-6 py-3 text-sm uppercase tracking-[0.3em] text-cyan-400/70 hover:border-cyan-400 hover:text-cyan-400 transition-colors"
          >
            Plan Your Event
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
