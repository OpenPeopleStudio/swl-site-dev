"use client";

import { FormEvent, useMemo, useState } from "react";

type ConciergeMode = "day" | "night";

type ConciergeWidgetProps = {
  mode?: ConciergeMode;
  onSubmit?: (payload: { prompt: string; timestamp: string }) => void;
};

type MessageAuthor = "concierge" | "guest";

type ConciergeMessage = {
  id: string;
  author: MessageAuthor;
  body: string;
  timestamp: string;
};

type QuickAction = {
  label: string;
  prompt: string;
  description: string;
};

const INITIAL_MESSAGES: ConciergeMessage[] = [
  {
    id: "concierge-greeting",
    author: "concierge",
    body: "Hi, I can help with reservations or questions—just let me know what you need.",
    timestamp: "Now",
  },
  {
    id: "concierge-secondary",
    author: "concierge",
    body: "Share a preferred date, party size, or any accommodations and I’ll prepare a request for the team.",
    timestamp: "Now",
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Reserve a table",
    prompt: "I'd like to request a table for two on April 20 around 7:00pm.",
    description: "Guide the concierge to start a reservation draft.",
  },
  {
    label: "Private dining",
    prompt:
      "Can you help me plan a private dinner for eight guests with a focus on seafood?",
    description: "Opens the private dining inquiry flow.",
  },
  {
    label: "Dietary",
    prompt:
      "Do you accommodate dairy-free menus? I'd love to know what's possible.",
    description: "Invites the concierge to speak about accommodations.",
  },
  {
    label: "Gift cards",
    prompt: "When will the Snow White Laundry gift cards be available?",
    description: "Shares the current gift-card timeline.",
  },
];

/**
 * ConciergeWidget is a standalone preview of the AI concierge flow.
 * It focuses on warm micro-interactions, quick prompts, and calm typography.
 */
