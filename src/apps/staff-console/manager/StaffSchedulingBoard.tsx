"use client";

import { useMemo, useState, type FormEvent } from "react";

type FocusTag = "service" | "prep" | "guest" | "ops";

type TimelineCard = {
  id: string;
  title: string;
  time: string;
  meta: string;
  detail: string;
  focus: FocusTag;
};

type Task = {
  id: string;
  label: string;
  detail: string;
  due: string;
  focus: FocusTag;
};

type RequestType = "shift_change" | "reservation_add" | "task";

const SHIFT_COLUMNS: Array<{ title: string; items: TimelineCard[] }> = [
  {
    title: "Today",
    items: [
      {
        id: "shift-crew-a",
        title: "Line Team · Service",
        time: "15:00 – 23:30",
        meta: "Lead: Koa · 5 crew",
        detail: "Pre-shift brief + second seating coverage.",
        focus: "service",
      },
      {
        id: "shift-pastry",
        title: "Pastry Lab",
        time: "12:00 – 20:00",
        meta: "Lead: Mina",
        detail: "Fermented dough proof + dessert flight finishing.",
        focus: "prep",
      },
      {
        id: "shift-host",
        title: "Host & Concierge",
        time: "14:00 – 22:00",
        meta: "Lead: Ezra",
        detail: "Reservations queue + concierge handoffs.",
        focus: "guest",
      },
    ],
  },
  {
    title: "Evening",
    items: [
      {
        id: "shift-bar",
        title: "Bar Flight Crew",
        time: "17:30 – 01:00",
        meta: "Lead: Jules",
        detail: "Pairings for Experience B + late seating cleans.",
        focus: "service",
      },
      {
        id: "shift-dish",
        title: "Utility / Dish",
        time: "18:00 – 02:30",
        meta: "Lead: Theo",
        detail: "Deep clean cycle & glass reset.",
        focus: "ops",
      },
    ],
  },
  {
    title: "Tomorrow",
    items: [
      {
        id: "shift-bakers",
        title: "Bakers",
        time: "05:30 – 12:30",
        meta: "Lead: Lale",
        detail: "Laminate croissants + seasonal focaccia.",
        focus: "prep",
      },
      {
        id: "shift-admin",
        title: "Admin / Ops",
        time: "09:00 – 17:00",
        meta: "Lead: Rowan",
        detail: "Vendor calls + prep schedule confirmation.",
        focus: "ops",
      },
    ],
  },
];

const RESERVATION_DECK: TimelineCard[] = [
  {
    id: "reservation-early",
    title: "Reservation · 17:30",
    time: "Party of 4 · Flight B",
    meta: "Host: Ezra",
    detail: "Rooftop arrival. Allergies: shellfish.",
    focus: "guest",
  },
  {
    id: "reservation-private",
    title: "Private Dinner · Salon",
    time: "19:00 – 23:00",
    meta: "Chef table · 10 guests",
    detail: "Menu 'Under Aurora' — finalize fire sequence.",
    focus: "service",
  },
  {
    id: "reservation-late",
    title: "Reservation · 21:15",
    time: "Party of 2 · Experience A",
    meta: "Host: Liv",
    detail: "Birthday note + sparkling pairing.",
    focus: "guest",
  },
];

const TASKS: Task[] = [
  {
    id: "task-menu",
    label: "Confirm tomorrow's tasting menu edits",
    detail: "Chef Orion wants sign-off by 18:00.",
    due: "Due 17:45",
    focus: "prep",
  },
  {
    id: "task-contract",
    label: "Send updated contract · Rivera family",
    detail: "Integrate wine pairing note + new deposit total.",
    due: "Due 19:00",
    focus: "guest",
  },
  {
    id: "task-shift",
    label: "Schedule cross-train session",
    detail: "Host team shadow pastry plating (Tomorrow).",
    due: "Due Tonight",
    focus: "service",
  },
  {
    id: "task-maint",
    label: "Last-call reminders",
    detail: "Ping mixers to log detergent levels + dryer temps.",
    due: "Due 23:00",
    focus: "ops",
  },
];

const FOCUS_COPY: Record<FocusTag, { label: string; color: string }> = {
  service: { label: "Service", color: "bg-white text-black" },
  prep: { label: "Prep", color: "bg-amber-300/80 text-black" },
  guest: { label: "Guest", color: "bg-cyan-200/90 text-black" },
  ops: { label: "Ops", color: "bg-white/20 text-white" },
};

