"use client";

import { RefreshCw, Sun, Moon, BellRing } from "lucide-react";

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type AlertChip = {
  id: string;
  label: string;
  tone?: "warning" | "info" | "ok";
};

type InventoryTopBarProps = {
  title?: string;
  timestamp?: string;
  alerts?: AlertChip[];
  mode?: "day" | "night";
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onToggleMode?: () => void;
};

export function InventoryTopBar({
  title = "InventoryOS",
  timestamp,
  alerts = [],
  mode = "night",
  isRefreshing,
  onRefresh,
  onToggleMode,
}: InventoryTopBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-white/40">
          Snow White Laundry
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-2xl font-light text-white">{title}</h1>
          {timestamp && (
            <span className="text-xs text-white/60">
              {timestamp}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {alerts.map((alert) => (
            <span
              key={alert.id}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                "border-white/20 text-white/80",
                alert.tone === "warning" && "border-amber-400/60 text-amber-200 bg-amber-500/10",
                alert.tone === "ok" && "border-emerald-400/60 text-emerald-200 bg-emerald-500/10",
                alert.tone === "info" && "border-sky-400/60 text-sky-100 bg-sky-500/10",
              )}
            >
              <BellRing className="size-3.5" />
              {alert.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cx(
              "inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white transition",
              "hover:border-white/60 disabled:opacity-50",
            )}
          >
            <RefreshCw className={cx("size-3.5", isRefreshing && "animate-spin")} />
            Sync
          </button>
          <button
            type="button"
            onClick={onToggleMode}
            className="rounded-xl border border-white/20 p-2 text-white/70 transition hover:text-white"
          >
            {mode === "day" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
