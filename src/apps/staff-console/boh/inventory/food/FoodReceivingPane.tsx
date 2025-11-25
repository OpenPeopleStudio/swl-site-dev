"use client";

import { useState } from "react";

type FoodReceivingPaneProps = {
  items: { id: string; name: string }[];
  onReceive?: (payload: {
    itemId: string;
    quantity: number;
    costPerUnit?: number;
    vendorId?: string;
    notes?: string;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function FoodReceivingPane({
  items,
  onReceive,
  isSubmitting,
}: FoodReceivingPaneProps) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!itemId || quantity === "") return;
        await onReceive?.({
          itemId,
          quantity: Number(quantity),
          costPerUnit: cost === "" ? undefined : Number(cost),
          notes: notes || undefined,
        });
        setQuantity("");
        setCost("");
        setNotes("");
      }}
    >
      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
        Receiving
      </p>
      <h2 className="text-xl font-light">Record Delivery</h2>

      <div className="mt-4 space-y-3 text-sm text-white/80">
        <label className="block">
          Item
          <select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Quantity
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value === "" ? "" : Number(event.target.value))
            }
            className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>
        <label className="block">
          Cost per Unit
          <input
            type="number"
            step="0.01"
            value={cost}
            onChange={(event) =>
              setCost(event.target.value === "" ? "" : Number(event.target.value))
            }
            className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>
        <label className="block">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!itemId || quantity === "" || isSubmitting}
        className="mt-4 w-full rounded-2xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/60 disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Log Delivery"}
      </button>
    </form>
  );
}
