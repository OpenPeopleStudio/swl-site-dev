"use client";

import { useMemo } from "react";

export type EventLane = "inquiry" | "curation" | "awaiting_guest" | "contract_out" | "confirmed";

export type StaffEventCard = {
  id: string;
  guestName: string;
  guestEmail?: string;
  partySize: number;
  date?: string | null;
  status: EventLane;
  budgetRange?: string | null;
  notes?: string | null;
  lastTouched?: string | null;
};

const STATUS_LABEL: Record<EventLane, string> = {
  inquiry: "New",
  curation: "Curation",
  awaiting_guest: "Waiting",
  contract_out: "Contract",
  confirmed: "Confirmed",
};

const STATUS_TONE: Record<EventLane, string> = {
  inquiry: "border-white/15 text-white/75",
  curation: "border-sky-400/40 text-sky-100",
  awaiting_guest: "border-amber-400/40 text-amber-200",
  contract_out: "border-purple-400/40 text-purple-200",
  confirmed: "border-emerald-400/40 text-emerald-200",
};

export function StaffEventsBoard({ requests }: { requests: StaffEventCard[] }) {
  const pipeline = useMemo(() => {
    return Object.keys(STATUS_LABEL).map((status) => ({
      status: status as EventLane,
      count: requests.filter((request) => request.status === status).length,
      items: requests
        .filter((request) => request.status === status)
        .slice(0, 4),
    }));
  }, [requests]);

  const upcoming = useMemo(() => {
    return requests
      .filter((request) => request.date)
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 6);
  }, [requests]);

  return (
    <section className="flex flex-col gap-6 rounded-[36px] border border-white/10 bg-gradient-to-br from-[#02040a] via-[#05070f] to-[#02040a] p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Staff · Events</p>
          <h1 className="text-3xl font-light tracking-[0.3em]">Private Dining Stream</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stat label="Active Requests" value={requests.length} />
          <Stat
            label="Confirmed"
            tone="emerald"
            value={pipeline.find((lane) => lane.status === "confirmed")?.count ?? 0}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_minmax(0,0.8fr)]">
        <UpcomingList events={upcoming} />
        <Pipeline lanes={pipeline} />
      </div>
    </section>
  );
}

function UpcomingList({ events }: { events: StaffEventCard[] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-5">
        <p className="text-sm text-white/60">No scheduled experiences in the next window.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
        <span>Upcoming experiences</span>
        <span>{events.length}</span>
      </header>
      <div className="space-y-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold">{event.guestName}</p>
              <p className="text-xs text-white/60">
                {formatDate(event.date)} · {event.partySize} guests
              </p>
              {event.notes && (
                <p className="text-xs text-white/50 line-clamp-1">{event.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage</p>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${STATUS_TONE[event.status]}`}>
                {STATUS_LABEL[event.status]}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Pipeline({
  lanes,
}: {
  lanes: { status: EventLane; count: number; items: StaffEventCard[] }[];
}) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
        <span>Pipeline</span>
        <span>Preview</span>
      </header>
      <div className="grid gap-3">
        {lanes.map((lane) => (
          <div key={lane.status} className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em]">
              <span className="text-white/60">{STATUS_LABEL[lane.status]}</span>
              <span className="text-white/40">{lane.count}</span>
            </div>
            {lane.items.length === 0 ? (
              <p className="text-xs text-white/45">No requests in this lane.</p>
            ) : (
              lane.items.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
                >
                  <div>
                    <p>{request.guestName}</p>
                    <p className="text-white/40">
                      {request.partySize}p · {request.budgetRange ?? "Custom"}
                    </p>
                  </div>
                  <span className="text-white/40">{shortDate(request.date)}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/40 text-emerald-200"
      : "border-white/15 text-white/80";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-right ${toneClass}`}>
      <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">{label}</p>
      <p className="text-2xl font-light">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
