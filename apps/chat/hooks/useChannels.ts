"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type ChatChannel = {
  id: string;
  name: string;
  type: string;
};

export function useChannels(userId?: string | null) {
  const supabase = supabaseBrowser;
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!userId) {
      setChannels([]);
      setLoading(false);
      return;
    }
    startTransition(() => setLoading(true));
    setError(null);
    const { data, error: memberError } = await supabase
      .from("channel_members")
      .select("channel_id, channels(id,name,type)")
      .eq("user_id", userId);

    if (memberError) {
      startTransition(() => setError(memberError.message));
      startTransition(() => setLoading(false));
      return;
    }

    const map = new Map<string, ChatChannel>();
    (data ?? []).forEach((row: any) => {
      const channelData = Array.isArray(row.channels)
        ? row.channels[0]
        : row.channels;
      if (!channelData) return;
      map.set(channelData.id, {
        id: channelData.id,
        name: channelData.name ?? "Channel",
        type: channelData.type ?? "direct",
      });
    });

    // Ensure global channel exists even if membership missing
    if (![...map.values()].some((c) => c.type === "global")) {
      const { data: globalData } = await supabase
        .from("channels")
        .select("id,name,type")
        .eq("type", "global")
        .limit(1)
        .maybeSingle();
      if (globalData) {
        map.set(globalData.id, {
          id: globalData.id,
          name: globalData.name ?? "Global",
          type: globalData.type ?? "global",
        });
      }
    }

    startTransition(() => setChannels(Array.from(map.values())));
    startTransition(() => setLoading(false));
  }, [supabase, userId]);

  useEffect(() => {
    startTransition(() => {
      void fetchChannels();
    });
  }, [fetchChannels]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`channel-members:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchChannels();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChannels, supabase, userId]);

  return {
    channels,
    loading,
    error,
    refresh: fetchChannels,
  };
}
