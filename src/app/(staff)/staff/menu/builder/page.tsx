"use client";

import { useMemo } from "react";
import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { MenuBuilderWorkspace } from "@/apps/staff-console/manager/MenuBuilderWorkspace";
import { useMenuBuilderData } from "@/hooks/staff/useMenuBuilderData";

export default function StaffMenuBuilderPage() {
  const { data, loading, error, refresh } = useMenuBuilderData();

  const payload = data;

  const statusLabel = useMemo(() => {
    if (!payload) return "—";
    const { stage } = payload.concept;
    return stage === "ideation"
      ? "Ideation"
      : stage === "testing"
        ? "Testing"
        : "Service-ready";
  }, [payload]);

  return (
    <SiteShell>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8">
        <PageHeader
          title="Menu Builder"
          subtitle="Collaborative R&D · back of house signal"
          className="[&>h1]:text-3xl [&>h1]:sm:text-4xl [&>h1]:tracking-tight"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
            <span className="rounded-full border border-white/15 px-3 py-1">{statusLabel}</span>
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded-full border border-white/15 px-3 py-1 text-white/80 transition hover:border-white/40"
            >
              Refresh
            </button>
          </div>
        </PageHeader>

        {loading && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6 text-white/70">
            Syncing concept data…
          </div>
        )}

        {error && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6 text-sm text-white/70">
            {error}
          </div>
        )}

        {payload && !loading && !error && (
          <MenuBuilderWorkspace
            dishes={payload.dishes}
            components={payload.components}
            ingredients={payload.ingredients}
            costMetrics={payload.costMetrics}
            allergens={payload.allergens}
            versionHistory={payload.versionHistory}
            platingAssets={payload.platingAssets}
            chefChat={payload.chefChat}
            prepSummary={payload.prepSummary}
            activeDishId={payload.dishes[0]?.id}
          />
        )}
      </div>
    </SiteShell>
  );
}


