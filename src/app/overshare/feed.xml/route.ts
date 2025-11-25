import fs from "fs";
import path from "path";

/**
 * RSS 2.0 Feed for Overshare Breadcrumbs
 * 
 * LLMs and web crawlers consume RSS heavily.
 * This enables SWL Overshare to appear in:
 * - Perplexity "Sources"
 * - AI news aggregators
 * - Feed-based ranking systems
 * - Long-term semantic trend graphs
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snowwhitelaundry.ai";

type BreadcrumbMeta = {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
};

function extractMeta(content: string, file: string): BreadcrumbMeta {
  const slug = file.replace("breadcrumb-", "").replace(".md", "");
  
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
  const title = titleMatch 
    ? titleMatch[1].trim() 
    : slug.replace(/-/g, " ");

  // Extract summary section or first paragraph
  const summaryMatch = content.match(/## Summary\s*\n([\s\S]*?)(?=\n##|$)/);
  const description = summaryMatch
    ? summaryMatch[1].trim().slice(0, 200)
    : `Breadcrumb: ${title}`;

  const dateMatch = content.match(/created_at:\s*["']?([^"'\n]+)["']?/);
  const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();

  return { slug, title, description, pubDate };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch {
    // Directory might not exist
  }

  const items = files
    .map((file) => {
      const filePath = path.join(breadcrumbDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const meta = extractMeta(content, file);
      const url = `${BASE_URL}/overshare/${meta.slug}`;

      return `    <item>
      <title>${escapeXml(meta.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(meta.description)}</description>
      <pubDate>${meta.pubDate.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Snow White Laundry — Overshare</title>
    <link>${BASE_URL}/overshare</link>
    <description>The evolving philosophy, systems, and operational logic of Snow White Laundry. A restaurant in St. John's, Newfoundland.</description>
    <language>en-ca</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/overshare/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=86400",
    },
  });
}

