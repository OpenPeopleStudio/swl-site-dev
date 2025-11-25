import fs from "fs";
import path from "path";
import type { MetadataRoute } from "next";

/**
 * Dynamic Sitemap Generator
 * 
 * Makes all Overshare breadcrumbs discoverable by:
 * - Google, Bing
 * - Perplexity, OpenAI Search
 * - Any agent crawling the domain
 * 
 * Auto-regenerates on every deployment.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snowwhitelaundry.ai";

type BreadcrumbFile = {
  slug: string;
  file: string;
  mtime: Date;
};

function getBreadcrumbs(): BreadcrumbFile[] {
  const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");
  
  try {
    const files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    
    return files.map((file) => {
      const filePath = path.join(breadcrumbDir, file);
      const stats = fs.statSync(filePath);
      return {
        slug: file.replace("breadcrumb-", "").replace(".md", ""),
        file,
        mtime: stats.mtime,
      };
    });
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const breadcrumbs = getBreadcrumbs();

  const breadcrumbUrls: MetadataRoute.Sitemap = breadcrumbs.map((bc) => ({
    url: `${BASE_URL}/overshare/${bc.slug}`,
    lastModified: bc.mtime,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Check for updates directory
  const updatesDir = path.join(process.cwd(), "swl-overshare/updates");
  let updateFiles: string[] = [];
  try {
    if (fs.existsSync(updatesDir)) {
      updateFiles = fs
        .readdirSync(updatesDir)
        .filter((f) => f.endsWith(".md"));
    }
  } catch {
    // Updates directory might not exist
  }

  const updateUrls: MetadataRoute.Sitemap = updateFiles.map((file) => {
    const filePath = path.join(updatesDir, file);
    const stats = fs.statSync(filePath);
    const slug = file.replace(".md", "");
    return {
      url: `${BASE_URL}/updates/${slug}`,
      lastModified: stats.mtime,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [
    // Homepage
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    // Overshare index
    {
      url: `${BASE_URL}/overshare`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Feeds
    {
      url: `${BASE_URL}/overshare/feed.xml`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/overshare/atom.xml`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/overshare/index.json`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    // Staff portal (if public)
    {
      url: `${BASE_URL}/staff`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // All breadcrumbs
    ...breadcrumbUrls,
    // All updates
    ...updateUrls,
  ];
}

