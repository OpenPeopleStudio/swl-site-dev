type GuestThread = {
  id: string;
  guestName: string;
  relationshipStage: "vip" | "watch" | "emerging";
  lastTouch: string;
  upcomingExperience?: string;
  memoryHook?: string;
  sentiment?: string;
};

type GuestInsightProps = {
  headline: string;
  guestThreads: GuestThread[];
  referrals?: Array<{ id: string; source: string; guest: string; status: string }>;
};

export function GuestRelationshipIntel({ headline, guestThreads, referrals = [] }: GuestInsightProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#05070f]/80 p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Guest Intelligence</p>
          <h2 className="text-2xl font-light">{headline}</h2>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {guestThreads.map((thread) => (
          <article
            key={thread.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg tracking-[0.2em] uppercase text-white/80">{thread.guestName}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                  thread.relationshipStage === "vip"
                    ? "border-emerald-400/40 text-emerald-200"
                    : thread.relationshipStage === "watch"
                      ? "border-amber-400/40 text-amber-200"
                      : "border-sky-400/40 text-sky-200"
                }`}
              >
                {thread.relationshipStage}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50">Last touch · {thread.lastTouch}</p>
            {thread.upcomingExperience && (
              <p className="mt-2 text-sm text-white/80">
                Next: {thread.upcomingExperience}
              </p>
            )}
            {thread.memoryHook && (
              <p className="mt-1 text-sm text-white/60">Memory: {thread.memoryHook}</p>
            )}
            {thread.sentiment && (
              <p className="mt-1 text-xs text-white/50">Sentiment: {thread.sentiment}</p>
            )}
          </article>
        ))}
      </div>

      {referrals.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Referral Watchlist</p>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            {referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold tracking-[0.3em] uppercase text-white/70">{referral.guest}</p>
                  <p className="text-xs text-white/50">From {referral.source}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{referral.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
