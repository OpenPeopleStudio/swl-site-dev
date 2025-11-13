"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ChannelSelector } from "@/apps/chat/components/ChannelSelector";
import { StaffDrawer } from "@/apps/chat/components/StaffDrawer";
import { MessageFeed } from "@/apps/chat/components/MessageFeed";
import { ChatComposer } from "@/apps/chat/components/ChatComposer";
import MediaModal from "@/apps/chat/components/MediaModal";
import { useChannels } from "@/apps/chat/hooks/useChannels";
import {
  useRealtimeMessages,
  type ChatUser,
} from "@/apps/chat/hooks/useRealtimeMessages";
import { getOrCreateDirectChannel } from "@/apps/chat/hooks/useDirectMessage";

type ChatContainerProps = {
  variant?: "page" | "overlay";
};

export function ChatContainer({ variant = "page" }: ChatContainerProps) {
  const supabase = supabaseBrowser;
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    supabase.auth.getUser().then(({ data }) => {
      if (ignore) return;
      const raw = data?.user;
      if (!raw) {
        setCurrentUser(null);
        return;
      }
      setCurrentUser({
        id: raw.id,
        email: raw.email,
        full_name: raw.user_metadata?.full_name ?? null,
        avatar_url: raw.user_metadata?.avatar_url ?? null,
        role: raw.user_metadata?.role ?? null,
      });
    });
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const userId = currentUser?.id ?? null;

  const {
    channels,
    loading: channelsLoading,
    error: channelsError,
    refresh: refreshChannels,
  } = useChannels(userId);

  useEffect(() => {
    if (!channels.length) return;
    if (activeChannelId) return;
    const preferred =
      channels.find((channel) => channel.type === "global") ?? channels[0];
    startTransition(() => {
      setActiveChannelId(preferred.id);
    });
  }, [channels, activeChannelId]);

  const {
    messages,
    loading: messagesLoading,
    error: messageError,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  } = useRealtimeMessages(activeChannelId, userId);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId),
    [channels, activeChannelId],
  );

  const handleStaffSelect = useCallback(
    async (staff: { id: string; full_name?: string | null }) => {
      if (!userId) return;
      try {
        setActionError(null);
        const channelId = await getOrCreateDirectChannel(
          userId,
          staff.id,
          staff.full_name,
        );
        await refreshChannels();
        setActiveChannelId(channelId);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Unable to open chat.",
        );
      }
    },
    [userId, refreshChannels],
  );

  const handleSend = useCallback(
    async (payload: { content?: string; imageUrl?: string | null; gifUrl?: string | null }) => {
      if (!activeChannelId) {
        setActionError("Select a channel before sending messages.");
        return;
      }
      try {
        setActionError(null);
        await sendMessage(payload);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Unable to send message.",
        );
      }
    },
    [activeChannelId, sendMessage],
  );

  const containerClasses =
    variant === "overlay"
      ? "h-full w-full rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-4 text-white shadow-[0_25px_90px_rgba(0,0,0,0.65)]"
      : "rounded-[40px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 text-white shadow-[0_60px_140px_rgba(0,0,0,0.6)]";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-6">
        <div className="space-y-3">
          <ChannelSelector
            channels={channels}
            loading={channelsLoading}
            activeChannelId={activeChannelId}
            onSelect={(id) => setActiveChannelId(id)}
          />
          <div className="flex justify-end">
        <StaffDrawer currentUserId={userId} onSelect={handleStaffSelect} />
          </div>
          {channelsError && (
            <p className="text-sm text-red-300">{channelsError}</p>
          )}
          {actionError && (
            <p className="text-sm text-red-300">{actionError}</p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
            <span>{activeChannel?.type === "direct" ? "Direct" : "Channel"}</span>
            <span>{activeChannel?.name ?? "Select a channel"}</span>
          </div>
        </div>

        <MessageFeed
          messages={messages}
          loading={messagesLoading}
          currentUserId={userId ?? undefined}
          onToggleReaction={toggleReaction}
          onEdit={(messageId, initial) => {
            const next = window.prompt("Edit message", initial ?? "");
            if (next === null || !next.trim()) return;
            void editMessage(messageId, next.trim());
          }}
          onDelete={(messageId) => {
            if (window.confirm("Delete this message for everyone?")) {
              void deleteMessage(messageId);
            }
          }}
          onPreviewMedia={(url) => setActiveMedia(url)}
        />

        <ChatComposer onSend={handleSend} />
      </div>

      <MediaModal
        url={activeMedia}
        isOpen={Boolean(activeMedia)}
        onClose={() => setActiveMedia(null)}
      />
      {messageError && (
        <p className="mt-3 text-center text-sm text-red-300">{messageError}</p>
      )}
    </div>
  );
}

export default ChatContainer;
