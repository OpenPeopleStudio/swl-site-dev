"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
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

  const fetchStaff = useCallback(async () => {
    startTransition(() => setLoading(true));
    const { data, error } = await supabase
      .from("staff_with_presence")
      .select("id, full_name, role, avatar_url, state, last_active");
    if (error) {
      console.error("presence fetch failed", error);
      startTransition(() => setStaff([]));
    } else {
      startTransition(() => setStaff(data ?? []));
    }
    startTransition(() => setLoading(false));
  }, [supabase]);

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
