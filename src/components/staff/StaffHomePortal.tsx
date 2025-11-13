"use client";

import Link from "next/link";
import {
  CalendarClock,
  ChefHat,
  ClipboardList,
  Boxes,
  Sparkles,
  MessageSquareHeart,
  ArrowRight,
  TimerReset,
} from "lucide-react";

const quickLinks = [
  { label: "Schedule", href: "/staff/schedule" },
  { label: "Menu Builder", href: "/staff/menu" },
  { label: "InventoryOS", href: "/staff/inventory" },
  { label: "Events", href: "/staff/events" },
  { label: "Reflection", href: "/staff/reflection" },
];

const moduleCards = [
  {
    title: "Schedule",
    icon: CalendarClock,
    description: "Crewed through 02:30 · cross-train block pending",
    stat: "7 shifts",
    href: "/staff/schedule",
  },
  {
    title: "Menu Builder",
    icon: ChefHat,
    description: "Aurora Ridge v9 testing · plating upload needed",
    stat: "3 drafts",
    href: "/staff/menu",
  },
  {
    title: "InventoryOS",
    icon: Boxes,
    description: "Langoustine alert · auto replenish queue ready",
    stat: "4 alerts",
    href: "/staff/inventory",
  },
  {
    title: "Events",
    icon: ClipboardList,
    description: "Rivera contract awaiting signature",
    stat: "6 requests",
    href: "/staff/events",
  },
];

const signalCards = [
  {
    label: "Next Crew Handoff",
    value: "16:45",
    detail: "FOH brief + allergy sync",
  },
  {
    label: "Current Flight",
    value: "Course IV",
    detail: "Ember Root Parfait — 18 tables in",
  },
  {
    label: "Guest Notes",
    value: "5 VIPs",
    detail: "Rivera (shellfish), Hale (paired)",
  },
];

const tableTimelines = [
  {
    table: "Dining 04",
    course: "Course III · Aurora Ridge",
    elapsed: "8m since last fire",
    total: "$512",
  },
  {
    table: "Chef 1",
    course: "Pairing Flight",
    elapsed: "2m since last pour",
    total: "$118",
  },
  {
    table: "Bar 2",
    course: "Snacks",
    elapsed: "0m · new order",
    total: "$32",
  },
  {
    table: "Dining 07",
    course: "Prelude",
    elapsed: "4m",
    total: "$0",
  },
];

const prompts = [
  {
    id: "prompt-1",
    title: "Reflection",
    body: "Where did hospitality transcend service tonight?",
    cadence: "Post-shift",
  },
  {
    id: "prompt-2",
    title: "Inventory Signal",
    body: "Capture drift > 15 minutes + attach delivery temp photo.",
    cadence: "On Arrival",
  },
];

export function StaffHomePortal() {
  return (
    <div className="flex w-full flex-col gap-8 text-white">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <p className="text-xs uppercase tracking-[0.5em] text-white/45">Snow White Laundry · Staff</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-light tracking-[0.3em]">Orbital Command Surface</h1>
            <p className="mt-2 text-sm text-white/60">
              Menu, inventory, events, and reflections stay in lockstep — pick your station and launch.
            </p>
          </div>
          <Link
            href="/staff/events"
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-5 py-2 text-xs uppercase tracking-[0.4em] text-accent hover:border-accent hover:text-white"
          >
            Live Requests
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full border border-white/15 px-4 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-white/70 hover:border-white/50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
        {moduleCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.4)] transition hover:border-white/40"
          >
            <div className="flex items-center gap-3">
              <card.icon className="size-5 text-white/60" />
              <p className="text-sm uppercase tracking-[0.4em] text-white/50">{card.title}</p>
            </div>
            <p className="mt-3 text-sm text-white/70">{card.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-light">{card.stat}</span>
              <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {signalCards.map((signal) => (
          <div
            key={signal.label}
            className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/10/60 to-transparent p-4 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/45">{signal.label}</p>
            <p className="mt-2 text-3xl font-light text-white">{signal.value}</p>
            <p className="text-sm text-white/60">{signal.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Active Tables</p>
            <Link href="/pos" className="text-xs uppercase tracking-[0.4em] text-accent hover:text-white">
              Open POS
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {tableTimelines.map((table) => (
              <div
                key={table.table}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70"
              >
                <div className="flex items-center justify-between">
                  <p className="text-white">{table.table}</p>
                  <span className="text-xs text-white/50">{table.total}</span>
                </div>
                <p className="text-xs text-white/60">{table.course}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.4em] text-white/50">
                  <TimerReset className="size-3.5" />
                  {table.elapsed}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Prompts & Signals</p>
            <Sparkles className="size-4 text-white/60" />
          </div>
          <div className="space-y-3 text-sm text-white/80">
            {prompts.map((prompt) => (
              <article
                key={prompt.id}
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                  <MessageSquareHeart className="size-3.5" />
                  {prompt.title}
                </div>
                <p className="mt-2">{prompt.body}</p>
                <p className="mt-1 text-[0.55rem] uppercase tracking-[0.4em] text-white/40">
                  {prompt.cadence}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default StaffHomePortal;
