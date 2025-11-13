import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 20;
  const { data, error } = await supabase
    .from("staff_reflections")
    .select("id, owner, title, summary, tags, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Fetch reflections failed", error);
    return NextResponse.json({ error: "Unable to load reflections" }, { status: 500 });
  }
  const payload = (data ?? []).map((row) => ({
    id: row.id,
    owner: row.owner,
    title: row.title ?? undefined,
    summary: row.summary,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
  }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      owner?: string;
      summary?: string;
      title?: string;
      tags?: string[];
    };
    const owner = body.owner?.trim();
    const summary = body.summary?.trim();
    if (!owner || !summary) {
      return NextResponse.json(
        { error: "Owner and summary are required." },
        { status: 400 },
      );
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("staff_reflections")
      .insert({
        owner,
        title: body.title?.trim() || null,
        summary,
        tags: body.tags && body.tags.length > 0 ? body.tags : undefined,
      })
      .select("id, owner, title, summary, tags, created_at")
      .single();
    if (error || !data) {
      console.error("Insert reflection failed", error);
      return NextResponse.json(
        { error: "Unable to save reflection" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      id: data.id,
      owner: data.owner,
      title: data.title ?? undefined,
      summary: data.summary,
      tags: data.tags ?? undefined,
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error("Reflection POST error", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
