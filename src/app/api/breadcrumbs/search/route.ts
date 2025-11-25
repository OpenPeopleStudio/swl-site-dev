import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/owner/openai";

/**
 * Breadcrumb Semantic Search API
 * 
 * Search the breadcrumb archive using natural language.
 * Uses vector embeddings for semantic similarity matching.
 */

const EMBEDDING_MODEL = "text-embedding-3-small";

type SearchRequest = {
  query: string;
  threshold?: number;
  limit?: number;
  category?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchRequest;

    if (!body?.query?.trim()) {
      return NextResponse.json(
        { error: "query is required" },
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
    const openai = getOpenAIClient();

    // Generate embedding for query
    const embeddingRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: body.query.trim(),
    });

    const queryEmbedding = embeddingRes.data[0].embedding;

    // Search using the Supabase function
    const { data, error } = await supabase.rpc("search_breadcrumbs", {
      query_embedding: queryEmbedding,
      match_threshold: body.threshold ?? 0.5,
      match_count: body.limit ?? 10,
    });

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 },
      );
    }

    // Filter by category if specified
    let results = data ?? [];
    if (body.category) {
      results = results.filter(
        (r: { category: string | null }) => r.category === body.category,
      );
    }

    return NextResponse.json({
      query: body.query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}

// GET for simple searches via URL params
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const threshold = searchParams.get("threshold");
  const limit = searchParams.get("limit");
  const category = searchParams.get("category");

  if (!query) {
    return NextResponse.json(
      { error: "q parameter is required" },
      { status: 400 },
    );
  }

  // Create a fake request body and call POST
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      threshold: threshold ? parseFloat(threshold) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      category: category || undefined,
    }),
  });

  return POST(fakeRequest);
}

