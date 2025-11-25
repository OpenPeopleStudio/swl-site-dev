"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ReserveFormState } from "@/domains/customer/types";

const OPENING_DATES = [
  { label: "Thu • Apr 24", value: "2026-04-24" },
  { label: "Fri • Apr 25", value: "2026-04-25" },
  { label: "Sat • Apr 26", value: "2026-04-26" },
];

const PARTY_MIN = 1;
const PARTY_MAX = 8;

type Props = {
  action: (state: ReserveFormState, formData: FormData) => Promise<ReserveFormState>;
  initialState: ReserveFormState;
};

export function ReserveOpeningWeekForm({ action, initialState }: Props) {
  const [selectedDate, setSelectedDate] = useState(OPENING_DATES[0].value);
  const [partySize, setPartySize] = useState(4);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [state, formAction] = useFormState(action, initialState);

  const selectedLabel = useMemo(
    () => OPENING_DATES.find((d) => d.value === selectedDate)?.label ?? "",
    [selectedDate],
  );

  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-sm text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <h3 className="text-2xl font-light">Opening week request received</h3>
        <p className="mt-2 text-white/70">
          {state.message ?? "We’ll email you with confirmation once tables open."}
        </p>
        <ul className="mt-4 space-y-2 text-white/70">
          <li>• Date: {selectedLabel}</li>
          <li>• Party size: {partySize} guests</li>
          <li>• Our concierge will follow up within 24 hours.</li>
        </ul>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="opening_date" value={selectedDate} />
      <input type="hidden" name="opening_party" value={partySize} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="guest_name" value={guestName} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-white/70">
          Your Name
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="John Doe"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
            required
          />
        </label>
        <label className="block text-sm text-white/70">
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
            required
          />
        </label>
      </div>

      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Select evening</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {OPENING_DATES.map((slot) => {
            const isActive = slot.value === selectedDate;
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => setSelectedDate(slot.value)}
                className={`flex-1 min-w-[140px] rounded-2xl border px-4 py-3 text-center text-sm transition ${
                  isActive
                    ? "border-white/80 bg-white/15 text-white shadow-[0_10px_35px_rgba(42,99,255,0.35)]"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm text-white/60">
          <span className="uppercase tracking-[0.3em] text-white/50">Party size</span>
          <span className="text-white">{partySize} guests</span>
        </div>
        <input
          type="range"
          min={PARTY_MIN}
          max={PARTY_MAX}
          step={1}
          value={partySize}
          onChange={(event) => setPartySize(Number(event.target.value))}
          className="mt-3 w-full accent-white"
        />
        <div className="mt-1 flex justify-between text-xs text-white/40">
          <span>{PARTY_MIN}</span>
          <span>{PARTY_MAX}</span>
        </div>
      </div>

      <label className="block text-sm text-white/70">
        Notes (allergies, toasts, celebrations)
        <textarea
          name="opening_notes"
          rows={3}
          placeholder="Anniversary dinner, pescatarian, prefer counter..."
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
        />
      </label>

      {state.status === "error" && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm text-red-200">
          {state.message ?? "Unable to save request. Please try again."}
        </p>
      )}

      <div>
        <SubmitButton label="Request Early Seating" />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:border-white/60 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "Sending…" : label}
    </button>
  );
}
