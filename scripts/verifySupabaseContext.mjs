import fs from "node:fs";
import path from "node:path";

const TARGET_DIR = path.resolve("apps/chat");
const ILLEGAL_IMPORT = "@\\/lib\\/supabase";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(entryPath);
    }
    if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      return [entryPath];
    }
    return [];
  });
}

const files = walk(TARGET_DIR);
let hasError = false;

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const regex = new RegExp(`["']${ILLEGAL_IMPORT}["']`, "g");
  if (regex.test(content)) {
    hasError = true;
    console.error(
      `🚫 Supabase server client import detected in ${path.relative(
        process.cwd(),
        file,
      )}. Use "@/lib/supabaseBrowser" instead.`,
    );
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log("✅ Supabase client imports verified safe.");
}
