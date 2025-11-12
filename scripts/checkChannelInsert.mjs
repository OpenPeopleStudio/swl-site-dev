import fs from "node:fs";
import path from "node:path";

const ROOTS = ["apps/chat"];
const PATTERN = /channel_id:\s*["'`]global-chat["'`]/;
let failed = false;

function crawl(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      crawl(entryPath);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      const contents = fs.readFileSync(entryPath, "utf8");
      if (PATTERN.test(contents)) {
        console.error(
          `🚫 Do not insert string channel_id in ${path.relative(
            process.cwd(),
            entryPath,
          )}`,
        );
        failed = true;
      }
    }
  }
}

ROOTS.forEach((dir) => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    crawl(fullPath);
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log("✅ channel_id inserts look sane.");
}
