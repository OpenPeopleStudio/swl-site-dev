"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { StarField } from "@/components/design/StarField";
import { RestaurantSchema } from "@/lib/jsonld-components";

/**
 * Layout map:
 * - Hero cluster (breadcrumbs line + wordmark + ethos + opening details).
 * - Narrative block → craft triad → future paths rail → team snapshot → location & opening.
 * - Stay-connected footer with mailing list stub.
 * Future sections (Reservations, Menu, Journal, Press) can slot between the craft triad and team block without reworking shell.
 */

const aboutCopy = [
  "Snow White Laundry is a small, high-attention dining room opening in Spring 2026 at 281 Water Street, St. John’s, Newfoundland & Labrador.",
  "We treat a night in the restaurant as more than dinner. Every choice—how a dish is built, how a guest is greeted—begins with intention, is shaped through craft, and aims at an honest emotional response.",
  "The room stays intimate, the menu moves with the North Atlantic seasons, and the service stays precise without tipping into ceremony.",
];

const anchorPoints = [
  "Focused seats so each table is fully seen.",
  "Menu that shifts with North Atlantic waters and producers.",
  "Service that is disciplined, warm, and unscripted.",
];

const craftTenets = [
  {
    title: "Intention",
    detail:
      "Nothing is accidental. From the first email to the last glass of wine, each step is considered so guests feel looked after, not managed.",
  },
  {
    title: "Emotion",
    detail:
      "A restaurant is a place for feeling—laughter at the bar, quiet at the table, a small moment of surprise between courses.",
  },
  {
    title: "Craft",
    detail:
      "Technique and discipline turn intention into something guests can taste, hear, and feel. Craft makes restraint visible.",
  },
];

const team = [
  {
    name: "Ken Pittman",
    role: "Head Chef",
    detail: "Leads the kitchen with clarity and restraint, letting the best of Newfoundland and Labrador stay at the center.",
  },
  {
    name: "Tom Lane",
    role: "General Manager",
    detail: "Shapes the flow of the room so structure fades into the background and the night moves with intention.",
  },
];

const futurePaths = [
  { label: "Reservations", note: "Opens closer to service so we can honor every seat." },
  { label: "Menus", note: "Seasonal menus publish once testing holds steady." },
  { label: "Signals", note: "A quiet channel for guest reflections after opening." },
];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/snowwhitelaundry" },
  { label: "Facebook", href: "https://www.facebook.com/snowwhitelaundry" },
];

const mapHref = "https://maps.google.com/?q=281%20Water%20Street%2C%20St.%20John%27s%2C%20NL";

type JournalEntry = {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  tone: "build" | "signal";
};

// TODO[DATA]: Source journalEntries from Supabase once the updates feed is live.
const journalEntries: JournalEntry[] = [
  {
    id: "landing-alignment",
    dateLabel: "November 2025",
    title: "Landing page aligned with the console",
    summary:
      "Public entry now mirrors the breadcrumbs + star-field ethos so the first impression matches the rooms our team already inhabits.",
    tone: "build",
  },
  {
    id: "mailing-list-supabase",
    dateLabel: "November 2025",
    title: "Mailing list wired directly into Supabase",
    summary:
      "Every email submitted here now lands in the mailing_list_signups table, which means updates only go out when we have something honest to share.",
    tone: "signal",
  },
];

