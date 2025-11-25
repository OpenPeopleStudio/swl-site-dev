export type MenuStatus = "on" | "prep" | "eightySixed" | "testing";

export type MenuVisibility = "guest-facing" | "staff-only";

export type MenuStatusFilter = "all" | MenuStatus;

export type MenuRowBusyState = "availability" | "visibility" | "reorder";

export type MenuServiceOption = {
  id: string;
  slug: string;
  label: string;
  serviceDate: string;
  windowStart: string;
  windowEnd: string;
  status: string;
};

export type MenuItem = {
  id: string;
  name: string;
  shortDescription: string;
  price: number;
  status: MenuStatus;
  station: string | null;
  tags: string[];
  serviceSlugs: string[];
  serviceLabels: string[];
  visibility: MenuVisibility;
  lastUpdated: string;
};

export type MenuSection = {
  id: string;
  name: string;
  notes?: string | null;
  serviceSlugs: string[];
  serviceLabels: string[];
  items: MenuItem[];
};

export type MenuStatusOption = {
  value: MenuStatus;
  label: string;
};

export type StaffMenuPayload = {
  services: MenuServiceOption[];
  sections: MenuSection[];
  statusOptions: MenuStatusOption[];
  lastSyncedAt: string;
};

export type MenuViewState = "loading" | "ready" | "empty" | "error";

