import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Breadcrumb Enqueue API
 * 
 * Adds staff submissions directly to Supabase queue.
 * Supabase Edge Functions or GitHub Actions process it later.
 * 
 * This is the simplest entry point for the automation pipeline:
 * Staff UI → Supabase Queue → Edge Function/Actions → Repo → Vercel
 */

type EnqueueRequest = {
  title: string;
  category: string;
  body: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnqueueRequest;

    const { title, category, body: content } = body;

    if (!title?.trim() || !category?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "title, category, and body are required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("swl_breadcrumb_queue").insert({
      title: title.trim(),
      category: category.trim(),
      body: content.trim(),
    });

    if (error) {
      console.error("Enqueue error:", error);
      return NextResponse.json(
        { error: "Failed to enqueue breadcrumb" },
        { status: 500 },
      );
    }

    return NextResponse.json({ queued: true });
  } catch (error) {
    console.error("Enqueue error:", error);
    return NextResponse.json(
      { error: "Failed to enqueue breadcrumb" },
      { status: 500 },
    );
  }
}

