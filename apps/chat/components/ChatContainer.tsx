"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Inbox, Users, Image as ImageIcon } from "lucide-react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";
import { ChatComposer } from "@/apps/chat/components/ChatComposer";
import MediaModal from "@/apps/chat/components/MediaModal";
import { useChannels } from "@/apps/chat/hooks/useChannels";
import {
  useRealtimeMessages,
  type ChatUser,
} from "@/apps/chat/hooks/useRealtimeMessages";
import { getOrCreateDirectChannel } from "@/apps/chat/hooks/useDirectMessage";
import { usePresence } from "@/apps/chat/hooks/usePresence";
import {
  InboxList,
  type ThreadSummary,
} from "@/apps/chat/components/imessage/InboxList";
import { GlobalChatBanner } from "@/apps/chat/components/imessage/GlobalChatBanner";
import { ConversationPane } from "@/apps/chat/components/imessage/ConversationPane";
import { UploadButton } from "@/apps/chat/components/UploadButton";

type ChatContainerProps = {
  variant?: "page" | "overlay";
};

export function ChatContainer({ variant = "page" }: ChatContainerProps) {
  const supabase = supabaseBrowser;
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);

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
  const { staff } = usePresence();

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

  const threads = useMemo<ThreadSummary[]>(() => {
    const base = channels.map((channel) => {
      const latest =
        channel.id === activeChannelId && messages.length > 0
          ? messages[messages.length - 1]
          : null;
      return {
        id: channel.id,
        title: channel.name ?? "Conversation",
        lastMessage: latest?.content ?? null,
        updated_at: latest?.created_at ?? null,
        isGlobal: channel.type === "global",
      };
    });

    return base.sort((a, b) => {
      if (a.isGlobal && !b.isGlobal) return -1;
      if (!a.isGlobal && b.isGlobal) return 1;
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [channels, messages, activeChannelId]);

  const contacts = useMemo(
    () =>
      staff
        .filter((person) => person.id !== userId)
        .map((person) => ({
          id: person.id,
          name: person.full_name ?? "Unknown",
          role: person.role ?? undefined,
          avatarUrl: person.avatar_url ?? undefined,
        })),
    [staff, userId],
  );

  const handleStaffSelect = useCallback(
    async (staffId: string) => {
      if (!userId) return;
      const target = staff.find((person) => person.id === staffId);
      if (!target) return;
      try {
        setActionError(null);
        const channelId = await getOrCreateDirectChannel(
          userId,
          target.id,
          target.full_name,
        );
        await refreshChannels();
        setActiveChannelId(channelId);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Unable to open chat.",
        );
      }
    },
    [refreshChannels, staff, userId],
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
      ? "rounded-[24px] border border-white/10 bg-white/5 text-white backdrop-blur-[24px] p-5 shadow-[0_40px_140px_rgba(0,0,0,0.7)]"
      : "rounded-[28px] border border-white/10 bg-white/5 text-white backdrop-blur-[28px] p-6 shadow-[0_60px_160px_rgba(0,0,0,0.75)]";

  const globalThread = threads.find((thread) => thread.isGlobal);
  const regularThreads = threads.filter((thread) => !thread.isGlobal);

  const handleQuickUpload = useCallback(
    async (url: string) => {
      if (!url) return;
      await handleSend({ imageUrl: url });
      setUploaderOpen(false);
    },
    [handleSend],
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">
              Cortex Line
            </p>
            <h2 className="text-2xl font-light text-white">
              {activeChannel?.name ?? "Connecting…"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <HeaderButton
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
              active={inboxOpen}
              onClick={() => {
                setInboxOpen((value) => !value);
                setRecipientsOpen(false);
                setUploaderOpen(false);
              }}
            />
            <HeaderButton
              icon={<Users className="h-4 w-4" />}
              label="People"
              active={recipientsOpen}
              onClick={() => {
                setRecipientsOpen((value) => !value);
                setInboxOpen(false);
                setUploaderOpen(false);
              }}
            />
            <HeaderButton
              icon={<ImageIcon className="h-4 w-4" />}
              label="Media"
              active={uploaderOpen}
              onClick={() => {
                setUploaderOpen((value) => !value);
                setInboxOpen(false);
                setRecipientsOpen(false);
              }}
            />
          </div>
        </header>

        <div className="relative min-h-[360px]">
          {messagesLoading ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm text-white/60">
              Resolving thread…
            </div>
          ) : (
            <ConversationPane
              messages={messages}
              currentUserId={userId ?? undefined}
              contacts={contacts}
              onQuickSelect={(id) => {
                void handleStaffSelect(id);
                setRecipientsOpen(false);
                setInboxOpen(false);
              }}
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
          )}

          {inboxOpen && (
            <FloatingDrawer title="Inbox" onClose={() => setInboxOpen(false)}>
              {channelsLoading ? (
                <p className="text-sm text-white/60">Loading threads…</p>
              ) : (
                <InboxList
                  threads={regularThreads}
                  activeThreadId={activeChannelId}
                  onSelect={(id) => {
                    setActiveChannelId(id);
                    setInboxOpen(false);
                  }}
                  renderPinned={
                    <GlobalChatBanner
                      title={globalThread?.title ?? "Global Chat"}
                      description="Pinned for the entire crew"
                      onOpen={() => {
                        if (globalThread) {
                          setActiveChannelId(globalThread.id);
                          setInboxOpen(false);
                        }
                      }}
                    />
                  }
                />
              )}
            </FloatingDrawer>
          )}

          {recipientsOpen && (
            <FloatingDrawer
              title="Direct Messages"
              onClose={() => setRecipientsOpen(false)}
            >
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      void handleStaffSelect(contact.id);
                      setRecipientsOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs uppercase tracking-[0.3em]">
                      {contact.name.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-white">{contact.name}</p>
                      {contact.role && (
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                          {contact.role}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </FloatingDrawer>
          )}

          {uploaderOpen && (
            <FloatingDrawer
              title="Media Upload"
              onClose={() => setUploaderOpen(false)}
            >
              <p className="mb-3 text-sm text-white/70">
                Drop a photo and we’ll post it straight into this thread.
              </p>
              <UploadButton onUploaded={(url) => void handleQuickUpload(url)} />
            </FloatingDrawer>
          )}
        </div>

        {channelsError && (
          <p className="text-sm text-rose-300">{channelsError}</p>
        )}
        {actionError && (
          <p className="text-sm text-rose-300">{actionError}</p>
        )}

        <ChatComposer onSend={handleSend} />
      </div>

      <MediaModal
        url={activeMedia}
        isOpen={Boolean(activeMedia)}
        onClose={() => setActiveMedia(null)}
      />
      {messageError && (
        <p className="pt-4 text-center text-sm text-rose-300">{messageError}</p>
      )}
    </div>
  );
}

type DrawerProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function FloatingDrawer({ title, onClose, children }: DrawerProps) {
  return (
    <div className="absolute inset-0 z-20 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/10"
      >
        <span className="sr-only">Close drawer</span>
      </button>
      <div className="relative z-10 w-full max-w-xs rounded-[28px] border border-white/10 bg-[#04050c]/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/50">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:border-white/40 hover:text-white"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type HeaderButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function HeaderButton({ icon, label, active, onClick }: HeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
        active
          ? "border-white/60 bg-white/15 text-white"
          : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default ChatContainer;
