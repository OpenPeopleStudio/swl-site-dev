"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePosData } from "@/hooks/staff/usePosData";
import type {
  MenuCategory,
  MenuItem,
  ModifierSuggestion,
  PosCheck,
  PosCheckLine,
  TableBlock,
} from "@/types/pos";

export function PosWorkspace() {
  const {
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
  } = usePosData();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [preferredSeat, setPreferredSeat] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const effectiveSelection = useMemo(() => {
    if (selectedTables.length) return selectedTables;
    if (tables.length) return [tables[0].id];
    return [];
  }, [selectedTables, tables]);

  const activeBlocks = useMemo(
    () => tables.filter((block) => effectiveSelection.includes(block.id)),
    [tables, effectiveSelection],
  );
  const activeTable = activeBlocks[0] ?? tables[0] ?? null;

  const activeCheck = useMemo<PosCheck | null>(() => {
    if (!activeBlocks.length) return null;
    const target = [...activeBlocks.map((block) => block.id)].sort();
    return (
      checks.find((check) => arraysMatch(check.tableSlugs, target)) ?? null
    );
  }, [activeBlocks, checks]);

  const orderLines = useMemo(
    () =>
      activeCheck
        ? checkLines.filter((line) => line.checkId === activeCheck.id)
        : [],
    [checkLines, activeCheck],
  );

  const receiptNoteDraft = activeCheck
    ? noteDrafts[activeCheck.id] ?? activeCheck.receiptNote ?? ""
    : "";

  useEffect(() => {
    if (!activeCheck) return;
    const baseline = activeCheck.receiptNote ?? "";
    if (receiptNoteDraft === baseline) return;
    const timeout = setTimeout(() => {
      updateCheck(activeCheck.id, {
        receiptNote: receiptNoteDraft,
        expectedRevision: activeCheck.revision,
      }).catch((err) => console.error(err));
    }, 500);
    return () => clearTimeout(timeout);
  }, [receiptNoteDraft, activeCheck, updateCheck]);

  const handleReceiptNoteChange = useCallback(
    (value: string) => {
      if (!activeCheck) return;
      setNoteDrafts((prev) => ({ ...prev, [activeCheck.id]: value }));
    },
    [activeCheck],
  );

  const ensureCheck = useCallback(async () => {
    if (activeCheck) return activeCheck;
    if (!activeBlocks.length) return null;
    try {
      return await openCheck(activeBlocks.map((block) => block.id));
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [activeCheck, activeBlocks, openCheck]);

  const seatSlots = useMemo(
    () => generateSeatSlots(effectiveSelection, tables),
    [effectiveSelection, tables],
  );

  const activeSeat = useMemo(() => {
    if (!activeTable) return null;
    const defaultSeat = `${activeTable.id}-seat-1`;
    if (preferredSeat && seatSlots.some((slot) => slot.id === preferredSeat)) {
      return preferredSeat;
    }
    return seatSlots[0]?.id ?? defaultSeat;
  }, [activeTable, seatSlots, preferredSeat]);

  const handleAddItem = useCallback(
    async (item: MenuItem) => {
  if (!activeSeat) return;
      const check = await ensureCheck();
      if (!check) return;
      try {
        await addLine(check.id, {
      name: item.name,
      seat: activeSeat,
      price: item.price,
      qty: 1,
          menuItemId: item.id,
      modifierKey: item.modifierKey,
        });
      } catch (err) {
        console.error(err);
      }
    },
    [activeSeat, ensureCheck, addLine],
  );

  const handleAdjustQty = useCallback(
    async (line: PosCheckLine, delta: number) => {
      if (!activeCheck) return;
      const nextQty = Math.max(0, line.qty + delta);
      try {
        await updateLine(activeCheck.id, { lineId: line.id, qty: nextQty });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const handleClearTicket = useCallback(async () => {
    if (!activeCheck) return;
    try {
      await clearLines(activeCheck.id);
    } catch (err) {
      console.error(err);
    }
  }, [activeCheck, clearLines]);

  const handleToggleComp = useCallback(
    async (line: PosCheckLine) => {
      if (!activeCheck) return;
      try {
        await updateLine(activeCheck.id, { lineId: line.id, comp: !line.comp });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const handleSplitMode = useCallback(
    async (line: PosCheckLine, mode: "even" | "custom") => {
      if (!activeCheck) return;
      const nextMode = line.splitMode === mode ? "none" : mode;
      try {
        await updateLine(activeCheck.id, { lineId: line.id, splitMode: nextMode });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const handleModifierToggle = useCallback(
    async (line: PosCheckLine, modifierId: string) => {
      if (!activeCheck) return;
      const current = line.modifiers ?? [];
      const next = current.includes(modifierId)
        ? current.filter((id) => id !== modifierId)
        : [...current, modifierId];
      try {
        await updateLine(activeCheck.id, { lineId: line.id, modifiers: next });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const handleTransferBlur = useCallback(
    async (line: PosCheckLine, value: string) => {
      if (!activeCheck) return;
      const trimmed = value.trim();
      try {
        await updateLine(activeCheck.id, {
          lineId: line.id,
          transferTo: trimmed.length ? trimmed : null,
        });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const handleCustomSplitBlur = useCallback(
    async (line: PosCheckLine, value: string) => {
      if (!activeCheck) return;
      const trimmed = value.trim();
      try {
        await updateLine(activeCheck.id, {
          lineId: line.id,
          customSplitNote: trimmed.length ? trimmed : null,
        });
      } catch (err) {
        console.error(err);
      }
    },
    [activeCheck, updateLine],
  );

  const totals = useMemo(() => {
    const subtotal = orderLines.reduce(
      (sum, line) => sum + line.price * line.qty,
      0,
    );
    const tax = subtotal * 0.13;
    const compTotal = orderLines.reduce(
      (sum, line) => (line.comp ? sum + line.price * line.qty : sum),
      0,
    );
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      compTotal,
    };
  }, [orderLines]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#03040b] text-white">
        <p className="text-xs uppercase tracking-[0.45em] text-white/60">
          Loading POS data…
        </p>
      </main>
    );
  }

  if (error) {
  return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#03040b] text-white">
        <p className="text-sm text-white/70">{error}</p>
          <button
            type="button"
          onClick={() => refresh()}
          className="rounded-full border border-white/40 px-4 py-2 text-[0.6rem] uppercase tracking-[0.35em] text-white/80 hover:border-white/70"
          >
          Retry
          </button>
      </main>
    );
  }

  if (!activeTable) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#03040b] text-white">
        <p className="text-xs uppercase tracking-[0.45em] text-white/60">
          No tables configured yet.
        </p>
      </main>
    );
  }

  const menuSource = menu.length ? menu : fallbackMenu;
  const modifierLibrary = Object.keys(modifiers).length ? modifiers : fallbackModifiers;
  const lastLine = orderLines.at(-1);

  return (
    <div className="min-h-screen bg-[#03040b] px-6 py-8 text-white">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_360px]">
        <TableRail
          tables={tables}
          selectedIds={selectedTables}
          onSelect={(id) => {
            setSelectedTables([id]);
            setPreferredSeat(`${id}-seat-1`);
          }}
        />

        <div className="space-y-5 rounded-[32px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.5)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
              <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">
                Ordering · {activeTable.label}
              </p>
            <h2 className="text-2xl font-light">
              {activeTable.guestNames?.join(", ") || "Unassigned"} · Party{" "}
              {activeTable.guestNames?.length ?? activeTable.seats}
            </h2>
            <p className="text-xs text-white/60">
              {activeTable.currentCourse ?? "Prelude"} · {activeTable.lastOrderMinutes ?? 0}m since last order
            </p>
          </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-full border border-white/20 px-4 py-1 text-[0.55rem] uppercase tracking-[0.4em] text-white/70 hover:border-white/50"
            >
              {action}
            </button>
          ))}
        </div>
          </header>

          <SeatSummary seats={seatSlots} activeSeat={activeSeat} onSelect={(seat) => setPreferredSeat(seat)} />

          <MenuGrid categories={menuSource} onAddItem={handleAddItem} />

          <ModifierPanel lastLine={lastLine} library={modifierLibrary} onToggle={handleModifierToggle} />
        </div>

        <TicketPanel
          activeTable={activeTable}
          activeSeat={activeSeat}
          lines={orderLines}
          totals={totals}
          receiptNote={receiptNoteDraft}
          onChangeNote={handleReceiptNoteChange}
          onAdjustQty={handleAdjustQty}
          onToggleComp={handleToggleComp}
          onSplitMode={handleSplitMode}
          onTransferBlur={handleTransferBlur}
          onCustomSplitBlur={handleCustomSplitBlur}
          onClear={handleClearTicket}
        />
      </div>
    </div>
  );
}

function arraysMatch(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function TableRail({
  tables,
  selectedIds,
  onSelect,
}: {
  tables: TableBlock[];
  selectedIds: string[];
  onSelect: (tableId: string) => void;
}) {
  return (
    <aside className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Active Tables</p>
      <div className="space-y-2">
        {tables.map((table) => {
          const active = selectedIds.includes(table.id);
          return (
            <button
              key={table.id}
              type="button"
              onClick={() => onSelect(table.id)}
              className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                active
                  ? "border-white/70 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                  : "border-white/15 bg-white/0 hover:border-white/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{table.label}</p>
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {table.status}
                </span>
              </div>
              <p className="text-xs text-white/60">
                {table.currentCourse ?? "Prelude"} · {table.lastOrderMinutes ?? 0}m since fire
              </p>
              <p className="text-xs text-white/40">
                Party {table.guestNames?.length ?? table.seats} · {formatCurrency(table.billTotal)}
              </p>
            </button>
          );
        })}
        {tables.length === 0 && (
          <p className="text-sm text-white/60">No table blocks available yet.</p>
        )}
      </div>
    </aside>
  );
}

function SeatSummary({
  seats,
  activeSeat,
  onSelect,
}: {
  seats: SeatSlot[];
  activeSeat: string | null;
  onSelect: (seat: string) => void;
}) {
  if (!seats.length) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Select a table to manage seats.
        </section>
    );
  }
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Seats</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            onClick={() => onSelect(seat.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              seat.id === activeSeat
                ? "border-white/80 text-white"
                : "border-white/20 text-white/60 hover:border-white/40"
            }`}
          >
            {seat.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function MenuGrid({
  categories,
  onAddItem,
}: {
  categories: MenuCategory[];
  onAddItem: (item: MenuItem) => void;
}) {
  return (
        <div className="grid gap-4 lg:grid-cols-2">
      {categories.map((category) => (
            <section
              key={category.id}
              className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.35)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">{category.label}</p>
                <span style={{ color: category.color }} className="text-xs">
                  {category.items.length} items
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                onClick={() => onAddItem(item)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/40 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{item.name}</p>
                      <span className="text-xs text-white/60">${item.price.toFixed(2)}</span>
                    </div>
                    {item.tags && (
                      <div className="mt-1 flex gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 px-2 text-[0.55rem] uppercase tracking-[0.3em] text-white/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
  );
}

function ModifierPanel({
  lastLine,
  library,
  onToggle,
}: {
  lastLine: PosCheckLine | undefined;
  library: Record<string, ModifierSuggestion[]>;
  onToggle: (line: PosCheckLine, modifierId: string) => void;
}) {
  if (!lastLine) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Choose an item to surface likely modifications.
      </section>
    );
  }
  const modifierKey = lastLine.modifierKey;
  const options = modifierKey ? library[modifierKey] ?? [] : [];
  if (!options.length) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        No saved modifications for this item yet. Edit in Menu Builder to prime suggestions.
      </section>
    );
  }
  const applied = lastLine.modifiers ?? [];
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Modifications</p>
        <p className="text-xs text-white/60">{lastLine.name}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(lastLine, option.id)}
            className={`rounded-full border px-3 py-1 text-[0.6rem] uppercase tracking-[0.35em] ${
              applied.includes(option.id) || option.defaultApplied
                ? "border-[#00ff9c]/60 text-[#00ff9c]"
                : "border-white/20 text-white/60"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function TicketPanel({
  activeTable,
  activeSeat,
  lines,
  totals,
  receiptNote,
  onChangeNote,
  onAdjustQty,
  onToggleComp,
  onSplitMode,
  onTransferBlur,
  onCustomSplitBlur,
  onClear,
}: {
  activeTable: TableBlock;
  activeSeat: string | null;
  lines: PosCheckLine[];
  totals: { subtotal: number; tax: number; total: number; compTotal: number };
  receiptNote: string;
  onChangeNote: (value: string) => void;
  onAdjustQty: (line: PosCheckLine, delta: number) => void;
  onToggleComp: (line: PosCheckLine) => void;
  onSplitMode: (line: PosCheckLine, mode: "even" | "custom") => void;
  onTransferBlur: (line: PosCheckLine, value: string) => void;
  onCustomSplitBlur: (line: PosCheckLine, value: string) => void;
  onClear: () => void;
}) {
  return (
      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between">
          <div>
          <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/50">
            Ticket · {activeTable.label}
          </p>
            <p className="text-xs text-white/60">
              Seat {activeSeat || "-"} · {activeTable.guestNames?.join(", ") || "Guest"}
            </p>
          </div>
          <button
            type="button"
          onClick={onClear}
          disabled={!lines.length}
          className="rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.4em] text-white/60 hover.border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </header>

        <div className="space-y-3 overflow-y-auto pr-1 max-h-[40vh]">
        {lines.length === 0 ? (
            <p className="text-sm text-white/60">Add items to begin a ticket.</p>
          ) : (
          lines.map((line) => (
              <div
                key={line.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-white/60">
                      Seat {line.seat} · ${line.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                    onClick={() => onAdjustQty(line, -1)}
                      className="h-7 w-7 rounded-full border border-white/20 text-sm"
                    >
                      –
                    </button>
                    <span className="w-6 text-center text-sm">{line.qty}</span>
                    <button
                      type="button"
                    onClick={() => onAdjustQty(line, 1)}
                      className="h-7 w-7 rounded-full border border-white/20 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[0.55rem] uppercase tracking-[0.35em]">
                  <button
                    type="button"
                  onClick={() => onToggleComp(line)}
                    className={`rounded-full border px-3 py-1 ${
                    line.comp
                        ? "border-[#ff7f81]/60 text-[#ffb3b5]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Comp
                  </button>
                  <button
                    type="button"
                  onClick={() => onSplitMode(line, "even")}
                    className={`rounded-full border px-3 py-1 ${
                    line.splitMode === "even"
                        ? "border-[#8a7cff]/60 text-[#c8c0ff]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Split 50/50
                  </button>
                  <button
                    type="button"
                  onClick={() => onSplitMode(line, "custom")}
                    className={`rounded-full border px-3 py-1 ${
                    line.splitMode === "custom"
                        ? "border-[#42d9ff]/60 text-[#9ae7ff]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Custom Split
                  </button>
                </div>
                <div className="space-y-2 text-xs text-white/60">
                {line.splitMode === "custom" && (
                    <input
                    key={`${line.id}-custom-${line.customSplitNote ?? ""}`}
                      type="text"
                    defaultValue={line.customSplitNote ?? ""}
                    onBlur={(event) => onCustomSplitBlur(line, event.target.value)}
                      placeholder="Custom split detail"
                      className="w-full rounded-2xl border border-white/15 bg-transparent px-3 py-1 text-xs outline-none"
                    />
                  )}
                  <input
                  key={`${line.id}-transfer-${line.transferTo ?? ""}`}
                    type="text"
                  defaultValue={line.transferTo ?? ""}
                  onBlur={(event) => onTransferBlur(line, event.target.value)}
                    placeholder="Transfer to table / guest"
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-3 py-1 text-xs outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

      <ReceiptComposer totals={totals} lines={lines} receiptNote={receiptNote} onChangeNote={onChangeNote} />
      </aside>
  );
}

function ReceiptComposer({
  totals,
  lines,
  receiptNote,
  onChangeNote,
}: {
  totals: { subtotal: number; tax: number; total: number; compTotal: number };
  lines: PosCheckLine[];
  receiptNote: string;
  onChangeNote: (value: string) => void;
}) {
  const transferLines = lines
    .map((line) => ({
      line,
      transfer: line.transferTo,
    }))
    .filter((entry) => entry.transfer);

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
      <Row label="Subtotal" value={totals.subtotal} />
      <Row label="Tax (13%)" value={totals.tax} />
      {totals.compTotal > 0 && (
        <Row label="Complimentary" value={-totals.compTotal} highlight="text-[#ffb3b5]" />
      )}
      <hr className="border-white/10" />
      <Row label="Owed" value={totals.total - totals.compTotal} bold />

      {transferLines.length > 0 && (
        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70">
          <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/40">
            Transfers
          </p>
          <ul className="mt-1 space-y-1">
            {transferLines.map(({ line, transfer }) => (
              <li key={line.id}>
                {line.name} → {transfer}
              </li>
            ))}
          </ul>
        </div>
      )}

      <textarea
        value={receiptNote}
        onChange={(event) => onChangeNote(event.target.value)}
        placeholder="Receipt note, comp reason, celebration mention…"
        className="mt-2 w-full rounded-2xl border border-white/15 bg-transparent px-3 py-2 text-xs text-white outline-none"
      />

      <div className="grid gap-3 pt-2">
        <button
          type="button"
          className="rounded-full bg-[#00FF9C] px-4 py-3 text-[0.8rem] font-semibold uppercase tracking-[0.35em] text-black transition hover:bg-[#00ff9c]/80"
        >
          Charge Card
        </button>
        <button
          type="button"
          className="rounded-full border border-white/15 px-4 py-3 text-[0.75rem] uppercase tracking-[0.35em] text-white/80 hover:border-white/40"
        >
          Mark as Cash
        </button>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: string;
}) {
  return (
    <div className="flex items-center justify-between text-white/80">
      <span className={`text-xs uppercase tracking-[0.35em] ${bold ? "text-white" : ""}`}>
        {label}
      </span>
      <span className={`text-base ${bold ? "font-semibold" : ""} ${highlight ?? ""}`}>
        {value >= 0 ? `$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`}
      </span>
    </div>
  );
}

function generateSeatSlots(blockIds: string[], blocks: TableBlock[]): SeatSlot[] {
  const selected = blocks.filter((block) => blockIds.includes(block.id));
  const slots: SeatSlot[] = [];
  selected.forEach((block) => {
    for (let index = 0; index < block.seats; index += 1) {
      slots.push({
        id: `${block.id}-seat-${index + 1}`,
        label: `${block.label}·${index + 1}`,
        blockId: block.id,
      });
    }
  });
  return slots;
}

function formatCurrency(amount?: number) {
  if (typeof amount !== "number") return "—";
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const fallbackMenu: MenuCategory[] = [
  {
    id: "snacks",
    label: "Snacks",
    color: "#00FF9C",
    items: [
      { id: "snack-1", name: "Shiso Spritz", price: 18, tags: ["bev"], modifierKey: "shiso" },
      { id: "snack-2", name: "Sea Lettuce Chip", price: 12, modifierKey: "chip" },
    ],
  },
  {
    id: "plates",
    label: "Plates",
    color: "#8A7CFF",
    items: [
      { id: "main-1", name: "Charred Oyster", price: 28, modifierKey: "oyster" },
      { id: "main-2", name: "Ember Beet", price: 24 },
      { id: "main-3", name: "River Trout", price: 34 },
    ],
  },
];

const fallbackModifiers: Record<string, ModifierSuggestion[]> = {
  shiso: [
    { id: "zero-proof", label: "Zero-proof version" },
    { id: "less-sweet", label: "Less sweet" },
  ],
  chip: [
    { id: "no-sesame", label: "No sesame" },
    { id: "extra-crisp", label: "Extra crisp" },
  ],
  oyster: [
    { id: "allium-free", label: "Remove allium" },
    { id: "extra-caviar", label: "Extra caviar" },
  ],
};

