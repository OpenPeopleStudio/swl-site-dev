"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type StaffIdentity = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string;
};

function buildAvatar(nameOrEmail: string) {
  const encoded = encodeURIComponent(nameOrEmail);
  return `https://ui-avatars.com/api/?name=${encoded}&background=111111&color=ffffff`;
}

export async function getCurrentUser(
  client?: SupabaseClient | null,
): Promise<StaffIdentity | null> {
  const supabase = client ?? supabaseBrowser;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  const metadata = data.user.user_metadata ?? {};
  const email = data.user.email ?? "";
  const name = metadata.full_name || email.split("@")[0] || "Staff";

  return {
    id: data.user.id,
    email,
    full_name: name,
    role: metadata.role || "staff",
    avatar_url: metadata.avatar_url || buildAvatar(name),
  };
}
