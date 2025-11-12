import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const lowerEmail = email.toLowerCase();
    const { data: listData, error: listError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listError) {
      console.error("Supabase session user lookup failed", listError);
      return NextResponse.json(
        { error: "Unable to list Supabase users" },
        { status: 500 },
      );
    }

    let user =
      listData.users?.find(
        (candidate) => candidate.email?.toLowerCase() === lowerEmail,
      ) ?? null;

    if (!user) {
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: randomUUID(),
          user_metadata: { source: "gate" },
        });
      if (createError || !created?.user) {
        console.error("Supabase user creation failed", createError);
        return NextResponse.json(
          { error: "Unable to create Supabase user" },
          { status: 500 },
        );
      }
      user = created.user;
    }

    const adminApi = supabase.auth.admin as unknown as {
      createSession?: (userId: string) => Promise<{
        data: { session: { access_token: string; refresh_token: string; expires_at?: number } } | null;
        error: unknown;
      }>;
    };

    if (!adminApi.createSession) {
      console.error("Supabase admin createSession is unavailable.");
      return NextResponse.json(
        { error: "Session minting not supported on this stack" },
        { status: 500 },
      );
    }

    const { data: sessionData, error: sessionError } = await adminApi.createSession(
      user.id,
    );

    if (sessionError || !sessionData?.session) {
      console.error("Supabase session creation failed", sessionError);
      return NextResponse.json(
        { error: "Unable to create Supabase session" },
        { status: 500 },
      );
    }

    const { session } = sessionData;
    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    });
  } catch (error) {
    console.error("Supabase session API error", error);
    return NextResponse.json(
      { error: "Unable to mint Supabase session" },
      { status: 500 },
    );
  }
}
