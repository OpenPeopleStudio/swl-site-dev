"use client";

import type { ReactNode } from "react";

export type ThreadSummary = {
  id: string;
  title: string;
  lastMessage?: string | null;
  updated_at?: string | null;
  unread?: boolean;
  avatarUrl?: string | null;
  isGlobal?: boolean;
};

type InboxListProps = {
  threads: ThreadSummary[];
  activeThreadId?: string | null;
  onSelect: (threadId: string) => void;
  renderPinned?: ReactNode;
};

export function InboxList({
  threads,
  activeThreadId,
  onSelect,
  renderPinned,
}: InboxListProps) {
  return (
    <div className="space-y-3">
      {renderPinned}
      <div className="flex flex-col gap-1">
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "border-white/40 bg-white/10"
                  : "border-white/10 bg-transparent hover:border-white/30"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xs uppercase tracking-[0.3em] text-white/60">
                {thread.title.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{thread.title}</p>
                <p className="truncate text-xs text-white/60">
                  {thread.lastMessage ?? "Start a conversation…"}
                </p>
              </div>
              {thread.unread && (
                <span className="h-2.5 w-2.5 rounded-full bg-[#00F3FF] shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default InboxList;
