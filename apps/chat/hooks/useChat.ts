"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SupabaseClient,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";
import {
  getCurrentUser,
  type StaffIdentity,
} from "@/lib/shared/getCurrentUser";
import { resolveChannelId } from "@/lib/shared/getChannelId";

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
  const supabase = supabaseBrowser;
  const ready = true;

  const [user, setUser] = useState<StaffIdentity | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedChannelId, setResolvedChannelId] = useState<string | null>(
    null,
  );
  const [resolvedIdentifier, setResolvedIdentifier] = useState<string | null>(
    null,
  );
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    let active = true;

    async function refreshIdentity() {
      const identity = await getCurrentUser(client);
      if (active) setUser(identity);
    }

    void refreshIdentity();
    const { data: authListener } = client.auth.onAuthStateChange(() => {
      void refreshIdentity();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    resolveChannelId(channelId)
      .then((id) => {
        if (!active) return;
        setResolvedIdentifier(channelId);
        setResolvedChannelId(id);
        setChannelError(null);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : "Unable to resolve chat channel.";
        setResolvedIdentifier(channelId);
        setResolvedChannelId(null);
        setChannelError(message);
        setError(message);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channelId, ready]);

  useEffect(() => {
    if (!resolvedChannelId || resolvedIdentifier !== channelId) {
      return undefined;
    }
    const client = supabase;
    let active = true;
    async function fetchMessages() {
      setIsLoading(true);
      const { data, error: supabaseError } = await client
        .from("messages")
        .select("*")
        .eq("channel_id", resolvedChannelId)
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
      .channel(`chat:${resolvedChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: RealtimePostgresInsertPayload<ChatMessage>) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [resolvedChannelId, resolvedIdentifier, channelId, supabase]);

  const sendMessage = useCallback(
    async (text: string) => {
      const client = supabase;
      if (!client)
        throw new Error("Chat is unavailable (Supabase not configured).");
      if (!user) throw new Error("Authentication required.");
      if (!text.trim()) return;
      if (!resolvedChannelId || resolvedIdentifier !== channelId)
        throw new Error("Chat channel unavailable. Please wait.");
      setIsSending(true);
      const { error: supabaseError } = await client.from("messages").insert({
        content: text.trim(),
        user_id: user.id,
        channel_id: resolvedChannelId,
      });
      setIsSending(false);
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
    },
    [resolvedChannelId, resolvedIdentifier, channelId, supabase, user],
  );

  const activeChannelId =
    resolvedIdentifier === channelId ? resolvedChannelId : null;
  const activeChannelError =
    resolvedIdentifier === channelId ? channelError : null;

  return {
    supabaseClient: supabase as SupabaseClient | null,
    user,
    messages,
    isLoading,
    error,
    sendMessage,
    isSending,
    channelId: activeChannelId,
    ready,
    channelReady: Boolean(activeChannelId),
    channelError: activeChannelError,
  };
}
