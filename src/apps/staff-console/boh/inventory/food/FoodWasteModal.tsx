"use client";

import { useState } from "react";

type FoodWasteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string; name: string }[];
  onSubmit?: (payload: {
    itemId: string;
    quantity: number;
    reason?: string;
    notes?: string;
  }) => Promise<void> | void;
};

const wasteReasons = [
  "Spoilage",
  "Prep mistake",
  "Line waste",
  "Contamination",
  "Expiry",
];

export function FoodWasteModal({
  isOpen,
  onClose,
  items,
  onSubmit,
}: FoodWasteModalProps) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState(wasteReasons[0]);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#05070f] p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              Waste Event
            </p>
            <h2 className="text-2xl font-light">Log Spoilage</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white"
          >
            Close
          </button>
        </div>

        <form
          className="mt-4 space-y-4 text-sm text-white/80"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!itemId || quantity === "") return;
            await onSubmit?.({
              itemId,
              quantity: Number(quantity),
              reason,
              notes: notes || undefined,
            });
            setQuantity("");
            setNotes("");
            onClose();
          }}
        >
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
            Quantity Lost
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
            Reason
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2"
            >
              {wasteReasons.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/60"
          >
            Log Waste
          </button>
        </form>
      </div>
    </div>
  );
}
