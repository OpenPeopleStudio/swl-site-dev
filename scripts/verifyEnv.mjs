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
    const normalizedLine = line.replace(/\r$/, "");
    const match = normalizedLine.match(/^([^=:#]+)=(.*)$/);
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

const optional = [
  "OPENAI_API_KEY", // Required for breadcrumb generation
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
  
  // Check optional but important vars
  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`⚠️  Missing optional env var: ${key}`);
      if (key === "OPENAI_API_KEY") {
        console.warn("   This is required for breadcrumb generation to work.");
      }
    } else if (key === "OPENAI_API_KEY") {
      // Validate OpenAI API key format
      const apiKey = process.env[key].trim().replace(/^["']|["']$/g, "");
      if (!apiKey.startsWith("sk-")) {
        console.error(`❌ Invalid OpenAI API key format: ${key}`);
        console.error(`   Key should start with "sk-" but starts with "${apiKey.substring(0, Math.min(10, apiKey.length))}..."`);
        console.error(`   Please check your .env.local file and ensure the key is correct.`);
        console.error(`   Get a new key at https://platform.openai.com/account/api-keys`);
        failed = true;
      } else {
        console.log(`✅ ${key} is set and format looks valid.`);
      }
    }
  }
  
  if (failed) {
    process.exit(1);
  }
}
