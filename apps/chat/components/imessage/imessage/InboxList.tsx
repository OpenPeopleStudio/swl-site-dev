"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";

export type ThreadSummary = {
  id: string;
  title: string;
  lastMessage?: string | null;
  updated_at: string;
  unread?: boolean;
  avatarUrl?: string | null;
  is_global?: boolean | null;
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
  const pinned = threads.filter((thread) => thread.is_global);
  const regular = threads
    .filter((thread) => !thread.is_global)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  return (
    <nav className="space-y-4 text-white">
      {renderPinned}
      <ul className="space-y-1">
        {[...pinned, ...regular].map((thread) => {
          const isActive = thread.id === activeThreadId;
          return (
            <Fragment key={thread.id}>
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  isActive
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-white/0 hover:border-white/30"
                }`}
              >
                {thread.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thread.avatarUrl}
                    alt={thread.title}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-xs uppercase tracking-[0.3em] text-white/70">
                    {thread.title.slice(0, 2)}
                  </span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {thread.title}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {thread.lastMessage ?? "Start a conversation…"}
                  </p>
                </div>
                {thread.unread && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00F3FF] shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
                )}
              </button>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}

export default InboxList;
