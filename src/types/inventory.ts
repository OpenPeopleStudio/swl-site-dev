export type InventoryItemType = "food" | "alcohol";

export type InventoryGridItem = {
  id: string;
  itemType: InventoryItemType;
  name: string;
  category: string | null;
  location: string | null;
  unit: string | null;
  onHand: number;
  parLevel: number | null;
  minimumThreshold: number | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPunctuality?: number | null;
  vendorCostDrift?: number | null;
  lastCountedAt?: string | null;
  updatedAt?: string | null;
  note?: string | null;
};

export type InventoryCountSessionSummary = {
  id: string;
  label: string;
  startedAt: string;
  focusZone?: string | null;
  countedItemIds: string[];
  status?: "open" | "closed";
};

export type InventorySnapshot = {
  items: InventoryGridItem[];
  generatedAt: string;
  session: InventoryCountSessionSummary | null;
  lastSyncSource?: string | null;
};

export type InventoryCountMutationResult = {
  item: InventoryGridItem;
  session: InventoryCountSessionSummary;
};

export type InventoryExportRequest = {
  items: Array<
    InventoryGridItem & {
      projectedOnHand: number;
    }
  >;
  session?: Pick<InventoryCountSessionSummary, "id" | "label" | "focusZone"> | null;
  generatedAt?: string;
  format?: "csv" | "print";
};

