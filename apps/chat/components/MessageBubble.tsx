"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ChatMessageRecord } from "@/apps/chat/types";
import { ReactionBar } from "@/apps/chat/components/ReactionBar";

type MessageBubbleProps = {
  message: ChatMessageRecord;
  currentUserId?: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
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
  onToggleReaction,
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
    ? "bg-gradient-to-b from-[#1b6bff] via-[#0f5bff] to-[#0835ff] text-white shadow-[0_22px_45px_rgba(15,91,255,0.45)] rounded-br-2xl border border-[#3c6dff]/40"
    : "bg-[#16161f] text-white/90 border border-white/5 shadow-[0_16px_35px_rgba(0,0,0,0.55)] rounded-bl-2xl";

  const showContent = Boolean(message.content) && !message.deleted;
  const showMedia = (message.image_url || message.gif_url) && !message.deleted;

  return (
    <motion.li
      {...bubbleMotion}
      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${
          isMine ? "items-end text-right" : "items-start text-left"
        }`}
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
          {displayName}
        </div>

        <div
          className={`w-auto max-w-full rounded-3xl px-4 py-3 ${bubbleClass}`}
        >
          {message.deleted && (
            <p className="text-sm italic text-white/60">Message removed</p>
          )}

          {showContent && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
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

        <div
          className={`flex flex-wrap items-center gap-3 text-[11px] text-white/45 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span>{timestamp}</span>
          {message.edited_at && <span className="uppercase tracking-wide">Edited</span>}
          {isMine && !message.deleted && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[#7cc5ff] transition hover:text-white"
                onClick={() => onEdit(message.id, message.content ?? "")}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-[#ff453a] transition hover:text-white"
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
                className="rounded-full border border-white/10 px-3 py-1 text-white/70 transition hover:border-white/40"
              >
                •••
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 min-w-[160px] rounded-2xl border border-white/10 bg-[#101018] p-2 text-left text-xs text-white/80 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/10"
                    onClick={() => {
                      onToggleReaction(message.id, "❤️");
                      setMenuOpen(false);
                    }}
                  >
                    Quick ❤️
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/10"
                    onClick={() => {
                      onToggleReaction(message.id, "🔥");
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
            onToggleReaction={(emoji, targetMessageId) =>
              onToggleReaction(targetMessageId, emoji)
            }
          />
        )}
      </div>
    </motion.li>
  );
}
