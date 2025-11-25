import type { PrivateEvent } from "@/domains/events/lib/queries";

type HandbookProps = {
  guestEmail: string;
  events: PrivateEvent[];
};

function formatDateLabel(value?: string | null) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CustomerAiHandbook({ guestEmail, events }: HandbookProps) {
  const hasEvents = events.length > 0;
  const nextEvent =
    events.find((event) => {
      if (!event.preferred_date) return false;
      return new Date(event.preferred_date).getTime() >= Date.now();
    }) ?? events[0];

  const confirmedCount = events.filter((event) =>
    ["contract_signed", "deposit_paid", "confirmed", "completed"].includes(
      event.status ?? "",
    ),
  ).length;
  const pendingDocs = events.filter((event) => !event.proposal_pdf_url).length;

  const overshareLines = hasEvents
    ? [
        `${nextEvent?.event_type ?? "Private experience"} anchored for ${
          nextEvent?.party_size ?? "your"
        } guests · ${
          nextEvent?.preferred_date ? formatDateLabel(nextEvent.preferred_date) : "date in flux"
        }.`,
        nextEvent?.special_requests
          ? `Noted: “${nextEvent.special_requests.slice(0, 140)}${
              (nextEvent.special_requests?.length ?? 0) > 140 ? "…" : ""
            }” — chef already sketching around it.`
          : "Chef team currently sketching menu mood boards — drop any wild requests in the form and we’ll weave it in.",
        nextEvent?.deposit_paid
          ? "Deposit logged. Ceremony locked."
          : "No deposit captured yet — we’ll only send the link once you approve the PDF proposal.",
      ]
    : [
        "No experiences on file yet — the AI concierge is on standby with scent notes, lighting recs, and menu drafts.",
        "Submit the wizard above and this block starts oversharing very specific prep updates for your night.",
      ];

  const stats = [
    {
      label: "Experiences in motion",
      value: hasEvents ? `${events.length}` : "0",
      detail: hasEvents ? "Includes held dates + drafts" : "Fresh canvas",
    },
    {
      label: "Confirmed rituals",
      value: confirmedCount ? `${confirmedCount}` : "—",
      detail: "Signed or deposit-in",
    },
    {
      label: "Proposals drafting",
      value: pendingDocs ? `${pendingDocs}` : "All delivered",
      detail: pendingDocs ? "Chef is polishing PDFs" : "Latest proposal sent",
    },
  ];

  const logisticFacts = [
    {
      label: "Primary guest",
      value: guestEmail,
    },
    {
      label: "Current status",
      value: nextEvent?.status ? nextEvent.status.replace(/_/g, " ") : "Awaiting first request",
    },
    {
      label: "Menu direction",
      value: nextEvent?.menu_style ?? "Chef’s tasting (default)",
    },
    {
      label: "Budget lane",
      value: nextEvent?.budget_range ?? "Custom proposal",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10/30 via-transparent to-black/60 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-white/50">AI Handbook</p>
          <h2 className="text-2xl font-light">Oversharer mode</h2>
          <p className="text-sm text-white/70">
            {hasEvents
              ? "Live concierge notes tuned to your current experience."
              : "Once you submit details, the AI concierge starts narrating your night."}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.45em] text-white/70">
          {hasEvents ? "Signal live" : "Awaiting signal"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">{stat.label}</p>
            <p className="mt-2 text-3xl font-light">{stat.value}</p>
            <p className="text-xs text-white/60">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-white/45">Overshare feed</p>
          <div className="mt-3 space-y-3">
            {overshareLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-white/45">Logistics snapshot</p>
          <dl className="mt-3 space-y-3">
            {logisticFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40">{fact.label}</dt>
                <dd className="text-base text-white">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {nextEvent?.preferred_date && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              Next target window: <span className="text-white">{formatDateLabel(nextEvent.preferred_date)}</span>.
              We’ll nudge you if anything shifts.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
import type { PrivateEvent } from "@/domains/events/lib/queries";

type HandbookProps = {
  guestEmail: string;
  events: PrivateEvent[];
};

function formatDateLabel(value?: string | null) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function CustomerAiHandbook({ guestEmail, events }: HandbookProps) {
  const hasEvents = events.length > 0;
  const nextEvent =
    events.find((event) => {
      if (!event.preferred_date) return false;
      return new Date(event.preferred_date).getTime() >= Date.now();
    }) ?? events[0];

  const confirmedCount = events.filter((event) =>
    ["contract_signed", "deposit_paid", "confirmed", "completed"].includes(
      event.status ?? "",
    ),
  ).length;
  const pendingDocs = events.filter((event) => !event.proposal_pdf_url).length;

  const overshareLines = hasEvents
    ? [
        `${nextEvent?.event_type ?? "Private experience"} anchored for ${
          nextEvent?.party_size ?? "your"
        } guests · ${
          nextEvent?.preferred_date ? formatDateLabel(nextEvent.preferred_date) : "date in flux"
        }.`,
        nextEvent?.special_requests
          ? `Noted: “${nextEvent.special_requests.slice(0, 140)}${
              (nextEvent.special_requests?.length ?? 0) > 140 ? "…" : ""
            }” — chef already sketching around it.`
          : "Chef team currently sketching menu mood boards — drop any wild requests in the form and we’ll weave it in.",
        nextEvent?.deposit_paid
          ? "Deposit logged. Ceremony locked."
          : "No deposit captured yet — we’ll only send the link once you approve the PDF proposal.",
      ]
    : [
        "No experiences on file yet — the AI concierge is on standby with scent notes, lighting recs, and menu drafts.",
        "Submit the wizard above and this block starts oversharing very specific prep updates for your night.",
      ];

  const stats = [
    {
      label: "Experiences in motion",
      value: hasEvents ? `${events.length}` : "0",
      detail: hasEvents ? "Includes held dates + drafts" : "Fresh canvas",
    },
    {
      label: "Confirmed rituals",
      value: confirmedCount ? `${confirmedCount}` : "—",
      detail: "Signed or deposit-in",
    },
    {
      label: "Proposals drafting",
      value: pendingDocs ? `${pendingDocs}` : "All delivered",
      detail: pendingDocs ? "Chef is polishing PDFs" : "Latest proposal sent",
    },
  ];

  const logisticFacts = [
    {
      label: "Primary guest",
      value: guestEmail,
    },
    {
      label: "Current status",
      value: nextEvent?.status ? nextEvent.status.replace(/_/g, " ") : "Awaiting first request",
    },
    {
      label: "Menu direction",
      value: nextEvent?.menu_style ?? "Chef’s tasting (default)",
    },
    {
      label: "Budget lane",
      value: nextEvent?.budget_range ?? "Custom proposal",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10/30 via-transparent to-black/60 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-white/50">AI Handbook</p>
          <h2 className="text-2xl font-light">Oversharer mode</h2>
          <p className="text-sm text-white/70">
            {hasEvents
              ? "Live concierge notes tuned to your current experience."
              : "Once you submit details, the AI concierge starts narrating your night."}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.45em] text-white/70">
          {hasEvents ? "Signal live" : "Awaiting signal"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">{stat.label}</p>
            <p className="mt-2 text-3xl font-light">{stat.value}</p>
            <p className="text-xs text-white/60">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-white/45">Overshare feed</p>
          <div className="mt-3 space-y-3">
            {overshareLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.4em] text-white/45">Logistics snapshot</p>
          <dl className="mt-3 space-y-3">
            {logisticFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[0.65rem] uppercase tracking-[0.4em] text-white/40">{fact.label}</dt>
                <dd className="text-base text-white">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {nextEvent?.preferred_date && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              Next target window: <span className="text-white">{formatDateLabel(nextEvent.preferred_date)}</span>.
              We’ll nudge you if anything shifts.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

