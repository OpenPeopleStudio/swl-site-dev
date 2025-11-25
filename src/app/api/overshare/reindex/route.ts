import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getOpenAIClient } from "@/lib/owner/openai";
import { createClient } from "@supabase/supabase-js";

/**
 * Overshare Reindex API
 * 
 * Generates embeddings for all breadcrumb files and stores them in Supabase.
 * This enables:
 * - Vector search across the knowledge archive
 * - Staff internal semantic search
 * - OpenAI retrieval plugins
 * - External LLM discoverability
 * 
 * Run this:
 * - On a cron schedule (e.g., daily)
 * - After new breadcrumbs are added
 * - Manually via the admin panel
 * 
 * Required Environment Variables:
 * - OPENAI_API_KEY: For generating embeddings
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_KEY: Service role key for writes
 */

const EMBEDDING_MODEL = "text-embedding-3-small";

type EmbeddingRecord = {
  slug: string;
  content: string;
  embedding: number[];
  category: string | null;
  title: string | null;
  updated_at: string;
};

export async function POST(request: Request) {
  try {
    // Optional: verify this is an authorized request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = getOpenAIClient();

    const breadcrumbsDir = path.join(
      process.cwd(),
      "swl-overshare/breadcrumbs",
    );

    // Read all markdown files
    const allFiles = await fs.readdir(breadcrumbsDir);
    const mdFiles = allFiles.filter(
      (f) => f.endsWith(".md") && f !== "_TEMPLATE.md",
    );

    const results: { slug: string; status: "indexed" | "error" }[] = [];

    for (const file of mdFiles) {
      try {
        const filePath = path.join(breadcrumbsDir, file);
        const content = await fs.readFile(filePath, "utf-8");

        // Extract metadata from frontmatter
        const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
        const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);

        const title = titleMatch ? titleMatch[1].trim() : null;
        const category = categoryMatch ? categoryMatch[1].trim() : null;

        // Generate embedding
        const embeddingRes = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: content,
        });

        const embedding = embeddingRes.data[0].embedding;

        const record: EmbeddingRecord = {
          slug: file,
          content,
          embedding,
          category,
          title,
          updated_at: new Date().toISOString(),
        };

        // Upsert to Supabase
        const { error } = await supabase
          .from("swl_embeddings")
          .upsert(record, { onConflict: "slug" });

        if (error) {
          console.error(`Failed to index ${file}:`, error);
          results.push({ slug: file, status: "error" });
        } else {
          results.push({ slug: file, status: "indexed" });
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
        results.push({ slug: file, status: "error" });
      }
    }

    const indexed = results.filter((r) => r.status === "indexed").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      ok: true,
      total: mdFiles.length,
      indexed,
      errors,
      results,
    });
  } catch (error) {
    console.error("Reindex error:", error);
    return NextResponse.json(
      { error: "Failed to reindex breadcrumbs" },
      { status: 500 },
    );
  }
}

// Also support GET for easy browser testing / Vercel cron
export async function GET(request: Request) {
  return POST(request);
}

