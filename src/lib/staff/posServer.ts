"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { getSessionFromCookies } from "@/lib/shared/session";

const ALLOWED_ROLES = new Set(["staff", "manager", "owner"]);
const DEFAULT_TAX_RATE = Number(process.env.NEXT_PUBLIC_POS_TAX_RATE ?? "0.13");
const REQUIRE_DEVICE =
  process.env.NEXT_PUBLIC_REQUIRE_POS_DEVICE === "true" ||
  process.env.REQUIRE_POS_DEVICE === "true";

export class PosHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type StaffContext = {
  supabase: SupabaseClient;
  staffId: string;
  email: string;
  role: string;
};

export async function requirePosStaff(): Promise<StaffContext> {
  const session = await getSessionFromCookies();
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    throw new PosHttpError(401, "POS access requires a staff session.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staff")
    .select("id, role, email")
    .eq("email", session.email)
    .maybeSingle();

  if (error) {
    console.error("POS staff lookup failed", error);
    throw new PosHttpError(500, "Unable to verify staff record.");
  }

  if (!data?.id) {
    throw new PosHttpError(403, "Staff profile is missing in Supabase.");
  }

  return {
    supabase,
    staffId: data.id as string,
    email: session.email,
    role: data.role ?? session.role,
  };
}

export async function ensureTrustedDevice(
  supabase: SupabaseClient,
  deviceId: string | null,
): Promise<string | null> {
  if (!deviceId) {
    if (REQUIRE_DEVICE) {
      throw new PosHttpError(403, "Trusted device ID required.");
    }
    return null;
  }

  const { data, error } = await supabase
    .from("device_connections")
    .select("id, status, trust_level")
    .eq("id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("Device lookup failed", error);
    throw new PosHttpError(500, "Unable to verify POS device.");
  }

  if (!data || data.status !== "active" || !["trusted", "active"].includes(data.trust_level ?? "")) {
    throw new PosHttpError(403, "Device is not trusted for POS actions.");
  }

  return data.id as string;
}

export async function logPosEvent(
  supabase: SupabaseClient,
  staffId: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const entry = {
    action,
    performed_by: staffId,
    payload,
  };
  const { error } = await supabase.from("system_logs").insert(entry);
  if (error) {
    console.warn("Failed to log POS event", action, error);
  }
}

export async function recalcCheckTotals(
  supabase: SupabaseClient,
  checkId: string,
  taxRate = DEFAULT_TAX_RATE,
) {
  const { data: lines, error } = await supabase
    .from("pos_check_lines")
    .select("qty, price, comp")
    .eq("check_id", checkId);

  if (error) {
    console.error("Check line fetch failed", error);
    throw new PosHttpError(500, "Unable to recalculate check totals.");
  }

  const subtotal = (lines ?? []).reduce((sum, line) => {
    const price = Number(line.price) || 0;
    const qty = Number(line.qty) || 0;
    return sum + price * qty;
  }, 0);

  const compTotal = (lines ?? []).reduce((sum, line) => {
    if (!line.comp) return sum;
    const price = Number(line.price) || 0;
    const qty = Number(line.qty) || 0;
    return sum + price * qty;
  }, 0);

  const tax = Number((subtotal - compTotal) * taxRate);
  const total = subtotal - compTotal + tax;

  const { error: updateError } = await supabase
    .from("pos_checks")
    .update({
      subtotal,
      tax,
      total,
      comp_total: compTotal,
    })
    .eq("id", checkId);

  if (updateError) {
    console.error("Check total update failed", updateError);
    throw new PosHttpError(500, "Unable to persist check totals.");
  }
}