export function ConciergeWidget({ mode = "night", onSubmit }: ConciergeWidgetProps) {
  const [messages, setMessages] = useState<ConciergeMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");

  const palette = useMemo(() => {
    if (mode === "day") {
      return {
        container:
          "bg-gradient-to-b from-[#f7f1e3]/90 via-[#f3e5cf]/95 to-[#f8f5ef]/95 text-[#1f130a]",
        border: "border-[#f2d7b1]/70",
        shadow: "shadow-[0_30px_80px_rgba(17,6,0,0.12)]",
        conciergeBubble: "bg-white/80 text-[#1c1209]",
        guestBubble: "bg-[#1c1209] text-[#f7efe3]",
        meta: "text-[#6f5335]",
        badge: "bg-[#f6e8d1]/70 text-[#6b4727]",
        field: "bg-white/70 placeholder:text-[#704f33]/50 text-[#1c1209]",
        panelBg: "bg-white/70",
        panelBorder: "border-[#efd9bd]/80",
        formBorder: "border-[#efd9bd]/80",
        inputBorder: "border-[#e9cfb0]/80",
        action: "bg-[#f0daba] text-[#51341d]",
        actionBorder: "border-[#ecd0b2]/80",
        sendButton: "bg-[#2f1b10]",
        sendButtonText: "text-[#fdeed6]",
        sendButtonFocus: "focus-visible:outline-[#f2c79b]",
      };
    }
    return {
      container:
        "bg-gradient-to-b from-[#05060b]/95 via-[#0b111c]/95 to-[#020308]/95 text-white",
      border: "border-white/10",
      shadow: "shadow-[0_40px_90px_rgba(0,0,0,0.55)]",
      conciergeBubble: "bg-white/10 text-white",
      guestBubble: "bg-[#0d2730] text-[#c5f7ff]",
      meta: "text-white/60",
      badge: "bg-white/5 text-white/80",
      field: "bg-white/5 placeholder:text-white/50 text-white",
      panelBg: "bg-white/5",
      panelBorder: "border-white/10",
      formBorder: "border-white/10",
      inputBorder: "border-white/10",
      action: "bg-white/10 text-white/80",
      actionBorder: "border-white/15",
      sendButton: "bg-[#1bf5ff]",
      sendButtonText: "text-[#041824]",
      sendButtonFocus: "focus-visible:outline-[#1bf5ff]",
    };
  }, [mode]);

  function handleQuickAction(action: QuickAction) {
    handleSend(action.prompt);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSend(input);
  }

  function handleSend(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const timestamp = new Date().toISOString();
    const guestMessage: ConciergeMessage = {
      id: `guest-${timestamp}`,
      author: "guest",
      body: trimmed,
      timestamp: formatClockTime(timestamp),
    };
    const reply: ConciergeMessage = {
      id: `concierge-${timestamp}`,
      author: "concierge",
      body: simulateConciergeReply(trimmed),
      timestamp: "Moments later",
    };
    setMessages((prev) => [...prev, guestMessage, reply]);
    setInput("");
    onSubmit?.({ prompt: trimmed, timestamp });
  }

  return (
    <section
      className={`relative flex w-full max-w-2xl flex-col gap-6 rounded-[32px] border ${palette.border} ${palette.container} ${palette.shadow} p-6`}
    >
      <header className="space-y-2">
        <p className={`text-xs uppercase tracking-[0.4em] ${palette.meta}`}>AI Concierge</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-light">Snow White Laundry</h2>
            <p className={`text-sm ${palette.meta}`}>
              Crafted assistance for reservations, private dining, and guest care.
            </p>
          </div>
          <span className={`rounded-full px-4 py-1 text-xs font-semibold ${palette.badge}`}>
            Live preview
          </span>
        </div>
      </header>

      <div
        className={`space-y-4 rounded-3xl border ${palette.panelBorder} ${palette.panelBg} p-4 backdrop-blur-xl`}
      >
        <div
          aria-live="polite"
          className="scrollbar-hide flex max-h-80 flex-col gap-3 overflow-y-auto pr-1"
        >
          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex ${message.author === "guest" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                  message.author === "guest" ? palette.guestBubble : palette.conciergeBubble
                }`}
              >
                <p>{message.body}</p>
                <span className={`mt-2 block text-[11px] uppercase tracking-[0.3em] ${palette.meta}`}>
                  {message.author === "guest" ? "You" : "Concierge"} · {message.timestamp}
                </span>
              </div>
            </article>
          ))}
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => handleQuickAction(action)}
                className={`group flex w-full flex-col rounded-2xl border ${palette.actionBorder} px-4 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:border-white/40 ${palette.action}`}
              >
                <span className="font-medium uppercase tracking-[0.3em]">
                  {action.label}
                </span>
                <span className="mt-1 text-xs opacity-80">{action.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex flex-col gap-3 rounded-2xl border ${palette.formBorder} p-4`}
      >
        <label className={`text-xs uppercase tracking-[0.4em] ${palette.meta}`}>
          Message
        </label>
        <textarea
          aria-label="Message the concierge"
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tell us about your visit, timing, or needs…"
          className={`resize-none rounded-2xl border ${palette.inputBorder} px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 ${palette.field}`}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-xs ${palette.meta}`}>
            We’ll route this to the host team—no login required.
          </p>
          <button
            type="submit"
            className={`rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${palette.sendButton} ${palette.sendButtonText} ${palette.sendButtonFocus}`}
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

function simulateConciergeReply(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("private")) {
    return "Private dinners are curated around a single storyline. Share your date and sensory wishes, and I’ll prepare a custom inquiry for the chef’s review.";
  }
  if (normalized.includes("diet") || normalized.includes("allerg")) {
    return "We honor every dietary request with intention. Note your needs and we’ll design a course map that keeps the emotion of the menu intact.";
  }
  if (normalized.includes("gift")) {
    return "Gift cards arrive soon after opening. I can note your interest and email you when the artisans finish the packaging.";
  }
  if (normalized.includes("modify") || normalized.includes("change") || normalized.includes("update")) {
    return "Let me know what needs to shift—party size, timing, or contact. I’ll adjust the request before it reaches the host stand.";
  }
  if (normalized.includes("reserve") || normalized.includes("table")) {
    return "I’ll stage a reservation request. Add the date, party size, and any timing notes so the team can respond with precise availability.";
  }
  return "I’m listening. Share as much detail as you’d like—date, occasion, accommodations—and I’ll queue it for the Snow White Laundry host collective.";
}

function formatClockTime(timestamp: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "Just now";
  }
}

export default ConciergeWidget;
