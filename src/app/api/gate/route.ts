import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  SESSION_COOKIE,
  serializeSession,
  type SessionPayload,
} from "@/lib/session";

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
  const { data, error } = await supabase
    .from("staff_access")
    .select("role")
    .eq("email", email)
    .maybeSingle<StaffAccessRecord>();

  if (error) {
    console.error("Gate lookup error", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    role: data.role ?? "staff",
  });
}

export async function POST(request: Request) {
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

    const supabase = getSupabaseAdmin();
    const { data, error: selectError } = await supabase
      .from("staff_access")
      .select("password_hash, role, must_reset")
      .eq("email", email)
      .maybeSingle<StaffAccessRecord>();

    if (selectError) {
      console.error("Gate lookup error", selectError);
      return NextResponse.json(
        { error: "Access check failed" },
        { status: 500 },
      );
    }

    if (intent === "register") {
      if (data) {
        return NextResponse.json(
          { error: "Account already exists" },
          { status: 409 },
        );
      }
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to create an account" },
          { status: 400 },
        );
      }
      const password_hash = await bcrypt.hash(password, 12);
      const { error: insertError } = await supabase
        .from("staff_access")
        .insert({ email, password_hash, role: "customer" });
      if (insertError) {
        console.error("Gate register error", insertError);
        return NextResponse.json(
          { error: "Unable to create account" },
          { status: 500 },
        );
      }
      try {
        await ensureSupabaseUser(email, password, "customer");
      } catch (syncError) {
        console.error(syncError);
        return NextResponse.json(
          { error: "Unable to sync Supabase account" },
          { status: 500 },
        );
      }
      return buildAuthCookieResponse({ email, role: "customer" });
    }

    if (!data || !password) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 },
      );
    }

    const verified = await bcrypt.compare(password, data.password_hash);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 },
      );
    }

    const resolvedRole = data.role ?? "staff";

    if (data.must_reset) {
      if (!newPassword) {
        return NextResponse.json(
          { requiresPasswordReset: true },
          { status: 409 },
        );
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 },
        );
      }
      const nextHash = await bcrypt.hash(newPassword, 12);
      const { error: resetError } = await supabase
        .from("staff_access")
        .update({ password_hash: nextHash, must_reset: false })
        .eq("email", email);
      if (resetError) {
        console.error("Gate password reset error", resetError);
        return NextResponse.json(
          { error: "Unable to reset password" },
          { status: 500 },
        );
      }
      try {
        await ensureSupabaseUser(email, newPassword, resolvedRole);
      } catch (syncError) {
        console.error(syncError);
        return NextResponse.json(
          { error: "Unable to sync Supabase account" },
          { status: 500 },
        );
      }
      return buildAuthCookieResponse({
        email,
        role: resolvedRole,
      });
    }

    try {
      await ensureSupabaseUser(email, password, resolvedRole);
    } catch (syncError) {
      console.error(syncError);
      return NextResponse.json(
        { error: "Unable to sync Supabase account" },
        { status: 500 },
      );
    }

    return buildAuthCookieResponse({
      email,
      role: resolvedRole,
    });
  } catch (err) {
    console.error("Gate error", err);
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
