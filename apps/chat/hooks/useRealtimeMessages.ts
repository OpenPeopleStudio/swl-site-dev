"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import type {
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type {
  ChatMessageRecord,
  ReactionRecord,
  StaffProfile,
} from "@/apps/chat/types";

export type ChatUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type SupabaseMessageRow = {
  id: string;
  content: string | null;
  image_url: string | null;
  gif_url: string | null;
  user_id: string;
  channel_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  deleted: boolean | null;
  deleted_at: string | null;
  staff?: StaffProfile | StaffProfile[] | null;
  reactions?: ReactionRecord[] | null;
};

type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
};

type SendPayload = {
  content?: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
};

function normalizeMessage(row: SupabaseMessageRow): ChatMessageRecord {
  const staffRecord = Array.isArray(row.staff)
    ? row.staff[0]
    : row.staff ?? null;
  return {
    id: row.id,
    content: row.content ?? null,
    image_url: row.image_url ?? null,
    gif_url: row.gif_url ?? null,
    user_id: row.user_id,
    channel_id: row.channel_id ?? null,
    parent_id: row.parent_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    edited_at: row.edited_at ?? null,
    deleted: row.deleted ?? false,
    deleted_at: row.deleted_at ?? null,
    staff: staffRecord
      ? {
          id: staffRecord.id,
          full_name: staffRecord.full_name,
          avatar_url: staffRecord.avatar_url,
          role: staffRecord.role,
        }
      : null,
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
  };
}

export function useRealtimeMessages(
  channelId: string | null,
  currentUserId: string | null,
) {
  const supabase = supabaseBrowser;
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessageById = useCallback(
    async (id: string) => {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select(
          "id, content, image_url, gif_url, user_id, channel_id, parent_id, created_at, updated_at, edited_at, deleted, deleted_at, staff:staff(id, full_name, avatar_url, role), reactions:message_reactions(id, message_id, user_id, reaction_type)",
        )
        .eq("id", id)
        .maybeSingle();
      if (fetchError || !data) return null;
      return normalizeMessage(data as SupabaseMessageRow);
    },
    [supabase],
  );

  useEffect(() => {
    if (!channelId) {
      startTransition(() => {
        setMessages([]);
        setLoading(false);
      });
      return undefined;
    }
    let isActive = true;
    startTransition(() => setLoading(true));
    startTransition(() => setError(null));

    supabase
      .from("messages")
      .select(
        "id, content, image_url, gif_url, user_id, channel_id, parent_id, created_at, updated_at, edited_at, deleted, deleted_at, staff:staff(id, full_name, avatar_url, role), reactions:message_reactions(id, message_id, user_id, reaction_type)",
      )
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data, error: fetchError }) => {
        if (!isActive) return;
        if (fetchError) {
          startTransition(() => setError(fetchError.message));
        } else {
          startTransition(() => {
            setMessages((data ?? []).map(normalizeMessage));
            setError(null);
          });
        }
        startTransition(() => setLoading(false));
      });

    const messageChannel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (
          payload: RealtimePostgresInsertPayload<SupabaseMessageRow>,
        ) => {
          const fresh = await fetchMessageById(payload.new.id);
          if (!fresh) return;
          startTransition(() => {
            setMessages((prev) => {
              const next = [...prev, fresh];
              next.sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              );
              return next;
            });
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (
          payload: RealtimePostgresUpdatePayload<SupabaseMessageRow>,
        ) => {
          const fresh = await fetchMessageById(payload.new.id);
          if (!fresh) return;
          startTransition(() => {
            setMessages((prev) =>
              prev.map((message) => (message.id === fresh.id ? fresh : message)),
            );
          });
        },
      )
      .subscribe();

  const reactionChannel = supabase
      .channel(`message-reactions:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (
          payload:
            | RealtimePostgresInsertPayload<ReactionRow>
            | RealtimePostgresUpdatePayload<ReactionRow>
            | RealtimePostgresDeletePayload<ReactionRow>,
        ) => {
          const eventType = payload.eventType;
          let reaction: ReactionRow | null = null;
          if (eventType === "DELETE") {
            reaction = (payload as RealtimePostgresDeletePayload<ReactionRow>)
              .old as ReactionRow;
          } else {
            reaction = (payload as RealtimePostgresInsertPayload<ReactionRow>)
              .new as ReactionRow;
          }
          if (!reaction?.message_id) return;
          startTransition(() => {
            setMessages((prev) =>
              prev.map((message) => {
                if (message.id !== reaction!.message_id) return message;
                const reactions = message.reactions ?? [];
                if (eventType === "DELETE") {
                  return {
                    ...message,
                    reactions: reactions.filter((r) => r.id !== reaction!.id),
                  };
                }
                const filtered = reactions.filter((r) => r.id !== reaction!.id);
                return { ...message, reactions: [...filtered, reaction!] };
              }),
            );
          });
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionChannel);
    };
  }, [channelId, supabase, fetchMessageById]);

  const sendMessage = useCallback(
    async ({ content, imageUrl, gifUrl }: SendPayload) => {
      if (!currentUserId) {
        throw new Error("Login required.");
      }
      if (!channelId) {
        throw new Error("Select a channel.");
      }
      if (!content?.trim() && !imageUrl && !gifUrl) return;
      const { error: insertError } = await supabase.from("messages").insert({
        user_id: currentUserId,
        content: content?.trim() ?? null,
        image_url: imageUrl ?? null,
        gif_url: gifUrl ?? null,
        channel_id: channelId,
      });
      if (insertError) {
        throw new Error(insertError.message);
      }
    },
    [channelId, currentUserId, supabase],
  );

  const editMessage = useCallback(
    async (messageId: string, updated: string) => {
      if (!currentUserId) throw new Error("Login required.");
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content: updated,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", currentUserId);
      if (updateError) throw new Error(updateError.message);
    },
    [currentUserId, supabase],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentUserId) throw new Error("Login required.");
      const { error: deleteError } = await supabase
        .from("messages")
        .update({
          deleted: true,
          deleted_at: new Date().toISOString(),
          content: null,
          image_url: null,
          gif_url: null,
        })
        .eq("id", messageId)
        .eq("user_id", currentUserId);
      if (deleteError) throw new Error(deleteError.message);
    },
    [currentUserId, supabase],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) throw new Error("Login required.");
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("reaction_type", emoji)
        .maybeSingle();
      if (existing?.id) {
        const { error: removeError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
        if (removeError) throw new Error(removeError.message);
        return;
      }
      const { error: insertError } = await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: emoji,
        });
      if (insertError) throw new Error(insertError.message);
    },
    [currentUserId, supabase],
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  };
}
