import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

/**
 * Breadcrumb Commit API
 * 
 * Direct GitHub commit route - server-side override if GitHub Actions fails.
 * 
 * Required Environment Variables:
 * - GITHUB_TOKEN: Personal Access Token with repo write permissions
 * - GITHUB_OWNER: Repository owner (username or org)
 * - GITHUB_REPO: Repository name
 */

type CommitRequest = {
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
    const body = (await request.json()) as CommitRequest;

    if (!body?.markdown?.trim()) {
      return NextResponse.json(
        { error: "markdown is required" },
        { status: 400 },
      );
    }

    const ghToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    const ghOwner = process.env.GITHUB_OWNER ?? process.env.GH_OWNER;
    const ghRepo = process.env.GITHUB_REPO ?? process.env.GH_REPO;

    if (!ghToken || !ghOwner || !ghRepo) {
      return NextResponse.json(
        { error: "GitHub configuration missing (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)" },
        { status: 500 },
      );
    }

    const { markdown } = body;

    // Extract title from frontmatter
    const titleMatch = markdown.match(/title:\s*["']?([^"'\n]+)["']?/);
    const title = titleMatch ? titleMatch[1].trim() : "untitled";
    const slug = slugify(title);
    const filePath = `swl-overshare/breadcrumbs/breadcrumb-${slug}.md`;

    const octokit = new Octokit({ auth: ghToken });

    // Check if file exists (to get SHA for update)
    let existingSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: ghOwner,
        repo: ghRepo,
        path: filePath,
      });
      if (!Array.isArray(data) && data.type === "file") {
        existingSha = data.sha;
      }
    } catch {
      // File doesn't exist, which is fine
    }

    // Create or update file
    await octokit.repos.createOrUpdateFileContents({
      owner: ghOwner,
      repo: ghRepo,
      path: filePath,
      message: `Add breadcrumb: ${title}`,
      content: Buffer.from(markdown).toString("base64"),
      ...(existingSha ? { sha: existingSha } : {}),
    });

    // Update manifest
    try {
      const { data: manifestData } = await octokit.repos.getContent({
        owner: ghOwner,
        repo: ghRepo,
        path: "swl-overshare/breadcrumbs/manifest.json",
      });

      if (!Array.isArray(manifestData) && manifestData.type === "file") {
        const manifest = JSON.parse(
          Buffer.from(manifestData.content, "base64").toString("utf-8"),
        ) as { breadcrumbs: string[] };

        const fileName = `breadcrumb-${slug}.md`;
        if (!manifest.breadcrumbs.includes(fileName)) {
          manifest.breadcrumbs.push(fileName);
          manifest.breadcrumbs.sort();
          manifest.breadcrumbs = [...new Set(manifest.breadcrumbs)];

          await octokit.repos.createOrUpdateFileContents({
            owner: ghOwner,
            repo: ghRepo,
            path: "swl-overshare/breadcrumbs/manifest.json",
            message: `Update manifest: add ${slug}`,
            content: Buffer.from(JSON.stringify(manifest, null, 2)).toString("base64"),
            sha: manifestData.sha,
          });
        }
      }
    } catch (err) {
      console.error("Failed to update manifest:", err);
      // Don't fail the whole operation
    }

    return NextResponse.json({ committed: true, file: filePath });
  } catch (error) {
    console.error("Commit error:", error);
    return NextResponse.json(
      { error: "Failed to commit breadcrumb" },
      { status: 500 },
    );
  }
}

