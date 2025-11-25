"use client";

import Link from "next/link";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
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

export default function StaffRoot() {
  return (
    <SiteShell>
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-6 2xl:px-8 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100%", width: "100%" }}>
        <PageHeader
          title="Orbital Command Surface"
          subtitle="Staff Dashboard"
        />

        <GlassSection delay={0.3}>
          <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
            Menu, inventory, events, and reflections stay in lockstep — pick your station and launch.
          </p>

          <div className="space-y-6 sm:space-y-8">
            {/* Quick Links */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-full border border-white/10 px-4 sm:px-6 py-2 text-xs sm:text-sm uppercase tracking-[0.4em] text-white/70 hover:border-white/30 hover:text-white transition-all duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Module Cards */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {moduleCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <card.icon className="size-5 text-white/60" />
                    <p className="text-xs uppercase tracking-[0.4em] text-white/50">{card.title}</p>
                  </div>
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">{card.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl sm:text-4xl font-light text-white">{card.stat}</span>
                    <ArrowRight className="size-5 text-white/40 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Signal Cards */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {signalCards.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-white/45">{signal.label}</p>
                  <p className="mt-3 text-4xl sm:text-5xl font-light text-white">{signal.value}</p>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{signal.detail}</p>
                </div>
              ))}
            </div>

            {/* Tables & Prompts Grid */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Active Tables */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Active Tables</p>
                  <Link href="/pos" className="text-xs uppercase tracking-[0.4em] text-white/60 hover:text-white transition-colors duration-300">
                    Open POS
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {tableTimelines.map((table) => (
                    <div
                      key={table.table}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white">{table.table}</p>
                        <span className="text-xs text-white/50">{table.total}</span>
                      </div>
                      <p className="text-xs text-white/60 mb-2 leading-relaxed">{table.course}</p>
                      <div className="inline-flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.4em] text-white/50">
                        <TimerReset className="size-3" />
                        {table.elapsed}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompts & Signals */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">Prompts & Signals</p>
                  <Sparkles className="size-5 text-white/60" />
                </div>
                <div className="space-y-3">
                  {prompts.map((prompt) => (
                    <article
                      key={prompt.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
                        <MessageSquareHeart className="size-3" />
                        {prompt.title}
                      </div>
                      <p className="text-sm text-white/80 mb-1 leading-relaxed">{prompt.body}</p>
                      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/40">
                        {prompt.cadence}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassSection>
      </div>
    </SiteShell>
  );
}
