export function MenuLegend() {
  return (
    <section className="rounded-2xl border border-white/10 px-4 py-3 text-xs text-white/60 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Legend</p>
      <div className="mt-2 flex flex-wrap gap-4">
        <LegendItem colorClass="bg-emerald-300" label="On service" />
        <LegendItem colorClass="bg-amber-300" label="Prep only" />
        <LegendItem colorClass="bg-rose-400" label="86'd / off deck" />
        <LegendItem colorClass="bg-sky-300" label="Testing run" />
      </div>
    </section>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

