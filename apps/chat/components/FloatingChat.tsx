"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatDrawer } from "@/apps/chat/components/ChatDrawer";

export function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_20px_80px_rgba(79,70,229,0.45)] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:bottom-10 md:right-10"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      {open && <ChatDrawer open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export default FloatingChat;
