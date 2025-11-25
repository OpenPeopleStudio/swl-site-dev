"use client";

import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

export async function getOrCreateDirectChannel(
  currentUserId: string,
  targetUserId: string,
  targetName?: string | null,
) {
  const supabase = supabaseBrowser;

  const { data: existingMemberships, error: membershipError } = await supabase
    .from("channel_members")
    .select("channel_id, channels!inner(id, type)")
    .eq("user_id", currentUserId)
    .eq("channels.type", "direct");

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const directIds =
    existingMemberships?.map((entry) => entry.channel_id).filter(Boolean) ?? [];

  if (directIds.length > 0) {
    const { data: overlap, error: overlapError } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", targetUserId)
      .in("channel_id", directIds)
      .limit(1);
    if (overlapError) throw new Error(overlapError.message);
    if (overlap && overlap.length > 0 && overlap[0]?.channel_id) {
      return overlap[0].channel_id;
    }
  }

  const channelName = targetName
    ? `DM · ${targetName}`
    : "Direct Conversation";

  const { data: channel, error: insertChannelError } = await supabase
    .from("channels")
    .insert({ type: "direct", name: channelName })
    .select("id")
    .single();

  if (insertChannelError || !channel?.id) {
    throw new Error(insertChannelError?.message ?? "Unable to create channel");
  }

  const { error: memberInsertError } = await supabase
    .from("channel_members")
    .insert([
      { channel_id: channel.id, user_id: currentUserId },
      { channel_id: channel.id, user_id: targetUserId },
    ]);

  if (memberInsertError) {
    throw new Error(memberInsertError.message);
  }

  return channel.id;
}
