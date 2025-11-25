"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  InventoryCountMutationResult,
  InventoryCountSessionSummary,
  InventoryGridItem,
  InventorySnapshot,
} from "@/types/inventory";

type InventoryStatus = "low" | "par" | "over";
type InventoryState = "ready" | "loading" | "empty" | "error";

type InventoryFilters = {
  search: string;
  category: string;
  location: string;
  status: InventoryStatus | "all";
};

const GRID_TEMPLATE =
  "grid-cols-[minmax(220px,1.5fr)_minmax(130px,0.9fr)_minmax(150px,0.9fr)_minmax(70px,0.45fr)_minmax(90px,0.55fr)_minmax(80px,0.55fr)_minmax(100px,0.7fr)_minmax(140px,0.95fr)_minmax(180px,1.05fr)]";

const STATUS_OPTIONS: Array<{ value: InventoryStatus | "all"; label: string }> = [
  { value: "all", label: "All status" },
  { value: "low", label: "Below par" },
  { value: "par", label: "At par" },
  { value: "over", label: "Over" },
];

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

type InventorySortKey = "name" | "category" | "location" | "variance" | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZES = [25, 40, 80, 120];

type NoteComposerState = {
  open: boolean;
  item: InventoryGridItem | null;
  body: string;
  tags: string;
  error: string | null;
  saving: boolean;
};

type InventoryClientProps = {
  initialSnapshot: InventorySnapshot;
};

