"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ChatContainer } from "@/apps/chat/components/ChatContainer";

type ChatDrawerProps = {
  open: boolean;
  onClose?: () => void;
};

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/70 p-4 md:items-center md:justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#04040a]/95 p-4 text-white shadow-[0_50px_160px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                  Cortex Chat
                </p>
                <h2 className="text-2xl font-light">Staff Line</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ChatContainer variant="overlay" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ChatDrawer;
