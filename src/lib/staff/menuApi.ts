import type {
  MenuStatus,
  MenuVisibility,
  StaffMenuPayload,
} from "@/types/menu";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error ?? "Menu request failed");
  }
  return (await response.json()) as T;
}

export async function fetchMenuData(signal?: AbortSignal): Promise<StaffMenuPayload> {
  const response = await fetch("/api/staff/menu", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return handleResponse<StaffMenuPayload>(response);
}

export async function updateMenuItemStatus(itemId: string, status: MenuStatus) {
  const response = await fetch(`/api/staff/menu/items/${itemId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleResponse<{ status: { status: MenuStatus; item_id: string } }>(response);
}

export async function updateMenuItemVisibility(itemId: string, visibility: MenuVisibility) {
  const response = await fetch(`/api/staff/menu/items/${itemId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });
  return handleResponse<{ item: { id: string; visibility: MenuVisibility } }>(response);
}

export async function reorderMenuItem(
  sectionId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const response = await fetch(`/api/staff/menu/sections/${sectionId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, direction }),
  });
  return handleResponse<{ items: Array<{ item_id: string; sort_index: number }> }>(response);
}

