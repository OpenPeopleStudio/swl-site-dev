"use client";

import type { ReactionRecord } from "../types";

const DEFAULT_EMOJIS = ["❤️", "👍", "😂", "😮"];

type ReactionBarProps = {
  messageId: string;
  reactions: ReactionRecord[];
  currentUserId: string;
  onToggleReaction: (emoji: string, messageId: string) => void;
};

export function ReactionBar({
  messageId,
  reactions,
  currentUserId,
  onToggleReaction,
}: ReactionBarProps) {
  const grouped = reactions.reduce<Record<string, string[]>>((acc, reaction) => {
    if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
    acc[reaction.emoji].push(reaction.user_id);
    return acc;
  }, {});

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {Object.entries(grouped).map(([emoji, userIds]) => {
        const isMine = userIds.includes(currentUserId);
        return (
          <button
            key={`${messageId}-${emoji}`}
            onClick={() => onToggleReaction(emoji, messageId)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow-inner backdrop-blur ${isMine ? "bg-white/30 text-black" : "bg-white/10 text-white/90"}`}
          >
            <span>{emoji}</span>
            <span>{userIds.length}</span>
          </button>
        );
      })}
      <div className="flex gap-1">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji, messageId)}
            className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 transition hover:border-white/40"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReactionBar;
