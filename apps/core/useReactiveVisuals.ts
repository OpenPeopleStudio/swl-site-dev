"use client";

import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

export function useReactiveVisuals() {
  useEffect(() => {
    const channel = supabaseBrowser.channel("activity-reflections");
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reflections" },
      (payload: RealtimePostgresInsertPayload<{ highlight?: string | null }>) => {
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
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
