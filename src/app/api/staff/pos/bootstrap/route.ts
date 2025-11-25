import { NextResponse } from "next/server";
import { posMockStore } from "@/lib/staff/posMockStore";
import { getSessionFromCookies } from "@/lib/shared/session";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = posMockStore.getPosBootstrap();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("POS bootstrap error", error);
    return NextResponse.json({ error: "Unable to load POS data" }, { status: 500 });
  }
}

