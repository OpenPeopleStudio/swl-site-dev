#!/usr/bin/env node

/**
 * Snow White Laundry — Worktree Cleanup Scheduler
 *
 * Purpose:
 * Clean up stale or abandoned Git worktrees created by Cursor agents.
 * Prevents:
 * - corrupted worktrees
 * - too many parallel workspaces
 * - merge conflicts
 * - file overwrite collisions
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const WORKTREE_ROOT = ".cursor/worktrees";
const MAX_AGE_HOURS = 24; // configurable

console.log("→ Starting worktree cleanup…");

if (!fs.existsSync(WORKTREE_ROOT)) {
  console.log("No worktrees to clean.");
  process.exit(0);
}

// get all directories inside .cursor/worktrees
const dirs = fs.readdirSync(WORKTREE_ROOT);

dirs.forEach((dir) => {
  const fullPath = path.join(WORKTREE_ROOT, dir);

  if (!fs.statSync(fullPath).isDirectory()) return;

  // compute age of worktree
  const stats = fs.statSync(fullPath);
  const modifiedTime = new Date(stats.mtime).getTime();
  const now = Date.now();
  const ageHours = (now - modifiedTime) / (1000 * 60 * 60);

  // skip if too new
  if (ageHours < MAX_AGE_HOURS) {
    console.log(`⧖ Skipping fresh worktree: ${dir}`);
    return;
  }

  console.log(`⚠ Removing stale worktree: ${dir}`);

  // force remove worktree
  try {
    execSync(`git worktree remove ${fullPath} --force`, { stdio: "ignore" });
  } catch {
    console.log(`git worktree remove failed, using fs.rm for: ${dir}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
});

console.log("✓ Worktree cleanup complete.");
