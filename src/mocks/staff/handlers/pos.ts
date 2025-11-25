import { http, HttpResponse } from "msw";
import { createPosStore } from "@/lib/staff/posStoreCore";
import type { AddLinePayload, UpdateCheckPayload, UpdateLinePayload } from "@/types/pos";

const store = createPosStore();
const mockActor = { email: "pos-mock@snowwhitelaundry.co" };

export const posHandlers = [
  http.get("/api/staff/pos/bootstrap", () => {
    return HttpResponse.json(store.getPosBootstrap());
  }),
  http.post("/api/staff/pos/tables/:tableId/checks", async ({ params, request }) => {
    const tableId = params.tableId as string;
    if (!tableId) {
      return HttpResponse.json({ error: "Table id missing" }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { tableSlugs?: string[] };
    const check = store.ensureCheckForTables(
      [tableId, ...(body.tableSlugs ?? [])].filter(Boolean),
      mockActor,
    );
    return HttpResponse.json({ check }, { status: 201 });
  }),
  http.post("/api/staff/pos/checks/:checkId/lines", async ({ params, request }) => {
    const checkId = params.checkId as string;
    const body = (await request.json().catch(() => null)) as AddLinePayload | null;
    if (!checkId || !body) {
      return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const line = store.addCheckLine(checkId, body, mockActor);
    return HttpResponse.json({ line }, { status: 201 });
  }),
  http.patch("/api/staff/pos/checks/:checkId/lines", async ({ params, request }) => {
    const checkId = params.checkId as string;
    const body = (await request.json().catch(() => null)) as UpdateLinePayload | null;
    if (!checkId || !body?.lineId) {
      return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const line = store.updateCheckLine(checkId, body);
    return HttpResponse.json({ line });
  }),
  http.delete("/api/staff/pos/checks/:checkId/lines", ({ params }) => {
    const checkId = params.checkId as string;
    if (!checkId) {
      return HttpResponse.json({ error: "Invalid check id" }, { status: 400 });
    }
    store.clearCheckLines(checkId);
    return HttpResponse.json({ ok: true });
  }),
  http.patch("/api/staff/pos/checks/:checkId", async ({ params, request }) => {
    const checkId = params.checkId as string;
    const body = (await request.json().catch(() => null)) as UpdateCheckPayload | null;
    if (!checkId || !body) {
      return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const check = store.updateCheck(checkId, body);
    return HttpResponse.json({ check });
  }),
];

