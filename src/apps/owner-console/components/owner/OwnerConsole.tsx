"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MenuBuilderWorkspace } from "./MenuBuilderWorkspace";
import { OwnerMenuSectionsPreview } from "./OwnerMenuSectionsPreview";

type Snapshot = {
  label: string;
  value: string;
  delta?: string;
  tone?: "stable" | "caution" | "critical";
  detail?: string;
};

type Panel = {
  id: string;
  title: string;
  description: string;
  items: { label: string; value: string; hint?: string; tone?: "calm" | "warn" }[];
};

type DeepLayer = {
  id: string;
  title: string;
  summary: string;
  action: string;
  component?: "menuBuilder";
};

const MOCK_SNAPSHOTS: Snapshot[] = [
  {
    label: "Staff Readiness",
    value: "84",
    detail: "Quiet fatigue in BOH. Two burnout pings.",
  },
  {
    label: "Guest Load",
    value: "82 covers",
    delta: "+6 VIP",
    detail: "High allergy complexity at 7pm seating.",
  },
  {
    label: "Prep Health",
    value: "Bottleneck",
    tone: "caution",
    detail: "Fermented carrots short by 12 portions.",
  },
  {
    label: "Inventory Pressure",
    value: "Amber",
    tone: "critical",
    detail: "Oyster allotment dependent on 3pm vendor arrival.",
  },
  {
    label: "Financial Pacing",
    value: "Margin steady",
    detail: "Labour 2% over target · COGS within band.",
  },
  {
    label: "Vibe Forecast",
    value: "Focused",
    detail: "Weather chill + menu intensity = low chatter service.",
  },
];

const MOCK_PANELS: Panel[] = [
  {
    id: "scheduling",
    title: "Scheduling & Staffing",
    description: "Conflict scan · shift density · recommended swaps.",
    items: [
      { label: "Tonight", value: "FOH +1, BOH balanced" },
      { label: "Pairings", value: "Kenji ⇄ Mara", hint: "speed + calm" },
      { label: "Critical Role", value: "Sommelier backup missing", tone: "warn" },
    ],
  },
  {
    id: "prep",
    title: "Prep Engine",
    description: "Prep hours · scaling · allergen flags.",
    items: [
      { label: "Hours Required", value: "11.5", hint: "4 assigned" },
      { label: "Bottleneck", value: "Ferments station behind 35 min", tone: "warn" },
      { label: "Allergen Alerts", value: "3 components" },
    ],
  },
  {
    id: "foodInventory",
    title: "Food InventoryOS",
    description: "Spoilage, vendor drift, volatile items.",
    items: [
      { label: "Shortage Risk", value: "Langoustine (12 hrs lead)", tone: "warn" },
      { label: "Waste", value: "1.2% (stable)" },
      { label: "Vendor Drift", value: "Norð shipping delayed", tone: "warn" },
    ],
  },
  {
    id: "alcoholInventory",
    title: "Alcohol InventoryOS",
    description: "Variance & pairing readiness.",
    items: [
      { label: "Variance", value: "+0.6%", tone: "warn" },
      { label: "Keg Status", value: "Stout 84% · Saison 41%" },
      { label: "Pairings", value: "Shiso Spritz resupply pending", tone: "warn" },
    ],
  },
  {
    id: "menuHealth",
    title: "Menu Health",
    description: "COGS · complexity · readiness.",
    items: [
      { label: "Stability", value: "High", hint: "New dish bedding in" },
      { label: "COGS", value: "31.2%", tone: "warn" },
      { label: "Dependency Risk", value: "Atlantic uni" },
    ],
  },
  {
    id: "fohFlow",
    title: "FOH Flow Forecast",
    description: "Table pacing · server load · experience notes.",
    items: [
      { label: "Pacing", value: "7:45 pinch", tone: "warn" },
      { label: "Load Dist.", value: "Nora heavy (6 tables)" },
      { label: "Notes", value: "VIP table 12 prefer Mara" },
    ],
  },
  {
    id: "vendorIntel",
    title: "Vendor Intelligence",
    description: "Deliveries today · issues · reliability.",
    items: [
      { label: "Today", value: "5 deliveries" },
      { label: "Issues", value: "Hoshino produce temp swing", tone: "warn" },
      { label: "Reliability", value: "92 · stable" },
    ],
  },
  {
    id: "crisis",
    title: "Crisis Monitor",
    description: "Equipment · weather · callouts.",
    items: [
      { label: "Equipment", value: "Dish machine recal 18:00", tone: "warn" },
      { label: "Staff", value: "Sous sick backup assigned" },
      { label: "Weather", value: "Calm · on-time arrivals" },
    ],
  },
];

