import { NextResponse } from "next/server";
import { getEventsSupabaseAdmin, type PrivateEvent } from "@/domains/events/lib/queries";

type DateScope = "day" | "week" | "month";
type EventStatusToken =
  | "inquiry"
  | "curation"
  | "awaiting_guest"
  | "contract_out"
  | "confirmed"
  | "tentative"
  | "cancelled";
type EventKindToken = "buyout" | "large_party" | "internal" | "vendor" | "unknown";

const STATUS_BUCKETS: Record<EventStatusToken, string[]> = {
  inquiry: ["inquiry"],
  curation: ["curation", "menu_curation"],
  awaiting_guest: ["awaiting_guest", "proposal_sent"],
  contract_out: ["contract_out", "contract_sent", "contract_signed"],
  confirmed: ["confirmed", "deposit_paid", "completed"],
  tentative: ["tentative"],
  cancelled: ["cancelled", "canceled"],
};

const TYPE_FACETS: Record<EventKindToken, string[]> = {
  buyout: ["buyout"],
  large_party: ["large_party", "large party", "large format"],
  internal: ["internal"],
  vendor: ["vendor", "partner"],
  unknown: [],
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = parseScope(url.searchParams.get("scope"));
  const rangeStartParam = url.searchParams.get("rangeStart");
  const rangeEndParam = url.searchParams.get("rangeEnd");
  const statuses = parseTokens<EventStatusToken>(url.searchParams.get("status"));
  const types = parseTokens<EventKindToken>(url.searchParams.get("type"));
  const limit = parseLimit(url.searchParams.get("limit"));
  const page = parsePage(url.searchParams.get("page"));
  const { rangeStart, rangeEnd } = getRange(scope, rangeStartParam, rangeEndParam);

  const supabase = getEventsSupabaseAdmin();
  let query = supabase
    .from("private_events")
    .select("*")
    .order("preferred_date", { ascending: true });

  if (rangeStart) {
    query = query.gte("preferred_date", rangeStart);
  }
  if (rangeEnd) {
    query = query.lte("preferred_date", rangeEnd);
  }

  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const statusValues = expandStatuses(statuses);
  if (statusValues.length > 0) {
    query = query.in("status", statusValues);
  }

  const typeExpression = buildTypeExpression(types);
  if (typeExpression) {
    query = query.or(typeExpression);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json<{ events: PrivateEvent[] }>({
    events: (data ?? []) as PrivateEvent[],
  });
}

function parseScope(value: string | null): DateScope {
  if (value === "day" || value === "week" || value === "month") {
    return value;
  }
  return "week";
}

function parseTokens<T extends string>(value: string | null): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean) as T[];
}

function parseLimit(value: string | null): number {
  if (!value) return 120;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 120;
  }
  return Math.min(parsed, 500);
}

function parsePage(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function getRange(scope: DateScope, start?: string | null, end?: string | null) {
  if (start && end) {
    return { rangeStart: start, rangeEnd: end };
  }
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rangeEnd = new Date(startOfDay);

  switch (scope) {
    case "day":
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
      break;
    case "week":
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
      break;
    case "month":
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 30);
      break;
    default:
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 7);
  }

  return {
    rangeStart: formatDate(startOfDay),
    rangeEnd: formatDate(rangeEnd),
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function expandStatuses(tokens: EventStatusToken[]) {
  const values = new Set<string>();
  tokens.forEach((token) => {
    STATUS_BUCKETS[token]?.forEach((status) => values.add(status));
  });
  return Array.from(values);
}

function buildTypeExpression(tokens: EventKindToken[]) {
  const clauses: string[] = [];

  tokens.forEach((token) => {
    const facets = TYPE_FACETS[token];
    if (facets.length === 0 && token === "unknown") {
      clauses.push("event_type.is.null");
      return;
    }
    facets.forEach((facet) => {
      clauses.push(`event_type.ilike.%${facet}%`);
    });
  });

  if (clauses.length === 0) {
    return "";
  }

  return clauses.join(",");
}


