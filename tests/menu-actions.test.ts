import { describe, it, beforeEach, expect, vi } from "vitest";

vi.mock("@/lib/staff/menuApi", () => ({
  updateMenuItemStatus: vi.fn().mockResolvedValue(undefined),
  updateMenuItemVisibility: vi.fn().mockResolvedValue(undefined),
  reorderMenuItem: vi.fn().mockResolvedValue(undefined),
}));

import {
  updateMenuItemStatus,
  updateMenuItemVisibility,
  reorderMenuItem,
} from "@/lib/staff/menuApi";
import { createMenuActions } from "@/hooks/staff/useMenuActions";
import type { StaffMenuPayload } from "@/types/menu";

const baseState: StaffMenuPayload = {
  services: [],
  statusOptions: [],
  lastSyncedAt: "",
  sections: [
    {
      id: "section-1",
      name: "Cold Plates",
      notes: null,
      serviceLabels: ["Dinner"],
      serviceSlugs: ["dinner"],
      items: [
        {
          id: "item-a",
          name: "Sea Chime",
          shortDescription: "",
          price: 10,
          station: "cold line",
          tags: ["veg"],
          serviceSlugs: ["dinner"],
          serviceLabels: ["Dinner"],
          visibility: "guest-facing",
          status: "on",
          lastUpdated: "",
        },
        {
          id: "item-b",
          name: "Polar Melon",
          shortDescription: "",
          price: 12,
          station: "cold line",
          tags: [],
          serviceSlugs: ["dinner"],
          serviceLabels: ["Dinner"],
          visibility: "guest-facing",
          status: "prep",
          lastUpdated: "",
        },
      ],
    },
  ],
};

describe("createMenuActions", () => {
  let state: StaffMenuPayload;
  const refresh = vi.fn().mockResolvedValue(undefined);
  const setRowBusy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    state = JSON.parse(JSON.stringify(baseState));
  });

  const mutate = (updater: (current: StaffMenuPayload) => StaffMenuPayload) => {
    state = updater(state);
  };

  const actions = () =>
    createMenuActions({
      getSections: () => state.sections,
      mutate,
      refresh,
      setRowBusy,
    });

  it("toggles availability optimistically", async () => {
    await actions().toggleAvailability("item-a");
    expect(state.sections[0].items[0].status).toBe("eightySixed");
    expect(updateMenuItemStatus).toHaveBeenCalledWith("item-a", "eightySixed");
  });

  it("updates visibility", async () => {
    await actions().toggleVisibility("item-a");
    expect(state.sections[0].items[0].visibility).toBe("staff-only");
    expect(updateMenuItemVisibility).toHaveBeenCalledWith("item-a", "staff-only");
  });

  it("reorders items", async () => {
    await actions().reorderItem("section-1", "item-b", "up");
    expect(state.sections[0].items[0].id).toBe("item-b");
    expect(reorderMenuItem).toHaveBeenCalledWith("section-1", "item-b", "up");
  });
});

