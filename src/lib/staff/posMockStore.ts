"use server";

import { createPosStore } from "@/lib/staff/posStoreCore";
import type { SessionPayload } from "@/lib/shared/session";

const store = createPosStore();

export const posMockStore = {
  getPosBootstrap: () => store.getPosBootstrap(),
  ensureCheckForTables: (tableSlugs: string[], actor: SessionPayload) =>
    store.ensureCheckForTables(tableSlugs, actor),
  addCheckLine: (checkId: string, payload: Parameters<typeof store.addCheckLine>[1], actor: SessionPayload) =>
    store.addCheckLine(checkId, payload, actor),
  updateCheckLine: (checkId: string, payload: Parameters<typeof store.updateCheckLine>[1]) =>
    store.updateCheckLine(checkId, payload),
  clearCheckLines: (checkId: string) => store.clearCheckLines(checkId),
  updateCheck: (checkId: string, payload: Parameters<typeof store.updateCheck>[1]) =>
    store.updateCheck(checkId, payload),
};

