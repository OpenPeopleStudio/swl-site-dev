import { describe, it, beforeEach, expect, vi } from "vitest";

vi.mock("@/lib/shared/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/shared/session", () => ({
  getSessionFromCookies: vi.fn(),
}));

import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";
import { PATCH as statusPatch } from "@/app/api/staff/menu/items/[itemId]/status/route";
import { PATCH as visibilityPatch } from "@/app/api/staff/menu/items/[itemId]/visibility/route";
import { PATCH as reorderPatch } from "@/app/api/staff/menu/sections/[sectionId]/reorder/route";

const mockRequest = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const sessionRoles = {
  staff: { role: "staff" },
  guest: { role: "guest" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("menu status endpoint", () => {
  it("rejects unauthorized access", async () => {
    (getSessionFromCookies as unknown as vi.Mock).mockResolvedValue(null);
    const response = await statusPatch(mockRequest({ status: "on" }), {
      params: { itemId: "item-1" },
    });
    expect(response.status).toBe(401);
  });

  it("rejects forbidden roles", async () => {
    (getSessionFromCookies as unknown as vi.Mock).mockResolvedValue(sessionRoles.guest);
    const response = await statusPatch(mockRequest({ status: "on" }), {
      params: { itemId: "item-1" },
    });
    expect(response.status).toBe(403);
  });

  it("records status changes", async () => {
    (getSessionFromCookies as unknown as vi.Mock).mockResolvedValue(sessionRoles.staff);
    const insertChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { item_id: "item-1", status: "prep" },
          error: null,
        }),
      }),
    };
    const fromMock = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
    });
    (getSupabaseAdmin as unknown as vi.Mock).mockReturnValue({ from: fromMock });

    const response = await statusPatch(mockRequest({ status: "prep" }), {
      params: { itemId: "item-1" },
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toEqual({ item_id: "item-1", status: "prep" });
  });
});

describe("menu visibility endpoint", () => {
  it("updates visibility", async () => {
    (getSessionFromCookies as unknown as vi.Mock).mockResolvedValue(sessionRoles.staff);
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "item-1", visibility: "staff-only" },
            error: null,
          }),
        }),
      }),
    };
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "menu_items") {
        return {
          update: vi.fn().mockReturnValue(updateChain),
        };
      }
      return {};
    });
    (getSupabaseAdmin as unknown as vi.Mock).mockReturnValue({ from: fromMock });

    const response = await visibilityPatch(mockRequest({ visibility: "staff-only" }), {
      params: { itemId: "item-1" },
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.item.visibility).toBe("staff-only");
  });
});

describe("menu reorder endpoint", () => {
  it("swaps adjacent items", async () => {
    (getSessionFromCookies as unknown as vi.Mock).mockResolvedValue(sessionRoles.staff);
    let selectCall = 0;
    const initialEntries = [
      { item_id: "item-a", section_id: "section-1", sort_index: 10 },
      { item_id: "item-b", section_id: "section-1", sort_index: 20 },
    ];
    const reordered = [
      { item_id: "item-b", sort_index: 10 },
      { item_id: "item-a", sort_index: 20 },
    ];

    const selectChain = {
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => {
          selectCall += 1;
          return Promise.resolve({
            data: selectCall === 1 ? initialEntries : reordered,
            error: null,
          });
        }),
      }),
    };

    const updateChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
      }),
    };

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "menu_section_items") {
        return {
          select: () => selectChain,
          update: () => updateChain,
        };
      }
      return {};
    });

    (getSupabaseAdmin as unknown as vi.Mock).mockReturnValue({ from: fromMock });

    const response = await reorderPatch(mockRequest({ itemId: "item-a", direction: "down" }), {
      params: { sectionId: "section-1" },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items[0].item_id).toBe("item-b");
  });
});

