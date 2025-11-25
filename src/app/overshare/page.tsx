import fs from "fs";
import path from "path";
import Link from "next/link";

export const dynamic = "force-static";
export const revalidate = 3600; // Revalidate every hour

type BreadcrumbMeta = {
  slug: string;
  title: string;
  category: string | null;
  file: string;
};

function extractMeta(content: string, file: string): BreadcrumbMeta {
  const slug = file.replace("breadcrumb-", "").replace(".md", "");
  
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/);
  const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
  
  return {
    slug,
    title: titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, " "),
    category: categoryMatch ? categoryMatch[1].trim() : null,
    file,
  };
}

export default function OvershareIndex() {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch {
    // Directory might not exist yet
  }

  // Extract metadata from each file
  const breadcrumbs: BreadcrumbMeta[] = files.map((file) => {
    const filePath = path.join(breadcrumbDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    return extractMeta(content, file);
  });

  // Group by category
  const grouped = breadcrumbs.reduce(
    (acc, bc) => {
      const cat = bc.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(bc);
      return acc;
    },
    {} as Record<string, BreadcrumbMeta[]>,
  );

  const categories = Object.keys(grouped).sort();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1a2e_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#0d1117_0%,transparent_40%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/stars.svg')] opacity-20"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:px-12 sm:py-24">
        {/* Header */}
        <header className="mb-16">
          <p className="mb-3 text-xs uppercase tracking-[0.5em] text-cyan-400/60">
            Knowledge Archive
          </p>
          <h1 className="font-['Eurostile',_sans-serif] text-5xl font-light tracking-wide text-white sm:text-6xl">
            Overshare
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
            The living, evolving philosophy, systems, and culture behind Snow
            White Laundry. Each breadcrumb is a structured insight—generated as
            the restaurant develops, indexed for discovery.
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs text-white/30">
            <span>{breadcrumbs.length} breadcrumbs</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{categories.length} categories</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>St. John&apos;s, Newfoundland</span>
          </div>
        </header>

        {/* Breadcrumb Grid */}
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
            <p className="text-white/40">No breadcrumbs yet.</p>
            <p className="mt-2 text-sm text-white/25">
              Staff can generate breadcrumbs at{" "}
              <Link href="/staff/breadcrumbs" className="text-cyan-400/60 hover:text-cyan-400">
                /staff/breadcrumbs
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <section key={category}>
                <h2 className="mb-4 text-xs uppercase tracking-[0.4em] text-white/40">
                  {category}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {grouped[category].map((bc) => (
                    <Link key={bc.slug} href={`/overshare/${bc.slug}`}>
                      <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.05]">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <h3 className="relative text-lg font-light capitalize text-white/90 transition-colors group-hover:text-white">
                          {bc.title}
                        </h3>
                        <p className="relative mt-2 text-xs text-white/30">
                          {bc.file}
                        </p>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-400/50">
                          →
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 border-t border-white/10 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-white/30">
            <p>Snow White Laundry · Overshare Engine</p>
            <Link
              href="/staff/breadcrumbs"
              className="text-cyan-400/50 transition-colors hover:text-cyan-400"
            >
              Staff Portal →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

