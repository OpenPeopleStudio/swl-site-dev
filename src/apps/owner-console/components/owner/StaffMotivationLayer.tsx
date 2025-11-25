type RecognitionHighlight = {
  id: string;
  staffer: string;
  role: string;
  impact: string;
  metricDelta?: string;
};

type RitualPulse = {
  id: string;
  title: string;
  cadence: string;
  status: "scheduled" | "in-progress" | "done";
  note?: string;
};

type MotivationLayerProps = {
  energyIndex: number; // 0-100 composite pulled from SchedulingOS + Prep Engine
  recognitionQueue: RecognitionHighlight[];
  rituals: RitualPulse[];
  sentimentSnippet?: string;
};

export function StaffMotivationLayer({
  energyIndex,
  recognitionQueue,
  rituals,
  sentimentSnippet,
}: MotivationLayerProps) {
  const pulseTone =
    energyIndex > 80 ? "text-emerald-300" : energyIndex > 60 ? "text-sky-200" : energyIndex > 40 ? "text-amber-200" : "text-rose-200";

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/60 to-black/80 p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Motivation & Recognition</p>
          <h2 className="text-2xl font-light">Staff Pulse</h2>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Energy Index</p>
          <p className={`text-4xl font-light ${pulseTone}`}>{energyIndex}</p>
        </div>
      </header>

      {sentimentSnippet && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
          {sentimentSnippet}
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Recognition Queue</p>
          <div className="mt-3 space-y-3 text-sm text-white/80">
            {recognitionQueue.map((highlight) => (
              <div key={highlight.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold tracking-[0.3em] uppercase">{highlight.staffer}</p>
                  <span className="text-xs text-white/50">{highlight.role}</span>
                </div>
                <p className="mt-2 text-white/70">{highlight.impact}</p>
                {highlight.metricDelta && (
                  <p className="mt-1 text-xs text-white/50">{highlight.metricDelta}</p>
                )}
              </div>
            ))}
            {recognitionQueue.length === 0 && (
              <p className="text-white/50">No pending shout-outs — review Prep Engine logs for new wins.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Team Rituals</p>
          <div className="mt-3 space-y-3 text-sm text-white/80">
            {rituals.map((ritual) => (
              <div key={ritual.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="font-semibold tracking-[0.2em] uppercase text-white/70">{ritual.title}</p>
                  <p className="text-xs text-white/50">{ritual.cadence}</p>
                  {ritual.note && <p className="text-xs text-white/60">{ritual.note}</p>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    ritual.status === "done"
                      ? "border-emerald-400/40 text-emerald-200"
                      : ritual.status === "in-progress"
                        ? "border-sky-400/40 text-sky-100"
                        : "border-white/20 text-white/60"
                  }`}
                >
                  {ritual.status}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
