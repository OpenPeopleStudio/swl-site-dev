type HorizonSlice = {
  id: string;
  label: string;
  window: string;
  focusAreas: string[];
  riskFlag?: string;
  dependences?: string[];
  cta?: string;
};

type OwnerTimeHorizonProps = {
  slices: HorizonSlice[];
};

export function OwnerTimeHorizonView({ slices }: OwnerTimeHorizonProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-black/70 via-[#040814] to-black/70 p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Time Horizon</p>
        <h2 className="text-2xl font-light">Owner Perspective</h2>
      </header>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {slices.map((slice) => (
          <article
            key={slice.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">{slice.label}</p>
            <p className="text-lg text-white/80">{slice.window}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {slice.focusAreas.map((focus) => (
                <li key={focus} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  {focus}
                </li>
              ))}
            </ul>
            {slice.dependences && (
              <div className="mt-3 text-xs text-white/50">
                Dependencies: {slice.dependences.join(", ")}
              </div>
            )}
            {slice.riskFlag && (
              <p className="mt-2 rounded-full border border-amber-400/40 px-3 py-1 text-xs text-amber-200">
                {slice.riskFlag}
              </p>
            )}
            {slice.cta && (
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/60">
                {slice.cta}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