const REQUEST_COPY: Record<RequestType, { label: string; placeholder: string }> = {
  shift_change: {
    label: "Shift change request",
    placeholder: "Explain the swap or coverage you need…",
  },
  reservation_add: {
    label: "Reservation / guest note",
    placeholder: "Add phone call info, dietary notes, or timeline shifts…",
  },
  task: {
    label: "Scheduling task",
    placeholder: "Describe prep, cleaning, or inventory work that needs to be scheduled…",
  },
};

const GLANCE_METRICS = [
  { id: "guests", label: "Guests", value: "46 tonight", detail: "18 seated · 28 incoming" },
  { id: "stations", label: "Stations", value: "4 live", detail: "Line, pastry, bar, host" },
  { id: "tasks", label: "Open cues", value: "4", detail: "Menu edits + ops pings" },
];

export function StaffSchedulingBoard() {
  const [selectedReservationId, setSelectedReservationId] = useState(
    RESERVATION_DECK[0]?.id ?? null,
  );
  const [requestForm, setRequestForm] = useState<{
    type: RequestType;
    targetLabel: string;
    details: string;
  }>({
    type: "shift_change",
    targetLabel: "",
    details: "",
  });
  const [requestStatus, setRequestStatus] = useState<"idle" | "submitting" | "success">("idle");

  const selectedReservation = useMemo(
    () => RESERVATION_DECK.find((card) => card.id === selectedReservationId),
    [selectedReservationId],
  );

  function prefillRequest(type: RequestType, label: string) {
    setRequestStatus("idle");
    setRequestForm({
      type,
      targetLabel: label,
      details: "",
    });
  }

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestForm.details.trim()) return;
    setRequestStatus("submitting");
    window.setTimeout(() => {
      setRequestStatus("success");
      setRequestForm((prev) => ({ ...prev, details: "" }));
    }, 600);
  }

  return (
    <section className="flex flex-col gap-8 rounded-[40px] border border-white/10 bg-gradient-to-b from-[#040610]/90 via-[#05070c]/95 to-[#010104]/98 p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.7)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Staff · Schedule</p>
          <h1 className="mt-2 text-4xl font-light tracking-[0.3em]">Things In Motion</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <FocusChip label="Shifts" value="7 active" />
          <FocusChip label="Reservations" value="18 guests" />
          <FocusChip label="Tasks" value="4 reminders" tone="accent" />
        </div>
      </header>

  <ViewOnlyBanner />
  <SummaryPanel metrics={GLANCE_METRICS} />

  <div className="grid gap-6 xl:grid-cols-[3fr_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xs uppercase tracking-[0.5em] text-white/50">Crew Timeline</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {SHIFT_COLUMNS.map((column) => (
                <div key={column.title} className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <p className="text-center text-[11px] uppercase tracking-[0.5em] text-white/40">
                    {column.title}
                  </p>
                  <div className="mt-3 space-y-3">
                    {column.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[0_15px_30px_rgba(0,0,0,0.25)]"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.4em] text-white/45">
                          <span>{item.time}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${FOCUS_COPY[item.focus].color}`}>
                            {FOCUS_COPY[item.focus].label}
                          </span>
                        </div>
                        <p className="mt-2 text-lg font-light text-white">{item.title}</p>
                        <p className="text-sm text-white/65">{item.meta}</p>
                        <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                        <button
                          type="button"
                          onClick={() => prefillRequest("shift_change", `${item.title} · ${item.time}`)}
                          className="mt-3 w-full rounded-2xl border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/60"
                        >
                          Request change
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-white/50">Reservations & Dinners</p>
                <p className="text-white/70">Select a card to review prep focus.</p>
              </div>
              <button
                type="button"
                onClick={() => prefillRequest("reservation_add", "General request")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/80 hover:border-white/60"
              >
                Request update
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {RESERVATION_DECK.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedReservationId(card.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition lg:w-[calc(33%-0.5rem)] ${
                    selectedReservationId === card.id
                      ? "border-white/70 bg-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                      : "border-white/15 bg-black/30 hover:border-white/40"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">{card.title}</p>
                  <p className="text-sm text-white">{card.time}</p>
                  <p className="text-xs text-white/60">{card.meta}</p>
                </button>
              ))}
            </div>
            {selectedReservation && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Focus</p>
                <p className="mt-2 text-lg text-white">{selectedReservation.detail}</p>
                <p className="text-sm text-white/70">{selectedReservation.meta}</p>
                <button
                  type="button"
                  onClick={() =>
                    prefillRequest("reservation_add", `${selectedReservation.title} · ${selectedReservation.time}`)
                  }
                  className="mt-3 w-full rounded-2xl border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/60"
                >
                  Request change
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Reminders</p>
                <p className="text-sm text-white/70">View-only · route changes below.</p>
              </div>
              <button
                type="button"
                onClick={() => prefillRequest("task", "New reminder")}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/70 hover:border-white/60"
              >
                Submit request
              </button>
            </header>
            <ul className="mt-4 space-y-3">
              {TASKS.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                      <span>{task.due}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${FOCUS_COPY[task.focus].color}`}>
                        {FOCUS_COPY[task.focus].label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white">{task.label}</p>
                    <p className="text-xs text-white/60">{task.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => prefillRequest("task", task.label)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/60"
                  >
                    Request adjustment
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Next Pulses</p>
            <div className="mt-3 space-y-3 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Crew Sync</p>
                <p className="text-2xl font-light text-white">18:30</p>
                <p className="text-white/60">Align prep + service crossover.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Reminder</p>
                <p className="text-white">Send Rivera contract — include new wine tier.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Tomorrow</p>
                <p className="text-white">Brief night switch on Things queue.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <RequestPanel
        form={requestForm}
        status={requestStatus}
        onChange={setRequestForm}
        onSubmit={handleRequestSubmit}
      />
    </section>
  );
}

function ViewOnlyBanner() {
  return (
    <div className="rounded-[28px] border border-white/15 bg-black/30 px-5 py-4 text-sm text-white/70">
      <p className="uppercase tracking-[0.45em] text-white/40">Mode · View Only</p>
      <p className="mt-1">
        Owners control the master schedule. Review the live plan here and use the request panel below for
        shift swaps, reservation notes, or scheduling tasks tied to you.
      </p>
    </div>
  );
}

function RequestPanel({
  form,
  status,
  onChange,
  onSubmit,
}: {
  form: { type: RequestType; targetLabel: string; details: string };
  status: "idle" | "submitting" | "success";
  onChange: (form: { type: RequestType; targetLabel: string; details: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const meta = REQUEST_COPY[form.type];
  const disabled = !form.details.trim() || status === "submitting";

  function updateField(field: "targetLabel" | "details", value: string) {
    onChange({ ...form, [field]: value });
  }

  function updateType(type: RequestType) {
    onChange({ ...form, type });
  }

  return (
    <section className="rounded-[36px] border border-white/10 bg-white/5 p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Request changes</p>
          <h2 className="text-3xl font-light tracking-[0.25em]">Forward to owners</h2>
        </div>
        {status === "success" && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.4em] text-emerald-200">
            Sent
          </span>
        )}
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["shift_change", "reservation_add", "task"] as RequestType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateType(type)}
            className={`rounded-full border px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
              form.type === type ? "border-white/70 bg-white/15" : "border-white/15 text-white/60"
            }`}
          >
            {REQUEST_COPY[type].label}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.4em] text-white/50">
          Target block or context
          <input
            type="text"
            value={form.targetLabel}
            onChange={(event) => updateField("targetLabel", event.target.value)}
            placeholder="e.g., Pastry close Friday"
            className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.4em] text-white/50">
          Details
          <textarea
            value={form.details}
            onChange={(event) => updateField("details", event.target.value)}
            placeholder={meta.placeholder}
            rows={4}
            className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Routes to owners · auto logged in schedule queue
          </p>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-full border border-white/40 px-6 py-2 text-xs uppercase tracking-[0.4em] text-white transition hover:border-white/80 disabled:opacity-40"
          >
            {status === "submitting" ? "Sending…" : "Submit request"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FocusChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "accent";
}) {
  const classes =
    tone === "accent"
      ? "border-white/60 bg-white/15 text-white"
      : "border-white/15 bg-white/5 text-white/70";
  return (
    <div className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.4em] ${classes}`}>
      {label} · {value}
    </div>
  );
}

export default StaffSchedulingBoard;

function SummaryPanel({
  metrics,
}: {
  metrics: Array<{ id: string; label: string; value: string; detail: string }>;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 text-white">
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">{metric.label}</p>
            <p className="mt-2 text-2xl font-light">{metric.value}</p>
            <p className="text-xs text-white/60">{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
