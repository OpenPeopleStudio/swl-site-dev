import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Breadcrumb Queue API
 * 
 * Submits breadcrumb requests to Supabase for async processing.
 * This enables the fully automated pipeline:
 * UI → Supabase Row → Edge Function → AI → GitHub → Vercel
 * 
 * For immediate local saves, use /api/breadcrumbs/save instead.
 */

type QueueRequest = {
  title: string;
  category: string;
  body: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QueueRequest;

    if (!body?.title?.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    if (!body?.category?.trim()) {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 },
      );
    }

    if (!body?.body?.trim()) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("swl_breadcrumb_queue")
      .insert({
        title: body.title.trim(),
        category: body.category.trim(),
        body: body.body.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Queue insert error:", error);
      return NextResponse.json(
        { error: "Failed to queue breadcrumb" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      queued: true,
      id: data.id,
      message: "Breadcrumb queued for processing",
    });
  } catch (error) {
    console.error("Queue error:", error);
    return NextResponse.json(
      { error: "Failed to queue breadcrumb" },
      { status: 500 },
    );
  }
}

// GET: Retrieve queue status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("swl_breadcrumb_queue")
      .select("id, title, category, status, created_at, processed_at, result_file")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Queue fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch queue" },
        { status: 500 },
      );
    }

    return NextResponse.json({ queue: data });
  } catch (error) {
    console.error("Queue fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 },
    );
  }
}

