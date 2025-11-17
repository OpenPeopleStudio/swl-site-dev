"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

type SlideOverProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function SlideOverPanel({ title, open, onClose, children }: SlideOverProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="h-full w-full max-w-lg border-l border-white/10 bg-[#050712]/95 p-6 text-white shadow-[0_0_60px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Sensitive</p>
                <h2 className="text-2xl font-light">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 hover:border-white/60"
              >
                Close
              </button>
            </div>
            <div className="mt-6 h-[calc(100%-4rem)] overflow-y-auto pr-2 text-sm text-white/80">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
