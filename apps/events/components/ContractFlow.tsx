"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { PrivateEvent } from "@/apps/events/lib/queries";

type ContractFlowProps = {
  event: PrivateEvent;
};

export function ContractFlow({ event }: ContractFlowProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const depositCents = event.deposit_amount ?? 500_000;
  const depositDisplay = (depositCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  async function simulateDeposit() {
    if (!agreed) return;
    setLoading(true);
    setMessage(null);
    try {
      await supabaseBrowser
        .from("private_events")
        .update({
          status: "deposit_paid",
          deposit_paid: true,
        })
        .eq("id", event.id);
      setMessage("Deposit recorded. The ritual is confirmed.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to record deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmLater() {
    if (!agreed) return;
    setLoading(true);
    setMessage(null);
    try {
      await supabaseBrowser
        .from("private_events")
        .update({
          contract_signed: true,
          notes_internal:
            "Contract acknowledged; deposit pending confirmation.",
        })
        .eq("id", event.id);
      setMessage("Marked as contract acknowledged.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to update contract status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-morphic rounded-3xl border border-white/10 bg-black/50 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Sacred Bond
        </p>
        <h2 className="text-2xl font-light text-white">Seal the Ritual</h2>
        <p className="text-sm text-white/60">
          Stripe integration arrives next. For now, simulate the deposit to keep
          the workflow moving.
        </p>
      </div>

      <label className="mt-6 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1"
        />
        <span>
          I understand this commitment is sacred. Cancellations within 14 days
          forfeit the deposit.
        </span>
      </label>

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={simulateDeposit}
          disabled={!agreed || loading}
          className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-900 to-green-800 px-4 py-3 text-sm font-light text-white transition hover:from-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Opening gate..." : `Mark Deposit ${depositDisplay}`}
        </button>
        <button
          type="button"
          onClick={confirmLater}
          disabled={!agreed || loading}
          className="rounded-2xl border border-white/20 px-4 py-3 text-sm text-white/80 transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Later
        </button>
      </div>

      {message && (
        <p className="mt-4 text-sm text-white/70" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
