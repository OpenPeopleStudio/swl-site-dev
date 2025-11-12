"use client";

import Avatar from "@/shared/ui/Avatar";
import type { ChatMessageRecord } from "../types";
import { ReactionBar } from "./ReactionBar";
import { MediaPreview } from "./MediaPreview";

type ChatMessageProps = {
  message: ChatMessageRecord;
  isSelf: boolean;
  currentUserId: string;
  onToggleReaction: (emoji: string, messageId: string) => void;
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
}: ChatMessageProps) {
  const timestamp = message.created_at
    ? timeFormatter.format(new Date(message.created_at))
    : "";
  const initials = (message.users?.full_name ?? "Staff")
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
          src={message.users?.avatar_url ?? undefined}
          initials={initials}
          className="shrink-0 bg-neutral-900/60"
        />
      )}
      <div className={`flex max-w-[80%] flex-col ${isSelf ? "items-end" : ""}`}>
        {!isSelf && (
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            {message.users?.full_name ?? "Staff"}
          </p>
        )}
        <div
          className={`mt-1 w-fit max-w-full px-4 py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${bubbleClasses}`}
        >
          {message.content}
          <MediaPreview imageUrl={message.image_url} gifUrl={message.gif_url} />
          {message.emotion_label && (
            <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
              {message.emotion_label}
            </div>
          )}
        </div>
        <span className="mt-1 text-xs text-white/40">{timestamp}</span>
        <ReactionBar
          messageId={message.id}
          reactions={message.reactions ?? []}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
        />
      </div>
    </div>
  );
}

export default ChatMessage;
