"use client";

import { useMemo, useState } from "react";

type TableStatus = "open" | "ordering" | "served" | "paying";

type TableBlock = {
  id: string;
  label: string;
  seats: number;
  zone: "dining" | "chef" | "bar";
  canCombine: boolean;
  status: TableStatus;
  currentCourse?: string;
  lastOrderMinutes?: number;
  seatedMinutes?: number;
  guestNames?: string[];
  billTotal?: number;
};

type SeatSlot = {
  id: string;
  label: string;
  blockId: string;
};

type MenuCategory = {
  id: string;
  label: string;
  color: string;
  items: MenuItem[];
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  tags?: string[];
  modifierKey?: string;
};

type OrderLine = {
  id: string;
  name: string;
  seat: string;
  price: number;
  qty: number;
  modifierKey?: string;
};

type ModifierSuggestion = {
  id: string;
  label: string;
  defaultApplied?: boolean;
};

type LineAdjustment = {
  comp?: boolean;
  splitMode?: "none" | "even" | "custom";
  transferTo?: string;
  customSplitNote?: string;
};

const DINING_TABLES: TableBlock[] = Array.from({ length: 14 }).map((_, index) => ({
  id: `d-${String(index + 1).padStart(2, "0")}`,
  label: `Dining ${String(index + 1).padStart(2, "0")}`,
  seats: 2,
  zone: "dining",
  canCombine: true,
  status: index % 4 === 0 ? "ordering" : index % 4 === 1 ? "open" : index % 4 === 2 ? "served" : "paying",
  currentCourse: ["Prelude", "Course II", "Course III", "Dessert"][index % 4],
  lastOrderMinutes: (index % 5) * 7 + 5,
  seatedMinutes: (index % 6) * 12 + 20,
  guestNames: index % 3 === 0 ? ["Aya", "Ken"] : ["Guest"],
  billTotal: 240 + index * 8,
}));

const CHEF_TABLES: TableBlock[] = Array.from({ length: 4 }).map((_, index) => ({
  id: `chef-${index + 1}`,
  label: `Chef ${index + 1}`,
  seats: 1,
  zone: "chef",
  canCombine: false,
  status: index % 2 === 0 ? "ordering" : "served",
  currentCourse: index % 2 === 0 ? "Chef's Notes" : "Prelude",
  lastOrderMinutes: 4 + index * 3,
  seatedMinutes: 18 + index * 6,
  guestNames: [`Chef's Guest ${index + 1}`],
  billTotal: 180 + index * 20,
}));

const BAR_SEATS: TableBlock[] = Array.from({ length: 4 }).map((_, index) => ({
  id: `bar-${index + 1}`,
  label: `Bar ${index + 1}`,
  seats: 1,
  zone: "bar",
  canCombine: false,
  status: "open",
  currentCourse: "Snacks",
  lastOrderMinutes: 0,
  seatedMinutes: 0,
  guestNames: [],
  billTotal: 0,
}));

const TABLE_BLOCKS: TableBlock[] = [...DINING_TABLES, ...CHEF_TABLES, ...BAR_SEATS];

const MENU: MenuCategory[] = [
  {
    id: "snacks",
    label: "Snacks",
    color: "#00FF9C",
    items: [
      { id: "snack-1", name: "Shiso Spritz", price: 18, tags: ["bev"], modifierKey: "shiso" },
      { id: "snack-2", name: "Sea Lettuce Chip", price: 12, modifierKey: "chip" },
      { id: "snack-3", name: "Coal Pearls", price: 15 },
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
      { id: "main-4", name: "Aged Duck", price: 42, modifierKey: "duck" },
    ],
  },
  {
    id: "desserts",
    label: "Desserts",
    color: "#FF82E0",
    items: [
      { id: "dessert-1", name: "Black Sesame Cloud", price: 16 },
      { id: "dessert-2", name: "Frozen Yuzu Leaf", price: 14 },
    ],
  },
  {
    id: "pairings",
    label: "Pairings",
    color: "#42D9FF",
    items: [
      { id: "pair-1", name: "Wine Pairing", price: 68 },
      { id: "pair-2", name: "NA Pairing", price: 48 },
    ],
  },
];

const MODIFIER_LIBRARY: Record<string, ModifierSuggestion[]> = {
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
  duck: [
    { id: "medium-rare", label: "Cook medium rare", defaultApplied: true },
    { id: "sauce-side", label: "Sauce on the side" },
  ],
};

