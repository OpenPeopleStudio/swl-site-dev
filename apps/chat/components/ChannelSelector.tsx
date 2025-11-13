"use client";

import type { ChatChannel } from "@/apps/chat/hooks/useChannels";

type ChannelSelectorProps = {
  channels: ChatChannel[];
  activeChannelId: string | null;
  onSelect: (channelId: string) => void;
  loading?: boolean;
};

export function ChannelSelector({
  channels,
  activeChannelId,
  onSelect,
  loading = false,
}: ChannelSelectorProps) {
  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        Loading channels…
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
        No channels available.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      {channels.map((channel) => {
        const isActive = channel.id === activeChannelId;
        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelect(channel.id)}
            className={`rounded-2xl border px-4 py-2 text-sm transition ${
              isActive
                ? "border-white/70 bg-white/15 text-white shadow-[0_8px_30px_rgba(99,102,241,0.35)]"
                : "border-white/10 bg-white/0 text-white/70 hover:border-white/50 hover:text-white"
            }`}
          >
            {channel.name}
          </button>
        );
      })}
    </div>
  );
}

export default ChannelSelector;
