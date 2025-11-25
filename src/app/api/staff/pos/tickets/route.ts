import { NextResponse } from "next/server";
import { ensureTicketForTables } from "@/lib/staff/posServer";
import { getSessionFromCookies } from "@/lib/shared/session";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { tableSlugs } = (await request.json()) as {
      tableSlugs?: string[];
    };
    if (!tableSlugs || tableSlugs.length === 0) {
      return NextResponse.json(
        { error: "tableSlugs is required" },
        { status: 400 },
      );
    }
    const ticket = await ensureTicketForTables(
      tableSlugs.map((slug) => slug.trim()).filter(Boolean),
      session,
    );
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket creation failed", error);
    return NextResponse.json(
      { error: "Unable to create ticket" },
      { status: 500 },
    );
  }
}

