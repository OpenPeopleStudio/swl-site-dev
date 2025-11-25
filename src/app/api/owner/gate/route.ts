import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import {
  SESSION_COOKIE,
  serializeSession,
  type SessionPayload,
} from "@/lib/shared/session";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

async function logGateAuth(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    email: string;
    intent: "login" | "register" | "password_reset";
    success: boolean;
    role?: string;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    error_message?: string;
  },
) {
  try {
    await supabase.from("gate_auth_log").insert({
      email: params.email.toLowerCase(),
      intent: params.intent,
      success: params.success,
      role: params.role || null,
      user_id: params.user_id || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
      error_message: params.error_message || null,
    });
  } catch (error) {
    // Don't fail auth if logging fails, but log the error
    console.error("Failed to log gate auth:", error);
  }
}

function getClientInfo(request: Request): { ip_address?: string; user_agent?: string } {
  const headers = request.headers;
  const ip_address =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined;
  const user_agent = headers.get("user-agent") || undefined;
  return { ip_address, user_agent };
}

// Seed users configuration - matches check-user route
const SEEDED_USERS = [
  {
    email: "tom@openpeople.ai",
    passwordEnv: "GATE_TOM_PASSWORD",
    fallbackPassword: "opendeck",
    metadata: { role: "owner" },
  },
  {
    email: "tom@snowwhitelaundry.com",
    passwordEnv: "GATE_TOM_STAFF_PASSWORD",
    fallbackPassword: "opendeck",
    metadata: { role: "staff" },
  },
  {
    email: "toml_ne@icloud.com",
    passwordEnv: "GATE_TOML_PASSWORD",
    fallbackPassword: "opendeck",
    metadata: { role: "customer" },
  },
] as const;

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

const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

type StaffAccessRecord = {
  password_hash: string;
  role?: string | null;
  must_reset?: boolean | null;
};

const MIN_SUPABASE_PASSWORD_LENGTH =
  Number(process.env.SUPABASE_PASSWORD_MIN_LENGTH) || 6;
const SUPABASE_PASSWORD_PAD_CHAR =
  process.env.SUPABASE_PASSWORD_PAD_CHAR || "*";

