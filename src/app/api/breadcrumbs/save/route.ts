import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type SaveRequest = {
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
    const body = (await request.json()) as SaveRequest;

    if (!body?.markdown?.trim()) {
      return NextResponse.json(
        { error: "markdown is required" },
        { status: 400 },
      );
    }

    const { markdown } = body;

    // Extract title from frontmatter
    const titleMatch = markdown.match(/title:\s*["']?([^"'\n]+)["']?/);
    const title = titleMatch ? titleMatch[1].trim() : "untitled";
    const slug = slugify(title);

    // Validate slug
    if (!slug || slug === "untitled") {
      return NextResponse.json(
        { error: "Could not extract valid title from breadcrumb" },
        { status: 400 },
      );
    }

    const breadcrumbsDir = path.join(
      process.cwd(),
      "swl-overshare/breadcrumbs",
    );

    const fileName = `breadcrumb-${slug}.md`;
    const filePath = path.join(breadcrumbsDir, fileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      // File exists - append timestamp to make unique
      const timestamp = Date.now();
      const uniqueFileName = `breadcrumb-${slug}-${timestamp}.md`;
      const uniqueFilePath = path.join(breadcrumbsDir, uniqueFileName);
      await fs.writeFile(uniqueFilePath, markdown, "utf-8");

      // Update manifest
      await updateManifest(breadcrumbsDir, uniqueFileName);

      return NextResponse.json({
        saved: true,
        file: uniqueFileName,
        message: "Breadcrumb saved with unique timestamp (title already existed)",
      });
    } catch {
      // File doesn't exist - safe to write
      await fs.writeFile(filePath, markdown, "utf-8");

      // Update manifest
      await updateManifest(breadcrumbsDir, fileName);

      return NextResponse.json({
        saved: true,
        file: fileName,
      });
    }
  } catch (error) {
    console.error("Breadcrumb save error:", error);
    return NextResponse.json(
      { error: "Failed to save breadcrumb" },
      { status: 500 },
    );
  }
}

async function updateManifest(
  breadcrumbsDir: string,
  newFileName: string,
): Promise<void> {
  const manifestPath = path.join(breadcrumbsDir, "manifest.json");

  try {
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent) as {
      version: number;
      description: string;
      auto_generate_rules: Record<string, boolean>;
      breadcrumbs: string[];
    };

    // Add new breadcrumb if not already present
    if (!manifest.breadcrumbs.includes(newFileName)) {
      manifest.breadcrumbs.push(newFileName);
      // Sort alphabetically for consistency
      manifest.breadcrumbs.sort();
      // Remove duplicates
      manifest.breadcrumbs = [...new Set(manifest.breadcrumbs)];
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to update manifest:", error);
    // Don't fail the whole operation if manifest update fails
  }
}

