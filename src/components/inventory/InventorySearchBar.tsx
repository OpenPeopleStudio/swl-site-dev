"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

type InventorySearchBarProps = {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onOpenFilters?: () => void;
  dataHints?: string[];
};

export function InventorySearchBar({
  placeholder = "Search ingredients, vendors, alerts...",
  onSearch,
  onOpenFilters,
  dataHints = [],
}: InventorySearchBarProps) {
  const [value, setValue] = useState("");
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Search className="size-4 text-white/40" />
        <input
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            onSearch?.(next);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onOpenFilters?.()}
          className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
        </button>
      </div>
      {dataHints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dataHints.slice(0, 4).map((hint) => (
            <span
              key={hint}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60"
            >
              {hint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
