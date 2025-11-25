import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { remark } from "remark";
import html from "remark-html";
import { generateUpdateJSONLD } from "@/lib/jsonld";
import { StarField } from "@/components/design/StarField";

export const dynamic = "force-static";
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

type UpdateMeta = {
  title: string;
  date: string | null;
  category: string | null;
  keywords: string[];
};

function extractMeta(content: string): UpdateMeta {
  const titleMatch = content.match(/^#\s+(.+)/);
  const dateMatch = content.match(/date:\s*["']?([^"'\n]+)["']?/);
  const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
  
  // Extract keywords from YAML array
  const keywordsSection = content.match(/keywords:\s*\[([^\]]+)\]/);
  let keywords: string[] = [];
  if (keywordsSection) {
    keywords = keywordsSection[1]
      .split(",")
      .map((k) => k.trim().replace(/['"]/g, ""))
      .filter(Boolean);
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : "Update",
    date: dateMatch ? dateMatch[1].trim() : null,
    category: categoryMatch ? categoryMatch[1].trim() : null,
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
  const updatesDir = path.join(process.cwd(), "swl-overshare/updates");
  
  try {
    if (!fs.existsSync(updatesDir)) {
      return [];
    }
    
    const files = fs
      .readdirSync(updatesDir)
      .filter((f) => f.endsWith(".md"));
    
    return files.map((file) => ({
      slug: file.replace(".md", ""),
    }));
  } catch {
    return [];
  }
}

export default async function UpdatePage({ params }: PageProps) {
  const { slug } = await params;
  
  const filePath = path.join(
    process.cwd(),
    "swl-overshare/updates",
    `${slug}.md`,
  );

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  const rawContent = fs.readFileSync(filePath, "utf8");
  const meta = extractMeta(rawContent);
  const bodyContent = stripFrontmatter(rawContent);
  
  const processed = await remark().use(html).process(bodyContent);
  const contentHtml = processed.toString();

  // Generate JSON-LD
  const jsonLd = generateUpdateJSONLD({
    title: meta.title,
    slug,
    date: meta.date || new Date().toISOString(),
    category: meta.category || "update",
    keywords: meta.keywords,
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
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-cyan-400/60">
            Sparse Update
          </p>
          <h1 className="font-['Eurostile',_sans-serif] text-4xl font-light tracking-wide text-white sm:text-5xl">
            {meta.title}
          </h1>
          
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/30">
            {meta.date && (
              <span>{new Date(meta.date).toLocaleDateString("en-CA", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}</span>
            )}
            {meta.category && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="capitalize">{meta.category.replace(/-/g, " ")}</span>
              </>
            )}
          </div>

          {meta.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta.keywords.slice(0, 6).map((keyword) => (
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
            prose-p:text-white/60 prose-p:leading-relaxed
            prose-strong:text-white/90
            prose-ul:text-white/60
            prose-li:marker:text-cyan-400/40
            prose-a:text-cyan-400/70 prose-a:no-underline hover:prose-a:text-cyan-400"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Footer */}
        <footer className="mt-16 border-t border-white/10 pt-8">
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/30">
            <p>Snow White Laundry · Sparse Updates</p>
            <div className="flex items-center gap-4">
              <Link
                href="/overshare"
                className="text-white/40 transition-colors hover:text-cyan-400"
              >
                All Breadcrumbs
              </Link>
              <Link
                href="/api/updates/list"
                className="text-cyan-400/50 transition-colors hover:text-cyan-400"
              >
                All Updates →
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
    </>
  );
}
