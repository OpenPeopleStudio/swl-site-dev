"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { PresenceUser } from "@/apps/chat/types";

type PresenceIdentity = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

export function usePresence(identity?: PresenceIdentity | null) {
  const supabase = supabaseBrowser;
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  const key = useMemo(() => identity?.id ?? null, [identity?.id]);

  useEffect(() => {
    if (!key) return undefined;
    const channel = supabase.channel("presence:swl", {
      config: {
        presence: {
          key,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Record<string, PresenceUser[]>>();
      const flattened = Object.values(state)
        .flat()
        .map((entry) => ({
          user_id: entry.user_id,
          name: entry.name,
          role: entry.role,
          avatar_url: entry.avatar_url,
          state: entry.state ?? "online",
          last_active: entry.last_active,
        }));
      setOnlineUsers(flattened);
    });

    const subscribePromise = channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({
        user_id: key,
        name: identity?.name ?? identity?.email ?? "Staff",
        role: identity?.role ?? "team",
        avatar_url: identity?.avatar_url ?? null,
        state: "online",
        last_active: new Date().toISOString(),
      });
    });

    const heartbeat = setInterval(() => {
      void channel.track({
        user_id: key,
        state: "online",
        last_active: new Date().toISOString(),
      });
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      void subscribePromise;
      supabase.removeChannel(channel);
    };
  }, [key, supabase, identity?.name, identity?.email, identity?.role, identity?.avatar_url]);

  return { onlineUsers };
}
