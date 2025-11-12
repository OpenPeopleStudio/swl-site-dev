import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

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
