"use client";

import { ChatDrawer } from "@/apps/chat/components/ChatDrawer";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,transparent_60%)] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">
            Cortex Chat v2
          </p>
          <h1 className="text-4xl font-light">Snow White Laundry — Staff Line</h1>
          <p className="text-white/60">
            Real-time coordination with presence, reactions, GIFs, and uploads across the entire crew.
          </p>
        </div>

        <ChatDrawer open variant="page" />
      </div>
    </div>
  );
}
