"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatInput from "./ChatInput";
import UserBadge from "@/shared/ui/UserBadge";
import ShiftStatusButton from "./ShiftStatusButton";
import { initPresence, teardownPresence } from "@/apps/presence/lib/presence";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
  const {
    messages,
    user,
    isLoading,
    sendMessage,
    isSending,
    error,
    ready,
    channelReady,
    channelError,
  } = useChat({
    channelId,
  });
  const [sessionInfo, setSessionInfo] = useState("Checking Supabase auth…");
  const [inspectedUser, setInspectedUser] = useState<Record<string, unknown> | null>(null);
  const [authEvents, setAuthEvents] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function inspectAuth() {
      if (typeof document !== "undefined") {
        console.groupCollapsed("[Chat] Cookie snapshot");
        console.log(document.cookie);
        console.groupEnd();
      }
      const { data, error } = await supabaseBrowser.auth.getUser();
      console.groupCollapsed("[Chat] Supabase auth.getUser()");
      console.log("data:", data);
      console.log("error:", error);
      console.groupEnd();
      if (!mounted) return;
      if (data?.user) {
        setSessionInfo(`✅ Supabase session for ${data.user.email}`);
        setInspectedUser(
          JSON.parse(JSON.stringify(data.user)) as Record<string, unknown>,
        );
      } else if (error) {
        setSessionInfo(`❌ Supabase error: ${error.message}`);
        setInspectedUser(null);
      } else {
        setSessionInfo("⚠️ No Supabase session detected");
        setInspectedUser(null);
      }
    }

    inspectAuth();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        const timestamp = new Date().toISOString();
        setAuthEvents((prev) =>
          [...prev, `${timestamp} · ${event}`].slice(-8),
        );
        console.groupCollapsed("[Chat] Auth event");
        console.log(event, session);
        console.groupEnd();
        setSessionInfo(
          session?.user
            ? `✅ Supabase session for ${session.user.email}`
            : `⚠️ Auth event ${event} without session`,
        );
        setInspectedUser(
          session?.user
            ? (JSON.parse(JSON.stringify(session.user)) as Record<
                string,
                unknown
              >)
            : null,
        );
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
        <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
          <p>{sessionInfo}</p>
          {inspectedUser && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-white/60">
                Supabase user payload
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/60 p-2 text-[10px]">
                {JSON.stringify(inspectedUser, null, 2)}
              </pre>
            </details>
          )}
          {authEvents.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-white/60">
                Recent auth events
              </summary>
              <ul className="mt-2 space-y-1">
                {authEvents.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
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
        ) : channelError ? (
          <div className="text-sm text-red-400">{channelError}</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : isLoading || !channelReady ? (
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
        channelError ? (
          <div className="border-t border-white/10 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {channelError}
          </div>
        ) : channelReady ? (
          <ChatInput onSend={handleSend} disabled={isSending} />
        ) : (
          <div className="border-t border-white/10 bg-neutral-900/70 px-4 py-3 text-sm text-white/70">
            Resolving chat channel…
          </div>
        )
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
