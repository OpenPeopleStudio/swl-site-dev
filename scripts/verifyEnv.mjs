// Load .env.local if it exists (for local development)
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

try {
  const envLocal = readFileSync(join(rootDir, ".env.local"), "utf-8");
  for (const line of envLocal.split("\n")) {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !match[1].startsWith("#")) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // .env.local doesn't exist, that's okay
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

let failed = false;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log("✅ Environment variables verified.");
}
