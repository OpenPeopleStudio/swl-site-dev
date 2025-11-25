import { NextResponse } from "next/server";

/**
 * GitHub Writer API Route
 * 
 * Commits breadcrumb files directly to the GitHub repository.
 * This enables the fully automated pipeline:
 * Staff UI → Supabase → AI → GitHub Commit → Vercel → Sitemap
 * 
 * Required Environment Variables:
 * - GH_TOKEN: GitHub Personal Access Token with repo write permissions
 * - GH_OWNER: GitHub username or organization (e.g., "your-username")
 * - GH_REPO: Repository name (e.g., "swl-site-dev")
 * - GH_BRANCH: Target branch (defaults to "main")
 */

type WriteRequest = {
  markdown: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WriteRequest;

    if (!body?.markdown?.trim()) {
      return NextResponse.json(
        { error: "markdown is required" },
        { status: 400 },
      );
    }

    const ghToken = process.env.GH_TOKEN;
    const ghOwner = process.env.GH_OWNER;
    const ghRepo = process.env.GH_REPO;
    const ghBranch = process.env.GH_BRANCH ?? "main";

    if (!ghToken || !ghOwner || !ghRepo) {
      return NextResponse.json(
        { error: "GitHub configuration missing. Set GH_TOKEN, GH_OWNER, and GH_REPO." },
        { status: 500 },
      );
    }

    const { markdown } = body;

    // Extract title from frontmatter
    const titleMatch = markdown.match(/title:\s*["']?([^"'\n]+)["']?/);
    const title = titleMatch ? titleMatch[1].trim() : `untitled-${Date.now()}`;
    const slug = slugify(title);
    const filePath = `swl-overshare/breadcrumbs/breadcrumb-${slug}.md`;

    const apiBase = "https://api.github.com";
    const headers = {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // Check if file already exists (to get SHA for update)
    let existingSha: string | undefined;
    try {
      const existingRes = await fetch(
        `${apiBase}/repos/${ghOwner}/${ghRepo}/contents/${filePath}?ref=${ghBranch}`,
        { headers },
      );
      if (existingRes.ok) {
        const existing = (await existingRes.json()) as { sha: string };
        existingSha = existing.sha;
      }
    } catch {
      // File doesn't exist, which is fine
    }

    // Create or update the breadcrumb file
    const fileContent = Buffer.from(markdown).toString("base64");
    const createRes = await fetch(
      `${apiBase}/repos/${ghOwner}/${ghRepo}/contents/${filePath}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `Add breadcrumb: ${title}`,
          content: fileContent,
          branch: ghBranch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      },
    );

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error("GitHub file create error:", errorData);
      return NextResponse.json(
        { error: "Failed to create breadcrumb file on GitHub" },
        { status: 500 },
      );
    }

    // Now update the manifest
    const manifestPath = "swl-overshare/breadcrumbs/manifest.json";
    
    // Get current manifest
    const manifestRes = await fetch(
      `${apiBase}/repos/${ghOwner}/${ghRepo}/contents/${manifestPath}?ref=${ghBranch}`,
      { headers },
    );

    if (!manifestRes.ok) {
      console.error("Failed to fetch manifest");
      return NextResponse.json({
        ok: true,
        file: filePath,
        warning: "Breadcrumb saved but manifest update failed",
      });
    }

    const manifestData = (await manifestRes.json()) as {
      content: string;
      sha: string;
    };

    const decodedManifest = JSON.parse(
      Buffer.from(manifestData.content, "base64").toString("utf-8"),
    ) as {
      version: number;
      description: string;
      auto_generate_rules: Record<string, boolean>;
      breadcrumbs: string[];
    };

    // Add new breadcrumb to manifest
    const newBreadcrumbName = `breadcrumb-${slug}.md`;
    if (!decodedManifest.breadcrumbs.includes(newBreadcrumbName)) {
      decodedManifest.breadcrumbs.push(newBreadcrumbName);
      decodedManifest.breadcrumbs.sort();
      decodedManifest.breadcrumbs = [...new Set(decodedManifest.breadcrumbs)];
    }

    // Update manifest on GitHub
    const updatedManifestContent = Buffer.from(
      JSON.stringify(decodedManifest, null, 2),
    ).toString("base64");

    const manifestUpdateRes = await fetch(
      `${apiBase}/repos/${ghOwner}/${ghRepo}/contents/${manifestPath}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `Update manifest: add ${slug}`,
          content: updatedManifestContent,
          branch: ghBranch,
          sha: manifestData.sha,
        }),
      },
    );

    if (!manifestUpdateRes.ok) {
      console.error("Failed to update manifest on GitHub");
      return NextResponse.json({
        ok: true,
        file: filePath,
        warning: "Breadcrumb saved but manifest update failed",
      });
    }

    return NextResponse.json({
      ok: true,
      file: filePath,
      manifest: "updated",
    });
  } catch (error) {
    console.error("GitHub write error:", error);
    return NextResponse.json(
      { error: "Failed to write to GitHub" },
      { status: 500 },
    );
  }
}

