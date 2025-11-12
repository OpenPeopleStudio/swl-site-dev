"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export function useAmbientGlow() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel("activity-glow");
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => {
        document.documentElement.style.setProperty(
          "--ambient-glow",
          "rgba(0,122,255,0.15)",
        );
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          document.documentElement.style.setProperty(
            "--ambient-glow",
            "rgba(0,122,255,0.08)",
          );
        }, 5000);
      },
    );

    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, []);
}
