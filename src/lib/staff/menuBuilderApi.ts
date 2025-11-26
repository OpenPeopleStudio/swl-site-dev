import type { MenuBuilderPayload } from "@/types/menu-builder";

function assertResponse(response: Response) {
  if (!response.ok) {
    throw new Error("Unable to load menu builder data");
  }
  return response;
}

export async function fetchMenuBuilderData(signal?: AbortSignal): Promise<MenuBuilderPayload> {
  const response = await fetch("/api/staff/menu/builder", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  return (await assertResponse(response).json()) as MenuBuilderPayload;
}