function buildAuthCookieResponse(payload: SessionPayload) {
  const response = NextResponse.json({
    success: true,
    role: payload.role,
    email: payload.email,
  });
  response.cookies.set(SESSION_COOKIE, serializeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    domain: COOKIE_DOMAIN || undefined,
    maxAge: 60 * 60 * 6,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const user = await findSupabaseUserByEmail(supabase, email);

  if (!user) {
    return NextResponse.json({ exists: false });
  }

  const role = (user.user_metadata?.role as string | undefined) ?? "customer";

  return NextResponse.json({
    exists: true,
    role,
  });
}

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  let loggedEmail: string | undefined;
  let loggedIntent: "login" | "register" | "password_reset" = "login";

  try {
    const { email, password, intent, newPassword } = (await request.json()) as {
      email?: string;
      password?: string;
      intent?: "register" | "login";
      newPassword?: string;
    };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    loggedEmail = email.toLowerCase();
    loggedIntent = intent === "register" ? "register" : newPassword ? "password_reset" : "login";

    const supabase = getSupabaseAdmin();
    
    // Ensure seed users are synced before authentication
    await ensureSeedUsers(supabase);
    
    const existingUser = await findSupabaseUserByEmail(supabase, email);

    if (intent === "register") {
      if (existingUser) {
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "register",
          success: false,
          error_message: "Account already exists",
          ...clientInfo,
        });
        return NextResponse.json(
          { error: "Account already exists" },
          { status: 409 },
        );
      }
      if (!password) {
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "register",
          success: false,
          error_message: "Password is required",
          ...clientInfo,
        });
        return NextResponse.json(
          { error: "Password is required to create an account" },
          { status: 400 },
        );
      }
      try {
        await ensureSupabaseUser(email, password, "customer");
        const createdUser = await findSupabaseUserByEmail(supabase, email);
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "register",
          success: true,
          role: "customer",
          user_id: createdUser?.id,
          ...clientInfo,
        });
        return buildAuthCookieResponse({ email, role: "customer" });
      } catch (syncError) {
        console.error(syncError);
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "register",
          success: false,
          error_message: syncError instanceof Error ? syncError.message : "Unable to create account",
          ...clientInfo,
        });
        return NextResponse.json(
          { error: "Unable to create account" },
          { status: 500 },
        );
      }
    }

    if (!existingUser || !password) {
      await logGateAuth(supabase, {
        email: loggedEmail,
        intent: loggedIntent,
        success: false,
        error_message: existingUser ? "Password required" : "Account not found",
        ...clientInfo,
      });
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 },
      );
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      await logGateAuth(supabase, {
        email: loggedEmail,
        intent: loggedIntent,
        success: false,
        error_message: authError?.message || "Invalid password",
        user_id: existingUser?.id,
        ...clientInfo,
      });
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 },
      );
    }

    const resolvedRole = (existingUser.user_metadata?.role as string | undefined) ?? "customer";

    // Handle password reset if needed
    if (newPassword) {
      if (newPassword.length < 8) {
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "password_reset",
          success: false,
          error_message: "New password must be at least 8 characters long",
          user_id: existingUser.id,
          ...clientInfo,
        });
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 },
        );
      }
      try {
        await ensureSupabaseUser(email, newPassword, resolvedRole);
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "password_reset",
          success: true,
          role: resolvedRole,
          user_id: existingUser.id,
          ...clientInfo,
        });
      } catch (syncError) {
        console.error(syncError);
        await logGateAuth(supabase, {
          email: loggedEmail,
          intent: "password_reset",
          success: false,
          error_message: syncError instanceof Error ? syncError.message : "Unable to reset password",
          user_id: existingUser.id,
          ...clientInfo,
        });
        return NextResponse.json(
          { error: "Unable to reset password" },
          { status: 500 },
        );
      }
    }

    // Log successful login
    await logGateAuth(supabase, {
      email: loggedEmail,
      intent: loggedIntent,
      success: true,
      role: resolvedRole,
      user_id: existingUser.id,
      ...clientInfo,
    });

    return buildAuthCookieResponse({
      email,
      role: resolvedRole,
    });
  } catch (err) {
    console.error("Gate error", err);
    if (loggedEmail) {
      const supabase = getSupabaseAdmin();
      await logGateAuth(supabase, {
        email: loggedEmail,
        intent: loggedIntent,
        success: false,
        error_message: err instanceof Error ? err.message : "Access denied",
        ...clientInfo,
      });
    }
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }
}

async function ensureSupabaseUser(email: string, password: string, role: string) {
  const supabase = getSupabaseAdmin();
  const formattedRole = role || "staff";
  const normalizedPassword =
    password.length >= MIN_SUPABASE_PASSWORD_LENGTH
      ? password
      : password.padEnd(
          MIN_SUPABASE_PASSWORD_LENGTH,
          SUPABASE_PASSWORD_PAD_CHAR,
        );
  if (normalizedPassword !== password) {
    console.warn(
      `Supabase password for ${email} padded to satisfy minimum length of ${MIN_SUPABASE_PASSWORD_LENGTH}.`,
    );
  }
  const inferredName =
    email.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    ) || "Staff";

  const existing = await findSupabaseUserByEmail(supabase, email);

  if (!existing) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: {
        role: formattedRole,
        full_name: inferredName,
      },
    });
    if (createError) {
      console.error("Supabase user creation failed", createError);
      throw new Error("Unable to create Supabase user");
    }
    return;
  }

  const mergedMetadata = {
    ...(existing.user_metadata ?? {}),
    role: formattedRole,
    full_name:
      existing.user_metadata?.full_name?.trim() || inferredName,
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      password: normalizedPassword,
      user_metadata: mergedMetadata,
    },
  );
  if (updateError) {
    console.error("Supabase user update failed", updateError);
    throw new Error("Unable to update Supabase user");
  }
}

async function findSupabaseUserByEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
) {
  const normalized = email.toLowerCase();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error("Supabase user list failed", error);
    throw new Error("Unable to sync Supabase user");
  }
  return data.users.find(
    (candidate) => candidate.email?.toLowerCase() === normalized,
  );
}
