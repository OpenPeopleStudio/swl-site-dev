"use client";

import { useMemo } from "react";
import { Sparkles, MessageCircle } from "lucide-react";

type DishSummary = {
  id: string;
  name: string;
  category: string;
  status: "R&D" | "Testing" | "Trials" | "Live" | "Retired";
  updated_at: string;
};

type ComponentDraft = {
  id: string;
  name: string;
  technique: string;
  estimatedTime?: string;
};

type IngredientRecord = {
  id: string;
  name: string;
  vendor?: string | null;
  unit?: string;
  cost?: number | null;
  aiEstimate?: number | null;
  allergenTags?: string[];
};

type CostMetric = {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
};

type VersionEntry = {
  id: string;
  label: string;
  date: string;
  notes: string;
  deltaCost?: string;
};

type PlatingAsset = {
  id: string;
  photoUrl: string;
  annotations?: string;
};

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  outgoing?: boolean;
};

type PrepSummary = {
  covers: number;
  batches: Array<{ label: string; qty: string; due: string }>;
  alerts: string[];
};

type MenuBuilderWorkspaceProps = {
  dishes: DishSummary[];
  activeDishId?: string;
  components: ComponentDraft[];
  ingredients: IngredientRecord[];
  costMetrics: CostMetric[];
  allergens: string[];
  versionHistory: VersionEntry[];
  platingAssets: PlatingAsset[];
  chefChat: ChatMessage[];
  prepSummary: PrepSummary;
};

export function MenuBuilderWorkspace({
  dishes,
  activeDishId,
  components,
  ingredients,
  costMetrics,
  allergens,
  versionHistory,
  platingAssets,
  chefChat,
  prepSummary,
}: MenuBuilderWorkspaceProps) {
  const activeDish = useMemo(
    () => dishes.find((dish) => dish.id === activeDishId) ?? dishes[0],
    [dishes, activeDishId],
  );

  return (
    <div className="grid gap-6 text-white xl:grid-cols-[320px_1fr_360px]">
      <aside className="space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
        <DishListPanel dishes={dishes} activeDishId={activeDish?.id} />
        <VersionHistoryTimeline entries={versionHistory} />
        <PrepEngineSummaryPane summary={prepSummary} />
      </aside>

      <main className="space-y-4 rounded-[32px] border border-white/5 bg-white/5 p-5 shadow-[0_35px_90px_rgba(0,0,0,0.4)] backdrop-blur">
        <RecipeCanvas dish={activeDish} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ComponentBuilder components={components} />
          <IngredientPicker ingredients={ingredients} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CostBreakdownPanel metrics={costMetrics} />
          <AllergenSidebar allergens={allergens} />
        </div>
        <PlatingGuideViewer assets={platingAssets} />
      </main>

      <aside className="space-y-4">
        <ChefChatSidebar messages={chefChat} />
      </aside>
    </div>
  );
}

type DishListPanelProps = {
  dishes: DishSummary[];
  activeDishId?: string;
};

