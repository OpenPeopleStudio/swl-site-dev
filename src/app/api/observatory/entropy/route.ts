import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Observatory — Entropy Detection Endpoint
 * 
 * Analyzes breadcrumb files for entropy, drift, and structural issues.
 */

const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");

interface EntropyIssue {
  type: "linguistic_drift" | "missing_metadata" | "broken_link" | "isolated_node" | "structural_violation" | "semantic_outlier";
  breadcrumb: string;
  severity: "low" | "medium" | "high";
  message: string;
}

function extractMeta(content: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    for (const line of frontmatter.split("\n")) {
      const match = line.match(/^(\w+):\s*["']?([^"'\n]+)["']?/);
      if (match) {
        meta[match[1]] = match[2].trim();
      }
    }
  }
  return meta;
}

function extractLinks(content: string): string[] {
  const links: string[] = [];
  const linksMatch = content.match(/## Links\s*\n((?:- breadcrumb-[^\n]+\n?)+)/);
  if (linksMatch) {
    const linkLines = linksMatch[1].match(/- breadcrumb-[^\n]+/g) || [];
    links.push(...linkLines.map((l) => l.replace(/^-\s*/, "").trim()));
  }
  return links;
}

export async function GET() {
  const issues: EntropyIssue[] = [];
  let totalBreadcrumbs = 0;
  let totalLinks = 0;
  const linkMap = new Map<string, string[]>(); // breadcrumb -> [linked breadcrumbs]

  try {
    const files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && f.startsWith("breadcrumb-swl-") && !f.startsWith("_"));

    totalBreadcrumbs = files.length;

    // First pass: collect all breadcrumbs and their links
    for (const file of files) {
      const filePath = path.join(breadcrumbDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const meta = extractMeta(content);
      const links = extractLinks(content);
      
      totalLinks += links.length;
      linkMap.set(file, links);

      // Check for missing metadata
      if (!meta.title) {
        issues.push({
          type: "missing_metadata",
          breadcrumb: file,
          severity: "high",
          message: "Missing title field",
        });
      }
      if (!meta.slug) {
        issues.push({
          type: "missing_metadata",
          breadcrumb: file,
          severity: "high",
          message: "Missing slug field",
        });
      }
      if (!meta.category) {
        issues.push({
          type: "missing_metadata",
          breadcrumb: file,
          severity: "medium",
          message: "Missing category field",
        });
      }

      // Check for structural violations
      if (!content.includes("## Summary")) {
        issues.push({
          type: "structural_violation",
          breadcrumb: file,
          severity: "medium",
          message: "Missing Summary section",
        });
      }
      if (!content.includes("## Links")) {
        issues.push({
          type: "structural_violation",
          breadcrumb: file,
          severity: "low",
          message: "Missing Links section",
        });
      }

      // Check for broken links
      for (const link of links) {
        const linkPath = path.join(breadcrumbDir, link);
        if (!fs.existsSync(linkPath)) {
          issues.push({
            type: "broken_link",
            breadcrumb: file,
            severity: "medium",
            message: `Broken link to ${link}`,
          });
        }
      }

      // Simple linguistic drift detection (very basic)
      const wordCount = content.split(/\s+/).length;
      const avgWordLength = content.replace(/\s+/g, "").length / wordCount;
      if (avgWordLength < 3 || avgWordLength > 8) {
        issues.push({
          type: "linguistic_drift",
          breadcrumb: file,
          severity: "low",
          message: `Unusual average word length: ${avgWordLength.toFixed(2)}`,
        });
      }
    }

    // Second pass: detect isolated nodes (breadcrumbs with no incoming or outgoing links)
    for (const file of files) {
      const links = linkMap.get(file) || [];
      const hasOutgoing = links.length > 0;
      
      let hasIncoming = false;
      for (const [otherFile, otherLinks] of linkMap.entries()) {
        if (otherFile !== file && otherLinks.includes(file)) {
          hasIncoming = true;
          break;
        }
      }

      if (!hasOutgoing && !hasIncoming) {
        issues.push({
          type: "isolated_node",
          breadcrumb: file,
          severity: "low",
          message: "No incoming or outgoing links",
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to analyze entropy",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  // Calculate entropy score (0-1, where 1 is perfect, 0 is chaos)
  const issueCount = issues.length;
  const maxExpectedIssues = totalBreadcrumbs * 2; // Rough heuristic
  const entropyScore = Math.max(0, Math.min(1, 1 - issueCount / maxExpectedIssues));

  return NextResponse.json({
    entropyScore: Math.round(entropyScore * 100) / 100,
    totalBreadcrumbs,
    totalLinks,
    issueCount,
    issues: issues.slice(0, 50), // Limit to 50 most recent
    timestamp: new Date().toISOString(),
  });
}
