"use client";

import { useMemo, useState } from "react";
import InboxList, { type ThreadSummary } from "./InboxList";
import { GlobalChatBanner } from "./GlobalChatBanner";
import { NewMessageDrawer } from "./NewMessageDrawer";
import { ConversationPane, type ConversationMessage } from "./ConversationPane";

type ChatLayoutShellProps = {
  threads: ThreadSummary[];
  messages: ConversationMessage[];
  contacts: Array<{ id: string; name: string; role?: string | null; avatarUrl?: string | null }>;
  onThreadChange: (threadId: string) => void;
  onNewThread: (contactId: string) => void;
};

export function ChatLayoutShell({
  threads,
  messages,
  contacts,
  onThreadChange,
  onNewThread,
}: ChatLayoutShellProps) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    threads.find((thread) => thread.is_global)?.id ?? threads[0]?.id ?? null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSelect = (threadId: string) => {
    setActiveThreadId(threadId);
    onThreadChange(threadId);
  };

  const activeMessages = useMemo(
    () =>
      activeThreadId
        ? messages.filter((message) => message.id.startsWith(activeThreadId))
        : messages,
    [activeThreadId, messages],
  );

  return (
    <div className="grid gap-6 text-white lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_30px_rgba(255,255,255,0.06)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">
            Inbox
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen((value) => !value)}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/60 transition hover:border-white/40 hover:text-white"
          >
            +
          </button>
        </div>

        {drawerOpen && (
          <NewMessageDrawer
            open={drawerOpen}
            query={query}
            contacts={contacts}
            onQueryChange={setQuery}
            onSelect={(contactId) => {
              onNewThread(contactId);
              setDrawerOpen(false);
              setQuery("");
            }}
          />
        )}

        <InboxList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={handleSelect}
          renderPinned={
            <GlobalChatBanner onOpen={() => handleSelect(threads[0]?.id ?? "")} />
          }
        />
      </aside>

      <section className="space-y-4">
        <ConversationPane messages={activeMessages} />
      </section>
    </div>
  );
}

export default ChatLayoutShell;
