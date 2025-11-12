"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "../hooks/useChat";
import ChatInput from "./ChatInput";
import UserBadge from "@/shared/ui/UserBadge";
import ShiftStatusButton from "./ShiftStatusButton";
import { initPresence, teardownPresence } from "@/apps/presence/lib/presence";

type ChatBoxProps = {
  onNewMessage?: (message: { content?: string | null; user_id: string }) => void;
  channelId?: string;
  open?: boolean;
};

export default function ChatBox({
  onNewMessage,
  channelId = "global-chat",
  open = true,
}: ChatBoxProps) {
  const { messages, user, isLoading, sendMessage, isSending, error, ready } =
    useChat({
      channelId,
    });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      teardownPresence();
      return;
    }
    return initPresence(user, "online");
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    const latest = messages[messages.length - 1];
    if (!latest || latest.id === lastMessageId.current) return;
    if (!open && latest.user_id !== user?.id) {
      onNewMessage?.({ content: latest.content, user_id: latest.user_id });
    }
    lastMessageId.current = latest.id;
  }, [messages, onNewMessage, open, user?.id]);

  const handleSend = useMemo(
    () => async (text: string) => {
      try {
        await sendMessage(text);
      } catch (err) {
        console.error(err);
      }
    },
    [sendMessage],
  );

  return (
    <div className="glass-morphic flex h-full flex-col rounded-none border-t border-white/10 md:border-none">
      <header className="border-b border-white/10 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Cortex Chat
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-light text-white">
              Snow White Laundry Staff
            </h2>
            {user && <UserBadge user={user} subtitle="You" />}
          </div>
          {user && <ShiftStatusButton user={user} />}
        </div>
      </header>

      <div className="scrollbar-hide flex-1 overflow-y-auto p-4 space-y-3 text-white">
        {!ready ? (
          <div className="text-sm text-white/60">
            Chat temporarily unavailable. Please try again later.
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : isLoading ? (
          <div className="space-y-2 text-sm text-white/60">
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
          </div>
        ) : (
          messages.map((message) => {
            const isSelf = message.user_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-lg ${
                    isSelf ? "bg-[#007aff]" : "bg-neutral-800/80"
                  }`}
                >
                  {message.content ?? "[media]"}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <ChatInput onSend={handleSend} disabled={isSending} />
      ) : (
        <div className="border-t border-white/10 bg-neutral-900/70 px-4 py-3 text-sm text-white/70">
          <p>
            You must{" "}
            <a
              href="/gate"
              className="text-[#007aff] underline-offset-2 hover:underline"
            >
              sign in
            </a>{" "}
            to chat with the crew.
          </p>
        </div>
      )}
    </div>
  );
}
