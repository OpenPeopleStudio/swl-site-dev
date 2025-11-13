"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessageRecord } from "@/apps/chat/types";
import { MessageBubble } from "@/apps/chat/components/MessageBubble";

type MessageFeedProps = {
  messages: ChatMessageRecord[];
  currentUserId?: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, initial: string | null) => void;
  onDelete: (messageId: string) => void;
  onPreviewMedia: (url: string) => void;
  loading?: boolean;
};

export function MessageFeed({
  messages,
  currentUserId,
  onToggleReaction,
  onEdit,
  onDelete,
  onPreviewMedia,
  loading = false,
}: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto rounded-[24px] border border-white/5 bg-white/5 p-5 backdrop-blur-[12px]"
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-white/50">
          Loading chat…
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-sm text-white/60">
          <div>
            <p className="text-lg font-light text-white">Cortex Chat v2</p>
            <p className="mt-2 text-white/70">
              No messages yet. Start the thread below.
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <motion.ul className="flex flex-col gap-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onToggleReaction={onToggleReaction}
                onEdit={onEdit}
                onDelete={onDelete}
                onPreviewMedia={onPreviewMedia}
              />
            ))}
          </motion.ul>
        </AnimatePresence>
      )}
    </div>
  );
}
