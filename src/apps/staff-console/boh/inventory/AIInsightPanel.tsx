type Insight = {
  id: string;
  title: string;
  detail: string;
  severity?: "info" | "warning" | "critical";
  actionLabel?: string;
  onAction?: () => void;
};

const toneClasses: Record<
  NonNullable<Insight["severity"]>,
  string
> = {
  info: "border-sky-400/40 bg-sky-500/10 text-sky-50",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-50",
  critical: "border-rose-500/40 bg-rose-600/10 text-rose-50",
};

export function AIInsightPanel({ insights }: { insights: Insight[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            AI Forecast
          </p>
          <h2 className="text-xl font-light">Recommendations</h2>
        </div>
      </header>
      <div className="space-y-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`rounded-2xl border px-4 py-3 ${toneClasses[insight.severity ?? "info"] ?? "border-white/10 bg-white/5 text-white"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em]">
                  {insight.title}
                </p>
                <p className="mt-1 text-sm text-white/80">{insight.detail}</p>
              </div>
              {insight.actionLabel && (
                <button
                  type="button"
                  onClick={insight.onAction}
                  className="rounded-xl border border-white/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white hover:border-white/80"
                >
                  {insight.actionLabel}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
