import fs from "fs";
import path from "path";

/**
 * Atom Feed for Overshare Breadcrumbs
 * 
 * Complementary to RSS, Atom is preferred by many modern feed readers
 * and provides richer metadata support.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snowwhitelaundry.ai";

type BreadcrumbMeta = {
  slug: string;
  title: string;
  summary: string;
  updated: Date;
  author: string;
};

function extractMeta(content: string, file: string): BreadcrumbMeta {
  const slug = file.replace("breadcrumb-", "").replace(".md", "");
  
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
  const title = titleMatch 
    ? titleMatch[1].trim() 
    : slug.replace(/-/g, " ");

  const summaryMatch = content.match(/## Summary\s*\n([\s\S]*?)(?=\n##|$)/);
  const summary = summaryMatch
    ? summaryMatch[1].trim().slice(0, 300)
    : `Breadcrumb from the Snow White Laundry knowledge archive.`;

  const dateMatch = content.match(/created_at:\s*["']?([^"'\n]+)["']?/);
  const updated = dateMatch ? new Date(dateMatch[1]) : new Date();

  const authorMatch = content.match(/created_by:\s*["']?([^"'\n]+)["']?/);
  const author = authorMatch ? authorMatch[1].trim() : "Snow White Laundry";

  return { slug, title, summary, updated, author };
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

  // Find most recent update
  let latestUpdate = new Date(0);
  
  const entries = files
    .map((file) => {
      const filePath = path.join(breadcrumbDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const meta = extractMeta(content, file);
      const url = `${BASE_URL}/overshare/${meta.slug}`;

      if (meta.updated > latestUpdate) {
        latestUpdate = meta.updated;
      }

      return `  <entry>
    <title>${escapeXml(meta.title)}</title>
    <link href="${url}" rel="alternate" type="text/html"/>
    <id>${url}</id>
    <updated>${meta.updated.toISOString()}</updated>
    <author>
      <name>${escapeXml(meta.author)}</name>
    </author>
    <summary type="text">${escapeXml(meta.summary)}</summary>
  </entry>`;
    })
    .join("\n");

  if (latestUpdate.getTime() === 0) {
    latestUpdate = new Date();
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Snow White Laundry — Overshare</title>
  <subtitle>The evolving philosophy, systems, and operational logic of Snow White Laundry.</subtitle>
  <link href="${BASE_URL}/overshare" rel="alternate" type="text/html"/>
  <link href="${BASE_URL}/overshare/atom.xml" rel="self" type="application/atom+xml"/>
  <id>${BASE_URL}/overshare</id>
  <updated>${latestUpdate.toISOString()}</updated>
  <author>
    <name>Snow White Laundry</name>
    <uri>${BASE_URL}</uri>
  </author>
  <rights>© ${new Date().getFullYear()} Snow White Laundry, St. John's, Newfoundland</rights>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=86400",
    },
  });
}

