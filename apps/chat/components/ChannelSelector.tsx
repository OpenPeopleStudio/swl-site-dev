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
      <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">
        Loading channels…
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">
        No channels available.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => {
        const isActive = channel.id === activeChannelId;
        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelect(channel.id)}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
              isActive
                ? "bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.35)]"
                : "bg-white/5 text-white/65 hover:bg-white/15"
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
