"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RealtimePostgresDeletePayload,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { Card } from "@/shared/ui/Card";
import { MessageList } from "./components/MessageList";
import { RichMessageInput } from "./components/RichMessageInput";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveChannelId } from "@/lib/getChannelId";
import type { ChatMessageRecord, ReactionRecord } from "./types";
import { MediaModal } from "./components/MediaModal";

const FALLBACK_CHANNEL_IDENTIFIER = "global-chat";
const FALLBACK_USER_ID = "local-user";
const FALLBACK_USER_NAME = "Staff";
const FALLBACK_BOT_ID = "bot-user";

const SUMMARY_BULLETS = 6;

type StaffRow = { full_name?: string | null; avatar_url?: string | null; role?: string | null };

type SupabaseMessageRow = {
  id: string;
  content: string | null;
  image_url?: string | null;
  gif_url?: string | null;
  user_id: string;
  channel_id?: string | null;
  parent_id?: string | null;
  created_at: string;
  staff?: StaffRow | StaffRow[] | null;
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
  const [replyTarget, setReplyTarget] = useState<ChatMessageRecord | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const supabase = supabaseBrowser;
  const [channelUuid, setChannelUuid] = useState<string | null>(null);
  const [channelUuidIdentifier, setChannelUuidIdentifier] = useState<
    string | null
  >(null);
  const [channelResolveError, setChannelResolveError] = useState<
    string | null
  >(null);

  const channelIdentifier =
    process.env.NEXT_PUBLIC_CHAT_CHANNEL_ID ?? FALLBACK_CHANNEL_IDENTIFIER;
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
  const pendingEmotionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    resolveChannelId(channelIdentifier)
      .then((id) => {
        if (!active) return;
        setChannelUuidIdentifier(channelIdentifier);
        setChannelUuid(id);
        setChannelResolveError(null);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : "Unable to resolve chat channel.";
        setChannelUuidIdentifier(channelIdentifier);
        setChannelUuid(null);
        setChannelResolveError(message);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channelIdentifier]);

  const classifyMessageEmotion = useCallback(
    async (message: ChatMessageRecord) => {
      if (!message.content) return;
      if (pendingEmotionRef.current.has(message.id)) return;
      pendingEmotionRef.current.add(message.id);
      try {
        const response = await fetch("/api/chat/emotion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.content }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          label?: string;
          confidence?: number;
        };
        if (payload.label) {
          await supabase
            .from("messages")
            .update({
              emotion_label: payload.label,
              emotion_confidence: payload.confidence ?? null,
            })
            .eq("id", message.id);
        }
      } catch (error) {
        console.error("Emotion classify failed", error);
      } finally {
        pendingEmotionRef.current.delete(message.id);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (
      !channelUuid ||
      channelUuidIdentifier !== channelIdentifier
    )
      return undefined;
    let isMounted = true;

    const normalizeMessage = (
      message: SupabaseMessageRow,
    ): ChatMessageRecord => ({
      ...message,
      content: message.content ?? null,
      image_url: message.image_url ?? null,
      gif_url: message.gif_url ?? null,
      parent_id: message.parent_id ?? null,
      emotion_label: inferEmotion(message.content),
      staff: Array.isArray(message.staff)
        ? message.staff[0] ?? null
        : message.staff ?? null,
      reactions: Array.isArray(message?.reactions) ? message.reactions : [],
    });

    async function hydrate() {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, image_url, gif_url, user_id, channel_id, created_at, staff:staff(full_name, avatar_url, role), reactions(id, emoji, user_id, message_id)",
        )
        .eq("channel_id", channelUuid)
        .order("created_at", { ascending: true });

      if (!isMounted) return;
      if (!error) {
        const normalized = (data ?? []).map(normalizeMessage);
        setMessages(normalized);
        normalized.forEach((message: ChatMessageRecord) => {
          if (!message.emotion_label && message.content) {
            void classifyMessageEmotion(message);
          }
        });
      }
      setIsLoading(false);
    }

    hydrate();

    const messageChannel = supabase
      .channel(`public:messages:${channelUuid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelUuid}`,
        },
        async (
          payload: RealtimePostgresInsertPayload<SupabaseMessageRow>,
        ) => {
          const insertedId = (payload.new as { id?: string })?.id;
          if (!insertedId) return;

          const { data } = await supabase
            .from("messages")
            .select(
              "id, content, image_url, gif_url, user_id, channel_id, created_at, staff:staff(full_name, avatar_url, role), reactions(id, emoji, user_id, message_id)",
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
          if (!normalized.emotion_label && normalized.content) {
            void classifyMessageEmotion(normalized);
          }
        },
      )
      .subscribe();

    const reactionChannel = supabase
      .channel("public:reactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload: RealtimePostgresInsertPayload<ReactionRecord>) => {
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
        (payload: RealtimePostgresDeletePayload<ReactionRecord>) => {
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
      .channel(`chat-typing:${channelIdentifier}`)
      .on(
        "broadcast",
        { event: "typing" },
        (payload: { payload: { userId: string; name: string; typing: boolean } }) => {
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
  }, [
    channelUuid,
    channelUuidIdentifier,
    channelIdentifier,
    supabase,
    classifyMessageEmotion,
  ]);

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
    if (
      recent.length === 0 ||
      !channelUuid ||
      channelUuidIdentifier !== channelIdentifier
    )
      return;
    const payload = recent.map((message) => ({
      author: message.staff?.full_name ?? "Staff",
      content:
        message.content ??
        (message.image_url || message.gif_url ? "[media]" : ""),
    }));

    try {
      const response = await fetch("/api/chat/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      if (!response.ok) throw new Error("Recap failed");
      const data = (await response.json()) as { summary?: string };
      await supabase.from("messages").insert({
        content: data.summary ?? "Recap unavailable.",
        channel_id: channelUuid,
        user_id: botUserId,
      });
    } catch (error) {
      console.error("Recap request failed", error);
    }
  }

  const activeChannelError =
    channelUuidIdentifier === channelIdentifier ? channelResolveError : null;

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
              Connected to Supabase Realtime · Channel{" "}
              {(channelUuid ?? channelIdentifier).slice(0, 8)}
            </p>
          </header>

          <div className="flex flex-1 flex-col px-6 py-4">
            {activeChannelError ? (
              <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {activeChannelError}
              </div>
            ) : (
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                isLoading={isLoading}
                typingUsers={typingUsers}
                onToggleReaction={handleToggleReaction}
                onReply={(message) => setReplyTarget(message)}
                onMediaSelect={(url) => setActiveMedia(url)}
              />
            )}
            <RichMessageInput
              channelId={
                channelUuidIdentifier === channelIdentifier
                  ? channelUuid
                  : null
              }
              userId={currentUserId}
              onRecapRequest={handleRecapRequest}
              onTypingSignal={handleTypingSignal}
              replyTo={
                replyTarget
                  ? {
                      id: replyTarget.id,
                      content: replyTarget.content,
                      author: replyTarget.staff?.full_name ?? "Staff",
                    }
                  : null
              }
              onCancelReply={() => setReplyTarget(null)}
            />
          </div>
        </Card>
      </div>
      <MediaModal
        url={activeMedia}
        isOpen={Boolean(activeMedia)}
        onClose={() => setActiveMedia(null)}
      />
    </main>
  );
}