export default function InventoryClient({ initialSnapshot }: InventoryClientProps) {
  const [items, setItems] = useState<InventoryGridItem[]>(initialSnapshot.items);
  const [session, setSession] = useState(initialSnapshot.session);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialSnapshot.generatedAt);
  const [inventoryState, setInventoryState] = useState<InventoryState>(initialSnapshot.items.length ? "ready" : "empty");
  const [filters, setFilters] = useState<InventoryFilters>({ search: "", category: "all", location: "all", status: "all" });
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showCountTargetsOnly, setShowCountTargetsOnly] = useState(false);
  const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, number>>({});
  const [countedIds, setCountedIds] = useState<Set<string>>(new Set(initialSnapshot.session?.countedItemIds ?? []));
  const [sortKey, setSortKey] = useState<InventorySortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[1]);
  const [page, setPage] = useState(0);
  const [exportScope, setExportScope] = useState<"filtered" | "visible" | "low">("filtered");
  const [sessionFocusActive, setSessionFocusActive] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [noteComposer, setNoteComposer] = useState<NoteComposerState>({
    open: false,
    item: null,
    body: "",
    tags: "",
    error: null,
    saving: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedAuthor = window.localStorage.getItem("swl-inventory-author");
      if (storedAuthor) {
        setAuthorName(storedAuthor);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const categoryOptions = useMemo(() => buildOptions(items.map((item) => item.category)), [items]);
  const locationOptions = useMemo(() => buildOptions(items.map((item) => item.location)), [items]);

  const sessionFocusZone =
    sessionFocusActive && session?.focusZone ? session.focusZone.toLowerCase() : null;

  useEffect(() => {
    setPage(0);
  }, [
    pageSize,
    sortKey,
    sortDirection,
    filters.search,
    filters.category,
    filters.location,
    filters.status,
    showLowOnly,
    showCountTargetsOnly,
    sessionFocusZone,
  ]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return items.filter((item) => {
      const adjustment = pendingAdjustments[item.id] ?? 0;
      const projectedQuantity = item.onHand + adjustment;
      const variance = deriveVariance(item, adjustment);
      const resolvedStatus = resolveStatus(item, projectedQuantity);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.category ?? "").toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        filters.category === "all" || (item.category ?? "").toLowerCase() === filters.category;
      const matchesLocation =
        filters.location === "all" || (item.location ?? "").toLowerCase() === filters.location;
      const matchesStatus = filters.status === "all" || resolvedStatus === filters.status;
      const matchesFocusZone =
        !sessionFocusZone || (item.location ?? "").toLowerCase() === sessionFocusZone;
      const respectsLowFocus = !showLowOnly || resolvedStatus === "low";
      const countTarget = isCountTarget(item);
      const respectsCountFocus = !showCountTargetsOnly || countTarget;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesStatus &&
        matchesFocusZone &&
        respectsLowFocus &&
        respectsCountFocus
      );
    });
  }, [
    filters,
    items,
    pendingAdjustments,
    sessionFocusZone,
    showCountTargetsOnly,
    showLowOnly,
  ]);

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.category !== "all" ||
    filters.location !== "all" ||
    filters.status !== "all" ||
    showLowOnly ||
    showCountTargetsOnly ||
    Boolean(sessionFocusZone);

  const gridState: InventoryState =
    inventoryState !== "ready" ? inventoryState : filteredItems.length === 0 ? "empty" : "ready";

  const lowStockItems = useMemo(
    () =>
      filteredItems.filter((item) => {
        const projectedQuantity = item.onHand + (pendingAdjustments[item.id] ?? 0);
        return resolveStatus(item, projectedQuantity) === "low";
      }),
    [filteredItems, pendingAdjustments],
  );

  const lowCount = lowStockItems.length;
  const countedVisible = filteredItems.filter((item) => countedIds.has(item.id)).length;
  const varianceTotal = filteredItems.reduce(
    (sum, item) => sum + deriveVariance(item, pendingAdjustments[item.id] ?? 0),
    0,
  );

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      const adjA = pendingAdjustments[a.id] ?? 0;
      const adjB = pendingAdjustments[b.id] ?? 0;
      const projectedA = a.onHand + adjA;
      const projectedB = b.onHand + adjB;
      const varianceA = deriveVariance(a, adjA);
      const varianceB = deriveVariance(b, adjB);
      const statusA = resolveStatus(a, projectedA);
      const statusB = resolveStatus(b, projectedB);
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortKey) {
        case "category":
          return dir * (a.category ?? "").localeCompare(b.category ?? "");
        case "location":
          return dir * (a.location ?? "").localeCompare(b.location ?? "");
        case "variance":
          return dir * (varianceA - varianceB);
        case "status":
          return dir * statusA.localeCompare(statusB);
        case "name":
        default:
          return dir * a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [filteredItems, pendingAdjustments, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paginatedItems = useMemo(
    () => sortedItems.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [sortedItems, currentPage, pageSize],
  );

  useEffect(() => {
    if (page >= pageCount) {
      setPage(Math.max(0, pageCount - 1));
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (!session?.focusZone) {
      setSessionFocusActive(false);
    }
  }, [session?.focusZone, session]);

  const handleFilterChange = (key: keyof InventoryFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdjustOnHand = (itemId: string, baseQuantity: number, delta: number) => {
    setPendingAdjustments((prev) => {
      const nextDelta = (prev[itemId] ?? 0) + delta;
      const projected = baseQuantity + nextDelta;
      if (projected < 0) {
        return prev;
      }
      const next = { ...prev };
      if (nextDelta === 0) {
        delete next[itemId];
      } else {
        next[itemId] = nextDelta;
      }
      return next;
    });
  };

  const handleResetAdjustments = (itemId: string) => {
    setPendingAdjustments((prev) => {
      if (!(itemId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleStartSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = await fetch("/api/staff/inventory/session", { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to start count session");
      }
      const nextSession = (await response.json()) as InventoryCountSessionSummary;
      setSession(nextSession);
      setCountedIds(new Set(nextSession.countedItemIds ?? []));
      setSessionFocusActive(false);
    } catch (error) {
      console.error("start session failed", error);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const persistCount = useCallback(
    async (item: InventoryGridItem, finalQuantity: number) => {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });

      try {
        const response = await fetch("/api/staff/inventory/count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            itemType: item.itemType,
            quantity: finalQuantity,
            sessionId: session?.id,
          }),
        });
        if (!response.ok) {
          throw new Error("Unable to persist count");
        }
        const payload = (await response.json()) as InventoryCountMutationResult;
        setItems((prev) => prev.map((existing) => (existing.id === payload.item.id ? payload.item : existing)));
        setSession(payload.session);
        setCountedIds(new Set(payload.session.countedItemIds));
        setPendingAdjustments((prev) => {
          if (!(item.id in prev)) {
            return prev;
          }
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        setInventoryState((prev) => (prev === "error" ? "ready" : prev));
      } catch (error) {
        console.error("Persist count failed", error);
        setInventoryState("error");
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [session?.id],
  );

  const handleCountItem = (item: InventoryGridItem) => {
    if (savingIds.has(item.id)) {
      return;
    }
    const adjustment = pendingAdjustments[item.id] ?? 0;
    const finalQuantity = item.onHand + adjustment;
    if (finalQuantity < 0) {
      return;
    }
    void persistCount(item, finalQuantity);
  };

  const handleOpenNoteComposer = (item: InventoryGridItem) => {
    setNoteComposer({
      open: true,
      item,
      body: "",
      tags: "",
      error: null,
      saving: false,
    });
  };

  const handleAuthorNameChange = (value: string) => {
    setAuthorName(value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("swl-inventory-author", value);
      } catch {
        // ignore storage write errors
      }
    }
  };

  const handleCloseNoteComposer = () => {
    setNoteComposer((prev) => ({ ...prev, open: false, error: null, saving: false }));
  };

  const handleSubmitNote = async () => {
    if (!noteComposer.item) {
      return;
    }
    if (!session || session.status === "closed") {
      setNoteComposer((prev) => ({
        ...prev,
        error: "Start an active session to log notes.",
      }));
      return;
    }
    const trimmedBody = noteComposer.body.trim();
    if (!trimmedBody) {
      setNoteComposer((prev) => ({ ...prev, error: "Note body cannot be empty." }));
      return;
    }
    const parsedTags = noteComposer.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    setNoteComposer((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const response = await fetch("/api/staff/inventory/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: noteComposer.item.id,
          itemType: noteComposer.item.itemType,
          body: trimmedBody,
          tags: parsedTags,
          authorName,
          sessionId: session?.id,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to save note");
      }
      setNoteComposer({
        open: false,
        item: null,
        body: "",
        tags: "",
        error: null,
        saving: false,
      });
    } catch (error) {
      console.error("note composer error", error);
      setNoteComposer((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unable to save note",
        saving: false,
      }));
    }
  };

  const handleRenameSession = useCallback(
    async (nextLabel: string) => {
      if (!session) return;
      const trimmed = nextLabel.trim();
      if (!trimmed || trimmed === session.label) return;
      const response = await fetch("/api/staff/inventory/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, label: trimmed }),
      });
      if (!response.ok) {
        console.error("session rename failed");
        return;
      }
      const updated = (await response.json()) as InventoryCountSessionSummary | null;
      setSession(updated);
      setCountedIds(new Set(updated?.countedItemIds ?? []));
    },
    [session],
  );

  const handleUpdateSessionFocus = useCallback(
    async (focusZone: string | null) => {
      if (!session) return;
      const normalized = focusZone?.trim() || null;
      if (normalized === (session.focusZone ?? null)) return;
      const response = await fetch("/api/staff/inventory/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, focusZone: normalized }),
      });
      if (!response.ok) {
        console.error("session focus update failed");
        return;
      }
      const updated = (await response.json()) as InventoryCountSessionSummary | null;
      setSession(updated);
      setCountedIds(new Set(updated?.countedItemIds ?? []));
      if (!updated?.focusZone) {
        setSessionFocusActive(false);
      }
    },
    [session],
  );

  const handleCloseSession = useCallback(async () => {
    if (!session) return;
    const response = await fetch("/api/staff/inventory/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, status: "closed" }),
    });
    if (!response.ok) {
      console.error("session close failed");
      return;
    }
    setSession(null);
    setCountedIds(new Set());
    setSessionFocusActive(false);
  }, [session]);

  const handleToggleSessionFocus = useCallback(() => {
    if (!session?.focusZone) return;
    setSessionFocusActive((prev) => !prev);
  }, [session?.focusZone]);

  const handleExport = useCallback(async () => {
    const pool =
      exportScope === "visible" ? paginatedItems : exportScope === "low" ? lowStockItems : sortedItems;
    if (pool.length === 0) {
      return;
    }
    const itemsPayload = pool.map((item) => ({
      ...item,
      projectedOnHand: item.onHand + (pendingAdjustments[item.id] ?? 0),
    }));
    const response = await fetch("/api/export/inventory?format=csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsPayload,
        session: session ? { id: session.id, label: session.label, focusZone: session.focusZone ?? null } : null,
        generatedAt: new Date().toISOString(),
        format: "csv",
      }),
    });
    if (!response.ok) {
      console.error("inventory export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `swl-inventory-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [
    exportScope,
    lowStockItems,
    paginatedItems,
    pendingAdjustments,
    session,
    sortedItems,
  ]);

  const handlePrint = useCallback(async () => {
    if (typeof window === "undefined") return;
    const pool =
      exportScope === "visible" ? paginatedItems : exportScope === "low" ? lowStockItems : sortedItems;
    if (pool.length === 0) {
      return;
    }
    const itemsPayload = pool.map((item) => ({
      ...item,
      projectedOnHand: item.onHand + (pendingAdjustments[item.id] ?? 0),
    }));
    const response = await fetch("/api/export/inventory?format=print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: itemsPayload,
        session: session ? { id: session.id, label: session.label, focusZone: session.focusZone ?? null } : null,
        generatedAt: new Date().toISOString(),
        format: "print",
      }),
    });
    if (!response.ok) {
      console.error("inventory print export failed");
      return;
    }
    const text = await response.text();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(
        `<pre style="white-space:pre-wrap;font-family:monospace;padding:24px;color:#fff;background:#000;">${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`,
      );
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [
    exportScope,
    lowStockItems,
    paginatedItems,
    pendingAdjustments,
    session,
    sortedItems,
  ]);

  const handleNotifyLowStock = useCallback(async () => {
    if (lowStockItems.length === 0) {
      return;
    }
    setNotifyLoading(true);
    try {
      const payload = lowStockItems.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        quantity: item.onHand + (pendingAdjustments[item.id] ?? 0),
      }));
      const response = await fetch("/api/staff/inventory/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!response.ok) {
        throw new Error("Low stock notification failed");
      }
    } catch (error) {
      console.error("low stock notify error", error);
    } finally {
      setNotifyLoading(false);
    }
  }, [lowStockItems, pendingAdjustments]);

  const handleSync = useCallback(async () => {
    setInventoryState("loading");
    try {
      await fetch("/api/staff/inventory/health-report", { method: "POST" }).catch((error) => {
        console.warn("Inventory health report refresh failed", error);
      });
      const response = await fetch("/api/staff/inventory/grid", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to sync inventory");
      }
      const snapshot = (await response.json()) as InventorySnapshot;
      setItems(snapshot.items);
      setSession(snapshot.session);
      setCountedIds(new Set(snapshot.session?.countedItemIds ?? []));
      setLastSyncedAt(snapshot.generatedAt);
      setInventoryState(snapshot.items.length ? "ready" : "empty");
      setPendingAdjustments({});
      setSavingIds(new Set());
    } catch (error) {
      console.error("Inventory sync failed", error);
      setInventoryState("error");
    }
  }, []);

  return (
    <section className="w-full max-w-6xl text-white">
      <InventoryHeader
        lowCount={lowCount}
        countedCount={countedVisible}
        totalVisible={filteredItems.length}
        varianceTotal={varianceTotal}
        lastSyncedAt={lastSyncedAt}
        session={session}
        onStartSession={handleStartSession}
        sessionLoading={sessionLoading}
        locationOptions={locationOptions}
        onRenameSession={handleRenameSession}
        onUpdateSessionFocus={handleUpdateSessionFocus}
        onToggleSessionFocus={handleToggleSessionFocus}
        onCloseSession={handleCloseSession}
        sessionFocusActive={sessionFocusActive}
      />

      <InventoryControls
        filters={filters}
        onFilterChange={handleFilterChange}
        categoryOptions={categoryOptions}
        locationOptions={locationOptions}
        showLowOnly={showLowOnly}
        showCountTargetsOnly={showCountTargetsOnly}
        onToggleLowOnly={() => setShowLowOnly((prev) => !prev)}
        onToggleCountTargetsOnly={() => setShowCountTargetsOnly((prev) => !prev)}
        onSync={handleSync}
        lastSyncedAt={lastSyncedAt}
        onExport={handleExport}
        onPrint={handlePrint}
        onNotifyLowStock={handleNotifyLowStock}
        lowStockCount={lowCount}
        notifyLoading={notifyLoading}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortKeyChange={setSortKey}
        onSortDirectionToggle={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
        exportScope={exportScope}
        onExportScopeChange={setExportScope}
      />

      <InventoryGrid
        items={paginatedItems}
        state={gridState}
        hasActiveFilters={hasActiveFilters}
        countedIds={countedIds}
        pendingAdjustments={pendingAdjustments}
        onAdjustOnHand={handleAdjustOnHand}
        onResetAdjustments={handleResetAdjustments}
        onCountItem={handleCountItem}
        savingIds={savingIds}
        onRetry={handleSync}
        canLogNotes={Boolean(session && session.status !== "closed")}
        onLogNote={handleOpenNoteComposer}
      />

      <InventoryPagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        total={sortedItems.length}
      />

      <InventoryLegend />

      <NoteComposerDrawer
        state={noteComposer}
        session={session}
        authorName={authorName}
        onAuthorChange={handleAuthorNameChange}
        onBodyChange={(value) =>
          setNoteComposer((prev) => ({
            ...prev,
            body: value,
          }))
        }
        onTagsChange={(value) =>
          setNoteComposer((prev) => ({
            ...prev,
            tags: value,
          }))
        }
        onClose={handleCloseNoteComposer}
        onSubmit={handleSubmitNote}
      />
    </section>
  );
}

