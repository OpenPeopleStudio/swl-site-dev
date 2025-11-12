"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export type ChatMessage = {
  id: string;
  content: string | null;
  user_id: string;
  channel_id?: string | null;
  created_at: string;
};

type UseChatOptions = {
  channelId?: string;
};

export function useChat({ channelId = "global-chat" }: UseChatOptions = {}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const ready = Boolean(supabase);

  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(ready);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(
    ready ? null : "Chat is unavailable (Supabase not configured).",
  );

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
    });
    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
      },
    );
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;
    let active = true;
    async function fetchMessages() {
      setIsLoading(true);
      const { data, error: supabaseError } = await client
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setMessages((data ?? []) as ChatMessage[]);
        setError(null);
      }
      setIsLoading(false);
    }
    void fetchMessages();
    const channel = client
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [channelId, supabase]);

  const sendMessage = useCallback(
    async (text: string) => {
      const client = supabase;
      if (!client)
        throw new Error("Chat is unavailable (Supabase not configured).");
      if (!user) throw new Error("Authentication required.");
      if (!text.trim()) return;
      setIsSending(true);
      const { error: supabaseError } = await client.from("messages").insert({
        content: text.trim(),
        user_id: user.id,
        channel_id: channelId,
      });
      setIsSending(false);
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
    },
    [channelId, supabase, user],
  );

  return {
    supabaseClient: supabase as SupabaseClient | null,
    user,
    messages,
    isLoading,
    error,
    sendMessage,
    isSending,
    channelId,
    ready,
  };
}
