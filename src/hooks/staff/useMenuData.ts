"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { StaffMenuPayload } from "@/types/menu";
import { fetchMenuData } from "@/lib/staff/menuApi";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

type MenuDataState = {
  data: StaffMenuPayload | null;
  loading: boolean;
  error: string | null;
};

export function useMenuData() {
  const [{ data, loading, error }, setState] = useState<MenuDataState>({
    data: null,
    loading: true,
    error: null,
  });
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    startTransition(() => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    });
    try {
      const payload = await fetchMenuData();
      startTransition(() => {
        setState({ data: payload, loading: false, error: null });
      });
    } catch (err) {
      startTransition(() => {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Unable to load menu data",
        });
      });
    }
  }, [startTransition]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("staff-menu-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_sections" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_item_status" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [refresh]);

  const mutate = useCallback(
    (updater: (current: StaffMenuPayload) => StaffMenuPayload) => {
      setState((prev) => {
        if (!prev.data) return prev;
        return { ...prev, data: updater(prev.data) };
      });
    },
    [],
  );

  return {
    data,
    loading,
    error,
    refresh,
    mutate,
  };
}

