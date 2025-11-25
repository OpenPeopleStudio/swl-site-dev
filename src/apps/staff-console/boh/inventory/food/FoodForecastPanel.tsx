type Forecast = {
  id: string;
  ingredient: string;
  trend: "up" | "down" | "steady";
  changePercent: number;
  note: string;
};

export function FoodForecastPanel({ forecasts }: { forecasts: Forecast[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Price Outlook
        </p>
        <h2 className="text-xl font-light">Cost Forecast</h2>
      </header>
      <div className="mt-4 space-y-3">
        {forecasts.map((forecast) => (
          <article
            key={forecast.id}
            className="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <div className="flex flex-wrap items-center justify-between text-sm">
              <p className="font-semibold uppercase tracking-[0.3em] text-white/70">
                {forecast.ingredient}
              </p>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  forecast.trend === "up"
                    ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                    : forecast.trend === "down"
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                      : "border-white/20 text-white/70"
                }`}
              >
                {forecast.trend === "steady"
                  ? "Stable"
                  : `${forecast.changePercent > 0 ? "+" : ""}${forecast.changePercent.toFixed(1)}%`}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">{forecast.note}</p>
          </article>
        ))}
        {forecasts.length === 0 && (
          <p className="text-sm text-white/60">
            No price forecasts available. AI will notify you once market data updates.
          </p>
        )}
      </div>
    </section>
  );
}
