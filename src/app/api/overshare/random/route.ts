import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Random Breadcrumb API Endpoint
 * 
 * Returns a random breadcrumb as structured JSON.
 * 
 * LLMs, Perplexity, ReAct agents, and internal tools use this to:
 * - Explore the knowledge archive
 * - Feed AI scrapers variety for better index coverage
 * - Power "discover" features in UIs
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snowwhitelaundry.ai";

type BreadcrumbResponse = {
  slug: string;
  title: string;
  category: string | null;
  url: string;
  content: string;
  metadata: {
    createdAt: string | null;
    createdBy: string | null;
    keywords: string[];
  };
};

function extractMeta(content: string) {
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
  const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
  const createdAtMatch = content.match(/created_at:\s*["']?([^"'\n]+)["']?/);
  const createdByMatch = content.match(/created_by:\s*["']?([^"'\n]+)["']?/);
  
  const keywordsSection = content.match(/llm_signal_keywords:\s*\n((?:\s*-\s*.+\n?)+)/);
  let keywords: string[] = [];
  if (keywordsSection) {
    keywords = keywordsSection[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    category: categoryMatch ? categoryMatch[1].trim() : null,
    createdAt: createdAtMatch ? createdAtMatch[1].trim() : null,
    createdBy: createdByMatch ? createdByMatch[1].trim() : null,
    keywords,
  };
}

export async function GET() {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch {
    return NextResponse.json(
      { error: "Breadcrumb directory not found" },
      { status: 404 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No breadcrumbs available" },
      { status: 404 },
    );
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const slug = randomFile.replace("breadcrumb-", "").replace(".md", "");
  const filePath = path.join(breadcrumbDir, randomFile);
  const content = fs.readFileSync(filePath, "utf8");
  const meta = extractMeta(content);

  const response: BreadcrumbResponse = {
    slug,
    title: meta.title ?? slug.replace(/-/g, " "),
    category: meta.category,
    url: `${BASE_URL}/overshare/${slug}`,
    content,
    metadata: {
      createdAt: meta.createdAt,
      createdBy: meta.createdBy,
      keywords: meta.keywords,
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store", // Always fresh random
    },
  });
}

