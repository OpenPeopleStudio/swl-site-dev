import {
  createBarSeats,
  createChefTables,
  createDiningTables,
  createMenuCatalog,
  createModifierLibrary,
} from "@/lib/staff/posMockData";
import type {
  AddLinePayload,
  PosBootstrapPayload,
  PosCheck,
  PosCheckLine,
  TableBlock,
} from "@/types/pos";

type Actor = { email: string };

function universalUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `temp-${Math.random().toString(16).slice(2)}`;
}

function isoNow() {
  return new Date().toISOString();
}

function tableSetEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function tableHasLines(lines: PosCheckLine[], tableId: string) {
  return lines.some((line) => line.seat.startsWith(`${tableId}-seat-`));
}

export function createPosStore() {
  const tableBlocks: TableBlock[] = createDiningTables();
  const chefTables: TableBlock[] = createChefTables();
  const barSeats: TableBlock[] = createBarSeats();
  const menuCatalog = createMenuCatalog();
  const modifierLibrary = createModifierLibrary();

  let checks: PosCheck[] = [];
  let lines: PosCheckLine[] = [];

  function promoteTablesToOrdering(tableSlugs: string[]) {
    tableSlugs.forEach((slug) => {
      const table = [...tableBlocks, ...chefTables, ...barSeats].find((entry) => entry.id === slug);
      if (table && table.status === "open") {
        table.status = "ordering";
        table.lastOrderMinutes = 0;
      }
    });
  }

  function maybeReleaseTables(tableSlugs: string[]) {
    tableSlugs.forEach((slug) => {
      if (tableHasLines(lines, slug)) return;
      const table = [...tableBlocks, ...chefTables, ...barSeats].find((entry) => entry.id === slug);
      if (table) {
        table.status = "open";
        table.currentCourse = "Prelude";
        table.billTotal = 0;
      }
    });
  }

  function getPosBootstrap(): PosBootstrapPayload {
    return {
      tables: [...tableBlocks, ...chefTables, ...barSeats],
      menu: menuCatalog,
      modifiers: modifierLibrary,
      checks,
      checkLines: lines,
    };
  }

  function ensureCheckForTables(tableSlugs: string[], actor: Actor): PosCheck {
    const normalized = Array.from(new Set(tableSlugs)).sort();
    const existing = checks.find((check) => tableSetEqual(check.tableSlugs.slice().sort(), normalized));
    if (existing) {
      return existing;
    }
    const timestamp = isoNow();
    const check: PosCheck = {
      id: universalUuid(),
      tableSlugs: normalized,
      status: "open",
      guestNames: [],
      currentCourse: "Prelude",
      receiptNote: null,
      revision: 1,
      openedBy: actor.email,
      openedAt: timestamp,
      updatedAt: timestamp,
    };
    checks = [...checks, check];
    promoteTablesToOrdering(normalized);
    return check;
  }

  function addCheckLine(checkId: string, payload: AddLinePayload, actor: Actor): PosCheckLine {
    const check = checks.find((entry) => entry.id === checkId);
    if (!check) {
      throw new Error("Check not found");
    }
    const qty = payload.qty && payload.qty > 0 ? payload.qty : 1;
    const timestamp = isoNow();
    const line: PosCheckLine = {
      id: universalUuid(),
      checkId,
      name: payload.name,
      seat: payload.seat,
      price: payload.price,
      qty,
      menuItemId: payload.menuItemId ?? null,
      modifierKey: payload.modifierKey ?? null,
      modifiers: payload.modifiers ?? [],
      comp: false,
      splitMode: "none",
      transferTo: null,
      customSplitNote: null,
      createdBy: actor.email,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    lines = [...lines, line];
    check.updatedAt = timestamp;
    check.revision += 1;
    promoteTablesToOrdering(check.tableSlugs);
    return line;
  }

  function updateCheckLine(
    checkId: string,
    payload: {
      lineId: string;
      qty?: number;
      comp?: boolean;
      splitMode?: "none" | "even" | "custom";
      transferTo?: string | null;
      customSplitNote?: string | null;
      modifiers?: string[];
    },
  ): PosCheckLine | null {
    const check = checks.find((entry) => entry.id === checkId);
    if (!check) {
      throw new Error("Check not found");
    }
    const idx = lines.findIndex((entry) => entry.id === payload.lineId && entry.checkId === checkId);
    if (idx === -1) {
      throw new Error("Line not found");
    }
    const existing = lines[idx];
    if (typeof payload.qty === "number" && payload.qty <= 0) {
      lines = lines.filter((entry) => entry.id !== existing.id);
      maybeReleaseTables(check.tableSlugs);
      return null;
    }
    const next: PosCheckLine = {
      ...existing,
      qty: typeof payload.qty === "number" ? Math.max(1, payload.qty) : existing.qty,
      comp: typeof payload.comp === "boolean" ? payload.comp : existing.comp,
      splitMode: payload.splitMode ?? existing.splitMode,
      transferTo:
        payload.transferTo === undefined ? existing.transferTo : payload.transferTo || null,
      customSplitNote:
        payload.customSplitNote === undefined
          ? existing.customSplitNote
          : payload.customSplitNote || null,
      modifiers: payload.modifiers ?? existing.modifiers,
      updatedAt: isoNow(),
    };
    lines[idx] = next;
    check.updatedAt = next.updatedAt;
    check.revision += 1;
    return next;
  }

  function clearCheckLines(checkId: string) {
    const check = checks.find((entry) => entry.id === checkId);
    if (!check) {
      return;
    }
    lines = lines.filter((line) => line.checkId !== checkId);
    maybeReleaseTables(check.tableSlugs);
    check.updatedAt = isoNow();
    check.revision += 1;
  }

  function updateCheck(
    checkId: string,
    payload: {
      guestNames?: string[];
      currentCourse?: string | null;
      receiptNote?: string | null;
      status?: PosCheck["status"];
      expectedRevision?: number;
    },
  ): PosCheck {
    const idx = checks.findIndex((entry) => entry.id === checkId);
    if (idx === -1) {
      throw new Error("Check not found");
    }
    const existing = checks[idx];
    if (
      typeof payload.expectedRevision === "number" &&
      payload.expectedRevision !== existing.revision
    ) {
      throw new Error("Revision mismatch");
    }
    const timestamp = isoNow();
    const next: PosCheck = {
      ...existing,
      guestNames: payload.guestNames ?? existing.guestNames,
      currentCourse:
        payload.currentCourse === undefined ? existing.currentCourse : payload.currentCourse,
      receiptNote:
        payload.receiptNote === undefined ? existing.receiptNote : payload.receiptNote ?? null,
      status: payload.status ?? existing.status,
      revision: existing.revision + 1,
      updatedAt: timestamp,
    };
    checks[idx] = next;
    return next;
  }

  return {
    getPosBootstrap,
    ensureCheckForTables,
    addCheckLine,
    updateCheckLine,
    clearCheckLines,
    updateCheck,
  };
}

