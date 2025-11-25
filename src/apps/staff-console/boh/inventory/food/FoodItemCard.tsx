type FoodItemCardProps = {
  name: string;
  category?: string | null;
  storageZone?: string | null;
  onHand?: number | null;
  parLevel?: number | null;
  minimum?: number | null;
  vendorName?: string | null;
  costPerUnit?: number | null;
  lastInvoiceCost?: number | null;
  onSelect?: () => void;
};

export function FoodItemCard({
  name,
  category,
  storageZone,
  onHand,
  parLevel,
  minimum,
  vendorName,
  costPerUnit,
  lastInvoiceCost,
  onSelect,
}: FoodItemCardProps) {
  const belowMin =
    typeof onHand === "number" &&
    typeof minimum === "number" &&
    onHand < minimum;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition hover:border-white/30 ${
        belowMin ? "border-rose-400/40 bg-rose-500/10" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            {category ?? "Uncategorized"}
          </p>
          <h3 className="text-xl font-light text-white">{name}</h3>
        </div>
        <span className="text-xs text-white/60">{storageZone}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            On Hand
          </p>
          <p className="text-lg">{onHand ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Par
          </p>
          <p className="text-lg">{parLevel ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Minimum
          </p>
          <p className={`text-lg ${belowMin ? "text-rose-200" : ""}`}>
            {minimum ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/60">
        <p>Vendor: {vendorName ?? "—"}</p>
        <p>
          Cost: ${costPerUnit?.toFixed(2) ?? "—"} (
          {lastInvoiceCost ? `$${lastInvoiceCost.toFixed(2)} last invoice` : "no history"})
        </p>
      </div>
    </button>
  );
}
