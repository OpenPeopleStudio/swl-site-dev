import { NextResponse } from "next/server";
import { ensureTrustedDevice, requirePosStaff, PosHttpError } from "@/lib/staff/posServer";

type PosTableResponse = {
  id: string;
  label: string;
  zone: string;
  seats: number;
  can_combine: boolean;
  status: string;
  activeSession: null | {
    id: string;
    status: string;
    opened_at: string;
    party_size: number | null;
    reservation?: {
      id: number;
      guest_name: string | null;
      party_size: number | null;
      allergies: string[] | null;
      occasion: string | null;
      notes: string | null;
    };
    check?: {
      id: string;
      status: string;
      subtotal: number;
      tax: number;
      total: number;
      comp_total: number;
      receipt_note: string | null;
    };
  };
};

export async function GET(request: Request) {
  try {
    const context = await requirePosStaff();
    await ensureTrustedDevice(context.supabase, request.headers.get("x-pos-device"));

    const { supabase } = context;

    const { data: tables, error: tableError } = await supabase
      .from("pos_tables")
      .select("id, label, zone, seats, can_combine, status, is_active, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("label", { ascending: true });

    if (tableError) {
      console.error("POS tables fetch failed", tableError);
      return NextResponse.json({ error: "Unable to load tables." }, { status: 500 });
    }

    const { data: sessions, error: sessionError } = await supabase
      .from("pos_sessions")
      .select("id, table_id, status, party_size, opened_at, reservation_id, notes")
      .in("status", ["open", "ordering", "served", "paying"]);

    if (sessionError) {
      console.error("POS sessions fetch failed", sessionError);
      return NextResponse.json({ error: "Unable to load sessions." }, { status: 500 });
    }

    const sessionIds = sessions?.map((session) => session.id) ?? [];
    const reservationIds = sessions
      ?.map((session) => session.reservation_id)
      .filter((id): id is number => typeof id === "number") ?? [];

    const [checksResult, reservationsResult] = await Promise.all([
      sessionIds.length
        ? supabase
            .from("pos_checks")
            .select("id, session_id, status, subtotal, tax, total, comp_total, receipt_note")
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
      reservationIds.length
        ? supabase
            .from("reservations")
            .select("id, guest_name, party_size, allergies, occasion, notes")
            .in("id", reservationIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (checksResult.error) {
      console.error("POS checks fetch failed", checksResult.error);
      return NextResponse.json({ error: "Unable to load checks." }, { status: 500 });
    }

    if (reservationsResult.error) {
      console.error("Reservations fetch failed", reservationsResult.error);
      return NextResponse.json({ error: "Unable to load reservations." }, { status: 500 });
    }

    const sessionByTable = new Map<string, (typeof sessions)[number]>();
    sessions?.forEach((session) => {
      if (!sessionByTable.has(session.table_id)) {
        sessionByTable.set(session.table_id, session);
      }
    });

    const checksBySession = new Map<string, (typeof checksResult.data)[number]>();
    (checksResult.data ?? []).forEach((check) => {
      if (!checksBySession.has(check.session_id)) {
        checksBySession.set(check.session_id, check);
      }
    });

    const reservationById = new Map<number, (typeof reservationsResult.data)[number]>();
    (reservationsResult.data ?? []).forEach((reservation) => {
      reservationById.set(reservation.id, reservation);
    });

    const payload: PosTableResponse[] = (tables ?? []).map((table) => {
      const session = sessionByTable.get(table.id);
      if (!session) {
        return {
          id: table.id,
          label: table.label,
          zone: table.zone,
          seats: table.seats,
          can_combine: table.can_combine,
          status: table.status,
          activeSession: null,
        };
      }

      const check = checksBySession.get(session.id);
      const reservation = session.reservation_id
        ? reservationById.get(session.reservation_id)
        : undefined;

      return {
        id: table.id,
        label: table.label,
        zone: table.zone,
        seats: table.seats,
        can_combine: table.can_combine,
        status: table.status,
        activeSession: {
          id: session.id,
          status: session.status,
          opened_at: session.opened_at,
          party_size: session.party_size,
          reservation: reservation
            ? {
                id: reservation.id,
                guest_name: reservation.guest_name,
                party_size: reservation.party_size,
                allergies: reservation.allergies,
                occasion: reservation.occasion,
                notes: reservation.notes,
              }
            : undefined,
          check: check
            ? {
                id: check.id,
                status: check.status,
                subtotal: Number(check.subtotal) || 0,
                tax: Number(check.tax) || 0,
                total: Number(check.total) || 0,
                comp_total: Number(check.comp_total) || 0,
                receipt_note: check.receipt_note,
              }
            : undefined,
        },
      };
    });

    return NextResponse.json({ tables: payload });
  } catch (error) {
    if (error instanceof PosHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POS tables endpoint error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

