"use client";

import { useState } from "react";

type FoodCountPaneProps = {
  onSubmit?: (payload: { itemId: string; quantity: number }) => Promise<void> | void;
  items: { id: string; name: string }[];
  isSubmitting?: boolean;
};

export function FoodCountPane({ onSubmit, items, isSubmitting }: FoodCountPaneProps) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number | "">("");

  return (
    <form
      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!itemId || quantity === "") return;
        await onSubmit?.({ itemId, quantity: Number(quantity) });
        setQuantity("");
      }}
    >
      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
        Quick Count
      </p>
      <h2 className="text-xl font-light text-white">Update On-Hand</h2>

      <div className="mt-4 space-y-3 text-sm text-white/80">
        <label className="block">
          Item
          <select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-white/40"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Counted Quantity
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value === "" ? "" : Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-white/40"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!itemId || quantity === "" || isSubmitting}
        className="mt-4 w-full rounded-2xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/60 disabled:opacity-50"
      >
        {isSubmitting ? "Updating…" : "Log Count"}
      </button>
    </form>
  );
}
