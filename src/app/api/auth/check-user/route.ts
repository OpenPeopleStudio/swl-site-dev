import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const SEEDED_USERS = [
  {
    email: "tom@openpeople.ai",
    passwordEnv: "GATE_TOM_PASSWORD",
    fallbackPassword: "opendeck",
    metadata: { role: "staff" },
  },
  {
    email: "toml_ne@icloud.com",
    passwordEnv: "GATE_TOML_PASSWORD",
    fallbackPassword: "test",
    metadata: { role: "guest" },
  },
] as const;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase credentials are not configured.");
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}

async function findUserByEmail(client: SupabaseClient, email: string): Promise<User | null> {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) throw error;
  const lower = email.toLowerCase();
  const match = data.users.find((user) => user.email?.toLowerCase() === lower) ?? null;
  return match;
}

async function ensureSeedUsers(client: SupabaseClient) {
  await Promise.all(
    SEEDED_USERS.map(async ({ email, passwordEnv, fallbackPassword, metadata }) => {
      const password = process.env[passwordEnv] ?? fallbackPassword;
      if (!password) return;
      const existing = await findUserByEmail(client, email).catch((error) => {
        console.error("Failed to lookup user", email, error);
        return null;
      });
      if (existing) {
        const mergedMetadata =
          typeof existing.user_metadata === "object" && existing.user_metadata !== null
            ? { ...existing.user_metadata, ...metadata }
            : metadata;
        const { error } = await client.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: mergedMetadata,
        });
        if (error) {
          console.error("Failed to sync gate user", email, error);
        } else {
          console.info("Synced gate user password", email);
        }
        return;
      }
      const { error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) {
        console.error("Failed to seed user", email, error);
      } else {
        console.info("Seeded gate user", email);
      }
    }),
  );
}

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "Email required", exists: false }, { status: 400 });
    }
    const admin = getAdminClient();
    await ensureSeedUsers(admin);
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await findUserByEmail(admin, normalizedEmail).catch((error) => {
      console.error("Supabase check user error", error);
      return null;
    });
    return NextResponse.json({ exists: Boolean(existing) });
  } catch (error) {
    console.error("Check user API error", error);
    return NextResponse.json({ exists: false, error: "Unable to check user" }, { status: 500 });
  }
}
