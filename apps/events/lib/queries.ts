import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

export type PrivateEvent = {
  id: string;
  guest_name: string;
  guest_email?: string | null;
  organization?: string | null;
  event_type?: string | null;
  party_size?: number | null;
  preferred_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  menu_style?: string | null;
  budget_range?: string | null;
  special_requests?: string | null;
  status: string;
  proposal_text?: string | null;
  proposal_pdf_url?: string | null;
  deposit_amount?: number | null;
  deposit_paid?: boolean | null;
  photos?: string[] | null;
  reflection_prompt_sent?: boolean | null;
  notes_internal?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

const baseColumns =
  "id, guest_name, guest_email, organization, event_type, party_size, preferred_date, start_time, end_time, menu_style, budget_range, special_requests, status, proposal_text, proposal_pdf_url, deposit_amount, deposit_paid, photos, reflection_prompt_sent, notes_internal, created_at, updated_at";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: {
        headers: {
          "X-Client-Info": "cortexos-events-admin",
        },
      },
    })
  : null;

function requireSupabaseAdmin() {
  if (!SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not initialized");
  }
  return supabaseAdmin;
}

export const getEventById = cache(async (id: string) => {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .select(baseColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getEventById error", error);
    throw error;
  }
  return data as PrivateEvent | null;
});

export async function listCompletedEvents() {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .select(baseColumns)
    .eq("status", "completed")
    .order("preferred_date", { ascending: false });
  if (error) {
    console.error("listCompletedEvents error", error);
    throw error;
  }
  return (data ?? []) as PrivateEvent[];
}

export async function listEventsForGuest(email: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .select(baseColumns)
    .eq("guest_email", email)
    .order("preferred_date", { ascending: true });
  if (error) {
    console.error("listEventsForGuest error", error);
    return [];
  }
  return (data ?? []) as PrivateEvent[];
}
