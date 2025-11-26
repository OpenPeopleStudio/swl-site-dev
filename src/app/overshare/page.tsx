import fs from "fs";
import path from "path";
import Link from "next/link";
import { StarField } from "@/components/design/StarField";
import { GlassNav } from "@/components/design/GlassNav";
import { OvershareMark } from "@/components/overshare/OvershareMark";

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
    <main className="relative min-h-screen overflow-hidden text-white" style={{ background: "#000000" }}>
      <StarField />

      <div className="relative z-10 mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1600px" }}>
        <nav className="mb-12 sm:mb-16">
          <GlassNav />
        </nav>

        <header className="mb-20 sm:mb-24 md:mb-32 lg:mb-40 space-y-8">
          <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.02] px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-lg">
            <OvershareMark />
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
              Overshare · Knowledge Archive
            </p>
          </div>
          <p className="mb-4 sm:mb-6 text-xs sm:text-sm uppercase tracking-[0.5em] text-white/55">
            Knowledge Archive
          </p>
          <h1 className="font-['Eurostile',_sans-serif] text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-wide text-white">
            Overshare
          </h1>
          <p className="mt-8 sm:mt-10 md:mt-12 max-w-3xl text-lg sm:text-xl md:text-2xl leading-relaxed text-white/50">
            The living, evolving philosophy, systems, and culture behind Snow
            White Laundry. Each breadcrumb is a structured insight—generated as
            the restaurant develops, indexed for discovery.
          </p>
          <div className="mt-10 sm:mt-12 md:mt-16 flex items-center gap-8 sm:gap-10 text-xs sm:text-sm text-white/30">
            <span>{breadcrumbs.length} breadcrumbs</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{categories.length} categories</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>St. John&apos;s, Newfoundland</span>
          </div>
        </header>

        {/* Breadcrumb Grid */}
        {categories.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-md shadow-[0_35px_120px_rgba(0,0,0,0.55)]">
            <p className="text-white/50">No breadcrumbs yet.</p>
            <p className="mt-2 text-sm text-white/30">
              Overshare authoring now lives at{" "}
              <Link
                href="https://overshare.snowwhitelaundry.co"
                className="text-[#facc15]/70 hover:text-[#facc15]"
                target="_blank"
                rel="noreferrer"
              >
                overshare.snowwhitelaundry.co
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-16 sm:space-y-20 md:space-y-24 lg:space-y-32">
            {categories.map((category) => (
              <section
                key={category}
                className="rounded-[36px] border border-white/10 bg-white/[0.02] p-8 sm:p-10 md:p-12 shadow-[0_45px_140px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <h2 className="mb-6 sm:mb-8 md:mb-10 text-xs sm:text-sm uppercase tracking-[0.4em] text-white/50">
                  {category}
                </h2>
                <div className="grid gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2">
                  {grouped[category].map((bc) => (
                    <Link key={bc.slug} href={`/overshare/${bc.slug}`}>
                      <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-7 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.5)] backdrop-blur-lg transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <h3 className="relative text-lg font-light capitalize text-white/90 transition group-hover:text-white">
                          {bc.title}
                        </h3>
                        <p className="relative mt-2 text-xs text-white/30">
                          {bc.file}
                        </p>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/25 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#facc15]/70">
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
        <footer className="mt-32 sm:mt-40 md:mt-48 lg:mt-56 border-t border-white/10 pt-12 sm:pt-16 md:pt-20">
          <div className="flex flex-wrap items-center justify-between gap-6 sm:gap-8 text-xs sm:text-sm text-white/30">
            <p>Snow White Laundry · Overshare Engine</p>
            <Link
              href="https://overshare.snowwhitelaundry.co"
              target="_blank"
              rel="noreferrer"
              className="text-[#facc15]/70 transition-colors hover:text-[#facc15]"
            >
              Overshare Handbook →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}


