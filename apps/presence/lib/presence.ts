"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { StaffIdentity } from "@/lib/getCurrentUser";

type PresenceState = "online" | "on-shift" | "away";

let channel: RealtimeChannel | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let currentUser: StaffIdentity | null = null;
let currentState: PresenceState = "online";

function broadcastPresenceState(state: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("presenceUpdate", { detail: state ?? {} }),
  );
}

function buildPayload(state: PresenceState) {
  if (!currentUser) return undefined;
  return {
    user_id: currentUser.id,
    full_name: currentUser.full_name,
    avatar_url: currentUser.avatar_url,
    role: currentUser.role,
    state,
    last_active: new Date().toISOString(),
  };
}

export function updatePresenceState(state?: PresenceState) {
  if (!channel) return;
  if (state) currentState = state;
  const payload = buildPayload(currentState);
  if (!payload) return;
  void channel.track(payload);
}

export function teardownPresence() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  void channel?.unsubscribe();
  channel = null;
  currentUser = null;
}

export function initPresence(
  user: StaffIdentity,
  initialState: PresenceState = "online",
) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || typeof window === "undefined") {
    return () => undefined;
  }
  teardownPresence();

  currentUser = user;
  currentState = initialState;

  channel = supabase.channel("presence:swl", {
    config: { presence: { key: user.id } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      broadcastPresenceState(channel?.presenceState() ?? {});
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const payload = buildPayload(currentState);
        if (payload) await channel?.track(payload);
      }
    });

  heartbeat = setInterval(() => {
    const payload = buildPayload(currentState);
    if (payload) void channel?.track(payload);
  }, 15000);

  return () => teardownPresence();
}
