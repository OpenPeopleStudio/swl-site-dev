"use client";

import type { ReactNode } from "react";
import type {
  MenuServiceOption,
  MenuStatusFilter,
  MenuStatusOption,
} from "@/types/menu";

interface MenuHeaderControlsProps {
  serviceOptions: MenuServiceOption[];
  statusOptions: MenuStatusOption[];
  serviceFilter: string;
  statusFilter: MenuStatusFilter;
  onServiceChange: (serviceSlug: string) => void;
  onStatusChange: (filter: MenuStatusFilter) => void;
  contextLabel?: string;
  lastSyncedLabel?: string;
  children?: ReactNode;
}

const ALL_STATUS_OPTION = { label: "All", value: "all" as const };

export function MenuHeaderControls({
  serviceOptions,
  statusOptions,
  serviceFilter,
  statusFilter,
  onServiceChange,
  onStatusChange,
  contextLabel,
  lastSyncedLabel,
  children,
}: MenuHeaderControlsProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {contextLabel ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
              Service Context
            </p>
            <p className="text-base font-medium text-white/80 whitespace-nowrap">
              {contextLabel}
            </p>
            {lastSyncedLabel && (
              <p className="text-xs text-white/50">Last sync · {lastSyncedLabel}</p>
            )}
          </div>
        ) : (
          <div>
            {lastSyncedLabel && (
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                Last sync · {lastSyncedLabel}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-end md:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Service</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {serviceOptions.map((service) => (
                <button
                  key={service.slug}
                  type="button"
                  onClick={() => onServiceChange(service.slug)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] transition ${
                    serviceFilter === service.slug
                      ? "border-white/70 text-white"
                      : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                  } whitespace-nowrap`}
                  aria-pressed={serviceFilter === service.slug}
                >
                  {service.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Status filter
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[ALL_STATUS_OPTION, ...statusOptions].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onStatusChange(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] transition ${
                    statusFilter === option.value
                      ? "border-white/70 text-white"
                      : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                  } whitespace-nowrap`}
                  aria-pressed={statusFilter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

