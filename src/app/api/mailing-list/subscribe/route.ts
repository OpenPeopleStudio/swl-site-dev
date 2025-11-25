import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SOURCE = "landing";

type SubscribePayload = {
  email?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SubscribePayload | null;

  if (!payload || typeof payload.email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = payload.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
  }

  const source =
    typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim().slice(0, 64)
      : DEFAULT_SOURCE;

  const metadata = {
    user_agent: request.headers.get("user-agent") || null,
    referer: request.headers.get("referer") || null,
  };

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("mailing_list_signups").insert({
    email,
    source,
    metadata,
  });

  if (error) {
    // 23505 is postgres unique violation (already subscribed)
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    console.error("Failed to store mailing list signup", error);
    return NextResponse.json({ error: "Unable to save email right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

