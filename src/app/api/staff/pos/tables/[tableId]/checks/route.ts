import { NextResponse } from "next/server";
import { posMockStore } from "@/lib/staff/posMockStore";
import { getSessionFromCookies } from "@/lib/shared/session";

const POS_ROLES = new Set(["staff", "manager", "owner"]);

type RequestBody = {
  tableSlugs?: string[];
};

export async function POST(
  request: Request,
  { params }: { params: { tableId: string } },
) {
  const session = await getSessionFromCookies();
  if (!session || !POS_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const primaryTable = params.tableId;
  if (!primaryTable) {
    return NextResponse.json({ error: "Table id missing" }, { status: 400 });
  }

  let additional: string[] = [];
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody | undefined;
    additional = body?.tableSlugs ?? [];
  } catch {
    additional = [];
  }

  try {
    const check = posMockStore.ensureCheckForTables(
      [primaryTable, ...additional].filter(Boolean),
      session,
    );
    return NextResponse.json({ check }, { status: 201 });
  } catch (error) {
    console.error("Unable to open check", error);
    return NextResponse.json({ error: "Unable to open check" }, { status: 500 });
  }
}

