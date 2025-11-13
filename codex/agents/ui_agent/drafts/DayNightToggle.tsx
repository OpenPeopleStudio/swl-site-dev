"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

type DayNightMode = "day" | "night";

type DayNightToggleProps = {
  defaultMode?: DayNightMode;
  storageKey?: string;
  onChange?: (mode: DayNightMode) => void;
};

const DEFAULT_STORAGE_KEY = "swl-guest-theme";

/**
 * A glassy, minimal toggle that switches between the warm day palette
 * and the neon night palette. Theme persistence is handled via localStorage.
 */
export function DayNightToggle({
  defaultMode = "night",
  storageKey = DEFAULT_STORAGE_KEY,
  onChange,
}: DayNightToggleProps) {
  const mode = useSyncExternalStore(
    (listener) => subscribeToThemeKey(storageKey, listener),
    () => readStoredMode(storageKey, defaultMode),
    () => defaultMode,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, mode);
    applyDocumentTheme(mode);
  }, [mode, storageKey]);

  useEffect(() => {
    onChange?.(mode);
  }, [mode, onChange]);

  const gradientClass = useMemo(
    () =>
      mode === "day"
        ? "from-[#fbe7c2] via-[#f8d6a0] to-[#f5c27d]"
        : "from-[#050910] via-[#03040a] to-[#02020a]",
    [mode],
  );

  function handleToggle() {
    const nextMode: DayNightMode = mode === "day" ? "night" : "day";
    persistThemePreference(storageKey, nextMode);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle site theme"
      aria-pressed={mode === "night"}
      className={`group relative flex h-16 w-40 items-center justify-between overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-r ${gradientClass} p-4 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_20px_70px_rgba(5,10,25,0.45)] transition`}
    >
      <span
        className={`transition ${
          mode === "day" ? "text-black/70" : "text-white/40 group-hover:text-white/70"
        }`}
      >
        Day
      </span>
      <span
        className={`transition ${
          mode === "night" ? "text-cyan-200" : "text-black/40 group-hover:text-black/60"
        }`}
      >
        Night
      </span>

      <span
        className={`absolute inset-1 flex items-center rounded-[26px] bg-white/10 backdrop-blur-xl transition-[transform,background] ${
          mode === "day"
            ? "translate-x-0 bg-white/60"
            : "translate-x-[calc(100%-0.5rem)] bg-white/5"
        }`}
      >
        <ToggleIcon mode={mode} />
      </span>
    </button>
  );
}

function ToggleIcon({ mode }: { mode: DayNightMode }) {
  if (mode === "day") {
    return (
      <span className="mx-auto flex h-10 w-10 items-center justify-center">
        <span className="relative block h-6 w-6 rounded-full bg-gradient-to-b from-[#fdf3d5] to-[#f0c974] shadow-[0_0_25px_rgba(255,215,128,0.8)] before:absolute before:-inset-1 before:rounded-full before:border before:border-[#f9dca6]/70 before:opacity-50" />
      </span>
    );
  }

  return (
    <span className="mx-auto flex h-10 w-10 items-center justify-center">
      <span className="relative block h-6 w-6 rounded-full bg-gradient-to-b from-[#11182c] to-[#020510] shadow-[0_0_30px_rgba(24,190,255,0.35)]">
        <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#05070f]" />
        <span className="absolute inset-0 rounded-full border border-cyan-300/30" />
      </span>
    </span>
  );
}

function readStoredMode(storageKey: string, fallback: DayNightMode) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(storageKey) as DayNightMode | null;
  return stored === "day" || stored === "night" ? stored : fallback;
}

const themeListeners = new Map<string, Set<() => void>>();
const storageHandlers = new Map<string, (event: StorageEvent) => void>();

function subscribeToThemeKey(storageKey: string, listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  let listeners = themeListeners.get(storageKey);
  if (!listeners) {
    listeners = new Set();
    themeListeners.set(storageKey, listeners);
    const handler = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      notifyThemeListeners(storageKey);
    };
    storageHandlers.set(storageKey, handler);
    window.addEventListener("storage", handler);
  }
  listeners.add(listener);
  return () => {
    const current = themeListeners.get(storageKey);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      themeListeners.delete(storageKey);
      const handler = storageHandlers.get(storageKey);
      if (handler) {
        window.removeEventListener("storage", handler);
        storageHandlers.delete(storageKey);
      }
    }
  };
}

function notifyThemeListeners(storageKey: string) {
  const listeners = themeListeners.get(storageKey);
  listeners?.forEach((listener) => listener());
}

function persistThemePreference(storageKey: string, mode: DayNightMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, mode);
  }
  notifyThemeListeners(storageKey);
}

function applyDocumentTheme(mode: DayNightMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
}

export default DayNightToggle;
