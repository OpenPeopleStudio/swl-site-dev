"use client";

import { useCallback, useEffect, useState } from "react";
import { createPosStore } from "@/lib/staff/posStoreCore";
import type {
  AddLinePayload,
  MenuCategory,
  ModifierSuggestion,
  PosBootstrapPayload,
  PosCheck,
  PosCheckLine,
  TableBlock,
  UpdateCheckPayload,
  UpdateLinePayload,
} from "@/types/pos";

type RefreshOptions = {
  silent?: boolean;
};

function getFallbackPayload() {
  const store = createPosStore();
  return store.getPosBootstrap();
}

export function usePosData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableBlock[]>([]);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [modifiers, setModifiers] = useState<Record<string, ModifierSuggestion[]>>({});
  const [checks, setChecks] = useState<PosCheck[]>([]);
  const [checkLines, setCheckLines] = useState<PosCheckLine[]>([]);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }
    try {
      const response = await fetch("/api/staff/pos/bootstrap", {
        cache: "no-store",
      });
      const raw = await response.text();
      if (!response.ok) {
        let reason = "Failed to load POS data";
        try {
          const data = JSON.parse(raw) as { error?: string };
          if (data?.error) {
            reason = data.error;
          }
        } catch {
          if (response.statusText) {
            reason = response.statusText;
          }
        }
        throw new Error(reason);
      }
      const payload = raw ? (JSON.parse(raw) as PosBootstrapPayload) : null;
      if (!payload) {
        throw new Error("POS bootstrap returned no data");
      }
      setTables(payload.tables);
      setMenu(payload.menu);
      setModifiers(payload.modifiers);
      setChecks(payload.checks);
      setCheckLines(payload.checkLines);
      if (!options?.silent) {
        setError(null);
      }
    } catch (err) {
      console.error("POS bootstrap failed", err);
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Unable to load POS data");
        const fallback = getFallbackPayload();
        setTables(fallback.tables);
        setMenu(fallback.menu);
        setModifiers(fallback.modifiers);
        setChecks(fallback.checks);
        setCheckLines(fallback.checkLines);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCheck = useCallback(
    async (tableSlugs: string[]) => {
      const [primary, ...rest] = tableSlugs;
      if (!primary) return null;
      const response = await fetch(`/api/staff/pos/tables/${encodeURIComponent(primary)}/checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableSlugs: rest }),
      });
      if (!response.ok) {
        throw new Error("Unable to open check");
      }
      const { check } = (await response.json()) as { check: PosCheck };
      if (check) {
        setChecks((prev) => {
          const exists = prev.some((entry) => entry.id === check.id);
          return exists ? prev.map((entry) => (entry.id === check.id ? check : entry)) : [...prev, check];
        });
      }
      void refresh({ silent: true });
      return check ?? null;
    },
    [refresh],
  );

  const addLine = useCallback(
    async (checkId: string, payload: AddLinePayload) => {
      const response = await fetch(`/api/staff/pos/checks/${encodeURIComponent(checkId)}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Unable to add line");
      }
      const { line } = (await response.json()) as { line: PosCheckLine };
      if (line) {
        setCheckLines((prev) => [...prev.filter((entry) => entry.id !== line.id), line]);
      }
      void refresh({ silent: true });
      return line ?? null;
    },
    [refresh],
  );

  const updateLine = useCallback(
    async (checkId: string, payload: UpdateLinePayload) => {
      const response = await fetch(`/api/staff/pos/checks/${encodeURIComponent(checkId)}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok && response.status !== 204) {
        throw new Error("Unable to update line");
      }
      if (response.status === 204) {
        setCheckLines((prev) => prev.filter((entry) => entry.id !== payload.lineId));
        void refresh({ silent: true });
        return null;
      }
      const { line } = (await response.json()) as { line: PosCheckLine | null };
      if (!line) {
        setCheckLines((prev) => prev.filter((entry) => entry.id !== payload.lineId));
        void refresh({ silent: true });
        return null;
      }
      setCheckLines((prev) => {
        const exists = prev.some((entry) => entry.id === line.id);
        return exists ? prev.map((entry) => (entry.id === line.id ? line : entry)) : [...prev, line];
      });
      void refresh({ silent: true });
      return line;
    },
    [refresh],
  );

  const clearLines = useCallback(
    async (checkId: string) => {
      const response = await fetch(`/api/staff/pos/checks/${encodeURIComponent(checkId)}/lines`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to clear lines");
      }
      setCheckLines((prev) => prev.filter((line) => line.checkId !== checkId));
      void refresh({ silent: true });
    },
    [refresh],
  );

  const updateCheck = useCallback(
    async (checkId: string, payload: UpdateCheckPayload) => {
      const response = await fetch(`/api/staff/pos/checks/${encodeURIComponent(checkId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Unable to update check");
      }
      const { check } = (await response.json()) as { check: PosCheck };
      if (check) {
        setChecks((prev) =>
          prev.map((entry) => (entry.id === check.id ? check : entry)),
        );
      }
      return check ?? null;
    },
    [],
  );

  return {
    loading,
    error,
    tables,
    menu,
    modifiers,
    checks,
    checkLines,
    refresh,
    openCheck,
    addLine,
    updateLine,
    clearLines,
    updateCheck,
  };
}

