import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ReservePayload = {
  name?: unknown;
  email?: unknown;
  partySize?: unknown;
  visitWindow?: unknown;
  notes?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ReservePayload | null;

  if (!payload || typeof payload.name !== "string" || payload.name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!payload.email || typeof payload.email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = payload.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 422 });
  }

  const name = payload.name.trim().slice(0, 160);

  const partySizeValue =
    typeof payload.partySize === "number"
      ? payload.partySize
      : typeof payload.partySize === "string"
        ? Number.parseInt(payload.partySize, 10)
        : NaN;

  if (Number.isNaN(partySizeValue) || partySizeValue < 1 || partySizeValue > 20) {
    return NextResponse.json(
      { error: "Let us know how many guests you expect (1-20)." },
      { status: 422 },
    );
  }

  const visitWindow =
    typeof payload.visitWindow === "string"
      ? payload.visitWindow.trim().slice(0, 240)
      : null;

  const notes =
    typeof payload.notes === "string"
      ? payload.notes.trim().slice(0, 1000)
      : null;

  const source =
    typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim().slice(0, 64)
      : "reserve_page";

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("reservation_requests").insert({
    name,
    email,
    party_size: partySizeValue,
    visit_window: visitWindow,
    notes,
    source,
  });

  if (error) {
    console.error("Failed to store reservation request", error);
    return NextResponse.json(
      { error: "Unable to record your request right now." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

