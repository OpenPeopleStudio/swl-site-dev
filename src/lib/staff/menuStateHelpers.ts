import type { MenuSection } from "@/types/menu";

export function findMenuItem(sections: MenuSection[], itemId: string) {
  for (const section of sections) {
    const match = section.items.find((item) => item.id === itemId);
    if (match) {
      return match;
    }
  }
  return null;
}

export function updateMenuItem(
  sections: MenuSection[],
  itemId: string,
  updater: (item: MenuSection["items"][number]) => MenuSection["items"][number],
) {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
  }));
}

export function updateMenuItems(
  sections: MenuSection[],
  itemIds: Iterable<string>,
  updater: (item: MenuSection["items"][number]) => MenuSection["items"][number],
) {
  const idSet = new Set(itemIds);
  if (!idSet.size) return sections;
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => (idSet.has(item.id) ? updater(item) : item)),
  }));
}

export function reorderMenuItems(
  sections: MenuSection[],
  sectionId: string,
  itemId: string,
  direction: "up" | "down",
) {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;
    const index = section.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      return section;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= section.items.length) {
      return section;
    }
    const nextItems = [...section.items];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;
    return { ...section, items: nextItems };
  });
}
