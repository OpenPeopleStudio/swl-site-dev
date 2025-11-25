import { NextResponse } from "next/server";
import { posMockStore } from "@/lib/staff/posMockStore";
import { getSessionFromCookies } from "@/lib/shared/session";
import type { AddLinePayload, UpdateLinePayload } from "@/types/pos";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

export async function POST(
  request: Request,
  { params }: { params: { checkId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkId = params.checkId;
  if (!checkId) {
    return NextResponse.json({ error: "Check id missing" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as AddLinePayload | null;
  if (!body || !body.name || !body.seat || typeof body.price !== "number") {
    return NextResponse.json(
      { error: "name, seat, and price are required" },
      { status: 400 },
    );
  }

  try {
    const line = posMockStore.addCheckLine(checkId, body, session);
    return NextResponse.json({ line }, { status: 201 });
  } catch (error) {
    console.error("Unable to add line", error);
    return NextResponse.json({ error: "Unable to add line" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { checkId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkId = params.checkId;
  if (!checkId) {
    return NextResponse.json({ error: "Check id missing" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as UpdateLinePayload | null;
  if (!body || !body.lineId) {
    return NextResponse.json({ error: "lineId is required" }, { status: 400 });
  }

  try {
    const line = posMockStore.updateCheckLine(checkId, body);
    return NextResponse.json({ line }, { status: line ? 200 : 204 });
  } catch (error) {
    console.error("Unable to update line", error);
    const message = error instanceof Error ? error.message : "Unable to update line";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { checkId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkId = params.checkId;
  if (!checkId) {
    return NextResponse.json({ error: "Check id missing" }, { status: 400 });
  }

  try {
    posMockStore.clearCheckLines(checkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to clear lines", error);
    return NextResponse.json({ error: "Unable to clear lines" }, { status: 500 });
  }
}

