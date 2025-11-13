"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type StaffPresence = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  state?: string | null;
  last_active?: string | null;
};

export function usePresence() {
  const supabase = supabaseBrowser;
  const [staff, setStaff] = useState<StaffPresence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFromRoster = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, role, avatar_url, last_synced")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      role: row.role,
      avatar_url: row.avatar_url,
      state: null,
      last_active: row.last_synced ?? null,
    }));
  }, [supabase]);

  const fetchStaff = useCallback(async () => {
    startTransition(() => setLoading(true));
    const { data, error } = await supabase
      .from("staff_with_presence")
      .select("id, full_name, role, avatar_url, state, last_active");
    if (!error) {
      startTransition(() => setStaff(data ?? []));
      startTransition(() => setLoading(false));
      return;
    }
    const shouldFallback =
      (error as PostgrestError | null)?.code === "42P01" ||
      (error as PostgrestError | null)?.message
        ?.toLowerCase()
        .includes("does not exist");
    if (!shouldFallback) {
      console.error("presence fetch failed", error);
      startTransition(() => setStaff([]));
      startTransition(() => setLoading(false));
      return;
    }
    try {
      const roster = await fetchFromRoster();
      startTransition(() => setStaff(roster));
    } catch (fallbackError) {
      console.error("presence fallback failed", fallbackError);
      startTransition(() => setStaff([]));
    }
    startTransition(() => setLoading(false));
  }, [fetchFromRoster, supabase]);

  useEffect(() => {
    startTransition(() => {
      void fetchStaff();
    });
  }, [fetchStaff]);

  useEffect(() => {
    const channel = supabase
      .channel("presence:staff")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        () => {
          void fetchStaff();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStaff, supabase]);

  return { staff, loading, refresh: fetchStaff };
}