export function DishListPanel({ dishes, activeDishId }: DishListPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50">
            Menu Builder
          </p>
          <h2 className="text-2xl font-light text-white">Dishes</h2>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/70 transition hover:border-white/60 hover:text-white"
        >
          New Dish
        </button>
      </div>
      <div className="space-y-2">
        {dishes.map((dish) => {
          const isActive = dish.id === activeDishId;
          return (
            <button
              key={dish.id}
              type="button"
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-white/50 bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  : "border-white/10 bg-transparent hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{dish.name}</p>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {dish.status}
                </span>
              </div>
              <p className="text-xs text-white/50">{dish.category}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type RecipeCanvasProps = {
  dish: DishSummary;
};

export function RecipeCanvas({ dish }: RecipeCanvasProps) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-gradient-to-br from-white/10/60 to-transparent p-5 shadow-[0_35px_90px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">
            Recipe Canvas
          </p>
          <h3 className="text-3xl font-light text-white">{dish.name}</h3>
          <p className="text-sm text-white/60">{dish.category}</p>
        </div>
        <span className="rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
          {dish.status}
        </span>
      </div>
      <p className="mt-4 text-sm text-white/70">
        Internal description, culinary narrative, plating intent, and sensory
        notes live here. Hook into Supabase for real content.
      </p>
    </section>
  );
}

type ComponentBuilderProps = {
  components: ComponentDraft[];
};

export function ComponentBuilder({ components }: ComponentBuilderProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
          Components
        </p>
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/70"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {components.map((component) => (
          <li
            key={component.id}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-white">{component.name}</p>
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                {component.technique}
              </span>
            </div>
            {component.estimatedTime && (
              <p className="text-xs text-white/40">
                {component.estimatedTime} prep
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type IngredientPickerProps = {
  ingredients: IngredientRecord[];
};

export function IngredientPicker({ ingredients }: IngredientPickerProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
          Ingredient Intelligence
        </p>
        <Sparkles className="h-4 w-4 text-white/60" />
      </div>
      <ul className="space-y-2">
        {ingredients.map((ingredient) => (
          <li
            key={ingredient.id}
            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-white">{ingredient.name}</p>
              <span className="text-xs text-white/50">
                {ingredient.cost ? `$${ingredient.cost.toFixed(2)}` : "AI estimate"}
              </span>
            </div>
            <p className="text-xs text-white/40">
              {ingredient.vendor ?? "Vendor TBD"} · {ingredient.unit ?? "unit"}
            </p>
            {ingredient.allergenTags && (
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.3em] text-[#ff7f81]">
                {ingredient.allergenTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#ff7f81]/40 px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type CostBreakdownPanelProps = {
  metrics: CostMetric[];
};

export function CostBreakdownPanel({ metrics }: CostBreakdownPanelProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">
        COGS Engine
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {metric.label}
            </p>
            <p className="text-2xl font-light text-white">{metric.value}</p>
            {metric.trend && (
              <p className="text-xs text-white/50">{`Trend: ${metric.trend}`}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

type AllergenSidebarProps = {
  allergens: string[];
};

export function AllergenSidebar({ allergens }: AllergenSidebarProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">
        Allergen Map
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {allergens.map((allergen) => (
          <div
            key={allergen}
            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.35em] text-[#ff9b7f]"
          >
            {allergen}
          </div>
        ))}
      </div>
    </section>
  );
}

type VersionHistoryTimelineProps = {
  entries: VersionEntry[];
};

export function VersionHistoryTimeline({
  entries,
}: VersionHistoryTimelineProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">
        Version History
      </p>
      <div className="mt-3 space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-white">{entry.label}</p>
              <span className="text-xs text-white/50">{entry.date}</span>
            </div>
            <p className="text-xs text-white/60">{entry.notes}</p>
            {entry.deltaCost && (
              <p className="text-xs text-white/50">
                Δ cost: <span className="text-white/80">{entry.deltaCost}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

type PlatingGuideViewerProps = {
  assets: PlatingAsset[];
};

export function PlatingGuideViewer({ assets }: PlatingGuideViewerProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/10/50 to-transparent p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
          Plating Guide
        </p>
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/70"
        >
          Upload
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => (
          <figure
            key={asset.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.photoUrl}
              alt="Plating memory"
              className="h-32 w-full object-cover"
            />
            {asset.annotations && (
              <figcaption className="p-3 text-xs text-white/70">
                {asset.annotations}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

type ChefChatSidebarProps = {
  messages: ChatMessage[];
};

export function ChefChatSidebar({ messages }: ChefChatSidebarProps) {
  return (
    <section className="flex h-full flex-col rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
          Chef Chat
        </p>
        <MessageCircle className="h-4 w-4 text-white/60" />
      </div>
      <div className="flex-1 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`w-full rounded-2xl border px-3 py-2 text-sm ${
              message.outgoing
                ? "border-white/15 bg-white/20 text-white/90"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {message.author}
            </p>
            <p>{message.content}</p>
            <p className="text-[11px] text-white/40">{message.timestamp}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type PrepEngineSummaryPaneProps = {
  summary: PrepSummary;
};

export function PrepEngineSummaryPane({
  summary,
}: PrepEngineSummaryPaneProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">
          Prep Engine
        </p>
        <span className="text-xs text-white/60">{summary.covers} covers</span>
      </div>
      <div className="space-y-2">
        {summary.batches.map((batch) => (
          <div
            key={`${batch.label}-${batch.qty}`}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <div className="flex items-center justify-between">
              <p>{batch.label}</p>
              <p className="text-xs text-white/60">{batch.due}</p>
            </div>
            <p className="text-xs text-white/70">{batch.qty}</p>
          </div>
        ))}
      </div>
      {summary.alerts.length > 0 && (
        <div className="mt-3 rounded-2xl border border-white/15 bg-[#ff7f81]/15 px-3 py-2 text-xs text-[#ffb3b5]">
          <p className="uppercase tracking-[0.4em]">Alerts</p>
          <ul className="list-disc pl-4">
            {summary.alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default MenuBuilderWorkspace;