export default function Landing() {
  return (
    <>
      <RestaurantSchema />
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <StarField className="-z-20 opacity-80 pointer-events-none" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black via-black/70 to-black"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-24 px-4 py-12 sm:px-6 sm:py-16 md:px-10 lg:px-12">
          <motion.header
            className="space-y-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-wrap items-center gap-3 text-[0.6rem] uppercase tracking-[0.4em] text-white/50">
              <span>Snow White Laundry</span>
              <span className="text-white/25">/</span>
              <span>Public orbit</span>
              <span className="text-white/25">/</span>
              <span>Landing</span>
            </div>

            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Opening Spring 2026 • 281 Water Street, St. John&apos;s, NL
              </p>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-eurostile, "Eurostile"), "Bank Gothic", sans-serif' }}
              >
                Snow White Laundry
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-3xl leading-relaxed">
                Through intention, and craft, we inspire emotion in everything we do.
              </p>
            </div>
          </motion.header>

          <motion.section
            className="space-y-6 border-l border-white/15 pl-6 sm:pl-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="About the restaurant"
          >
            {aboutCopy.map((paragraph) => (
              <p key={paragraph} className="text-sm sm:text-base leading-relaxed text-white/80">
                {paragraph}
              </p>
            ))}
            <ul className="mt-6 space-y-3 text-sm text-white/60">
              {anchorPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1 h-px w-6 bg-white/30" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section
            className="grid gap-10 md:grid-cols-3"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Intention, emotion, craft"
          >
            {craftTenets.map((tenet) => (
              <article key={tenet.title} className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{tenet.title}</p>
                <p className="text-sm text-white/80 leading-relaxed">{tenet.detail}</p>
              </article>
            ))}
          </motion.section>

          <motion.section
            className="space-y-4"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Future site structure"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Future paths</p>
            <div className="flex flex-wrap gap-6 text-sm text-white/60">
              {futurePaths.map((path) => (
                <div key={path.label} className="space-y-2">
                  <span className="rounded-full border border-white/15 px-4 py-2 tracking-[0.2em] uppercase text-[0.65rem]">
                    {path.label}
                  </span>
                  <p className="max-w-[14rem] text-xs text-white/40">{path.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">Journal is live below; the remaining paths unlock when those systems are real.</p>
          </motion.section>

          <motion.section
            className="space-y-6 border-l border-white/15 pl-6 sm:pl-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Journal updates"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Journal / Updates</p>
              <span className="text-[0.6rem] uppercase tracking-[0.35em] text-white/40">Live</span>
            </div>
            <div className="space-y-6">
              {journalEntries.map((entry) => (
                <article key={entry.id} className="space-y-2 text-white/80">
                  <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/40">{entry.dateLabel}</p>
                  <h3 className="text-base font-light tracking-[0.08em] text-white">{entry.title}</h3>
                  <p className="text-sm leading-relaxed text-white/70">{entry.summary}</p>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="space-y-6"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Team"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Team</p>
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              {team.map((person) => (
                <article key={person.name} className="space-y-2 text-sm text-white/80 sm:max-w-[18rem]">
                  <p className="text-white text-sm uppercase tracking-[0.25em]">
                    {person.name}
                    <span className="text-white/40"> — {person.role}</span>
                  </p>
                  <p className="text-white/70">{person.detail}</p>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="space-y-4 border-t border-white/10 pt-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Opening details"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Opening Spring 2026</p>
            <div className="space-y-2 text-sm sm:text-base text-white/80">
              <p>281 Water Street</p>
              <p>St. John&apos;s, Newfoundland & Labrador</p>
            </div>
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-white/80 transition hover:border-white/60"
            >
              View on Maps
              <span aria-hidden="true">↗</span>
            </a>
          </motion.section>

          <motion.section
            className="space-y-6 border-t border-white/10 pt-8"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.8 }}
            aria-label="Stay connected"
          >
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Stay connected</p>
              <p className="text-sm text-white/70 max-w-xl">
                We will share quiet updates in the lead-up to opening night. Leave your email and we will write when there is
                something real to say.
              </p>
            </div>
            <MailingListForm />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Follow along</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </>
  );
}

function MailingListForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/mailing-list/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; duplicate?: boolean };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save email.");
      }

      setEmail("");
      setStatus("success");
      setMessage(
        payload.duplicate
          ? "You are already on the list — thank you for waiting with us."
          : "We will reach out once there is something real to share.",
      );
    } catch (error) {
      console.error("Mailing list submission failed", error);
      setStatus("error");
      setMessage("Something went wrong. Please try again soon.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor="landing-email">
        Email address
      </label>
      <input
        id="landing-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        placeholder="email@example.com"
        className="flex-1 rounded-none border-b border-white/30 bg-transparent px-0 py-3 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none disabled:cursor-not-allowed"
        disabled={status === "submitting"}
      />
      <button
        type="submit"
        className="w-full sm:w-auto rounded-full border border-white/30 px-6 py-3 text-[0.7rem] uppercase tracking-[0.35em] text-white transition hover:border-white/70 disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/40"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending" : "Notify me"}
      </button>
      <p className="text-xs text-white/50 sm:ml-4" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
