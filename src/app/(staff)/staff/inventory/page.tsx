"use client";

import { InventoryTopBar } from "@/apps/staff-console/boh/inventory/InventoryTopBar";
import { InventorySidebar } from "@/apps/staff-console/boh/inventory/InventorySidebar";
import { InventorySearchBar } from "@/apps/staff-console/boh/inventory/InventorySearchBar";
import { InventoryNotesPanel } from "@/apps/staff-console/boh/inventory/InventoryNotesPanel";
import { AIInsightPanel } from "@/apps/staff-console/boh/inventory/AIInsightPanel";
import { VendorInsightPanel } from "@/apps/staff-console/boh/inventory/VendorInsightPanel";

const sidebarSections = [
  {
    title: "Programs",
    items: [
      { label: "Overview", href: "/staff/inventory", status: "ok" as const, isActive: true },
      { label: "Food · Deep Dive", href: "/staff/inventory/food", status: "warning" as const, badge: "live" },
      { label: "Spirits", href: "/staff/inventory", status: "ok" as const, badge: "soon" },
      { label: "Linen", href: "/staff/inventory", status: "ok" as const },
    ],
  },
  {
    title: "Automation",
    items: [
      { label: "Auto-replenish", href: "/staff/inventory", status: "warning" as const },
      { label: "Waste telemetry", href: "/staff/inventory", status: "ok" as const },
      { label: "Vendors", href: "/staff/inventory", status: "alert" as const, badge: "3" },
    ],
  },
];

const alertChips = [
  { id: "langoustine", label: "Langoustine below par", tone: "warning" as const },
  { id: "spruce", label: "Spruce syrup 18h lead", tone: "info" as const },
];

const noteFeed = [
  {
    id: "note-1",
    author: "Ken",
    body: "Nord delivery drifted +22 minutes. Logged temp at 1.6°C.",
    timestamp: "09:45",
    tags: ["vendor", "cold-chain"],
  },
  {
    id: "note-2",
    author: "Aya",
    body: "Coal crumble batch yielded 8% more dust. Adjusting sieve.",
    timestamp: "10:20",
    tags: ["prep"],
  },
  {
    id: "note-3",
    author: "Tom",
    body: "FoH flagged dairy-free glaze shortage — rerouting to prep queue.",
    timestamp: "11:10",
    tags: ["allergen"],
  },
];

const insightItems = [
  {
    id: "insight-1",
    title: "Shellfish Risk",
    detail: "Langoustine buffer hits zero in 18h. Suggest pulling 2kg from reserve vendor.",
    severity: "critical" as const,
    actionLabel: "Patch Order",
  },
  {
    id: "insight-2",
    title: "Spruce Tip Trend",
    detail: "Usage up 14% week-over-week due to Prelude glaze. Confirm next harvest slot.",
    severity: "warning" as const,
  },
  {
    id: "insight-3",
    title: "Waste",
    detail: "Trim loss dipped to 1.1% after new cryo batch. Keep monitoring.",
    severity: "info" as const,
  },
];

const vendors = [
  {
    name: "Norð Fisheries",
    punctuality: 9.2,
    drift: 1.8,
    reliability: 9.0,
    notes: "Requesting heads-up before Friday storms.",
  },
  {
    name: "Snow Ridge Dairy",
    punctuality: 8.6,
    drift: -0.4,
    reliability: 8.9,
    notes: "Dairy-free butter alt ready next week.",
  },
  {
    name: "Calm Forest Co.",
    punctuality: 7.8,
    drift: 2.2,
    reliability: 8.0,
    notes: "Spruce syrup limited — ration this week.",
  },
];

const hintChips = ["Langoustine", "Dairy-free glaze", "Waste < 2%", "Vendor drift"];

const storageMetrics = [
  {
    id: "freezer",
    title: "Freezer Orbit",
    level: 68,
    eta: "Stable",
    note: "Langoustine occupying 42%",
  },
  {
    id: "prep",
    title: "Prep Lab",
    level: 54,
    eta: "Restock 3h",
    note: "Spruce glaze runs tonight",
  },
  {
    id: "linen",
    title: "Linen Vault",
    level: 82,
    eta: "Healthy",
    note: "Next delivery Friday",
  },
];

const summaryTiles = [
  { id: "alerts", label: "Active alerts", value: "2", detail: "Langoustine · Spruce" },
  { id: "automation", label: "Automation", value: "Auto replenish", detail: "Waste telemetry normal" },
  { id: "sync", label: "Last sync", value: "14:32", detail: "Supabase functions" },
];

export default function InventoryPage() {
  return (
    <div className="flex w-full flex-col gap-6 text-white">
      <InventoryTopBar title="InventoryOS" timestamp="Synced 14:32" alerts={alertChips} />
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {summaryTiles.map((tile) => (
            <div key={tile.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">{tile.label}</p>
              <p className="mt-2 text-2xl font-light">{tile.value}</p>
              <p className="text-xs text-white/60">{tile.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-col gap-6 xl:flex-row">
        <InventorySidebar sections={sidebarSections} footerText="Auto-syncs every hour via Supabase functions." />
        <div className="flex-1 space-y-6">
          <InventorySearchBar dataHints={hintChips} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <InventoryNotesPanel notes={noteFeed} />
            <AIInsightPanel insights={insightItems} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {storageMetrics.map((metric) => (
              <section
                key={metric.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              >
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">{metric.title}</p>
                <p className="mt-2 text-3xl font-light">{metric.level}%</p>
                <p className="text-xs text-white/60">{metric.eta}</p>
                <p className="mt-3 text-sm text-white/70">{metric.note}</p>
              </section>
            ))}
          </div>
          <section className="rounded-3xl border border-dashed border-white/20 bg-white/0 p-5 text-sm text-white/60">
            <p>
              Need the granular dashboard? Jump into{" "}
              <span className="text-white">Food InventoryOS</span> for live Supabase data, auto-replenish rituals,
              and vendor telemetry.
            </p>
          </section>
        </div>
        <div className="w-full space-y-6 xl:max-w-sm">
          <VendorInsightPanel vendors={vendors} />
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#14182c] to-[#05070f] p-5 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Next Checks</p>
            <ul className="mt-3 space-y-2">
              <li>· Confirm langoustine reserve pull (14:00)</li>
              <li>· Update allergen badges after Prelude push</li>
              <li>· Archive Nord drift log for owner review</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
