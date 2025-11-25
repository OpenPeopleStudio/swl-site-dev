type VendorMetric = {
  name: string;
  punctuality: number;
  drift: number;
  reliability: number;
  notes?: string;
};

type VendorInsightPanelProps = {
  vendors: VendorMetric[];
};

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function VendorInsightPanel({ vendors }: VendorInsightPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Vendor Intelligence
          </p>
          <h2 className="text-xl font-light">Reliability Matrix</h2>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        {vendors.map((vendor) => (
          <article
            key={vendor.name}
            className="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold tracking-[0.2em] text-white/70 uppercase">
                {vendor.name}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">
                  {vendor.punctuality.toFixed(1)} / 10
                </span>
                <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-100">
                  {vendor.reliability.toFixed(1)} / 10
                </span>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-200">
                  Drift {formatPercent(vendor.drift)}
                </span>
              </div>
            </div>
            {vendor.notes && (
              <p className="mt-2 text-sm text-white/60">{vendor.notes}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
