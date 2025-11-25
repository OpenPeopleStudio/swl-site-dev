import { NextResponse } from "next/server";
import {
  addTicketLine,
  clearTicketLines,
  updateTicketLine,
} from "@/lib/staff/posServer";
import { getSessionFromCookies } from "@/lib/shared/session";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

export async function POST(
  request: Request,
  { params }: { params: { ticketId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticketId = params.ticketId;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID missing" }, { status: 400 });
  }
  try {
    const body = (await request.json()) as {
      name?: string;
      seat?: string;
      price?: number;
      qty?: number;
      menuItemId?: string | null;
      modifierKey?: string | null;
      modifiers?: string[];
    };
    if (!body.name || !body.seat || typeof body.price !== "number") {
      return NextResponse.json(
        { error: "name, seat, and price are required" },
        { status: 400 },
      );
    }
    const line = await addTicketLine(
      ticketId,
      {
        name: body.name,
        seat: body.seat,
        price: body.price,
        qty: body.qty,
        menuItemId: body.menuItemId,
        modifierKey: body.modifierKey,
        modifiers: body.modifiers,
      },
      session,
    );
    return NextResponse.json({ line });
  } catch (error) {
    console.error("Ticket line creation failed", error);
    return NextResponse.json(
      { error: "Unable to add line" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { ticketId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticketId = params.ticketId;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID missing" }, { status: 400 });
  }
  try {
    const body = (await request.json()) as {
      lineId?: string;
      qty?: number;
      comp?: boolean;
      splitMode?: "none" | "even" | "custom";
      transferTo?: string | null;
      customSplitNote?: string | null;
      modifiers?: string[];
    };
    if (!body.lineId) {
      return NextResponse.json(
        { error: "lineId is required" },
        { status: 400 },
      );
    }
    const line = await updateTicketLine(
      ticketId,
      {
        lineId: body.lineId,
        qty: body.qty,
        comp: body.comp,
        splitMode: body.splitMode,
        transferTo: body.transferTo,
        customSplitNote: body.customSplitNote,
        modifiers: body.modifiers,
      },
      session,
    );
    return NextResponse.json({ line });
  } catch (error) {
    console.error("Ticket line update failed", error);
    return NextResponse.json(
      { error: "Unable to update line" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { ticketId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticketId = params.ticketId;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID missing" }, { status: 400 });
  }
  try {
    const hasBody = Number(request.headers.get("content-length") ?? "0") > 0;
    const body = hasBody ? ((await request.json()) as { lineId?: string }) : null;
    if (body?.lineId) {
      await updateTicketLine(
        ticketId,
        {
          lineId: body.lineId,
          qty: 0,
        },
        session,
      );
      return NextResponse.json({ lineId: body.lineId });
    }
    await clearTicketLines(ticketId, session);
    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("Ticket line delete failed", error);
    return NextResponse.json(
      { error: "Unable to delete lines" },
      { status: 500 },
    );
  }
}

