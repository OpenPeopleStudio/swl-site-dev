"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, X } from "lucide-react";

type ChatRole = "assistant" | "user";

type SourceRef = {
  id: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  similarity?: number | null;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: SourceRef[];
  timestamp: number;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "concierge-intro",
  role: "assistant",
  content:
    "Snow White Laundry concierge online. Ask anything about private experiences, menu mood boards, or rituals and I’ll answer using our breadcrumb atlas.",
  timestamp: Date.now(),
};

function cleanSlug(slug: string | null) {
  if (!slug) return null;
  return slug.replace(/^breadcrumb-/, "").replace(/\.md$/i, "");
}

export function CustomerConciergeChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !pending;

  async function handleSend() {
    if (!canSend) return;

    const trimmed = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.slice(-8).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "Concierge is unavailable. Try again soon.",
        );
      }

      const payload = (await response.json()) as {
        reply: string;
        sources?: SourceRef[];
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.reply,
          sources: payload.sources ?? [],
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      const fallback =
        err instanceof Error ? err.message : "Unable to reach concierge.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fallback,
          timestamp: Date.now(),
        },
      ]);
      setError(fallback);
    } finally {
      setPending(false);
    }
  }

  const latestSources = useMemo(
    () => messages.slice().reverse().find((msg) => msg.sources?.length)?.sources,
    [messages],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#0e0f1d] via-[#111b3a] to-[#1f4bff] text-white shadow-[0_25px_70px_rgba(27,46,255,0.45)] ring-1 ring-white/10 transition hover:translate-y-[-2px] hover:shadow-[0_35px_90px_rgba(27,46,255,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:bottom-10 md:right-10"
        aria-label="Open concierge chat"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 25 }}
              className="relative flex h-[640px] w-full max-w-3xl flex-col rounded-[30px] border border-white/15 bg-[#04040a]/95 p-6 text-white shadow-[0_50px_160px_rgba(0,0,0,0.9)] backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.45em] text-white/40">
                    AI Concierge
                  </p>
                  <h2 className="text-2xl font-light">Guest Line</h2>
                  <p className="text-xs text-white/60">
                    Replies pull from Snow White Laundry breadcrumbs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/15 p-2 text-white/60 transition hover:border-white/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>

              <div className="mt-4 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Ask about menus, timelines, cocktails, or rituals…"
                  className="w-full resize-none rounded-2xl border border-white/15 bg-[#0b0b14] px-4 py-3 text-sm text-white outline-none transition focus:border-[#446bff]"
                />
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-white/40">
                  <span>
                    {pending ? "Concierge is typing…" : "Press enter to send"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!canSend}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#335dff] to-[#7a4bff] px-5 py-2 text-xs font-semibold text-white shadow-[0_20px_50px_rgba(93,81,255,0.45)] transition hover:from-[#4668ff] hover:to-[#8d5bff] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-rose-300">
                    {error} — we’ll retry automatically next time.
                  </p>
                )}
              </div>

              {latestSources && latestSources.length > 0 && (
                <div className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
                  <p className="mb-2">Grounded by</p>
                  <div className="flex flex-wrap gap-2">
                    {latestSources.map((source) => {
                      const slug = cleanSlug(source.slug);
                      const href = slug ? `/overshare/${slug}` : "/overshare";
                      return (
                        <a
                          key={source.id}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[10px] text-white/70 transition hover:border-white/60 hover:text-white"
                        >
                          {source.category ? `${source.category} · ` : ""}
                          {source.title ?? slug ?? "Breadcrumb"}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const bubbleClasses = isUser
    ? "bg-[#315dff] text-white rounded-3xl rounded-br-none"
    : "bg-white/8 text-white rounded-3xl rounded-bl-none border border-white/10";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } leading-relaxed`}
    >
      <div className="max-w-[80%]">
        <div className={`px-4 py-3 text-sm ${bubbleClasses}`}>
          <p>{message.content}</p>
          {message.sources && message.sources.length > 0 && !isUser && (
            <div className="mt-3 space-y-1 border-t border-white/10 pt-2 text-[10px] uppercase tracking-[0.3em] text-white/50">
              {message.sources.map((source) => {
                const slug = cleanSlug(source.slug);
                const href = slug ? `/overshare/${slug}` : "/overshare";
                return (
                  <a
                    key={`${message.id}-${source.id}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-full text-xs font-semibold text-white/70 underline-offset-2 hover:text-white hover:underline"
                  >
                    {source.title ?? slug ?? "View breadcrumb"}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


