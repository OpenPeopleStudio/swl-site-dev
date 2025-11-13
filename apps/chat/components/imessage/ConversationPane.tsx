"use client";

import { AnimatePresence } from "framer-motion";
import type { ChatMessageRecord } from "@/apps/chat/types";
import MessageBubble from "./MessageBubble";

type ConversationPaneProps = {
  messages: ChatMessageRecord[];
  currentUserId?: string;
  contacts?: Array<{ id: string; name: string }>;
  onQuickSelect?: (contactId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, initial: string | null) => void;
  onDelete: (messageId: string) => void;
  onPreviewMedia: (url: string) => void;
};

export function ConversationPane({
  messages,
  currentUserId,
  contacts = [],
  onQuickSelect,
  onToggleReaction,
  onEdit,
  onDelete,
  onPreviewMedia,
}: ConversationPaneProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-5 shadow-[inset_0_1px_25px_rgba(255,255,255,0.05)] backdrop-blur">
      <div className="flex flex-wrap gap-2 text-xs text-white/60">
        {contacts.slice(0, 4).map((contact) => (
          <button
            key={contact.id}
            type="button"
            onClick={() => onQuickSelect?.(contact.id)}
            className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {contact.name}
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMine={message.user_id === currentUserId}
            currentUserId={currentUserId}
            onToggleReaction={onToggleReaction}
            onEdit={onEdit}
            onDelete={onDelete}
            onPreviewMedia={onPreviewMedia}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ConversationPane;
