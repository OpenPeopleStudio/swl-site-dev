"use client";

import type { ComponentProps } from "react";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { MenuBuilderWorkspace } from "@/apps/staff-console/manager/MenuBuilderWorkspace";

const workspaceState: ComponentProps<typeof MenuBuilderWorkspace> = {
  dishes: [
    {
      id: "aurora-ridge",
      name: "Aurora Ridge Langoustine",
      category: "Flight B · Course 4",
      status: "Testing",
      updated_at: "2024-11-12T18:00:00Z",
    },
    {
      id: "ember-root",
      name: "Ember Root Parfait",
      category: "Vegetal",
      status: "R&D",
      updated_at: "2024-11-11T11:15:00Z",
    },
    {
      id: "icefield",
      name: "Icefield Bloom",
      category: "Dessert",
      status: "Trials",
      updated_at: "2024-11-10T22:30:00Z",
    },
  ],
  activeDishId: "aurora-ridge",
  components: [
    {
      id: "spruce-glaze",
      name: "Smoked Spruce Glaze",
      technique: "Slow reduction",
      estimatedTime: "45m",
    },
    {
      id: "fire-pearl",
      name: "Fire Pearl Crumble",
      technique: "Cryo puff",
      estimatedTime: "30m",
    },
    {
      id: "langoustine-butter",
      name: "Langoustine Butter",
      technique: "Brown butter baste",
      estimatedTime: "25m",
    },
  ],
  ingredients: [
    {
      id: "langoustine",
      name: "Nord Langoustine",
      vendor: "Norð Fisheries",
      unit: "kg",
      cost: 48.5,
      aiEstimate: 51.2,
      allergenTags: ["shellfish"],
    },
    {
      id: "spruce",
      name: "Spruce Tip Syrup",
      vendor: "Calm Forest Co.",
      unit: "L",
      cost: 18.75,
      aiEstimate: 19.1,
      allergenTags: [],
    },
    {
      id: "coal-salt",
      name: "Coal Salt",
      vendor: "House Blend",
      unit: "kg",
      cost: 6.2,
      aiEstimate: 6.4,
      allergenTags: [],
    },
    {
      id: "butter",
      name: "Browned Jersey Butter",
      vendor: "Snow Ridge Dairy",
      unit: "kg",
      cost: 9.4,
      aiEstimate: 9.5,
      allergenTags: ["dairy"],
    },
  ],
  costMetrics: [
    { label: "COGS", value: "31.4%", trend: "down" },
    { label: "Labour Band", value: "22.1%", trend: "flat" },
    { label: "Prep Hours", value: "11.5h", trend: "up" },
  ],
  allergens: ["Shellfish", "Dairy", "Citrus Oil", "Pine"],
  versionHistory: [
    {
      id: "v9",
      label: "Aurora v9",
      date: "Nov 12",
      notes: "Reduced glaze sweetness + added char.",
      deltaCost: "-$0.42",
    },
    {
      id: "v8",
      label: "Aurora v8",
      date: "Nov 9",
      notes: "Introduced coal salt chip for texture.",
    },
    {
      id: "v7",
      label: "Aurora v7",
      date: "Nov 5",
      notes: "Langoustine tail hydrated in spruce oil.",
    },
  ],
  platingAssets: [
    {
      id: "shot-1",
      photoUrl:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      annotations: "Keep glaze anchored at 3 o'clock · brighten micro herbs.",
    },
    {
      id: "shot-2",
      photoUrl:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=600&q=80",
      annotations: "Coal crumble hugging the shell – avoid covering pearl.",
    },
  ],
  chefChat: [
    {
      id: "chat-1",
      author: "Chef Orion",
      content: "Need a brighter hit on the glaze — try citrus vapour?",
      timestamp: "09:42",
    },
    {
      id: "chat-2",
      author: "Aya",
      content: "Reducing shiso micro batch for tonight. 30 covers ready.",
      timestamp: "10:05",
      outgoing: true,
    },
    {
      id: "chat-3",
      author: "Ken",
      content: "Confirming langoustine delivery ETA 14:00.",
      timestamp: "10:18",
    },
  ],
  prepSummary: {
    covers: 46,
    batches: [
      { label: "Spruce glaze", qty: "2.5L", due: "15:30" },
      { label: "Coal crumble", qty: "1 tray", due: "16:45" },
      { label: "Langoustine tails", qty: "48 pcs", due: "17:10" },
    ],
    alerts: ["Langoustine lead time down to 12h", "Need back-up dairy-free glaze"],
  },
};

export default function StaffMenuPage() {
  return (
    <SiteShell>
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-6 2xl:px-8 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100%", width: "100%" }}>
        <PageHeader
          title="Menu Builder"
          subtitle="Live Development Queue"
        />

        <GlassSection delay={0.3}>
          <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
            Calm snapshot of active dishes, prep load, and allergen flags. Plan, price, and deploy new menu experiences.
          </p>

          <div className="space-y-6 sm:space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              {workspaceState.costMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">{metric.label}</p>
                  <p className="mt-3 text-3xl sm:text-4xl font-light text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">Trend · {metric.trend}</p>
                </div>
              ))}
            </div>

            <MenuBuilderWorkspace {...workspaceState} />
          </div>
        </GlassSection>
      </div>
    </SiteShell>
  );
}
