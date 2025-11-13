"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ReactionRecord } from "@/apps/chat/types";

const DEFAULT_REACTIONS = ["❤️", "🔥", "😂", "👀", "⚡️"];

type ReactionBarProps = {
  messageId: string;
  reactions?: ReactionRecord[];
  currentUserId?: string;
  onToggleReaction: (emoji: string, messageId: string) => void;
};

export function ReactionBar({
  messageId,
  reactions = [],
  currentUserId,
  onToggleReaction,
}: ReactionBarProps) {
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        mine: boolean;
      }
    >();

    reactions.forEach((reaction) => {
      const entry = map.get(reaction.reaction_type) ?? {
        count: 0,
        mine: false,
      };
      entry.count += 1;
      if (reaction.user_id === currentUserId) {
        entry.mine = true;
      }
      map.set(reaction.reaction_type, entry);
    });

    return Array.from(map.entries());
  }, [reactions, currentUserId]);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {grouped.map(([emoji, meta]) => (
        <motion.button
          key={`${messageId}-${emoji}`}
          type="button"
          onClick={() => onToggleReaction(emoji, messageId)}
          whileTap={{ scale: 0.92 }}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] leading-none transition ${
            meta.mine
              ? "border-[#3c6dff] bg-[#1b3cff] text-white shadow-[0_4px_18px_rgba(60,109,255,0.45)]"
              : "border-white/10 bg-white/5 text-white/80 hover:border-white/30"
          }`}
        >
          <span>{emoji}</span>
          <span className="font-medium">{meta.count}</span>
        </motion.button>
      ))}

      {grouped.length === 0 &&
        DEFAULT_REACTIONS.map((emoji) => (
          <motion.button
            key={`add-${messageId}-${emoji}`}
            type="button"
            onClick={() => onToggleReaction(emoji, messageId)}
            whileTap={{ scale: 0.92 }}
            className="rounded-full border border-transparent px-2 py-1 text-[12px] text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            {emoji}
          </motion.button>
        ))}
    </div>
  );
}

export default ReactionBar;
