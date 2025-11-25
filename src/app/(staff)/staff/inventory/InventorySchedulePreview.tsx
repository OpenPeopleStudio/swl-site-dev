"use client";

import { ScheduleGrid, ScheduleLegend } from "@/components/staff/ScheduleGrid";
import type { ScheduleAssignment, ScheduleState } from "@/domains/staff/schedule/types";

type InventorySchedulePreviewProps = {
  assignments: ScheduleAssignment[];
};

export function InventorySchedulePreview({ assignments }: InventorySchedulePreviewProps) {
  const state: ScheduleState = assignments.length ? "ready" : "empty";
  return (
    <section className="mt-12 space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Ops cadence</p>
        <h2 className="text-xl font-light text-white">Procurement shifts</h2>
        <p className="text-sm text-white/60">
          Vendor follow-ups and auto-replenish windows stay inline with the breadcrumbs grid so the BOH
          team can mirror FOH tempo.
        </p>
      </div>
      <ScheduleGrid assignments={assignments} state={state} />
      <ScheduleLegend />
    </section>
  );
}