const QUICK_ACTIONS = ["Fire Next Course", "Mark Allergies", "Print Check", "Split Evenly"];

export function PosWorkspace() {
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([TABLE_BLOCKS[0].id]);
  const [viewMode, setViewMode] = useState<"ordering" | "layout">("ordering");
  const hasMergedBlocks = selectedBlocks.length > 1;
  const seatSlots = useMemo(() => generateSeatSlots(selectedBlocks), [selectedBlocks]);
  const [preferredSeat, setPreferredSeat] = useState<string | null>(null);
  const activeSeat = useMemo(() => {
    if (!seatSlots.length) {
      return "";
    }
    if (preferredSeat && seatSlots.some((slot) => slot.id === preferredSeat)) {
      return preferredSeat;
    }
    return seatSlots[0].id;
  }, [seatSlots, preferredSeat]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [modifiersByLine, setModifiersByLine] = useState<Record<string, string[]>>({});
  const [adjustments, setAdjustments] = useState<Record<string, LineAdjustment>>({});
  const [receiptNote, setReceiptNote] = useState("");
  const layoutMode = viewMode === "layout";

  const activeBlocks = useMemo(
    () => TABLE_BLOCKS.filter((block) => selectedBlocks.includes(block.id)),
    [selectedBlocks],
  );
  const activeTableId = selectedBlocks[0] ?? TABLE_BLOCKS[0].id;
  const activeTable = activeBlocks[0] ?? TABLE_BLOCKS[0];
  const orderingRailTables = useMemo(
    () => TABLE_BLOCKS.filter((block) => block.status !== "open"),
    [],
  );

  function toggleBlock(blockId: string) {
    setSelectedBlocks((current) => {
      if (current.includes(blockId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== blockId);
      }
      const block = TABLE_BLOCKS.find((b) => b.id === blockId);
      if (!block) return current;
      if (!block.canCombine) return [blockId];
      return [...current, blockId];
    });
  }

  function mergeBlocks(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const source = TABLE_BLOCKS.find((block) => block.id === sourceId);
    const target = TABLE_BLOCKS.find((block) => block.id === targetId);
    if (!source || !target) return;
    if (!source.canCombine || !target.canCombine) return;
    setSelectedBlocks((current) => {
      const next = new Set(current);
      next.add(sourceId);
      next.add(targetId);
      return Array.from(next);
    });
  }

  function focusTable(tableId: string) {
    setSelectedBlocks([tableId]);
    const slots = generateSeatSlots([tableId]);
    setPreferredSeat(slots[0]?.id ?? null);
  }

function addItem(item: MenuItem) {
  if (!activeSeat) return;
  setOrderLines((current) => [
    ...current,
    {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      seat: activeSeat,
      price: item.price,
      qty: 1,
      modifierKey: item.modifierKey,
    },
  ]);
}

  function adjustQty(lineId: string, delta: number) {
    setOrderLines((current) =>
      current
        .map((line) =>
          line.id === lineId ? { ...line, qty: Math.max(1, line.qty + delta) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function clearOrder() {
    setOrderLines([]);
    setModifiersByLine({});
    setAdjustments({});
    setReceiptNote("");
  }

  function toggleModifier(lineId: string, modifierId: string) {
    setModifiersByLine((current) => {
      const existing = current[lineId] ?? [];
      if (existing.includes(modifierId)) {
        return { ...current, [lineId]: existing.filter((id) => id !== modifierId) };
      }
      return { ...current, [lineId]: [...existing, modifierId] };
    });
  }

  function updateAdjustment(lineId: string, patch: Partial<LineAdjustment>) {
    setAdjustments((current) => ({
      ...current,
      [lineId]: {
        comp: patch.comp ?? current[lineId]?.comp ?? false,
        splitMode: patch.splitMode ?? current[lineId]?.splitMode ?? "none",
        transferTo: patch.transferTo ?? current[lineId]?.transferTo,
        customSplitNote: patch.customSplitNote ?? current[lineId]?.customSplitNote,
      },
    }));
  }

  const totals = useMemo(() => {
    const subtotal = orderLines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const tax = subtotal * 0.13;
    const compTotal = orderLines.reduce((sum, line) => {
      if (!adjustments[line.id]?.comp) return sum;
      return sum + line.price * line.qty;
    }, 0);
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      compTotal,
    };
  }, [orderLines, adjustments]);

  const lastLine = orderLines.at(-1);

  if (layoutMode) {
    return (
      <div className="flex flex-col gap-6 bg-[#03040b] px-6 py-8 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/45">Table Layout</p>
            <h1 className="text-3xl font-light tracking-[0.25em]">Arrange + Seat Guests</h1>
            <p className="text-sm text-white/60">
              Drag tables to merge, seat parties, and review dwell times before sending to ordering.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("ordering")}
            className="rounded-full border border-white/30 px-5 py-2 text-xs uppercase tracking-[0.4em] text-white/80 hover:border-white/70"
          >
            Exit Layout
          </button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
            <TableGrid
              blocks={TABLE_BLOCKS}
              selected={selectedBlocks}
              onToggle={toggleBlock}
              onMerge={mergeBlocks}
            />
            {hasMergedBlocks && (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-xs text-white/70">
                <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Merged</p>
                <p className="mt-1 font-medium">
                  {activeBlocks.map((block) => block.label).join(" + ")}
                </p>
                <button
                  type="button"
                  onClick={() => focusTable(activeBlocks[0]?.id ?? TABLE_BLOCKS[0].id)}
                  className="mt-2 text-[0.55rem] uppercase tracking-[0.4em] text-white/60 underline-offset-2 hover:text-white"
                >
                  Unmerge tables
                </button>
              </div>
            )}
            <SeatSummary
              seatSlots={seatSlots}
              activeSeat={activeSeat}
              onChangeSeat={(seat) => setPreferredSeat(seat)}
            />
          </section>
          <TableInfoPanel block={activeTable} mergedBlocks={hasMergedBlocks ? activeBlocks : undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen gap-4 bg-[#03040b] px-6 py-8 text-white xl:grid-cols-[260px_minmax(0,1fr)_420px]">
      <ActiveOrderRail
        tables={orderingRailTables}
        activeId={activeTableId}
        onSelect={focusTable}
        onOpenLayout={() => setViewMode("layout")}
      />

      <main className="space-y-5 rounded-[32px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.5)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Ordering · {activeTable.label}</p>
            <h2 className="text-2xl font-light">
              {activeTable.guestNames?.join(", ") || "Unassigned"} · Party{" "}
              {activeTable.guestNames?.length ?? activeTable.seats}
            </h2>
            <p className="text-xs text-white/60">
              {activeTable.currentCourse ?? "Prelude"} · {activeTable.lastOrderMinutes ?? 0}m since last order
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("layout")}
            className="rounded-full border border-white/20 px-4 py-2 text-[0.55rem] uppercase tracking-[0.4em] text-white/70 hover:border-white/50"
          >
            Table Layout
          </button>
        </header>

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

        <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
          <SeatSummary
            seatSlots={seatSlots}
            activeSeat={activeSeat}
            onChangeSeat={(seat) => setPreferredSeat(seat)}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {MENU.map((category) => (
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
                    onClick={() => addItem(item)}
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

        <ModifierPanel lastLine={lastLine} modifiersByLine={modifiersByLine} onToggle={toggleModifier} />
      </main>

      <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/50">Ticket · {activeTable.label}</p>
            <p className="text-xs text-white/60">
              Seat {activeSeat || "-"} · {activeTable.guestNames?.join(", ") || "Guest"}
            </p>
          </div>
          <button
            type="button"
            onClick={clearOrder}
            className="rounded-full border border-white/15 px-3 py-1 text-[0.55rem] uppercase tracking-[0.4em] text-white/60 hover:border-white/40"
          >
            Clear
          </button>
        </header>

        <div className="space-y-3 overflow-y-auto pr-1 max-h-[40vh]">
          {orderLines.length === 0 ? (
            <p className="text-sm text-white/60">Add items to begin a ticket.</p>
          ) : (
            orderLines.map((line) => (
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
                      onClick={() => adjustQty(line.id, -1)}
                      className="h-7 w-7 rounded-full border border-white/20 text-sm"
                    >
                      –
                    </button>
                    <span className="w-6 text-center text-sm">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(line.id, 1)}
                      className="h-7 w-7 rounded-full border border-white/20 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[0.55rem] uppercase tracking-[0.35em]">
                  <button
                    type="button"
                    onClick={() =>
                      updateAdjustment(line.id, { comp: !adjustments[line.id]?.comp })
                    }
                    className={`rounded-full border px-3 py-1 ${
                      adjustments[line.id]?.comp
                        ? "border-[#ff7f81]/60 text-[#ffb3b5]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Comp
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateAdjustment(line.id, {
                        splitMode: adjustments[line.id]?.splitMode === "even" ? "none" : "even",
                      })
                    }
                    className={`rounded-full border px-3 py-1 ${
                      adjustments[line.id]?.splitMode === "even"
                        ? "border-[#8a7cff]/60 text-[#c8c0ff]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Split 50/50
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateAdjustment(line.id, {
                        splitMode: adjustments[line.id]?.splitMode === "custom" ? "none" : "custom",
                      })
                    }
                    className={`rounded-full border px-3 py-1 ${
                      adjustments[line.id]?.splitMode === "custom"
                        ? "border-[#42d9ff]/60 text-[#9ae7ff]"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    Custom Split
                  </button>
                </div>
                <div className="space-y-2 text-xs text-white/60">
                  {adjustments[line.id]?.splitMode === "custom" && (
                    <input
                      type="text"
                      value={adjustments[line.id]?.customSplitNote ?? ""}
                      onChange={(event) =>
                        updateAdjustment(line.id, { customSplitNote: event.target.value })
                      }
                      placeholder="Custom split detail"
                      className="w-full rounded-2xl border border-white/15 bg-transparent px-3 py-1 text-xs outline-none"
                    />
                  )}
                  <input
                    type="text"
                    value={adjustments[line.id]?.transferTo ?? ""}
                    onChange={(event) =>
                      updateAdjustment(line.id, { transferTo: event.target.value })
                    }
                    placeholder="Transfer to table / guest"
                    className="w-full rounded-2xl border border-white/15 bg-transparent px-3 py-1 text-xs outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <ReceiptComposer
          totals={totals}
          orderLines={orderLines}
          adjustments={adjustments}
          receiptNote={receiptNote}
          onChangeNote={setReceiptNote}
        />
      </aside>
    </div>
  );
}

function TableGrid({
  blocks,
  selected,
  onToggle,
  onMerge,
}: {
  blocks: TableBlock[];
  selected: string[];
  onToggle: (id: string) => void;
  onMerge: (sourceId: string, targetId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const zones: Array<TableBlock["zone"]> = ["dining", "chef", "bar"];
  return (
    <div className="space-y-3">
      {zones.map((zone) => (
        <div key={zone}>
          <p className="mb-2 text-[0.55rem] uppercase tracking-[0.4em] text-white/40">{zone}</p>
          <div className="grid grid-cols-2 gap-2">
            {blocks
              .filter((block) => block.zone === zone)
              .map((block) => {
                const active = selected.includes(block.id);
                const isDragSource = draggingId === block.id;
                const canAcceptDrop =
                  Boolean(draggingId) && draggingId !== block.id && block.canCombine;
                return (
                  <button
                    key={block.id}
                    type="button"
                    draggable
                    onDragStart={() => {
                      setDraggingId(block.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(event) => {
                      if (canAcceptDrop) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => {
                      if (!draggingId || draggingId === block.id) return;
                      event.preventDefault();
                      onMerge(draggingId, block.id);
                      setDraggingId(null);
                    }}
                    onClick={() => onToggle(block.id)}
                    className={`rounded-2xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-white/70 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                        : "border-white/15 hover:border-white/40"
                    } ${
                      isDragSource
                        ? "opacity-80"
                        : canAcceptDrop
                          ? "border-dashed border-white/50"
                          : ""
                    }`}
                  >
                    <p className="text-sm font-medium">{block.label}</p>
                    <p className="text-xs text-white/60">{block.seats} seats</p>
                    <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/40">
                      {block.status}
                    </p>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableInfoPanel({
  block,
  mergedBlocks,
}: {
  block: TableBlock;
  mergedBlocks?: TableBlock[];
}) {
  if (!block) return null;
  const dwell = formatMinutes(block.seatedMinutes);
  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10/60 to-transparent p-5 shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/45">Table Detail</p>
          <h2 className="text-2xl font-light text-white">{block.label}</h2>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-white/70">
          {block.status}
        </span>
      </div>
      {mergedBlocks && mergedBlocks.length > 1 && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-xs text-white/70">
          <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Merged with</p>
          <p>{mergedBlocks.map((item) => item.label).join(", ")}</p>
        </div>
      )}
      <dl className="grid gap-3 text-sm text-white/70">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <dt className="uppercase tracking-[0.3em] text-white/40 text-[0.55rem]">Guests</dt>
          <dd>{block.guestNames?.join(", ") || "Unassigned"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <dt className="uppercase tracking-[0.3em] text-white/40 text-[0.55rem]">Course</dt>
          <dd>{block.currentCourse ?? "Prelude"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <dt className="uppercase tracking-[0.3em] text-white/40 text-[0.55rem]">Dwell</dt>
          <dd>{dwell}</dd>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <dt className="uppercase tracking-[0.3em] text-white/40 text-[0.55rem]">Bill</dt>
          <dd>{formatCurrency(block.billTotal)}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/80 hover:border-white/60"
      >
        Seat Guest / Update Party
      </button>
    </section>
  );
}

function ActiveOrderRail({
  tables,
  activeId,
  onSelect,
  onOpenLayout,
}: {
  tables: TableBlock[];
  activeId: string;
  onSelect: (tableId: string) => void;
  onOpenLayout: () => void;
}) {
  return (
    <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Active Tables</p>
        <button
          type="button"
          onClick={onOpenLayout}
          className="rounded-full border border-white/20 px-3 py-1 text-[0.55rem] uppercase tracking-[0.4em] text-white/70 hover:border-white/60"
        >
          Layout
        </button>
      </div>
      <div className="space-y-3">
        {tables.map((table) => (
          <ActiveTableCard
            key={table.id}
            table={table}
            active={table.id === activeId}
            onSelect={() => onSelect(table.id)}
          />
        ))}
        {tables.length === 0 && (
          <p className="text-sm text-white/60">No active tickets at the moment.</p>
        )}
      </div>
    </aside>
  );
}

function ActiveTableCard({
  table,
  active,
  onSelect,
}: {
  table: TableBlock;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
        active
          ? "border-white/70 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          : "border-white/15 bg-white/0 hover:border-white/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{table.label}</p>
        <span className="text-xs uppercase tracking-[0.3em] text-white/50">{table.status}</span>
      </div>
      <p className="text-xs text-white/60">
        {table.currentCourse ?? "Prelude"} · {table.lastOrderMinutes ?? 0}m since fire
      </p>
      <p className="text-xs text-white/40">
        Party {table.guestNames?.length ?? table.seats} · {formatCurrency(table.billTotal)}
      </p>
    </button>
  );
}

function SeatSummary({
  seatSlots,
  activeSeat,
  onChangeSeat,
}: {
  seatSlots: SeatSlot[];
  activeSeat: string;
  onChangeSeat: (seat: string) => void;
}) {
  if (seatSlots.length === 0) {
    return <p className="text-sm text-white/60">Select a table to manage seats.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-[0.55rem] uppercase tracking-[0.4em] text-white/45">Seats</p>
      <div className="flex flex-wrap gap-2">
        {seatSlots.map((seat) => (
          <button
            key={seat.id}
            type="button"
            onClick={() => onChangeSeat(seat.id)}
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
    </div>
  );
}

function formatMinutes(minutes?: number) {
  if (!minutes && minutes !== 0) return "–";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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

function ModifierPanel({
  lastLine,
  modifiersByLine,
  onToggle,
}: {
  lastLine: OrderLine | undefined;
  modifiersByLine: Record<string, string[]>;
  onToggle: (lineId: string, modifierId: string) => void;
}) {
  if (!lastLine) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Choose an item to surface likely modifications.
      </section>
    );
  }
  const modifierKey = lastLine.modifierKey;
  const options = modifierKey ? MODIFIER_LIBRARY[modifierKey] ?? [] : [];
  if (options.length === 0) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        No saved modifications for this item yet. Edit in Menu Builder to prime suggestions.
      </section>
    );
  }
  const applied = modifiersByLine[lastLine.id] ?? [];
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
            onClick={() => onToggle(lastLine.id, option.id)}
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

function ReceiptComposer({
  totals,
  orderLines,
  adjustments,
  receiptNote,
  onChangeNote,
}: {
  totals: { subtotal: number; tax: number; total: number; compTotal: number };
  orderLines: OrderLine[];
  adjustments: Record<string, LineAdjustment>;
  receiptNote: string;
  onChangeNote: (value: string) => void;
}) {
  const transferLines = orderLines
    .map((line) => ({
      line,
      transfer: adjustments[line.id]?.transferTo,
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

function generateSeatSlots(blockIds: string[]): SeatSlot[] {
  const blocks = TABLE_BLOCKS.filter((block) => blockIds.includes(block.id));
  const slots: SeatSlot[] = [];
  blocks.forEach((block) => {
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

export default PosWorkspace;
