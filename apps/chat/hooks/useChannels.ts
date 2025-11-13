"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { looksLikeUuid, resolveChannelId } from "@/lib/getChannelId";

const DEFAULT_CHANNEL_IDENTIFIER =
  process.env.NEXT_PUBLIC_CHAT_CHANNEL_ID?.trim() || "global-chat";
const DEFAULT_CHANNEL_LABEL =
  process.env.NEXT_PUBLIC_CHAT_CHANNEL_NAME?.trim() || "Global Chat";
const LOCAL_FALLBACK_CHANNEL_ID = "00000000-0000-4000-8000-000000000001";

function isMissingRelation(error?: PostgrestError | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    Boolean(error.message && /does not exist/i.test(error.message))
  );
}

export type ChatChannel = {
  id: string;
  name: string;
  type: string;
};

type ChannelMemberRow = {
  channel_id: string;
  channels:
    | null
    | {
        id: string;
        name?: string | null;
        type?: string | null;
      }
    | Array<{
        id: string;
        name?: string | null;
        type?: string | null;
      }>;
};

export function useChannels(userId?: string | null) {
  const supabase = supabaseBrowser;
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    startTransition(() => setLoading(true));
    setError(null);
    const map = new Map<string, ChatChannel>();

    if (userId) {
      const { data, error: memberError } = await supabase
        .from("channel_members")
        .select("channel_id, channels(id,name,type)")
        .eq("user_id", userId);

      if (memberError && !isMissingRelation(memberError)) {
        startTransition(() => setError(memberError.message));
      }

      (data ?? []).forEach((row: ChannelMemberRow) => {
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
    }

    if (![...map.values()].some((c) => c.type === "global")) {
      const { data: globalData, error: globalError } = await supabase
        .from("channels")
        .select("id,name,type")
        .eq("type", "global")
        .limit(1)
        .maybeSingle();
      if (globalError && !isMissingRelation(globalError)) {
        startTransition(() => setError(globalError.message));
      }
      if (globalData) {
        map.set(globalData.id, {
          id: globalData.id,
          name: globalData.name ?? "Global",
          type: globalData.type ?? "global",
        });
      }
    }

    if (map.size === 0) {
      if (DEFAULT_CHANNEL_IDENTIFIER) {
        try {
          const resolvedId = looksLikeUuid(DEFAULT_CHANNEL_IDENTIFIER)
            ? DEFAULT_CHANNEL_IDENTIFIER
            : await resolveChannelId(DEFAULT_CHANNEL_IDENTIFIER);
          if (resolvedId) {
            map.set(resolvedId, {
              id: resolvedId,
              name: DEFAULT_CHANNEL_LABEL,
              type: "global",
            });
          }
        } catch (fallbackError) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[chat] Unable to resolve default channel identifier",
              fallbackError,
            );
          }
        }
      }

      if (map.size === 0) {
        map.set(LOCAL_FALLBACK_CHANNEL_ID, {
          id: LOCAL_FALLBACK_CHANNEL_ID,
          name: DEFAULT_CHANNEL_LABEL,
          type: "global",
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
