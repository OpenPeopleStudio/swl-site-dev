import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/shared/session";
import { updateTicket } from "@/lib/staff/posServer";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

type PatchPayload = {
  guestNames?: string[];
  currentCourse?: string | null;
  receiptNote?: string | null;
  status?: string;
  expectedRevision?: number;
};

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
    const body = (await request.json()) as PatchPayload;
    const ticket = await updateTicket(ticketId, body, session);
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket update failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to update ticket";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

