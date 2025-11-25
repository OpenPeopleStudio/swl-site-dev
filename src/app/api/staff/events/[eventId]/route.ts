import { NextResponse } from "next/server";
import { getEventsSupabaseAdmin, type PrivateEvent } from "@/domains/events/lib/queries";

type EventUpdatePayload = {
  party_size?: number | null;
  status?: string;
  start_time?: string | null;
  end_time?: string | null;
  operational_requirements?: Record<string, boolean>;
};

export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  const eventId = params.eventId;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  let body: EventUpdatePayload;
  try {
    body = (await request.json()) as EventUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = buildUpdates(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const supabase = getEventsSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .update(updates)
    .eq("id", eventId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json<{ event: PrivateEvent }>({
    event: data as PrivateEvent,
  });
}

function buildUpdates(payload: EventUpdatePayload) {
  const updates: Record<string, unknown> = {};

  if (payload.party_size === null || typeof payload.party_size === "number") {
    updates.party_size = payload.party_size;
  }
  if (typeof payload.status === "string" && payload.status.trim().length > 0) {
    updates.status = payload.status.trim();
  }
  if (payload.start_time === null || typeof payload.start_time === "string") {
    updates.start_time = sanitizeTime(payload.start_time);
  }
  if (payload.end_time === null || typeof payload.end_time === "string") {
    updates.end_time = sanitizeTime(payload.end_time);
  }
  if (payload.operational_requirements && typeof payload.operational_requirements === "object") {
    updates.operational_requirements = payload.operational_requirements;
  }

  return updates;
}

function sanitizeTime(value?: string | null) {
  if (!value) return null;
  if (value.length === 5) {
    return `${value}:00`;
  }
  return value;
}


