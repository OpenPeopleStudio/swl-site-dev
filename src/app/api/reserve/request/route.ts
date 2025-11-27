import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

  const metadata = {
    name,
    party_size: partySizeValue,
    visit_window: visitWindow,
    notes,
    intent: "reservation_request",
  };

  const mailingListInsertPromise = supabase.from("mailing_list_signups").insert({
    email,
    source: `${source}_interest`,
    metadata,
  });

  const reservationOutcome = await persistReservationRequest(supabase, {
    name,
    email,
    partySize: partySizeValue,
    visitWindow,
    notes,
    source,
  });

  const mailingListResult = await mailingListInsertPromise;

  if (!reservationOutcome.ok) {
    console.error("Reservation request persistence failed", reservationOutcome.error);
    return NextResponse.json(
      { error: "Unable to record your request right now." },
      { status: 500 },
    );
  }

  const mailingListError = mailingListResult.error;
  const duplicateMailingListSignup = mailingListError?.code === "23505";
  const mailingListCaptured = !mailingListError || duplicateMailingListSignup;

  if (mailingListError && !duplicateMailingListSignup) {
    console.error("Mailing list capture failed (non-blocking)", mailingListError);
  }

  return NextResponse.json({
    ok: true,
    mailingListCaptured,
    duplicateMailingListSignup,
    usedLegacyReservationTable: reservationOutcome.usedLegacyTable,
  });
}

type ReservationPersistenceResult = {
  ok: true;
  usedLegacyTable: boolean;
  error?: undefined;
};

type ReservationPersistenceFailure = {
  ok: false;
  usedLegacyTable: boolean;
  error: { code?: string; message?: string } | null;
};

type ReservationPersistenceInput = {
  name: string;
  email: string;
  partySize: number;
  visitWindow: string | null;
  notes: string | null;
  source: string;
};

async function persistReservationRequest(
  supabase: SupabaseClient,
  data: ReservationPersistenceInput,
): Promise<ReservationPersistenceResult | ReservationPersistenceFailure> {
  const reservationInsert = await supabase.from("reservation_requests").insert({
    name: data.name,
    email: data.email,
    party_size: data.partySize,
    visit_window: data.visitWindow,
    notes: data.notes,
    source: data.source,
  });

  if (!reservationInsert.error) {
    return { ok: true, usedLegacyTable: false };
  }

  if (reservationInsert.error.code !== "PGRST205") {
    return { ok: false, usedLegacyTable: false, error: reservationInsert.error };
  }

  const legacyInsert = await supabase.from("reservations").insert({
    guest_name: data.name,
    guest_contact: data.email,
    party_size: data.partySize,
    occasion: data.visitWindow,
    notes: data.notes,
    status: "pending",
  });

  if (legacyInsert.error) {
    return { ok: false, usedLegacyTable: true, error: legacyInsert.error };
  }

  return { ok: true, usedLegacyTable: true };
}

