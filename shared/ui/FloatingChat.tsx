"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import ChatBox from "@/apps/chat/components/ChatBox";
import PresenceSidebar from "@/shared/ui/PresenceSidebar";
import { useMessageAlert } from "@/apps/chat/hooks/useMessageAlert";

type Toast = {
  id: number;
  text: string;
};

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newCount, setNewCount] = useState(0);
  useMessageAlert(newCount);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleNewMessage(message?: { content?: string | null }) {
    if (open) return;
    setUnread(true);
    setNewCount((count) => count + 1);
    setToast({
      id: Date.now(),
      text: message?.content
        ? message.content.slice(0, 80)
        : "New message from staff",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setUnread(false);
          setNewCount(0);
        }}
        id="chat-bubble"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#007aff] text-white shadow-2xl transition hover:bg-[#379eff] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:bottom-8 md:right-8"
      >
        <MessageCircle className="h-6 w-6" />
        {unread && (
          <span className="absolute top-2 right-2 h-3 w-3 animate-pulse rounded-full bg-red-500" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-end justify-end bg-black/50 backdrop-blur-sm md:items-stretch"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              onClick={(event) => event.stopPropagation()}
              className="glass-morphic flex h-[85vh] w-full flex-col rounded-t-3xl border-t border-white/10 text-white shadow-[0_40px_120px_rgba(0,0,0,0.8)] md:h-full md:w-[520px] md:rounded-none md:border-l"
            >
              <div className="flex h-full flex-1 flex-col md:flex-row">
                <div className="flex h-full flex-1 flex-col">
                  <ChatBox open={open} onNewMessage={handleNewMessage} />
                </div>
                <PresenceSidebar />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && !open && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-30 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm text-white shadow-2xl md:bottom-28 md:right-8"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              New message
            </p>
            <p className="text-white/80">{toast.text}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setUnread(false);
                setToast(null);
              }}
              className="mt-2 text-xs text-[#66aaff] underline-offset-2 hover:underline"
            >
              Open chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
