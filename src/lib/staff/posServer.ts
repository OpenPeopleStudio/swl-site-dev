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

// Session type for API routes
type SessionInfo = {
  email: string;
  role: string;
};

/**
 * Ensure a ticket (check) exists for the given table slugs.
 * Returns existing open ticket or creates a new one.
 */
export async function ensureTicketForTables(
  tableSlugs: string[],
  session: SessionInfo,
) {
  const supabase = getSupabaseAdmin();

  // Look for an existing open check for these tables
  const { data: existing, error: lookupError } = await supabase
    .from("pos_checks")
    .select("*")
    .contains("table_slugs", tableSlugs)
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("Ticket lookup failed", lookupError);
    throw new PosHttpError(500, "Unable to look up existing ticket.");
  }

  if (existing) {
    return existing;
  }

  // Create new ticket
  const { data: newTicket, error: createError } = await supabase
    .from("pos_checks")
    .insert({
      table_slugs: tableSlugs,
      status: "open",
      opened_by: session.email,
      subtotal: 0,
      tax: 0,
      total: 0,
    })
    .select()
    .single();

  if (createError) {
    console.error("Ticket creation failed", createError);
    throw new PosHttpError(500, "Unable to create ticket.");
  }

  return newTicket;
}

/**
 * Update ticket fields (status, guest names, notes, etc.)
 */
export async function updateTicket(
  ticketId: string,
  updates: {
    guestNames?: string[];
    currentCourse?: string | null;
    receiptNote?: string | null;
    status?: string;
    expectedRevision?: number;
  },
  session: SessionInfo,
) {
  const supabase = getSupabaseAdmin();

  const updatePayload: Record<string, unknown> = {};
  if (updates.guestNames !== undefined) updatePayload.guest_names = updates.guestNames;
  if (updates.currentCourse !== undefined) updatePayload.current_course = updates.currentCourse;
  if (updates.receiptNote !== undefined) updatePayload.receipt_note = updates.receiptNote;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  updatePayload.updated_by = session.email;

  let query = supabase
    .from("pos_checks")
    .update(updatePayload)
    .eq("id", ticketId);

  // Optimistic locking if revision provided
  if (updates.expectedRevision !== undefined) {
    query = query.eq("revision", updates.expectedRevision);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error("Ticket update failed", error);
    throw new PosHttpError(409, "Ticket update conflict or not found.");
  }

  return data;
}

/**
 * Add a line item to a ticket
 */
export async function addTicketLine(
  ticketId: string,
  lineData: {
    name: string;
    seat: string;
    price: number;
    qty?: number;
    menuItemId?: string | null;
    modifierKey?: string | null;
    modifiers?: string[];
  },
  _session: SessionInfo,
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("pos_check_lines")
    .insert({
      check_id: ticketId,
      name: lineData.name,
      seat: lineData.seat,
      price: lineData.price,
      qty: lineData.qty ?? 1,
      menu_item_id: lineData.menuItemId ?? null,
      modifier_key: lineData.modifierKey ?? null,
      modifiers: lineData.modifiers ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("Line insert failed", error);
    throw new PosHttpError(500, "Unable to add ticket line.");
  }

  // Recalculate totals
  await recalcCheckTotals(supabase, ticketId);

  return data;
}

/**
 * Update an existing ticket line
 */
export async function updateTicketLine(
  ticketId: string,
  updates: {
    lineId: string;
    qty?: number;
    comp?: boolean;
    splitMode?: "none" | "even" | "custom";
    transferTo?: string | null;
    customSplitNote?: string | null;
    modifiers?: string[];
  },
  _session: SessionInfo,
) {
  const supabase = getSupabaseAdmin();

  const updatePayload: Record<string, unknown> = {};
  if (updates.qty !== undefined) updatePayload.qty = updates.qty;
  if (updates.comp !== undefined) updatePayload.comp = updates.comp;
  if (updates.splitMode !== undefined) updatePayload.split_mode = updates.splitMode;
  if (updates.transferTo !== undefined) updatePayload.transfer_to = updates.transferTo;
  if (updates.customSplitNote !== undefined) updatePayload.custom_split_note = updates.customSplitNote;
  if (updates.modifiers !== undefined) updatePayload.modifiers = updates.modifiers;

  const { data, error } = await supabase
    .from("pos_check_lines")
    .update(updatePayload)
    .eq("id", updates.lineId)
    .eq("check_id", ticketId)
    .select()
    .single();

  if (error) {
    console.error("Line update failed", error);
    throw new PosHttpError(500, "Unable to update ticket line.");
  }

  // Recalculate totals
  await recalcCheckTotals(supabase, ticketId);

  return data;
}

/**
 * Clear all lines from a ticket
 */
export async function clearTicketLines(
  ticketId: string,
  _session: SessionInfo,
) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("pos_check_lines")
    .delete()
    .eq("check_id", ticketId);

  if (error) {
    console.error("Clear lines failed", error);
    throw new PosHttpError(500, "Unable to clear ticket lines.");
  }

  // Reset totals
  await supabase
    .from("pos_checks")
    .update({ subtotal: 0, tax: 0, total: 0, comp_total: 0 })
    .eq("id", ticketId);
}

