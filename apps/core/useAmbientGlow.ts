"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

export function useAmbientGlow() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabaseBrowser.channel("activity-glow");
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
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
