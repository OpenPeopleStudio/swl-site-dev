import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";

/**
 * Admin utility to set/reset passwords for existing users
 * 
 * POST /api/admin/set-password
 * Body: { email: string, password: string }
 */

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Find user by email
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return NextResponse.json(
        { error: "Failed to list users", details: listError.message },
        { status: 500 },
      );
    }

    const normalizedEmail = email.toLowerCase();
    const user = usersData.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Update user password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password,
        email_confirm: true,
      },
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password updated for ${email}`,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        role: updatedUser.user.user_metadata?.role,
      },
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      {
        error: "Failed to set password",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
