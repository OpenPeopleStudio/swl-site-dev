import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

export type PrivateEvent = {
  id: string;
  user_id?: string | null;
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

export type OpeningReservation = {
  id: string;
  user_id?: string | null;
  email: string;
  preferred_date: string;
  party_size: number;
  notes?: string | null;
  status: string;
  created_at?: string | null;
};

export type CustomerInteraction = {
  id: number;
  customer_id?: number | null;
  email?: string | null;
  interaction_type: string;
  channel?: string | null;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
  customers?: {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

const baseColumns = "*";

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

export async function listEventPipeline(limit = 50) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .select(baseColumns)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listEventPipeline error", error);
    throw error;
  }
  return (data ?? []) as PrivateEvent[];
}

const openingReservationColumns =
  "id, user_id, email, preferred_date, party_size, notes, status, created_at";

export async function listOpeningReservations() {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("opening_reservations")
    .select(openingReservationColumns)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listOpeningReservations error", error);
    throw error;
  }
  return (data ?? []) as OpeningReservation[];
}

export async function listRecentCustomerInteractions(limit = 20) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("customer_interactions")
    .select(
      `
        id,
        customer_id,
        email,
        interaction_type,
        channel,
        summary,
        payload,
        created_at,
        customers:customer_id (
          name,
          first_name,
          last_name
        )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listRecentCustomerInteractions error", error);
    throw error;
  }
  return (data ?? []) as CustomerInteraction[];
}
