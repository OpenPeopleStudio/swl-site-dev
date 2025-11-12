import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase";

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

export const getEventById = cache(async (id: string) => {
  const supabase = getSupabaseAdmin();
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
  const supabase = getSupabaseAdmin();
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
