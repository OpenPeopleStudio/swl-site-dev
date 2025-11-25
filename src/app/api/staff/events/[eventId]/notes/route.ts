import { NextResponse } from "next/server";
import { getEventsSupabaseAdmin } from "@/domains/events/lib/queries";

type NotePayload = {
  body: string;
  note_type?: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } },
) {
  const eventId = params.eventId;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const supabase = getEventsSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_notes")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } },
) {
  const eventId = params.eventId;
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  let body: NotePayload;
  try {
    body = (await request.json()) as NotePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trimmed = body.body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Note body is required" }, { status: 400 });
  }

  const supabase = getEventsSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_notes")
    .insert({
      event_id: eventId,
      body: trimmed,
      note_type: body.note_type ?? "general",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}


