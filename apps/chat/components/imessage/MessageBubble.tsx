"use client";

import { motion } from "framer-motion";
import type { ChatMessageRecord } from "@/apps/chat/types";
import { ReactionBar } from "@/apps/chat/components/ReactionBar";

type MessageBubbleProps = {
  message: ChatMessageRecord;
  isMine: boolean;
  currentUserId?: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, initial: string | null) => void;
  onDelete: (messageId: string) => void;
  onPreviewMedia?: (url: string) => void;
};

export function MessageBubble({
  message,
  isMine,
  currentUserId,
  onToggleReaction,
  onEdit,
  onDelete,
  onPreviewMedia,
}: MessageBubbleProps) {
  const timestamp = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const bubbleClasses = isMine
    ? "bg-white/25 text-white border-white/20 rounded-br-xl"
    : "bg-white/10 text-white/80 border-white/15 rounded-bl-xl";

  const showMedia = (message.image_url || message.gif_url) && !message.deleted;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] space-y-2 ${
          isMine ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`w-full rounded-2xl border px-4 py-3 shadow-[inset_0_1px_12px_rgba(255,255,255,0.15)] backdrop-blur ${bubbleClasses}`}
        >
          {message.deleted ? (
            <p className="text-sm italic text-white/70">Message removed</p>
          ) : (
            <>
              {message.content && (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {message.content}
                </p>
              )}
              {showMedia && (
                <button
                  type="button"
                  className="mt-3 block overflow-hidden rounded-2xl border border-white/10"
                  onClick={() => {
                    const mediaUrl = message.image_url ?? message.gif_url;
                    if (mediaUrl && onPreviewMedia) onPreviewMedia(mediaUrl);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(message.image_url ?? message.gif_url) ?? undefined}
                    alt="Chat attachment"
                    className="max-h-64 w-full object-cover"
                  />
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-white/45">
          <span>{timestamp}</span>
          {message.edited_at && <span>Edited</span>}
          {isMine && !message.deleted && (
            <div className="flex items-center gap-2 text-xs tracking-normal">
              <button
                type="button"
                className="text-white/70 transition hover:text-white"
                onClick={() => onEdit(message.id, message.content ?? "")}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-white/70 transition hover:text-white"
                onClick={() => onDelete(message.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {!message.deleted && (
          <ReactionBar
            messageId={message.id}
            reactions={message.reactions}
            currentUserId={currentUserId}
            onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
          />
        )}
      </div>
    </motion.li>
  );
}

export default MessageBubble;
