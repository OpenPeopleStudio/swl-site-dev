"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { ChatMessageRecord, ReactionRecord, StaffProfile } from "@/apps/chat/types";
import { resolveChannelId } from "@/lib/getChannelId";

const MESSAGE_SELECT =
  "id, content, image_url, gif_url, user_id, channel_id, parent_id, created_at, updated_at, edited_at, deleted, deleted_at, staff:staff(id, full_name, avatar_url, role), reactions:message_reactions(id, message_id, user_id, reaction_type)";

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

type InsertMessagePayload = {
  user_id: string;
  content: string | null;
  image_url: string | null;
  gif_url: string | null;
  channel_id: string;
};

type SendPayload = {
  content?: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
};

export type ChatUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

function normalizeMessage(row: SupabaseMessageRow): ChatMessageRecord {
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
    staff: row.staff
      ? ({
          id: row.staff.id,
          full_name: row.staff.full_name,
          avatar_url: row.staff.avatar_url,
          role: row.staff.role,
        } as StaffProfile)
      : null,
    reactions: Array.isArray(row.reactions)
      ? (row.reactions as ReactionRecord[])
      : [],
  };
}

export function useRealtimeChat(channelIdentifier?: string) {
  const supabase = supabaseBrowser;
  const [user, setUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedChannel, setResolvedChannel] = useState<string | null>(null);
  const [channelLookup, setChannelLookup] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);

  const identifier =
    channelIdentifier ?? process.env.NEXT_PUBLIC_CHAT_CHANNEL_ID ?? "global-chat";

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!active) return;
      if (authError) {
        setError(authError.message);
        return;
      }
      const rawUser = data?.user ?? null;
      if (!rawUser) {
        setUser(null);
        return;
      }
      const profile = await supabase
        .from("staff")
        .select("full_name, avatar_url, role")
        .eq("id", rawUser.id)
        .maybeSingle();
      setUser({
        id: rawUser.id,
        email: rawUser.email,
        full_name: profile.data?.full_name ?? rawUser.user_metadata?.full_name ?? null,
        avatar_url: profile.data?.avatar_url ?? rawUser.user_metadata?.avatar_url ?? null,
        role: profile.data?.role ?? rawUser.user_metadata?.role ?? null,
      });
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data }) => {
        const raw = data?.user;
        if (!raw) {
          setUser(null);
          return;
        }
        setUser((prev) => ({
          id: raw.id,
          email: raw.email,
          full_name: prev?.full_name ?? raw.user_metadata?.full_name ?? null,
          avatar_url: prev?.avatar_url ?? raw.user_metadata?.avatar_url ?? null,
          role: prev?.role ?? raw.user_metadata?.role ?? null,
        }));
      });
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    resolveChannelId(identifier)
      .then((id) => {
        if (!active) return;
        setResolvedChannel(id);
        setChannelLookup(identifier);
        setChannelError(null);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Unable to resolve chat channel.";
        setResolvedChannel(null);
        setChannelLookup(identifier);
        setChannelError(message);
        setError(message);
      });
    return () => {
      active = false;
    };
  }, [identifier]);

  const fetchMessageById = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return normalizeMessage(data);
    },
    [supabase],
  );

  useEffect(() => {
    if (!resolvedChannel || channelLookup !== identifier) return undefined;
    let isMounted = true;
    startTransition(() => {
      setLoading(true);
    });
    supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("channel_id", resolvedChannel)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (!isMounted) return;
        if (!isMounted) return;
        if (queryError) {
          setError(queryError.message);
        } else {
          const normalized = (data ?? []).map(normalizeMessage);
          setMessages(normalized);
          setError(null);
        }
        startTransition(() => {
          setLoading(false);
        });
      });

    const channel = supabase
      .channel(`chat:${resolvedChannel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: RealtimePostgresInsertPayload<SupabaseMessageRow>) => {
          const fresh = await fetchMessageById(payload.new.id);
          if (!fresh) return;
          setMessages((prev) => {
            const next = [...prev, fresh];
            next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        async (payload: RealtimePostgresUpdatePayload<SupabaseMessageRow>) => {
          const fresh = await fetchMessageById(payload.new.id);
          if (!fresh) return;
          setMessages((prev) =>
            prev.map((message) => (message.id === fresh.id ? fresh : message)),
          );
        },
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`chat:reactions:${resolvedChannel}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        async (
          payload:
            | RealtimePostgresInsertPayload<ReactionRow>
            | RealtimePostgresUpdatePayload<ReactionRow>,
        ) => {
          const messageId = payload.new?.message_id ?? payload.old?.message_id;
          if (!messageId) return;
          const fresh = await fetchMessageById(messageId);
          if (!fresh) return;
          setMessages((prev) =>
            prev.map((message) => (message.id === messageId ? fresh : message)),
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionChannel);
    };
  }, [channelLookup, identifier, resolvedChannel, supabase, fetchMessageById]);
  const readyChannel = channelLookup === identifier ? resolvedChannel : null;

  const sendMessage = useCallback(
    async ({ content, imageUrl, gifUrl }: SendPayload) => {
      if (!user?.id) throw new Error("Login required to chat.");
      if (!readyChannel) throw new Error("Chat channel not ready.");
      if (
        !content?.trim() &&
        !imageUrl &&
        !gifUrl
      ) {
        return;
      }
      const payload: InsertMessagePayload = {
        user_id: user.id,
        content: content?.trim() ?? null,
        image_url: imageUrl ?? null,
        gif_url: gifUrl ?? null,
        channel_id: readyChannel,
      };
      const { error: insertError } = await supabase
        .from("messages")
        .insert(payload);
      if (insertError) {
        throw new Error(insertError.message);
      }
    },
    [readyChannel, supabase, user],
  );

  const editMessage = useCallback(
    async (messageId: string, updated: string) => {
      if (!user?.id) throw new Error("Login required to edit messages.");
      const { error: updateError } = await supabase
        .from("messages")
        .update({
          content: updated,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    },
    [supabase, user],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id) throw new Error("Login required to delete messages.");
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
        .eq("user_id", user.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    },
    [supabase, user],
  );

  const toggleReaction = useCallback(
    async (messageId: string, reaction = "❤️") => {
      if (!user?.id) throw new Error("Login required to react.");
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("reaction_type", reaction)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
        return;
      }
      const { error: insertError } = await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reaction,
        });
      if (insertError) {
        throw new Error(insertError.message);
      }
    },
    [supabase, user],
  );

  return {
    messages,
    loading,
    error: error ?? channelError,
    user,
    channelId: readyChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  };
}
