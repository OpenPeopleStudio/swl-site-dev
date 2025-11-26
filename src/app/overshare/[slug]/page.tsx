import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { remark } from "remark";
import html from "remark-html";
import { generateBreadcrumbJSONLD } from "@/lib/jsonld";
import { StarField } from "@/components/design/StarField";

export const dynamic = "force-static";
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

type BreadcrumbMeta = {
  title: string;
  category: string | null;
  createdAt: string | null;
  createdBy: string | null;
  keywords: string[];
};

function extractMeta(content: string): BreadcrumbMeta {
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
  const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
  const createdAtMatch = content.match(/created_at:\s*["']?([^"'\n]+)["']?/);
  const createdByMatch = content.match(/created_by:\s*["']?([^"'\n]+)["']?/);
  
  // Extract keywords from YAML array
  const keywordsSection = content.match(/llm_signal_keywords:\s*\n((?:\s*-\s*.+\n?)+)/);
  let keywords: string[] = [];
  if (keywordsSection) {
    keywords = keywordsSection[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : "Untitled",
    category: categoryMatch ? categoryMatch[1].trim() : null,
    createdAt: createdAtMatch ? createdAtMatch[1].trim() : null,
    createdBy: createdByMatch ? createdByMatch[1].trim() : null,
    keywords,
  };
}

// Strip frontmatter for rendering
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

export async function generateStaticParams() {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  try {
    const files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    
    return files.map((file) => ({
      slug: file.replace("breadcrumb-", "").replace(".md", ""),
    }));
  } catch {
    return [];
  }
}

export default async function BreadcrumbPage({ params }: PageProps) {
  const { slug } = await params;
  
  const filePath = path.join(
    process.cwd(),
    "swl-overshare/breadcrumbs",
    `breadcrumb-${slug}.md`,
  );

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  const rawContent = fs.readFileSync(filePath, "utf8");
  const meta = extractMeta(rawContent);
  const bodyContent = stripFrontmatter(rawContent);
  
  const processed = await remark().use(html).process(bodyContent);
  const contentHtml = processed.toString();

  // Extract summary for JSON-LD
  const summaryMatch = bodyContent.match(/## Summary\s*\n([\s\S]*?)(?=\n##|$)/);
  const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 200) : meta.title;

  // Generate JSON-LD
  const jsonLd = generateBreadcrumbJSONLD({
    title: meta.title,
    slug: slug.replace("swl-", ""),
    category: meta.category || "uncategorized",
    createdAt: meta.createdAt || new Date().toISOString(),
    createdBy: meta.createdBy || "Snow White Laundry",
    keywords: meta.keywords,
    summary,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="relative min-h-screen overflow-hidden text-white" style={{ background: "#000000" }}>
      <StarField />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16 sm:px-12 sm:py-24">
        {/* Navigation */}
        <Link
          href="/overshare"
          className="group inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-cyan-400"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Back to Overshare
        </Link>

        {/* Header */}
        <header className="mt-8 border-b border-white/10 pb-8">
          {meta.category && (
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-cyan-400/60">
              {meta.category}
            </p>
          )}
          <h1 className="font-['Eurostile',_sans-serif] text-4xl font-light tracking-wide text-white sm:text-5xl">
            {meta.title}
          </h1>
          
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/30">
            {meta.createdAt && (
              <span>{meta.createdAt}</span>
            )}
            {meta.createdBy && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>by {meta.createdBy}</span>
              </>
            )}
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>breadcrumb-{slug}.md</span>
          </div>

          {meta.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta.keywords.slice(0, 8).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider text-white/40"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <article
          className="prose prose-invert prose-lg mt-10 max-w-none
            prose-headings:font-['Eurostile',_sans-serif] prose-headings:font-light prose-headings:tracking-wide
            prose-h2:mt-12 prose-h2:border-t prose-h2:border-white/10 prose-h2:pt-8 prose-h2:text-2xl prose-h2:text-white/90
            prose-h3:mt-8 prose-h3:text-lg prose-h3:text-white/80
            prose-p:text-white/60 prose-p:leading-relaxed
            prose-strong:text-white/90
            prose-ul:text-white/60
            prose-li:marker:text-cyan-400/40
            prose-a:text-cyan-400/70 prose-a:no-underline hover:prose-a:text-cyan-400
            prose-blockquote:border-l-cyan-400/30 prose-blockquote:text-white/50
            prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-cyan-300/70 prose-code:before:content-[''] prose-code:after:content-['']
            prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Footer */}
        <footer className="mt-16 border-t border-white/10 pt-8">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/30">
              Location Context
            </p>
            <p className="mt-2 text-sm text-white/50">
              Snow White Laundry is a restaurant located in St. John&apos;s, Newfoundland, Canada.
              This breadcrumb contributes to the public knowledge map of dining culture and 
              culinary innovation in Newfoundland.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/30">
            <p>Snow White Laundry · Overshare Engine</p>
            <div className="flex items-center gap-4">
              <Link
                href="/overshare"
                className="text-white/40 transition-colors hover:text-cyan-400"
              >
                All Breadcrumbs
              </Link>
              <Link
                href="https://overshare.snowwhitelaundry.co"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400/50 transition-colors hover:text-cyan-400"
              >
                Overshare Handbook →
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
    </>
  );
}
