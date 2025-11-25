type ReflectionPrompt = {
  id: string;
  question: string;
  context: string;
  responses?: string[];
};

type ReflectionPanelProps = {
  prompts: ReflectionPrompt[];
  gratitudeStream?: string[];
  nextCheckIn?: string;
};

export function OwnerReflectionPanel({ prompts, gratitudeStream = [], nextCheckIn }: ReflectionPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/70 p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Owner Reflection</p>
          <h2 className="text-2xl font-light">Alignment Channel</h2>
        </div>
        {nextCheckIn && (
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Next check-in · {nextCheckIn}
          </p>
        )}
      </header>

      <div className="mt-5 space-y-4">
        {prompts.map((prompt) => (
          <article
            key={prompt.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{prompt.context}</p>
            <p className="mt-1 text-lg text-white/80">{prompt.question}</p>
            {prompt.responses && prompt.responses.length > 0 && (
              <div className="mt-2 space-y-2 text-sm text-white/70">
                {prompt.responses.map((response, index) => (
                  <p key={index} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    {response}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {gratitudeStream.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Gratitude Stream</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {gratitudeStream.map((entry, index) => (
              <p key={index} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70">
                {entry}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
