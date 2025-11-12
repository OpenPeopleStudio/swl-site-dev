"use client";

import { useEffect, useState } from "react";
import Avatar from "@/shared/ui/Avatar";
import BubbleSurface from "@/shared/ui/BubbleSurface";
import type { ChatMessageRecord } from "../types";
import { ReactionBar } from "./ReactionBar";
import { MediaPreview } from "./MediaPreview";

type ChatMessageProps = {
  message: ChatMessageRecord;
  isSelf: boolean;
  currentUserId: string;
  onToggleReaction: (emoji: string, messageId: string) => void;
  onReply: (message: ChatMessageRecord) => void;
  onMediaSelect: (url: string) => void;
  parentMessage?: ChatMessageRecord | null;
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function ChatMessage({
  message,
  isSelf,
  currentUserId,
  onToggleReaction,
  onReply,
  onMediaSelect,
  parentMessage,
}: ChatMessageProps) {
  const timestamp = message.created_at
    ? timeFormatter.format(new Date(message.created_at))
    : "";
  const [fadeOpacity, setFadeOpacity] = useState(1);

  useEffect(() => {
    function updateOpacity() {
      if (!message.created_at) {
        setFadeOpacity(1);
        return;
      }
      const ageMinutes =
        (Date.now() - new Date(message.created_at).getTime()) / 60000;
      setFadeOpacity(Math.max(1 - ageMinutes / 60, 0.25));
    }
    updateOpacity();
    const id = setInterval(updateOpacity, 60000);
    return () => clearInterval(id);
  }, [message.created_at]);
  const initials = (message.staff?.full_name ?? "Staff")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bubbleClasses = isSelf
    ? "bg-[#007aff] text-white rounded-3xl rounded-br-none self-end"
    : "bg-neutral-800/80 text-white rounded-3xl rounded-bl-none";

  return (
    <div
      className={`flex w-full gap-3 ${isSelf ? "justify-end" : "justify-start"}`}
    >
      {!isSelf && (
        <Avatar
          size={40}
          src={message.staff?.avatar_url ?? undefined}
          initials={initials}
          className="shrink-0 bg-neutral-900/60"
        />
      )}
      <div className={`flex max-w-[80%] flex-col ${isSelf ? "items-end" : ""}`}>
        {!isSelf && (
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            {message.staff?.full_name ?? "Staff"}
          </p>
        )}
        <BubbleSurface
          delay={isSelf ? 0.2 : 0}
          className={`mt-1 inline-flex w-fit max-w-full px-0 py-0 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${
            isSelf ? "justify-end" : ""
          }`}
        >
          <div className={`px-4 py-2 text-sm ${bubbleClasses}`} style={{ opacity: fadeOpacity }}>
            {parentMessage && (
              <button
                type="button"
                onClick={() => onReply(parentMessage)}
                className="mb-2 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 text-left"
              >
                Replying to{" "}
                <span className="font-medium">
                  {parentMessage.staff?.full_name ?? "Staff"}
                </span>
                : {parentMessage.content ?? "[media]"}
              </button>
            )}
            {message.content}
            <MediaPreview
              imageUrl={message.image_url}
              gifUrl={message.gif_url}
              onSelect={onMediaSelect}
            />
            {message.emotion_label && (
              <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                {message.emotion_label}
              </div>
            )}
          </div>
        </BubbleSurface>
        <span className="mt-1 text-xs text-white/40">{timestamp}</span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onReply(message)}
            className="text-xs text-white/60 hover:text-white"
          >
            Reply
          </button>
          <ReactionBar
            messageId={message.id}
            reactions={message.reactions ?? []}
            currentUserId={currentUserId}
            onToggleReaction={onToggleReaction}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
