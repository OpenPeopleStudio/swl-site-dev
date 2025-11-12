"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

type GifPickerProps = {
  onSelect: (url: string) => void;
};

type TenorResult = {
  id: string;
  media_formats?: {
    tinygif?: { url: string };
    gif?: { url: string };
    nanomp4?: { url: string };
  };
};

export function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("cheers");
  const [internalResults, setInternalResults] = useState<TenorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_TENOR_API_KEY;
  const showGifSearch = Boolean(apiKey);
  const results = useMemo(
    () => (showGifSearch ? internalResults : []),
    [showGifSearch, internalResults],
  );

  useEffect(() => {
    if (!showGifSearch || !apiKey) return;
    let active = true;
    startTransition(() => {
      setLoading(true);
    });
    const controller = new AbortController();
    fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=12&media_filter=gif,tinygif`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setInternalResults(data.results ?? []);
      })
      .catch(() => {
        if (!active) return;
        setInternalResults([]);
      })
      .finally(() => {
        if (!active) return;
        startTransition(() => {
          setLoading(false);
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiKey, query, showGifSearch]);

  if (!showGifSearch) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/60">
        Set <code className="font-mono">NEXT_PUBLIC_TENOR_API_KEY</code> to enable
        GIF search.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-white">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
        <span>GIF Search</span>
        {loading && <span className="text-white/70">Loading…</span>}
      </div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Tenor"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/50"
      />
      <div className="grid grid-cols-3 gap-2">
        {results.map((result) => {
          const gif =
            result.media_formats?.tinygif?.url ??
            result.media_formats?.gif?.url ??
            "";
          if (!gif) return null;
          return (
            <button
              type="button"
              key={result.id}
              onClick={() => onSelect(gif)}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gif}
                alt="GIF option"
                className="h-24 w-full object-cover transition duration-200 hover:scale-105"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
