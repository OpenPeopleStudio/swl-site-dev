"use client";

import { useMemo } from "react";
import type {
  MenuRowBusyState,
  MenuSection,
  MenuStatus,
  MenuVisibility,
  StaffMenuPayload,
} from "@/types/menu";
import {
  reorderMenuItem as reorderMenuItemRequest,
  updateMenuItemStatus,
  updateMenuItemVisibility,
} from "@/lib/staff/menuApi";
import {
  findMenuItem,
  reorderMenuItems,
  updateMenuItem,
  updateMenuItems,
} from "@/lib/staff/menuStateHelpers";

export type UseMenuActionsArgs = {
  getSections: () => MenuSection[];
  mutate: (updater: (current: StaffMenuPayload) => StaffMenuPayload) => void;
  refresh: () => Promise<void>;
  setRowBusy: (itemId: string, state?: MenuRowBusyState) => void;
};

export function useMenuActions(args: UseMenuActionsArgs) {
  const { getSections, mutate, refresh, setRowBusy } = args;
  return useMemo(
    () =>
      createMenuActions({
        getSections,
        mutate,
        refresh,
        setRowBusy,
      }),
    [getSections, mutate, refresh, setRowBusy],
  );
}

export function createMenuActions({
  getSections,
  mutate,
  refresh,
  setRowBusy,
}: UseMenuActionsArgs) {
  const applyStatus = async (itemIds: string[], nextStatus: MenuStatus) => {
    if (!itemIds.length) return;
    itemIds.forEach((id) => setRowBusy(id, "availability"));
    mutate((current) => ({
      ...current,
      sections: updateMenuItems(current.sections, itemIds, (item) => ({
        ...item,
        status: nextStatus,
      })),
    }));
    try {
      await Promise.all(itemIds.map((id) => updateMenuItemStatus(id, nextStatus)));
    } catch (error) {
      console.error("Menu status update failed", error);
      await refresh();
    } finally {
      itemIds.forEach((id) => setRowBusy(id));
    }
  };

  const applyVisibility = async (itemIds: string[], visibility: MenuVisibility) => {
    if (!itemIds.length) return;
    itemIds.forEach((id) => setRowBusy(id, "visibility"));
    mutate((current) => ({
      ...current,
      sections: updateMenuItems(current.sections, itemIds, (item) => ({
        ...item,
        visibility,
      })),
    }));
    try {
      await Promise.all(itemIds.map((id) => updateMenuItemVisibility(id, visibility)));
    } catch (error) {
      console.error("Menu visibility update failed", error);
      await refresh();
    } finally {
      itemIds.forEach((id) => setRowBusy(id));
    }
  };

  const setStatus = async (itemId: string, nextStatus: MenuStatus) => {
    await applyStatus([itemId], nextStatus);
  };

  const setVisibility = async (itemId: string, visibility: MenuVisibility) => {
    await applyVisibility([itemId], visibility);
  };

  const toggleAvailability = async (itemId: string) => {
    const currentItem = findMenuItem(getSections(), itemId);
    if (!currentItem) return;
    const nextStatus = currentItem.status === "eightySixed" ? "on" : "eightySixed";
    await setStatus(itemId, nextStatus);
  };

  const toggleVisibility = async (itemId: string) => {
    const currentItem = findMenuItem(getSections(), itemId);
    if (!currentItem) return;
    const nextVisibility =
      currentItem.visibility === "guest-facing" ? "staff-only" : "guest-facing";
    await setVisibility(itemId, nextVisibility);
  };

  const reorderItem = async (sectionId: string, itemId: string, direction: "up" | "down") => {
    setRowBusy(itemId, "reorder");
    mutate((current) => ({
      ...current,
      sections: reorderMenuItems(current.sections, sectionId, itemId, direction),
    }));
    try {
      await reorderMenuItemRequest(sectionId, itemId, direction);
    } catch (error) {
      console.error("Menu reorder failed", error);
      await refresh();
    } finally {
      setRowBusy(itemId);
    }
  };

  const bulkSetStatus = async (itemIds: string[], nextStatus: MenuStatus) => {
    await applyStatus(itemIds, nextStatus);
  };

  const bulkSetVisibility = async (itemIds: string[], visibility: MenuVisibility) => {
    await applyVisibility(itemIds, visibility);
  };

  return {
    toggleAvailability,
    toggleVisibility,
    reorderItem,
    setStatus,
    setVisibility,
    bulkSetStatus,
    bulkSetVisibility,
  };
}

