import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase";

const STAFF_COOKIE = "swl_staff";

type StaffAccessRecord = {
  password_hash: string;
  role?: string | null;
};

function buildAuthCookieResponse() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(STAFF_COOKIE, "granted", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    domain:
      process.env.NODE_ENV === "production"
        ? "ai.snowwhitelaundry.co"
        : undefined,
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
    const { email, password, intent } = (await request.json()) as {
      email?: string;
      password?: string;
      intent?: "register" | "login";
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
      .select("password_hash, role")
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
      return buildAuthCookieResponse();
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

    return buildAuthCookieResponse();
  } catch (err) {
    console.error("Gate error", err);
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }
}
