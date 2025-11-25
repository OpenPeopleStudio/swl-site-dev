import { NextResponse } from "next/server";
import { posMockStore } from "@/lib/staff/posMockStore";
import { getSessionFromCookies } from "@/lib/shared/session";
import type { UpdateCheckPayload } from "@/types/pos";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

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

  const body = (await request.json().catch(() => null)) as UpdateCheckPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Payload missing" }, { status: 400 });
  }

  try {
    const check = posMockStore.updateCheck(checkId, body);
    return NextResponse.json({ check });
  } catch (error) {
    console.error("Unable to update check", error);
    const message = error instanceof Error ? error.message : "Unable to update check";
    const status = message === "Revision mismatch" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

