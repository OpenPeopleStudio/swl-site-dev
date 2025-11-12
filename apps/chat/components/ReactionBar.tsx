"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ReactionRecord } from "@/apps/chat/types";

const DEFAULT_REACTIONS = ["❤️", "🔥", "😂", "👀", "⚡️"];

type ReactionBarProps = {
  messageId: string;
  reactions?: ReactionRecord[];
  currentUserId?: string;
  onReact: (emoji: string) => void;
};

export function ReactionBar({
  messageId,
  reactions = [],
  currentUserId,
  onReact,
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
          onClick={() => onReact(emoji)}
          whileTap={{ scale: 0.9 }}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
            meta.mine
              ? "border-white/80 bg-white/20 text-white"
              : "border-white/10 bg-white/5 text-white/70 hover:border-white/40"
          }`}
        >
          <span>{emoji}</span>
          <span>{meta.count}</span>
        </motion.button>
      ))}

      {DEFAULT_REACTIONS.map((emoji) => (
        <motion.button
          key={`add-${messageId}-${emoji}`}
          type="button"
          onClick={() => onReact(emoji)}
          whileTap={{ scale: 0.9 }}
          className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60 transition hover:border-white/40 hover:text-white"
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}

export default ReactionBar;
