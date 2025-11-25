import { NextResponse } from "next/server";
import {
  ensureTrustedDevice,
  logPosEvent,
  PosHttpError,
  requirePosStaff,
} from "@/lib/staff/posServer";

type CreateSessionPayload = {
  tableId?: string;
  partySize?: number;
  reservationId?: number;
  note?: string;
};

const ACTIVE_SESSION_STATUSES = ["open", "ordering", "served", "paying"];

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateSessionPayload;
    if (!payload.tableId) {
      throw new PosHttpError(400, "tableId is required.");
    }

    const context = await requirePosStaff();
    const deviceId = await ensureTrustedDevice(
      context.supabase,
      request.headers.get("x-pos-device"),
    );
    const { supabase, staffId } = context;

    const { data: table, error: tableError } = await supabase
      .from("pos_tables")
      .select("id, status, seats")
      .eq("id", payload.tableId)
      .maybeSingle();

    if (tableError) {
      console.error("POS table lookup failed", tableError);
      return NextResponse.json({ error: "Unable to load table." }, { status: 500 });
    }

    if (!table) {
      throw new PosHttpError(404, "Table not found.");
    }

    const { data: existingSession, error: existingError } = await supabase
      .from("pos_sessions")
      .select("id, status")
      .eq("table_id", table.id)
      .in("status", ACTIVE_SESSION_STATUSES)
      .maybeSingle();

    if (existingError) {
      console.error("POS active session lookup failed", existingError);
      return NextResponse.json({ error: "Unable to verify session state." }, { status: 500 });
    }

    if (existingSession) {
      return NextResponse.json(
        { error: "Table already has an active session." },
        { status: 409 },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("pos_sessions")
      .insert({
        table_id: table.id,
        status: "ordering",
        party_size: payload.partySize ?? table.seats,
        reservation_id: payload.reservationId ?? null,
        notes: payload.note ?? null,
        started_by: staffId,
      })
      .select("id, status, opened_at, party_size, reservation_id")
      .single();

    if (sessionError || !session) {
      console.error("POS session insert failed", sessionError);
      return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
    }

    const { data: check, error: checkError } = await supabase
      .from("pos_checks")
      .insert({
        session_id: session.id,
        status: "open",
      })
      .select("id, status")
      .single();

    if (checkError || !check) {
      console.error("POS check insert failed", checkError);
      return NextResponse.json({ error: "Unable to open check." }, { status: 500 });
    }

    await supabase
      .from("pos_tables")
      .update({ status: "ordering", updated_at: new Date().toISOString() })
      .eq("id", table.id);

    await logPosEvent(supabase, staffId, "pos.session.opened", {
      session_id: session.id,
      table_id: table.id,
      party_size: session.party_size,
      reservation_id: session.reservation_id,
      device_id: deviceId,
    });

    return NextResponse.json({
      session,
      check,
    });
  } catch (error) {
    if (error instanceof PosHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POS session creation error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

