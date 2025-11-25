import { NextResponse } from "next/server";
import { runMenuIngestion } from "@/lib/staff/menuIngestion";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

const CRON_SECRET = process.env.CRON_SECRET;
const VERCEL_CRON_HEADER = "x-vercel-cron";

async function authorize(request: Request) {
  if (request.headers.get(VERCEL_CRON_HEADER)) {
    return true;
  }

  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${CRON_SECRET}`) {
      return true;
    }
  }

  const session = await getSessionFromCookies();
  return Boolean(session && ["owner", "manager"].includes(session.role));
}

async function handleIngestion(request: Request) {
  const permitted = await authorize(request);
  if (!permitted) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const summary = await runMenuIngestion(supabase);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Menu ingestion failed", error);
    return NextResponse.json(
      { error: "Failed to ingest menu data" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleIngestion(request);
}

export async function GET(request: Request) {
  return handleIngestion(request);
}