function NoteComposerDrawer({
  state,
  session,
  authorName,
  onAuthorChange,
  onBodyChange,
  onTagsChange,
  onClose,
  onSubmit,
}: {
  state: NoteComposerState;
  session: InventoryCountSessionSummary | null;
  authorName: string;
  onAuthorChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!state.open) {
    return null;
  }

  const canSubmit = Boolean(state.body.trim()) && Boolean(session) && !state.saving;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 text-white backdrop-blur-sm">
      <div className="w-full max-w-xl space-y-4 rounded-[32px] border border-white/15 bg-[#05070f] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">Inventory note</p>
            <h3 className="text-xl font-light tracking-wide">{state.item?.name ?? "Selected item"}</h3>
            {session ? (
              <p className="text-xs text-white/50">Session · {session.label}</p>
            ) : (
              <p className="text-xs text-amber-300">Start an active session to log notes.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>

        <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
          Author
          <input
            type="text"
            value={authorName}
            onChange={(event) => onAuthorChange(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
          Note
          <textarea
            value={state.body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
            rows={4}
            placeholder="Log temp checks, variance context, or other handoffs."
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
          Tags
          <input
            type="text"
            value={state.tags}
            onChange={(event) => onTagsChange(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
            placeholder="comma separated · e.g. cold,prep"
          />
        </label>

        {state.error && <p className="text-sm text-rose-300">{state.error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 hover:border-white/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.saving ? "Saving…" : "Log note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryPagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
  total,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
}) {
  if (pageCount <= 1 && total <= pageSize) {
    return null;
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.35em] text-white/70">
      <div className="flex items-center gap-2">
        <span>Rows {Math.min(page * pageSize + 1, total)}–{Math.min((page + 1) * pageSize, total)}</span>
        <span className="text-white/40">of {total}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Page size</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-2xl border border-white/20 bg-transparent px-2 py-1 text-xs text-white focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option
                key={size}
                value={size}
              >
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="rounded-full border border-white/20 px-3 py-1 transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function InventoryHeader({
  lowCount,
  countedCount,
  totalVisible,
  varianceTotal,
  lastSyncedAt,
  session,
  onStartSession,
  sessionLoading,
  locationOptions,
  onRenameSession,
  onUpdateSessionFocus,
  onToggleSessionFocus,
  onCloseSession,
  sessionFocusActive,
}: {
  lowCount: number;
  countedCount: number;
  totalVisible: number;
  varianceTotal: number;
  lastSyncedAt: string;
  session: InventoryCountSessionSummary | null;
  onStartSession: () => void;
  sessionLoading: boolean;
  locationOptions: Array<{ value: string; label: string }>;
  onRenameSession: (label: string) => void;
  onUpdateSessionFocus: (focus: string | null) => void;
  onToggleSessionFocus: () => void;
  onCloseSession: () => void;
  sessionFocusActive: boolean;
}) {
  const [labelDraft, setLabelDraft] = useState(session?.label ?? "");
  const [focusDraft, setFocusDraft] = useState(session?.focusZone ?? "");

  useEffect(() => {
    setLabelDraft(session?.label ?? "");
  }, [session?.label]);

  useEffect(() => {
    setFocusDraft(session?.focusZone ?? "");
  }, [session?.focusZone]);

  const canFocus = Boolean(session?.focusZone);

  return (
    <header className="mb-6 border-b border-white/10 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.45em] text-white/40">Inventory</p>
          <h1 className="text-2xl font-light tracking-tight text-white">Inventory grid</h1>
          <p className="text-xs text-white/60">
            {totalVisible} items visible · Σ variance {varianceTotal >= 0 ? "+" : ""}
            {varianceTotal} units
          </p>
        </div>
        <div className="flex flex-col items-end text-right text-[11px] uppercase tracking-[0.35em] text-white/60">
          <span className="whitespace-nowrap border-b border-white/25 pb-1">Last sync · {formatTime(lastSyncedAt)}</span>
          {session ? (
            <>
              <span className="mt-2 whitespace-nowrap text-white/70">
                Session · {session.label}
              </span>
              <span className="text-[10px] text-white/40">
                Started {formatDateTime(session.startedAt)} · {session.countedItemIds.length} counted
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/60">
                <input
                  value={labelDraft}
                  onChange={(event) => setLabelDraft(event.target.value)}
                  onBlur={() => onRenameSession(labelDraft)}
                  className="min-w-[160px] rounded-2xl border border-white/20 bg-transparent px-3 py-1 text-xs text-white focus:outline-none"
                  placeholder="Session label"
                />
                <select
                  value={focusDraft}
                  onChange={(event) => {
                    const value = event.target.value || "";
                    setFocusDraft(value);
                    onUpdateSessionFocus(value || null);
                  }}
                  className="rounded-2xl border border-white/20 bg-transparent px-3 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="">Focus zone</option>
                  {locationOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option
                        key={option.value}
                        value={option.label}
                      >
                        {option.label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={onToggleSessionFocus}
                  disabled={!canFocus}
                  className={`rounded-full border px-3 py-1 text-[10px] transition ${
                    sessionFocusActive ? "border-white/70 text-white" : "border-white/20 text-white/60"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Focus view
                </button>
                <button
                  type="button"
                  onClick={onCloseSession}
                  className="rounded-full border border-white/25 px-3 py-1 text-[10px] text-white/70 transition hover:border-white/50"
                >
                  Close session
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartSession}
              disabled={sessionLoading}
              className="mt-2 rounded-full border border-white/25 px-4 py-1 text-[10px] uppercase tracking-[0.35em] text-white/80 transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sessionLoading ? "Starting…" : "Start count session"}
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.35em] text-white/70">
        <span className="whitespace-nowrap border-b border-white/25 pb-1">Low {lowCount}</span>
        <span className="whitespace-nowrap border-b border-white/25 pb-1">Counted {countedCount}</span>
      </div>
    </header>
  );
}

function InventoryControls({
  filters,
  onFilterChange,
  categoryOptions,
  locationOptions,
  showLowOnly,
  showCountTargetsOnly,
  onToggleLowOnly,
  onToggleCountTargetsOnly,
  onSync,
  lastSyncedAt,
  onExport,
  onPrint,
  onNotifyLowStock,
  lowStockCount,
  notifyLoading,
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionToggle,
  exportScope,
  onExportScopeChange,
}: {
  filters: InventoryFilters;
  onFilterChange: (key: keyof InventoryFilters, value: string) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  locationOptions: Array<{ value: string; label: string }>;
  showLowOnly: boolean;
  showCountTargetsOnly: boolean;
  onToggleLowOnly: () => void;
  onToggleCountTargetsOnly: () => void;
  onSync: () => void;
  lastSyncedAt: string;
  onExport: () => void;
  onPrint: () => void;
  onNotifyLowStock: () => void;
  lowStockCount: number;
  notifyLoading: boolean;
  sortKey: InventorySortKey;
  sortDirection: SortDirection;
  onSortKeyChange: (key: InventorySortKey) => void;
  onSortDirectionToggle: () => void;
  exportScope: "filtered" | "visible" | "low";
  onExportScopeChange: (scope: "filtered" | "visible" | "low") => void;
}) {
  return (
    <div className="mb-6 space-y-4 border-b border-white/10 pb-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-white/15 px-4 py-2 text-xs text-white/70">
          <span className="uppercase tracking-[0.35em] text-white/40">Search</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Item or category"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </label>
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(value) => onFilterChange("category", value)}
          options={categoryOptions}
        />
        <SelectField
          label="Location"
          value={filters.location}
          onChange={(value) => onFilterChange("location", value)}
          options={locationOptions}
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(value) => onFilterChange("status", value)}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/70">
        <button
          type="button"
          onClick={onToggleLowOnly}
          className={`rounded-full border px-4 py-1 transition ${
            showLowOnly ? "border-white/70 text-white" : "border-white/20 text-white/60 hover:border-white/40"
          }`}
        >
          Low stock
        </button>
        <button
          type="button"
          onClick={onToggleCountTargetsOnly}
          className={`rounded-full border px-4 py-1 transition ${
            showCountTargetsOnly ? "border-white/70 text-white" : "border-white/20 text-white/60 hover:border-white/40"
          }`}
        >
          Count list
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            className="rounded-full border border-white/25 px-3 py-1 text-[10px] text-white/80 transition hover:border-white/50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-full border border-white/25 px-3 py-1 text-[10px] text-white/80 transition hover:border-white/50"
          >
            Print view
          </button>
          <button
            type="button"
            onClick={onNotifyLowStock}
            disabled={notifyLoading || lowStockCount === 0}
            className="rounded-full border border-white/30 px-3 py-1 text-[10px] text-white/80 transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {notifyLoading ? "Notifying…" : `Notify low (${lowStockCount})`}
          </button>
          <button
            type="button"
            onClick={onSync}
            className="rounded-full border border-white/30 px-4 py-1 text-[11px] text-white/80 transition hover:border-white/60"
          >
            Sync now · {formatTime(lastSyncedAt)}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-white/70">
        <div className="flex items-center gap-2">
          <span>Sort</span>
          <select
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as InventorySortKey)}
            className="rounded-2xl border border-white/20 bg-transparent px-3 py-1 text-xs text-white focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="location">Location</option>
            <option value="variance">Variance</option>
            <option value="status">Status</option>
          </select>
          <button
            type="button"
            onClick={onSortDirectionToggle}
            className="rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-white/40"
          >
            {sortDirection === "asc" ? "Asc" : "Desc"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>Export</span>
          <select
            value={exportScope}
            onChange={(event) =>
              onExportScopeChange(event.target.value as "filtered" | "visible" | "low")
            }
            className="rounded-2xl border border-white/20 bg-transparent px-3 py-1 text-xs text-white focus:outline-none"
          >
            <option value="filtered">All filtered</option>
            <option value="visible">Visible page</option>
            <option value="low">Low stock</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-[160px] flex-none items-center gap-3 rounded-2xl border border-white/15 px-4 py-2 text-xs text-white/70">
      <span className="uppercase tracking-[0.35em] text-white/40">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex-1 bg-transparent text-sm text-white focus:outline-none"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-black text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InventoryGrid({
  items,
  state,
  hasActiveFilters,
  countedIds,
  pendingAdjustments,
  onAdjustOnHand,
  onResetAdjustments,
  onCountItem,
  savingIds,
  onRetry,
  canLogNotes,
  onLogNote,
}: {
  items: InventoryGridItem[];
  state: InventoryState;
  hasActiveFilters: boolean;
  countedIds: Set<string>;
  pendingAdjustments: Record<string, number>;
  onAdjustOnHand: (itemId: string, baseQuantity: number, delta: number) => void;
  onResetAdjustments: (itemId: string) => void;
  onCountItem: (item: InventoryGridItem) => void;
  savingIds: Set<string>;
  onRetry: () => void;
  canLogNotes: boolean;
  onLogNote: (item: InventoryGridItem) => void;
}) {
  if (state === "loading") {
    return <InventorySkeletonRows />;
  }

  if (state === "error") {
    return <InventoryErrorState onRetry={onRetry} />;
  }

  if (state === "empty") {
    return <InventoryEmptyState hasActiveFilters={hasActiveFilters} />;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <div className="min-w-[1040px] space-y-3 pt-2">
        <div className={`hidden text-[10px] uppercase tracking-[0.4em] text-white/40 lg:grid ${GRID_TEMPLATE}`}>
          <span>Item</span>
          <span>Category</span>
          <span>Location</span>
          <span>Unit</span>
          <span className="text-right">On hand</span>
          <span className="text-right">Par</span>
          <span className="text-right">Variance</span>
          <span>Status</span>
          <span>Ops</span>
        </div>

        <div className="divide-y divide-white/15 border-y border-white/15">
          {items.map((item) => {
            const adjustment = pendingAdjustments[item.id] ?? 0;
            const variance = deriveVariance(item, adjustment);
            const displayOnHand = item.onHand + adjustment;
            const status = resolveStatus(item, displayOnHand);
            const counted = countedIds.has(item.id);

            return (
              <InventoryRow
                key={item.id}
                item={item}
                status={status}
                variance={variance}
                displayOnHand={displayOnHand}
                counted={counted}
                adjustment={adjustment}
                onAdjust={(delta) => onAdjustOnHand(item.id, item.onHand, delta)}
                onReset={() => onResetAdjustments(item.id)}
                onCount={() => onCountItem(item)}
                saving={savingIds.has(item.id)}
                canLogNotes={canLogNotes}
                onLogNote={() => onLogNote(item)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InventoryRow({
  item,
  status,
  variance,
  displayOnHand,
  counted,
  adjustment,
  onAdjust,
  onReset,
  onCount,
  saving,
  canLogNotes,
  onLogNote,
}: {
  item: InventoryGridItem;
  status: InventoryStatus;
  variance: number;
  displayOnHand: number;
  counted: boolean;
  adjustment: number;
  onAdjust: (delta: number) => void;
  onReset: () => void;
  onCount: () => void;
  saving: boolean;
  canLogNotes: boolean;
  onLogNote: () => void;
}) {
  const countTarget = isCountTarget(item);
  const vendorLink = item.vendorId ? `/staff/vendors/${item.vendorId}` : null;

  return (
    <div
      className={`grid ${GRID_TEMPLATE} items-center gap-3 px-2 py-4 text-xs text-white/70 transition-colors lg:px-2 ${
        counted ? "bg-white/5" : "bg-transparent"
      }`}
    >
      <div className="flex flex-col gap-1 text-sm text-white">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="truncate">{item.name}</span>
          {countTarget && (
            <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.35em] text-white/70">
              Count
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/45">
          Vendor · {item.vendorName ?? "—"}
          {typeof item.vendorPunctuality === "number" && (
            <span className="ml-2 text-emerald-200">{item.vendorPunctuality.toFixed(1)} punctuality</span>
          )}
          {typeof item.vendorCostDrift === "number" && (
            <span className="ml-2 text-amber-200">
              {item.vendorCostDrift > 0 ? "+" : ""}
              {item.vendorCostDrift.toFixed(1)}% drift
            </span>
          )}
          {vendorLink && (
            <Link
              href={vendorLink}
              className="ml-3 text-[10px] uppercase tracking-[0.35em] text-white/60 underline-offset-4 hover:text-white"
            >
              Open
            </Link>
          )}
        </p>
        <p className="truncate text-[11px] text-white/45">
          Counted · {item.lastCountedAt ? DATE_FORMATTER.format(new Date(item.lastCountedAt)) : "—"}
        </p>
      </div>
      <p className="truncate text-xs text-white/60">{item.category ?? "—"}</p>
      <p className="truncate text-xs text-white/60">{item.location ?? "—"}</p>
      <p className="whitespace-nowrap text-right text-xs text-white/60">{item.unit ?? "ea"}</p>
      <div className="flex flex-col items-end gap-1 text-right text-sm">
        <span className="whitespace-nowrap text-white">{displayOnHand}</span>
        {adjustment !== 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] uppercase tracking-[0.3em] text-amber-200/80"
          >
            Δ {adjustment > 0 ? "+" : ""}
            {adjustment}
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">live</span>
        )}
      </div>
      <p className="whitespace-nowrap text-right text-sm text-white/80">{item.parLevel ?? "—"}</p>
      <p
        className={`whitespace-nowrap text-right text-sm ${
          variance < 0 ? "text-amber-200" : variance === 0 ? "text-white/70" : "text-emerald-200"
        }`}
      >
        {variance > 0 ? "+" : ""}
        {variance}
      </p>
      <InventoryStatusBadge status={status} />
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.35em]">
        <div className="flex items-center gap-1 rounded-full border border-white/15 px-2">
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            className="px-1 py-1 text-white/70 transition hover:text-white"
            aria-label={`Decrease ${item.name} on-hand`}
          >
            −
          </button>
          <span className="text-white/50">adj</span>
          <button
            type="button"
            onClick={() => onAdjust(1)}
            className="px-1 py-1 text-white/70 transition hover:text-white"
            aria-label={`Increase ${item.name} on-hand`}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onCount}
          disabled={counted || saving}
          className={`rounded-full border px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
            counted ? "border-white/70 text-white" : "border-white/20 text-white/60 hover:border-white/40"
          }`}
        >
          {counted ? "Counted" : saving ? "Saving…" : "Mark counted"}
        </button>
        <button
          type="button"
          onClick={onLogNote}
          disabled={!canLogNotes}
          className="rounded-full border border-white/20 px-3 py-1 text-white/60 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Log note
        </button>
      </div>
    </div>
  );
}

function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const label = status === "low" ? "Below par" : status === "over" ? "Over" : "At par";
  const tone =
    status === "low"
      ? "border-amber-200/60 text-amber-100"
      : status === "over"
        ? "border-emerald-200/60 text-emerald-100"
        : "border-white/25 text-white/70";

  return (
    <span className={`inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.35em] ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function InventoryLegend() {
  return (
    <footer className="mt-8 border-t border-white/10 pt-4 text-xs text-white/60">
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1">
          <p className="uppercase tracking-[0.35em] text-white/40">Status legend</p>
          <p>- Low when on hand dips below minimum threshold · Over when it climbs past par</p>
        </div>
        <div className="space-y-1">
          <p className="uppercase tracking-[0.35em] text-white/40">Quick ops</p>
          <p>Adjustments stage inline; mark as counted to lock the value during live sessions.</p>
        </div>
        <div className="space-y-1">
          <p className="uppercase tracking-[0.35em] text-white/40">Focus</p>
          <p>Low Stock / Count List isolate problem clusters during service checks.</p>
        </div>
      </div>
    </footer>
  );
}

function InventorySkeletonRows() {
  return (
    <div className="mt-4 space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="h-16 w-full animate-pulse rounded-2xl border border-white/10 bg-white/5"
        />
      ))}
    </div>
  );
}

function InventoryEmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-white/60">
      <p className="text-base text-white/80">{hasActiveFilters ? "No items match the current filters." : "Inventory feed is empty."}</p>
      <p className="text-xs text-white/40">
        {hasActiveFilters
          ? "Broaden filters or clear focus toggles to see everything."
          : "No live inventory records yet — add items from Supabase InventoryOS."}
      </p>
    </div>
  );
}

function InventoryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
      <p className="text-base text-white">Inventory feed unavailable</p>
      <p className="mt-1 text-white/60">
        Check Supabase functions or retry sync. The view will reload automatically on success.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-white/80"
      >
        Retry
      </button>
    </div>
  );
}

function buildOptions(values: Array<string | null>) {
  const seen = new Map<string, string>();
  values.forEach((value) => {
    if (!value) return;
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, value);
    }
  });

  return [
    { value: "all", label: "All" },
    ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
  ];
}

function toCsvValue(value: string) {
  const normalized = `${value ?? ""}`;
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function deriveVariance(item: InventoryGridItem, adjustment = 0) {
  if (item.parLevel == null) {
    return 0;
  }
  const projected = item.onHand + adjustment;
  return Number((projected - item.parLevel).toFixed(2));
}

function resolveStatus(item: InventoryGridItem, projectedQuantity: number): InventoryStatus {
  const minTarget =
    typeof item.minimumThreshold === "number"
      ? item.minimumThreshold
      : typeof item.parLevel === "number"
        ? item.parLevel
        : null;
  if (minTarget != null && projectedQuantity < minTarget) {
    return "low";
  }
  if (typeof item.parLevel === "number" && projectedQuantity > item.parLevel) {
    return "over";
  }
  return "par";
}

function isCountTarget(item: InventoryGridItem) {
  if (item.minimumThreshold != null) {
    return item.onHand <= item.minimumThreshold;
  }
  return Boolean(item.parLevel && item.onHand <= item.parLevel);
}

function formatTime(value: string) {
  try {
    return TIME_FORMATTER.format(new Date(value));
  } catch {
    return "—";
  }
}

function formatDateTime(value: string) {
  try {
    const date = new Date(value);
    return `${DATE_FORMATTER.format(date)} · ${TIME_FORMATTER.format(date)}`;
  } catch {
    return "—";
  }
}

