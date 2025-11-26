"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ChatMessage = {
  id: string;
  sender: "guest" | "assistant";
  content: string;
  createdAt: number;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "intro",
  sender: "assistant",
  createdAt: Date.now(),
  content:
    "You’ve reached the Laundry Line — the direct line to Snow White Laundry. I can help you plan a future visit, ask about private events, or answer questions about how we think about the room.",
};

const CTA_SUBTEXT =
  "Have a question about visiting, private events, or how the room will work?";

export function LaundryLineChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const guestMessage: ChatMessage = {
      id: `guest-${Date.now()}`,
      sender: "guest",
      content: trimmed,
      createdAt: Date.now(),
    };

    appendMessage(guestMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/laundry-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          message: trimmed,
          metadata: { source: "landing-cta" },
        }),
      });

      if (!response.ok) {
        throw new Error("Laundry Line unavailable");
      }

      const payload = (await response.json()) as {
        threadId: string;
        reply: string;
      };

      setThreadId(payload.threadId);

      appendMessage({
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: payload.reply,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Laundry Line chat error", error);
      appendMessage({
        id: `assistant-error-${Date.now()}`,
        sender: "assistant",
        content:
          "It seems the Laundry Line is having trouble right now. If this keeps happening, you can email us and we’ll get back to you.",
        createdAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Laundry Line
          </p>
          <h2 className="mt-2 text-2xl font-light text-white">
            Talk to the room
          </h2>
          <p className="mt-2 text-sm text-white/70">{CTA_SUBTEXT}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-[0.7rem] uppercase tracking-[0.35em] text-white transition hover:border-white/60 hover:bg-white/10"
        >
          Open the Laundry Line
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-[32px] border border-white/15 bg-[#05050a]/95 p-6 shadow-[0_35px_140px_rgba(0,0,0,0.8)]"
            >
              <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
                    Snow White Laundry — Laundry Line
                  </p>
                  <h3 className="mt-1 text-2xl font-light text-white">
                    Laundry Line
                  </h3>
                  <p className="text-xs text-white/60">
                    Ask us about visiting, private events, or how the room will
                    work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-white/15 px-3 py-2 text-sm uppercase tracking-[0.25em] text-white/60 transition hover:border-white/60 hover:text-white"
                >
                  Close
                </button>
              </header>

              <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto pr-2"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "guest"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                        message.sender === "guest"
                          ? "rounded-br-none bg-white text-black"
                          : "rounded-bl-none border border-white/15 bg-white/5 text-white"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>

              <form
                className="mt-4 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
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
                  placeholder="Ask us about a visit, private events, or how we think about the room."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/60"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/40">
                  <span>
                    {isLoading ? "Laundry Line is replying…" : "Press Enter to send"}
                  </span>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="rounded-full border border-white/30 px-5 py-2 text-white transition hover:border-white/80 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                  >
                    Send
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}


