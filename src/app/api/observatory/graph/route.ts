import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Observatory — Graph Health Endpoint
 * 
 * Analyzes the breadcrumb graph structure for health metrics.
 */

const breadcrumbDir = path.join(process.cwd(), "swl-overshare/breadcrumbs");

interface GraphNode {
  id: string;
  title: string;
  category: string | null;
  links: string[];
  incomingLinks: number;
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
  const nodes = new Map<string, GraphNode>();
  const linkMap = new Map<string, string[]>();

  try {
    const files = fs
      .readdirSync(breadcrumbDir)
      .filter((f) => f.endsWith(".md") && f.startsWith("breadcrumb-swl-") && !f.startsWith("_"));

    // Build graph
    for (const file of files) {
      const filePath = path.join(breadcrumbDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const meta = extractMeta(content);
      const links = extractLinks(content);

      linkMap.set(file, links);

      nodes.set(file, {
        id: file,
        title: meta.title || file.replace("breadcrumb-swl-", "").replace(".md", ""),
        category: meta.category || null,
        links,
        incomingLinks: 0,
      });
    }

    // Calculate incoming links
    for (const [file, links] of linkMap.entries()) {
      for (const link of links) {
        const targetNode = nodes.get(link);
        if (targetNode) {
          targetNode.incomingLinks++;
        }
      }
    }

    const nodeArray = Array.from(nodes.values());

    // Calculate metrics
    const totalNodes = nodeArray.length;
    const totalEdges = nodeArray.reduce((sum, node) => sum + node.links.length, 0);
    const isolatedNodes = nodeArray.filter((n) => n.links.length === 0 && n.incomingLinks === 0).length;
    
    // Find overlinked nodes (top 10% by link count)
    const sortedByLinks = [...nodeArray].sort((a, b) => b.links.length - a.links.length);
    const top10Percent = Math.max(1, Math.floor(totalNodes * 0.1));
    const overlinkedNodes = sortedByLinks.slice(0, top10Percent);

    // Calculate cluster balance (category distribution)
    const categoryCounts = new Map<string, number>();
    for (const node of nodeArray) {
      const cat = node.category || "uncategorized";
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    const categories = Array.from(categoryCounts.values());
    const avgCategorySize = categories.reduce((a, b) => a + b, 0) / categories.length;
    const categoryVariance = categories.reduce((sum, size) => sum + Math.pow(size - avgCategorySize, 2), 0) / categories.length;
    const clusterBalance = Math.max(0, 1 - categoryVariance / (avgCategorySize * avgCategorySize)); // Normalized balance score

    // Graph integrity score (combination of connectivity and balance)
    const connectivityScore = totalNodes > 0 ? Math.min(1, totalEdges / (totalNodes * 2)) : 0; // Target: ~2 edges per node
    const integrityScore = (connectivityScore * 0.6 + clusterBalance * 0.4);

    return NextResponse.json({
      nodes: totalNodes,
      edges: totalEdges,
      isolatedNodes,
      overlinkedNodes: overlinkedNodes.map((n) => ({
        id: n.id,
        title: n.title,
        linkCount: n.links.length,
      })),
      categories: categoryCounts.size,
      clusterBalance: Math.round(clusterBalance * 100) / 100,
      integrityScore: Math.round(integrityScore * 100) / 100,
      connectivityScore: Math.round(connectivityScore * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to analyze graph",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
