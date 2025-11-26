"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { MenuBuilderPayload } from "@/types/menu-builder";
import { fetchMenuBuilderData } from "@/lib/staff/menuBuilderApi";

type BuilderState = {
  data: MenuBuilderPayload | null;
  loading: boolean;
  error: string | null;
};

export function useMenuBuilderData() {
  const [{ data, loading, error }, setState] = useState<BuilderState>({
    data: null,
    loading: true,
    error: null,
  });
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    startTransition(() => setState((prev) => ({ ...prev, loading: true, error: null })));
    try {
      const payload = await fetchMenuBuilderData();
      startTransition(() => setState({ data: payload, loading: false, error: null }));
    } catch (err) {
      startTransition(() =>
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Unable to load menu builder",
        }),
      );
    }
  }, [startTransition]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}