const MOCK_DEEP_LAYERS: DeepLayer[] = [
  {
    id: "menuBuilder",
    title: "Menu Builder",
    summary: "Version diffs · R&D queue · plating narratives.",
    action: "Open Menu Builder",
    component: "menuBuilder",
  },
  {
    id: "inventoryDeep",
    title: "Inventory Deep Dive",
    summary: "Receiving · waste · expiry predictions.",
    action: "Review InventoryOS",
  },
  {
    id: "skillTrees",
    title: "Skill Trees",
    summary: "Role progression · certification cadence.",
    action: "Open Staff Growth",
  },
  {
    id: "guestMemory",
    title: "Guest Memory",
    summary: "Returning guest DNA · preference threads.",
    action: "Open Guest Memory",
  },
  {
    id: "financials",
    title: "Financial Engine",
    summary: "Variance · pacing · cash flow signals.",
    action: "Open Financial Engine",
  },
  {
    id: "sop",
    title: "SOP Library",
    summary: "Updated playbooks · crisis rituals.",
    action: "View SOP Library",
  },
  {
    id: "whatIf",
    title: "What-If Simulator",
    summary: "AI scenarios: shortages, spike, callouts.",
    action: "Launch Sim",
  },
];

export function OwnerConsole() {
  const zoneOne = useMemo(() => MOCK_SNAPSHOTS, []);
  const zoneTwo = useMemo(() => MOCK_PANELS, []);
  const zoneThree = useMemo(() => MOCK_DEEP_LAYERS, []);
  const [menuBuilderOpen, setMenuBuilderOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col gap-10 bg-[#02030a] px-6 pb-24 pt-12 text-white">
      <header className="text-center">
        <p className="text-[0.65rem] uppercase tracking-[0.5em] text-white/40">Owner Console</p>
        <h1 className="mt-2 text-4xl font-light tracking-[0.2em] text-white">
          Snow White Laundry · Control Surface
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Only signal — staffing, guests, inventory, finance, crisis.
        </p>
      </header>

      <section className="space-y-4">
        <ZoneLabel title="Immediate Awareness" />
        <div className="grid gap-4 rounded-[36px] border border-white/5 bg-white/[0.02] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl sm:grid-cols-2 lg:grid-cols-3">
          {zoneOne.map((snapshot) => (
            <SnapshotCard key={snapshot.label} snapshot={snapshot} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <ZoneLabel title="Operational Panels" subtitle="Correct course · collapse on demand" />
        <div className="space-y-4">
          {zoneTwo.map((panel, index) => (
            <OperationalPanel key={panel.id} panel={panel} delay={index * 0.05} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <ZoneLabel title="Deep Layers" subtitle="Only on demand · clean surface by default" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zoneThree.map((layer) => (
            <DeepLayerTile
              key={layer.id}
              layer={layer}
              onOpen={() => {
                if (layer.component === "menuBuilder") {
                  setMenuBuilderOpen(true);
                }
              }}
            />
          ))}
        </div>
      </section>

      {menuBuilderOpen && <MenuBuilderSheet onClose={() => setMenuBuilderOpen(false)} />}
    </div>
  );
}

function ZoneLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <p className="text-[0.65rem] uppercase tracking-[0.45em] text-white/40">{title}</p>
      {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
    </div>
  );
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const tone =
    snapshot.tone === "critical"
      ? "text-rose-200 border-rose-400/40"
      : snapshot.tone === "caution"
        ? "text-amber-200 border-amber-300/40"
        : "text-white border-white/10";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-2 rounded-3xl border bg-white/5 p-4 ${tone}`}
    >
      <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">{snapshot.label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-2xl font-light tracking-[0.2em]">{snapshot.value}</p>
        {snapshot.delta && (
          <span className="rounded-full border border-white/20 px-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/60">
            {snapshot.delta}
          </span>
        )}
      </div>
      {snapshot.detail && <p className="text-xs text-white/60">{snapshot.detail}</p>}
    </motion.article>
  );
}

function OperationalPanel({ panel, delay }: { panel: Panel; delay: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay }}
      className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/45">{panel.title}</p>
          <p className="text-sm text-white/60">{panel.description}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-1 text-[0.58rem] uppercase tracking-[0.45em] text-white/70 hover:border-white/40"
        >
          Collapse
        </button>
      </div>
      <div className="mt-4 divide-y divide-white/10 text-sm text-white/75">
        {panel.items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">
                {item.label}
              </p>
              {item.hint && <p className="text-xs text-white/55">{item.hint}</p>}
            </div>
            <p className={`text-sm ${item.tone === "warn" ? "text-amber-200" : "text-white"}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function DeepLayerTile({ layer, onOpen }: { layer: DeepLayer; onOpen?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.02] p-4"
    >
      <p className="text-[0.58rem] uppercase tracking-[0.4em] text-white/45">{layer.title}</p>
      <p className="text-sm text-white/65">{layer.summary}</p>
      <button
        type="button"
        className="mt-auto w-full rounded-full border border-white/20 px-4 py-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/80 hover:border-white/50"
        onClick={onOpen}
      >
        {layer.action}
      </button>
    </motion.div>
  );
}

function MenuBuilderSheet({ onClose }: { onClose: () => void }) {
  const data = MOCK_MENU_BUILDER_DATA;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
    >
      <div className="relative h-[90vh] w-[92vw] max-w-[1400px] overflow-hidden rounded-[36px] border border-white/10 bg-[#05060f] p-6 shadow-[0_40px_160px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-white/20 px-4 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-white/70 hover:border-white/50"
        >
          Close
        </button>
        <div className="mt-10 h-full space-y-8 overflow-y-auto pr-2">
          <OwnerMenuSectionsPreview />
          <MenuBuilderWorkspace {...data} />
        </div>
      </div>
    </motion.div>
  );
}

const MOCK_MENU_BUILDER_DATA = {
  dishes: [
    {
      id: "relic",
      name: "Relic Oyster",
      category: "Amuse",
      status: "Live" as const,
      updated_at: new Date().toISOString(),
    },
    {
      id: "ember",
      name: "Ember Beet",
      category: "Vegetable",
      status: "Testing" as const,
      updated_at: new Date().toISOString(),
    },
  ],
  activeDishId: "relic",
  components: [
    { id: "comp-1", name: "Cold smoke", technique: "Cold smoke", estimatedTime: "1h" },
    { id: "comp-2", name: "Sea lettuce crisp", technique: "Dehydrate", estimatedTime: "6h" },
  ],
  ingredients: [
    {
      id: "ing-1",
      name: "Oyster",
      vendor: "Tide & Co",
      unit: "ea",
      cost: 4.5,
    },
    {
      id: "ing-2",
      name: "Sea lettuce",
      vendor: "Norð",
      unit: "kg",
      cost: 19,
    },
  ],
  costMetrics: [
    { label: "Dish COGS", value: "31%", trend: "up" as const },
    { label: "Prep Hours", value: "5.4h", trend: "down" as const },
  ],
  allergens: ["Shellfish", "Allium"],
  versionHistory: [
    { id: "v3", label: "v3", date: "Aug 08", notes: "Stabilized gel", deltaCost: "-0.4%" },
    { id: "v2", label: "v2", date: "Jul 30", notes: "Introduced smoke dome", deltaCost: "+0.3%" },
  ],
  platingAssets: [
    { id: "asset-1", photoUrl: "/placeholder/plating-1.jpg", annotations: "Lens flare caution" },
  ],
  chefChat: [
    {
      id: "msg-1",
      author: "Tom",
      content: "Need a leaner smoke profile — consider cedar",
      timestamp: "09:12",
    },
    {
      id: "msg-2",
      author: "Ken",
      content: "Testing cedar this afternoon",
      timestamp: "09:15",
      outgoing: true,
    },
  ],
  prepSummary: {
    covers: 42,
    batches: [
      { label: "Fermented carrots", qty: "2", due: "15:00" },
      { label: "Smoke pearls", qty: "1", due: "17:00" },
    ],
    alerts: ["Need fresh cedar by 14:00"],
  },
};

export default OwnerConsole;
