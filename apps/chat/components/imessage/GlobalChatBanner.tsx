"use client";

import { motion } from "framer-motion";

type GlobalChatBannerProps = {
  title?: string;
  description?: string;
  onOpen?: () => void;
};

export function GlobalChatBanner({
  title = "Global Chat",
  description = "Pinned for the entire crew",
  onOpen,
}: GlobalChatBannerProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="group flex w-full items-center justify-between rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-left text-white shadow-[inset_0_1px_12px_rgba(255,255,255,0.15)] backdrop-blur"
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.45em] text-white/50">
          {title}
        </p>
        <p className="text-sm text-white/80">{description}</p>
      </div>
      <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition group-hover:border-white/50 group-hover:text-white">
        Open
      </span>
    </motion.button>
  );
}

export default GlobalChatBanner;
