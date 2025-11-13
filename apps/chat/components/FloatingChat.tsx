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
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#0e0f1d] via-[#111b3a] to-[#1f4bff] text-white shadow-[0_25px_70px_rgba(27,46,255,0.45)] ring-1 ring-white/10 transition hover:translate-y-[-2px] hover:shadow-[0_35px_90px_rgba(27,46,255,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:bottom-10 md:right-10"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
      {open && <ChatDrawer open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export default FloatingChat;
