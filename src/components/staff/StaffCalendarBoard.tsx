"use client";

import { useMemo, useState } from "react";

type CalendarMode = "day" | "week" | "agenda";

type CalendarItem = {
  id: string;
  title: string;
  category: "shift" | "reservation" | "private_dinner" | "task";
  focus: "service" | "prep" | "guest" | "ops";
  start: string;
  end?: string;
  detail: string;
  meta: string;
};

const CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: "cal-1",
    title: "Line Team · Service",
    category: "shift",
    focus: "service",
    start: "2026-04-16T15:00:00-02:30",
    end: "2026-04-16T23:30:00-02:30",
    detail: "Cover both seatings · crew of five.",
    meta: "Lead: Koa",
  },
  {
    id: "cal-2",
    title: "Private Dinner · Salon",
    category: "private_dinner",
    focus: "guest",
    start: "2026-04-16T19:00:00-02:30",
    end: "2026-04-16T23:00:00-02:30",
    detail: "Menu 'Under Aurora' · Chef Orion",
    meta: "10 guests · wine pairings",
  },
  {
    id: "cal-3",
    title: "Reservations Block",
    category: "reservation",
    focus: "guest",
    start: "2026-04-16T17:30:00-02:30",
    end: "2026-04-16T22:30:00-02:30",
    detail: "18 guests · B + C experiences",
    meta: "Hosts: Ezra / Liv",
  },
  {
    id: "cal-4",
    title: "Send Rivera contract",
    category: "task",
    focus: "ops",
    start: "2026-04-16T19:00:00-02:30",
    detail: "Include wine tier + new deposit",
    meta: "Due 19:00",
  },
  {
    id: "cal-5",
    title: "Bakers · Dawn Shift",
    category: "shift",
    focus: "prep",
    start: "2026-04-17T05:30:00-02:30",
    end: "2026-04-17T12:30:00-02:30",
    detail: "Laminate croissants + focaccia",
    meta: "Lead: Lale",
  },
];

const MODE_LABELS: Record<CalendarMode, string> = {
  day: "Day",
  week: "Week Strip",
  agenda: "Agenda",
};

const CATEGORY_FILTERS = [
  { label: "Shifts", key: "shift" },
  { label: "Reservations", key: "reservation" },
  { label: "Private Dinners", key: "private_dinner" },
  { label: "Tasks", key: "task" },
] as const;

export function StaffCalendarBoard() {
  const [mode, setMode] = useState<CalendarMode>("day");
  const [filters, setFilters] = useState<Record<string, boolean>>({
    shift: true,
    reservation: true,
    private_dinner: true,
    task: true,
  });

  const filteredItems = useMemo(
    () => CALENDAR_ITEMS.filter((item) => filters[item.category]),
    [filters],
  );

  function toggleFilter(key: string) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <section className="flex flex-col gap-6 rounded-[40px] border border-white/10 bg-gradient-to-b from-[#03050b]/95 via-[#040712]/95 to-[#010106]/98 p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Unified Calendar</p>
          <h2 className="mt-2 text-3xl font-light tracking-[0.25em]">
            Calm overview of shifts, guests, and tasks
          </h2>
        </div>
        <div className="flex gap-2 rounded-full border border-white/15 bg-white/5 p-1">
          {(["day", "week", "agenda"] as CalendarMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-full px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
                mode === option ? "bg-white text-black" : "text-white/60"
              }`}
            >
              {MODE_LABELS[option]}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_minmax(320px,0.7fr)]">
        <div className="space-y-4">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Focus List</p>
            <div className="mt-3 space-y-3">
              {["Today", "Tomorrow", "Later"].map((bucket) => (
                <div key={bucket} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">{bucket}</p>
                  <p className="text-sm text-white/75">
                    {bucket === "Today"
                      ? "Line team, private dinner, contract reminder."
                      : bucket === "Tomorrow"
                        ? "Bakers, admin ops, concierge follow-up."
                        : "Menu revamp, supplier visit next week."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <CalendarCanvas mode={mode} items={filteredItems} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Filters</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => toggleFilter(filter.key)}
                  className={`rounded-full border px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
                    filters[filter.key]
                      ? "border-white/60 bg-white/10 text-white"
                      : "border-white/10 bg-black/20 text-white/40"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Agenda Preview</p>
            <ul className="mt-3 space-y-3 text-sm text-white/80">
              {filteredItems.slice(0, 4).map((item) => (
                <li key={`agenda-${item.id}`} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {new Date(item.start).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {item.end ? "– " + new Date(item.end).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                  <p className="text-base text-white">{item.title}</p>
                  <p className="text-xs text-white/60">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CalendarCanvas({ mode, items }: { mode: CalendarMode; items: CalendarItem[] }) {
  if (mode === "agenda") {
    return (
      <div className="rounded-[30px] border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Agenda</p>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                <span>
                  {new Date(item.start).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {item.end && (
                  <span>
                    {new Date(item.end).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <p className="mt-2 text-base text-white">{item.title}</p>
              <p className="text-xs text-white/60">{item.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (mode === "week") {
    const days = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
    return (
      <div className="rounded-[30px] border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Week Strip</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {days.map((day) => (
            <div key={day} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-center text-[11px] uppercase tracking-[0.4em] text-white/40">
                {day}
              </p>
              <ul className="mt-2 space-y-2 text-xs text-white/70">
                {items.slice(0, 3).map((item) => (
                  <li key={`${day}-${item.id}`} className="rounded-xl border border-white/10 bg-black/40 p-2">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">
                      {item.category.replace("_", " ")}
                    </p>
                    <p>{item.title}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Day timeline
  return (
    <div className="rounded-[30px] border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">Day Timeline</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
              <span>
                {new Date(item.start).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {item.end && (
                <span>
                  {new Date(item.end).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <p className="mt-2 text-base font-light text-white">{item.title}</p>
            <p className="text-sm text-white/70">{item.meta}</p>
            <p className="mt-2 text-xs text-white/60">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default StaffCalendarBoard;
