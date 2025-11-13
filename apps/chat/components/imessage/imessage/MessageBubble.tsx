"use client";

import { MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";

type MessageBubbleProps = {
  id: string;
  content: string;
  timestamp: string;
  outgoing?: boolean;
  accessory?: ReactNode;
};

export function MessageBubble({
  id,
  content,
  timestamp,
  outgoing = false,
  accessory,
}: MessageBubbleProps) {
  const bubbleClasses = outgoing
    ? "bg-white/25 text-white/90 border-white/20 rounded-br-xl"
    : "bg-white/10 text-white/80 border-white/10 rounded-bl-xl";

  return (
    <MotionConfig transition={{ duration: 0.18, ease: "easeInOut" }}>
      <motion.li
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}
        data-message-id={id}
      >
        <div className={`max-w-[70%] space-y-1 ${outgoing ? "text-right" : ""}`}>
          <div
            className={`inline-flex w-full flex-col rounded-2xl border px-4 py-3 shadow-[inset_0_1px_8px_rgba(255,255,255,0.12)] backdrop-blur ${bubbleClasses}`}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {content}
            </p>
          </div>
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/45">
            {timestamp}
          </div>
          {accessory}
        </div>
      </motion.li>
    </MotionConfig>
  );
}

export default MessageBubble;
