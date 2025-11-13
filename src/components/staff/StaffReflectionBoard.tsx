"use client";

import { useMemo, useState } from "react";

export type BoardReflection = {
  id: string;
  owner: string;
  summary: string;
  createdAt: string;
  title?: string;
  tags?: string[];
  severity?: "info" | "warning" | "critical";
};

export type ReflectionPrompt = {
  id: string;
  text: string;
  cadence?: string;
};

const PILL_TONE: Record<NonNullable<BoardReflection["severity"]>, string> = {
  info: "border-sky-400/40 text-sky-100",
  warning: "border-amber-400/40 text-amber-200",
  critical: "border-rose-400/40 text-rose-200",
};

export function StaffReflectionBoard({
  initialReflections,
  prompts,
}: {
  initialReflections: BoardReflection[];
  prompts: ReflectionPrompt[];
}) {
  const [items, setItems] = useState<BoardReflection[]>(initialReflections);
  const [draft, setDraft] = useState({ owner: "", summary: "", tags: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedReflections = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  const todayCount = useMemo(
    () =>
      items.filter((item) => {
        const date = new Date(item.createdAt);
        const now = new Date();
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      }).length,
    [items],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!draft.owner.trim() || !draft.summary.trim()) {
      setError("Name and summary are required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: draft.owner.trim(),
          summary: draft.summary.trim(),
          tags: draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json()) as BoardReflection & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save reflection");
      }
      setItems((current) => [payload, ...current]);
      setDraft({ owner: "", summary: "", tags: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save reflection");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-8 rounded-[36px] border border-white/10 bg-gradient-to-br from-[#03050b] via-[#050910] to-[#020307] p-6 text-white shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Staff · Reflections</p>
          <h1 className="text-3xl font-light tracking-[0.25em]">Cortex Loop</h1>
        </div>
        <div className="flex gap-3">
          <Stat label="Entries" value={sortedReflections.length} />
          <Stat label="New today" tone="emerald" value={todayCount} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_minmax(0,0.8fr)]">
        <div className="space-y-5">
          <ReflectionFeed reflections={sortedReflections} />
        </div>
        <aside className="space-y-5">
          <PromptsPanel prompts={prompts} />
          <CapturePanel
            draft={draft}
            onChangeDraft={setDraft}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        </aside>
      </div>
    </section>
  );
}

function ReflectionFeed({ reflections }: { reflections: BoardReflection[] }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
        <span>Operational Signals</span>
        <span>{reflections.length}</span>
      </header>
      <div className="space-y-3">
        {reflections.map((reflection) => (
          <article
            key={reflection.id}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/45">
              <span>{reflection.owner}</span>
              <span>{formatTime(reflection.createdAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">
                {reflection.title ?? reflection.summary.slice(0, 64)}
              </h3>
              {reflection.severity && (
                <span
                  className={`rounded-full border px-3 py-1 text-[0.55rem] uppercase tracking-[0.35em] ${PILL_TONE[reflection.severity]}`}
                >
                  {reflection.severity}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/75">{reflection.summary}</p>
            {reflection.tags && reflection.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-[0.55rem] uppercase tracking-[0.3em] text-white/50">
                {reflection.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/15 px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function PromptsPanel({ prompts }: { prompts: ReflectionPrompt[] }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <header className="text-xs uppercase tracking-[0.4em] text-white/40">Tonight’s Prompts</header>
      <div className="space-y-3 text-sm text-white/80">
        {prompts.map((prompt) => (
          <article key={prompt.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p>{prompt.text}</p>
            {prompt.cadence && (
              <p className="mt-1 text-xs uppercase tracking-[0.35em] text-white/50">
                {prompt.cadence}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function CapturePanel({
  draft,
  onChangeDraft,
  onSubmit,
  submitting,
  error,
}: {
  draft: { owner: string; summary: string; tags: string };
  onChangeDraft: (value: { owner: string; summary: string; tags: string }) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <header className="text-xs uppercase tracking-[0.4em] text-white/40">
        Record Reflection
      </header>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={draft.owner}
          onChange={(event) => onChangeDraft({ ...draft, owner: event.target.value })}
          className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
        />
        <textarea
          rows={3}
          placeholder="What’s the signal?"
          value={draft.summary}
          onChange={(event) => onChangeDraft({ ...draft, summary: event.target.value })}
          className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
        />
        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={draft.tags}
          onChange={(event) => onChangeDraft({ ...draft, tags: event.target.value })}
          className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
        />
        {error && <p className="rounded-2xl border border-white/12 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#00FF9C] px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-[#00ff9c]/80"
        >
          {submitting ? "Saving…" : "Save Reflection"}
        </button>
      </form>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/40 text-emerald-200"
      : "border-white/15 text-white/80";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-right ${toneClass}`}>
      <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">{label}</p>
      <p className="text-2xl font-light">{value}</p>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
