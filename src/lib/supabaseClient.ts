import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let clientInitError: string | null = null;

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;
  if (clientInitError) {
    console.error(clientInitError);
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    clientInitError =
      "Supabase public credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    console.error(clientInitError);
    return null;
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
