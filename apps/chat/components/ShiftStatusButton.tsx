"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";
import type { StaffIdentity } from "@/lib/shared/getCurrentUser";
import { updatePresenceState } from "@/apps/presence/lib/presence";

type ShiftLog = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_hours?: number | null;
  status?: string | null;
};

type ShiftStatusButtonProps = {
  user: StaffIdentity | null;
};

export default function ShiftStatusButton({ user }: ShiftStatusButtonProps) {
  const [activeShift, setActiveShift] = useState<ShiftLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("shift_log")
        .select("*")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setActiveShift(data ?? null);
      updatePresenceState(data ? "on-shift" : "online");
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  const ensuredUser = user;
  const client = supabaseBrowser;

  async function handleClockIn() {
    setLoading(true);
    setError(null);
    const clockIn = new Date().toISOString();
    const { data, error } = await client
      .from("shift_log")
      .insert({
        user_id: ensuredUser.id,
        clock_in: clockIn,
        status: "active",
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setActiveShift(data as ShiftLog);
    updatePresenceState("on-shift");
  }

  async function handleClockOut() {
    if (!activeShift) return;
    setLoading(true);
    setError(null);
    const clockOut = new Date();
    const duration =
      (clockOut.getTime() - new Date(activeShift.clock_in).getTime()) /
      (1000 * 60 * 60);

    const { error } = await client
      .from("shift_log")
      .update({
        clock_out: clockOut.toISOString(),
        duration_hours: Math.max(duration, 0),
        status: "inactive",
      })
      .eq("id", activeShift.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setActiveShift(null);
    updatePresenceState("away");
  }

  const isOnShift = Boolean(activeShift);
  const label = isOnShift ? "Clock out" : "Clock in";

  return (
    <div className="flex flex-col items-end gap-1 text-xs text-white/70">
      <button
        type="button"
        onClick={isOnShift ? handleClockOut : handleClockIn}
        disabled={loading}
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
          isOnShift
            ? "bg-rose-500/80 hover:bg-rose-500"
            : "bg-emerald-500/80 hover:bg-emerald-500"
        } disabled:opacity-50`}
      >
        {loading ? "Working..." : label}
      </button>
      <span className="text-[10px] tracking-[0.3em] text-white/50">
        {isOnShift ? "On shift" : "Off shift"}
      </span>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}
