"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ChatMessageRecord } from "@/apps/chat/types";
import { ReactionBar } from "@/apps/chat/components/ReactionBar";

type MessageBubbleProps = {
  message: ChatMessageRecord;
  currentUserId?: string;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, initial: string | null) => void;
  onDelete: (messageId: string) => void;
  onPreviewMedia?: (url: string) => void;
};

const bubbleMotion = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export function MessageBubble({
  message,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
  onPreviewMedia,
}: MessageBubbleProps) {
  const isMine = message.user_id === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);

  const timestamp = useMemo(() => {
    const date = new Date(message.created_at);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.created_at]);

  const displayName =
    message.staff?.full_name ??
    (isMine ? "You" : message.staff?.role ?? "Unknown");

  const bubbleClass = isMine
    ? "bg-gradient-to-br from-blue-500/80 to-violet-600/80 text-white border-white/20 shadow-[0_20px_60px_rgba(56,189,248,0.35)]"
    : "bg-white/10 text-white border-white/15";

  const showContent = Boolean(message.content) && !message.deleted;
  const showMedia = (message.image_url || message.gif_url) && !message.deleted;

  return (
    <motion.li
      {...bubbleMotion}
      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-xl flex-col gap-2 ${isMine ? "items-end" : "items-start"}`}>
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">
          {displayName}
        </div>

        <div
          className={`w-full rounded-2xl border px-4 py-3 backdrop-blur-xl ${bubbleClass}`}
        >
          {message.deleted && (
            <p className="text-sm text-white/60 italic">Message removed</p>
          )}

          {showContent && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          )}

          {showMedia && (
            <button
              type="button"
              onClick={() => {
                const mediaUrl = message.image_url ?? message.gif_url;
                if (mediaUrl && onPreviewMedia) onPreviewMedia(mediaUrl);
              }}
              className="group mt-3 block overflow-hidden rounded-2xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(message.image_url ?? message.gif_url) ?? undefined}
                alt="Chat attachment"
                className="max-h-64 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-white/50">
          <span>{timestamp}</span>
          {message.edited_at && <span>Edited</span>}
          {isMine && !message.deleted && (
            <div className="flex items-center gap-2">
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
          {!isMine && !message.deleted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-full border border-white/10 px-3 py-1 text-white/70 backdrop-blur hover:border-white/40 hover:text-white"
              >
                •••
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 min-w-[140px] rounded-2xl border border-white/10 bg-black/80 p-2 text-left text-xs shadow-2xl">
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-white/70 hover:bg-white/10"
                    onClick={() => {
                      onReact(message.id, "❤️");
                      setMenuOpen(false);
                    }}
                  >
                    Quick ❤️
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-white/70 hover:bg-white/10"
                    onClick={() => {
                      onReact(message.id, "🔥");
                      setMenuOpen(false);
                    }}
                  >
                    Quick 🔥
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!message.deleted && (
          <ReactionBar
            messageId={message.id}
            reactions={message.reactions}
            currentUserId={currentUserId}
            onReact={(emoji) => onReact(message.id, emoji)}
          />
        )}
      </div>
    </motion.li>
  );
}
