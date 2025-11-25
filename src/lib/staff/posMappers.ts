import type {
  MenuCategory,
  MenuItem,
  ModifierSuggestion,
  PosTicket,
  PosTicketLine,
  TableDefinition,
} from "@/types/pos";

type TableRow = {
  id: string;
  slug: string;
  label: string;
  seat_count: number;
  can_combine: boolean;
  sort_order: number;
  zone_id: string | null;
};

type ZoneRow = {
  id: string;
  slug: string;
  label: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  accent_color: string | null;
};

type MenuItemRow = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  tags: string[] | null;
  modifier_key: string | null;
  sort_order: number;
};

type ModifierRow = {
  modifier_key: string;
  option_code: string;
  label: string;
  default_applied: boolean;
  sort_order: number;
};

export function mapTableDefinitions(
  tables: TableRow[],
  zones: ZoneRow[],
): TableDefinition[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone.slug]));
  return tables
    .map<TableDefinition>((table) => ({
      dbId: table.id,
      id: table.slug,
      label: table.label,
      seats: table.seat_count,
      zone: zoneById.get(table.zone_id ?? "") ?? "dining",
      canCombine: table.can_combine,
      sortOrder: table.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function mapMenu(
  categories: CategoryRow[],
  items: MenuItemRow[],
): MenuCategory[] {
  const itemsByCategory = items.reduce<Record<string, MenuItem[]>>(
    (acc, item) => {
      const next: MenuItem = {
        id: item.id,
        name: item.name,
        price: Number(item.price),
        tags: item.tags,
        modifierKey: item.modifier_key,
      };
      acc[item.category_id] = [...(acc[item.category_id] ?? []), next];
      return acc;
    },
    {},
  );

  return categories
    .map<MenuCategory>((category) => ({
      id: category.id,
      label: category.label,
      color: category.accent_color ?? "#ffffff",
      items: (itemsByCategory[category.id] ?? []).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function mapModifierLibrary(
  rows: ModifierRow[],
): Record<string, ModifierSuggestion[]> {
  return rows.reduce<Record<string, ModifierSuggestion[]>>((acc, row) => {
    const suggestion: ModifierSuggestion = {
      id: row.option_code,
      label: row.label,
      defaultApplied: row.default_applied,
    };
    acc[row.modifier_key] = [...(acc[row.modifier_key] ?? []), suggestion].sort(
      (a, b) => a.label.localeCompare(b.label),
    );
    return acc;
  }, {});
}

type TicketRow = {
  id: string;
  table_ids: string[] | null;
  table_slugs: string[] | null;
  seat_map: string[] | null;
  guest_names: string[] | null;
  status: string;
  current_course: string | null;
  receipt_note: string | null;
  last_fire_at: string | null;
  seated_at: string | null;
  revision: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TicketLineRow = {
  id: string;
  ticket_id: string;
  menu_item_id: string | null;
  display_name: string;
  seat_label: string;
  price: number;
  qty: number;
  modifier_key: string | null;
  modifiers: string[] | null;
  comp: boolean | null;
  split_mode: "none" | "even" | "custom" | null;
  transfer_to: string | null;
  custom_split_note: string | null;
  created_at: string;
  updated_at: string | null;
};

export function mapTicketRow(row: TicketRow): PosTicket {
  return {
    id: row.id,
    tableIds: row.table_ids ?? [],
    tableSlugs: row.table_slugs ?? [],
    seatMap: row.seat_map ?? [],
    guestNames: row.guest_names ?? [],
    status: row.status,
    currentCourse: row.current_course,
    receiptNote: row.receipt_note,
    lastFireAt: row.last_fire_at,
    seatedAt: row.seated_at,
    revision: row.revision ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

export function mapTicketLineRow(row: TicketLineRow): PosTicketLine {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    menuItemId: row.menu_item_id,
    name: row.display_name,
    seat: row.seat_label,
    price: Number(row.price),
    qty: row.qty,
    modifierKey: row.modifier_key,
    modifiers: row.modifiers ?? [],
    comp: row.comp ?? false,
    splitMode: row.split_mode ?? "none",
    transferTo: row.transfer_to,
    customSplitNote: row.custom_split_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

