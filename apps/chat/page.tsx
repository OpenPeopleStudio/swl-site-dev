"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { ChatMessageRecord, ReactionRecord } from "./types";

const FALLBACK_CHANNEL_ID = "00000000-0000-0000-0000-000000000000";
const FALLBACK_USER_ID = "local-user";
const FALLBACK_USER_NAME = "Staff";
const FALLBACK_BOT_ID = "bot-user";

const SUMMARY_BULLETS = 6;

type SupabaseMessageRow = {
  id: string;
  content: string | null;
  image_url?: string | null;
  gif_url?: string | null;
  user_id: string;
  channel_id?: string | null;
  created_at: string;
  users?: { full_name?: string | null; avatar_url?: string | null }[] | null;
  reactions?: ReactionRecord[] | null;
};

const emotionKeywords: Record<string, string[]> = {
  Urgent: ["urgent", "asap", "rush", "now", "immediately"],
  Positive: ["great", "thanks", "awesome", "love"],
  Concern: ["issue", "problem", "concern", "delay"],
  Calm: ["noted", "ok", "steady"],
};

function inferEmotion(content?: string | null) {
  if (!content) return undefined;
  const lower = content.toLowerCase();
  for (const [label, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some((word) => lower.includes(word))) return label;
  }
  return undefined;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const channelId =
    process.env.NEXT_PUBLIC_CHAT_CHANNEL_ID ?? FALLBACK_CHANNEL_ID;
  const currentUserId =
    process.env.NEXT_PUBLIC_CHAT_USER_ID ?? FALLBACK_USER_ID;
  const currentUserName =
    process.env.NEXT_PUBLIC_CHAT_USER_NAME ?? FALLBACK_USER_NAME;
  const botUserId =
    process.env.NEXT_PUBLIC_CHAT_BOT_USER_ID ?? FALLBACK_BOT_ID;

  const typingMapRef = useRef<Map<string, string>>(new Map());
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const normalizeMessage = (message: SupabaseMessageRow): ChatMessageRecord => ({
      ...message,
      content: message.content ?? null,
      image_url: message.image_url ?? null,
      gif_url: message.gif_url ?? null,
      emotion_label: inferEmotion(message.content),
      users: Array.isArray(message?.users)
        ? message.users[0] ?? null
        : message.users ?? null,
      reactions: Array.isArray(message?.reactions) ? message.reactions : [],
    });

    async function hydrate() {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, image_url, gif_url, user_id, channel_id, created_at, users(full_name, avatar_url), reactions(id, emoji, user_id, message_id)",
        )
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (!isMounted) return;
      if (!error) {
        const normalized = (data ?? []).map(normalizeMessage);
        setMessages(normalized);
      }
      setIsLoading(false);
    }

    hydrate();

    const messageChannel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const insertedId = (payload.new as { id?: string })?.id;
          if (!insertedId) return;

          const { data } = await supabase
            .from("messages")
            .select(
              "id, content, image_url, gif_url, user_id, channel_id, created_at, users(full_name, avatar_url), reactions(id, emoji, user_id, message_id)",
            )
            .eq("id", insertedId)
            .maybeSingle();

          if (!data) return;
          const normalized = normalizeMessage(data);

          setMessages((prev) => {
            if (prev.some((message) => message.id === normalized.id)) {
              return prev;
            }
            return [...prev, normalized];
          });
        },
      )
      .subscribe();

    const reactionChannel = supabase
      .channel("public:reactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const reaction = payload.new as ReactionRecord;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === reaction.message_id
                ? {
                    ...message,
                    reactions: [...(message.reactions ?? []), reaction],
                  }
                : message,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          const reaction = payload.old as ReactionRecord;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === reaction.message_id
                ? {
                    ...message,
                    reactions: (message.reactions ?? []).filter(
                      (item) => item.id !== reaction.id,
                    ),
                  }
                : message,
            ),
          );
        },
      )
      .subscribe();

    const typingChannel = supabase
      .channel("chat-typing")
      .on(
        "broadcast",
        { event: "typing" },
        (payload) => {
          const { userId, name, typing } = payload.payload as {
            userId: string;
            name: string;
            typing: boolean;
          };
          if (!userId) return;
          setTypingUsers(() => {
            const map = new Map(typingMapRef.current);
            if (typing) {
              map.set(userId, name);
            } else {
              map.delete(userId);
            }
            typingMapRef.current = map;
            return Array.from(map.values());
          });
        },
      )
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      isMounted = false;
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionChannel);
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, [channelId, supabase]);

  function handleTypingSignal(isTyping: boolean) {
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, name: currentUserName, typing: isTyping },
    });
  }

  async function handleToggleReaction(emoji: string, messageId: string) {
    const target = messages.find((message) => message.id === messageId);
    if (!target) return;
    const existing = target.reactions?.find(
      (reaction) =>
        reaction.user_id === currentUserId && reaction.emoji === emoji,
    );

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({
        emoji,
        message_id: messageId,
        user_id: currentUserId,
      });
    }
  }

  async function handleRecapRequest() {
    const recent = messages.slice(-SUMMARY_BULLETS);
    if (recent.length === 0) return;
    const summary = recent
      .map((message) => {
        const name = message.users?.full_name ?? "Staff";
        return `• ${name}: ${message.content ?? "[media]"}`;
      })
      .join("\n");

    await supabase.from("messages").insert({
      content: `Service Recap:\n${summary}`,
      channel_id: channelId,
      user_id: botUserId,
    });
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto flex h-[90vh] max-w-3xl flex-col">
        <Card className="flex h-full flex-col bg-black/60 p-0 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
          <header className="border-b border-white/5 px-6 py-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              Cortex Staff
            </p>
            <h1 className="text-2xl font-light">Mission Thread</h1>
            <p className="text-sm text-white/50">
              Connected to Supabase Realtime · Channel {channelId.slice(0, 8)}
            </p>
          </header>

          <div className="flex flex-1 flex-col px-6 py-4">
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              isLoading={isLoading}
              typingUsers={typingUsers}
              onToggleReaction={handleToggleReaction}
            />
            <MessageInput
              channelId={channelId}
              userId={currentUserId}
              onRecapRequest={handleRecapRequest}
              onTypingSignal={handleTypingSignal}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
