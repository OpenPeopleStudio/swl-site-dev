"use client";

import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";

export type ConversationMessage = {
  id: string;
  content: string;
  created_at: string;
  outgoing?: boolean;
};

type ConversationPaneProps = {
  messages: ConversationMessage[];
};

export function ConversationPane({ messages }: ConversationPaneProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-5 shadow-[inset_0_1px_25px_rgba(255,255,255,0.05)] backdrop-blur">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            id={message.id}
            content={message.content}
            timestamp={new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            outgoing={message.outgoing}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ConversationPane;
