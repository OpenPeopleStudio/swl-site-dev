"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export function useReactiveVisuals() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel("activity-reflections");
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reflections" },
      (payload) => {
        const highlight = (payload.new as { highlight?: string | null })
          ?.highlight;
        const intensity = Math.min(
          ((highlight?.length ?? 0) % 120) / 120,
          1,
        );
        document.documentElement.style.setProperty(
          "--ambient-glow",
          `rgba(0,122,255,${0.05 + intensity * 0.2})`,
        );
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
