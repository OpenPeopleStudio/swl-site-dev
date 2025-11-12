"use client";

import { useMemo, useState } from "react";

type WizardProps = {
  action: (formData: FormData) => Promise<void>;
  defaultName: string;
};

type WizardState = {
  preferred_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  menu_style: string;
  dietary_notes: string;
  space_layout: string;
  party_size: string;
  special_requests: string;
  guest_name: string;
  budget_range: string;
};

const EVENT_TYPES = [
  "Private Dinner",
  "Wedding Reception",
  "Cocktail Reception",
  "Brand Launch",
  "Chef's Table",
];

const MENU_STYLES = ["Chef’s Tasting", "À la carte", "Cocktail Canapés", "Buffet"];

const LAYOUTS = ["Seated tables", "Chef counter", "Standing cocktail", "Custom hybrid"];

const INITIAL_STATE = (defaultName: string): WizardState => ({
  preferred_date: "",
  start_time: "",
  end_time: "",
  event_type: EVENT_TYPES[0],
  menu_style: MENU_STYLES[0],
  dietary_notes: "",
  space_layout: LAYOUTS[0],
  party_size: "",
  special_requests: "",
  guest_name: defaultName,
  budget_range: "",
});

export function CustomerEventWizard({ action, defaultName }: WizardProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(() => INITIAL_STATE(defaultName));

  const summary = useMemo(
    () => [
      { label: "Date", value: state.preferred_date || "TBD" },
      {
        label: "Time",
        value:
          state.start_time && state.end_time
            ? `${state.start_time} – ${state.end_time}`
            : "TBD",
      },
      { label: "Event Type", value: state.event_type },
      {
        label: "Menu Style",
        value: `${state.menu_style}${
          state.dietary_notes ? ` (Dietary: ${state.dietary_notes})` : ""
        }`,
      },
      { label: "Layout", value: state.space_layout },
      {
        label: "Guest Count",
        value: state.party_size ? `${state.party_size} guests` : "TBD",
      },
      { label: "Budget", value: state.budget_range || "Custom" },
      { label: "Host Name", value: state.guest_name || "Guest" },
    ],
    [state],
  );

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() {
    setError(null);
    if (step === 1 && !state.preferred_date) {
      setError("Select your preferred date to continue.");
      return;
    }
    if (step === 5) {
      if (!state.party_size) {
        setError("Please add an estimated guest count.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 6));
  }

  function prevStep() {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  }

  return (
    <div className="mt-6 space-y-6">
      <ProgressIndicator current={step} total={6} />
      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {step === 1 && (
        <StepCard title="Step 1 · Date & Timing">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-white/70 md:col-span-1">
              Preferred Date
              <input
                type="date"
                value={state.preferred_date}
                onChange={(event) => update("preferred_date", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
            <label className="text-sm text-white/70">
              Arrival
              <input
                type="time"
                value={state.start_time}
                onChange={(event) => update("start_time", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
            <label className="text-sm text-white/70">
              Departure
              <input
                type="time"
                value={state.end_time}
                onChange={(event) => update("end_time", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
          </div>
          <p className="mt-4 text-xs text-white/50">
            Live availability coming soon — for now, choose your ideal evening. We’ll
            confirm or suggest alternatives in the proposal.
          </p>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Step 2 · Event Style">
          <div className="grid gap-3 md:grid-cols-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update("event_type", type)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  state.event_type === type
                    ? "border-white/80 bg-white/10 text-white"
                    : "border-white/20 bg-black/40 text-white/70 hover:border-white/40"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Step 3 · Menu & Dietary">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70">
              Menu Style
              <select
                value={state.menu_style}
                onChange={(event) => update("menu_style", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              >
                {MENU_STYLES.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/70">
              Dietary Notes
              <input
                value={state.dietary_notes}
                onChange={(event) => update("dietary_notes", event.target.value)}
                placeholder="Allergies, vegetarian focus, etc."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
          </div>
        </StepCard>
      )}

      {step === 4 && (
        <StepCard title="Step 4 · Space & Layout">
          <div className="grid gap-3 md:grid-cols-2">
            {LAYOUTS.map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => update("space_layout", layout)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  state.space_layout === layout
                    ? "border-white/80 bg-white/10 text-white"
                    : "border-white/20 bg-black/40 text-white/70 hover:border-white/40"
                }`}
              >
                {layout}
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 5 && (
        <StepCard title="Step 5 · Guests & Preferences">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70">
              Guest Count
              <input
                type="number"
                min={1}
                value={state.party_size}
                onChange={(event) => update("party_size", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
            <label className="text-sm text-white/70">
              Host Name
              <input
                value={state.guest_name}
                onChange={(event) => update("guest_name", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
            <label className="text-sm text-white/70">
              Budget Range
              <input
                value={state.budget_range}
                onChange={(event) => update("budget_range", event.target.value)}
                placeholder="e.g. $15k – $25k"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
            <label className="text-sm text-white/70 md:col-span-2">
              Special Requests
              <textarea
                rows={3}
                value={state.special_requests}
                onChange={(event) => update("special_requests", event.target.value)}
                placeholder="Entertainment, audio/visual, speeches, etc."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
              />
            </label>
          </div>
        </StepCard>
      )}

      {step === 6 && (
        <StepCard title="Step 6 · Review & Send">
          <dl className="grid gap-4 md:grid-cols-2">
            {summary.map((item) => (
              <div key={item.label}>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {item.label}
                </dt>
                <dd className="text-lg text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
          <form action={action} className="mt-6 space-y-3">
            {Object.entries(state).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#2A63FF] py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:bg-[#244eda]"
            >
              Send Proposal Request
            </button>
            <p className="text-center text-xs text-white/60">
              Deposits are only collected after you approve the proposal.
            </p>
          </form>
        </StepCard>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 disabled:opacity-40"
        >
          Back
        </button>
        {step < 6 && (
          <button
            type="button"
            onClick={nextStep}
            className="rounded-full bg-white/10 px-6 py-2 text-sm uppercase tracking-[0.3em] text-white hover:bg-white/20"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function StepCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
      <h3 className="text-xl font-light">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-white/40">
      {Array.from({ length: total }).map((_, index) => {
        const step = index + 1;
        return (
          <span
            key={step}
            className={`h-2 flex-1 rounded-full ${
              step <= current ? "bg-white" : "bg-white/20"
            }`}
          />
        );
      })}
    </div>
  );
}
