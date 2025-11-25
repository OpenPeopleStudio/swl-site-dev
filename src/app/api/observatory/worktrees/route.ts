import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Observatory — Worktree Data Endpoint
 * 
 * Returns active worktrees with metadata for the Observatory dashboard.
 */

const WORKTREE_ROOT = ".cursor/worktrees";
const MAX_AGE_HOURS = 24;

interface WorktreeInfo {
  name: string;
  path: string;
  modified: string;
  ageHours: number;
  isStale: boolean;
  size: number;
  branch?: string;
  agentSource?: string;
}

export async function GET() {
  const worktrees: WorktreeInfo[] = [];

  if (!fs.existsSync(WORKTREE_ROOT)) {
    return NextResponse.json({
      active: 0,
      stale: 0,
      total: 0,
      worktrees: [],
    });
  }

  try {
    const dirs = fs.readdirSync(WORKTREE_ROOT);

    for (const dir of dirs) {
      const fullPath = path.join(WORKTREE_ROOT, dir);
      const stats = fs.statSync(fullPath);

      if (!stats.isDirectory()) continue;

      const modifiedTime = new Date(stats.mtime).getTime();
      const now = Date.now();
      const ageHours = (now - modifiedTime) / (1000 * 60 * 60);
      const isStale = ageHours >= MAX_AGE_HOURS;

      // Try to get branch name from git
      let branch: string | undefined;
      try {
        const gitHead = path.join(fullPath, ".git", "HEAD");
        if (fs.existsSync(gitHead)) {
          const headContent = fs.readFileSync(gitHead, "utf8").trim();
          branch = headContent.replace("ref: refs/heads/", "");
        }
      } catch {
        // Ignore git errors
      }

      // Calculate directory size
      let size = 0;
      try {
        const calculateSize = (dirPath: string): number => {
          let total = 0;
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              total += calculateSize(filePath);
            } else {
              total += stat.size;
            }
          }
          return total;
        };
        size = calculateSize(fullPath);
      } catch {
        size = 0;
      }

      // Infer agent source from directory name patterns
      let agentSource: string | undefined;
      if (dir.includes("ui")) agentSource = "ui-agent";
      else if (dir.includes("content")) agentSource = "content-agent";
      else if (dir.includes("schema")) agentSource = "schema-agent";
      else agentSource = "unknown";

      worktrees.push({
        name: dir,
        path: fullPath,
        modified: stats.mtime.toISOString(),
        ageHours: Math.round(ageHours * 10) / 10,
        isStale,
        size,
        branch,
        agentSource,
      });
    }
  } catch (error) {
    console.error("Worktree scan error:", error);
  }

  const active = worktrees.filter((w) => !w.isStale).length;
  const stale = worktrees.filter((w) => w.isStale).length;

  return NextResponse.json({
    active,
    stale,
    total: worktrees.length,
    worktrees: worktrees.sort((a, b) => b.ageHours - a.ageHours),
    timestamp: new Date().toISOString(),
  });
}
