type AutoReplenishRecommendation = {
  id: string;
  ingredient: string;
  recommendedQuantity: number;
  unit: string;
  vendor?: string;
  eta?: string;
  reasoning?: string;
};

export function FoodAutoReplenishPanel({
  recommendations,
}: {
  recommendations: AutoReplenishRecommendation[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Auto-Replenish
          </p>
          <h2 className="text-xl font-light">AI Order Suggestions</h2>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        {recommendations.map((rec) => (
          <article
            key={rec.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex flex-wrap items-center justify-between text-sm">
              <p className="font-semibold uppercase tracking-[0.3em] text-white/70">
                {rec.ingredient}
              </p>
              <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/70">
                {rec.recommendedQuantity} {rec.unit}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/60">
              <p>Vendor: {rec.vendor ?? "Best fit"}</p>
              {rec.eta && <p>Needed by: {rec.eta}</p>}
              {rec.reasoning && <p className="mt-1 text-white/70">{rec.reasoning}</p>}
            </div>
          </article>
        ))}
        {recommendations.length === 0 && (
          <p className="text-sm text-white/60">No reorder suggestions right now.</p>
        )}
      </div>
    </section>
  );
}
