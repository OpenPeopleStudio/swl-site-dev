"use server";

import { ensureOwner } from "@/apps/owner-console/lib/ensureOwner";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { OwnerConsoleAdvancedModules } from "@/apps/owner-console/components/owner/OwnerConsoleAdvancedModules";
import { StarField } from "@/components/design/StarField";

function formatDate(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function OwnerConsoleAdvancedPage() {
  await ensureOwner();
  const admin = getSupabaseAdmin();

  const [staffResponse, eventResponse, vendorResponse, referralResponse] = await Promise.all([
    admin.from("staff").select("id, full_name, role, email, last_synced").limit(4),
    admin
      .from("private_events")
      .select("id, guest_name, status, preferred_date, menu_style, updated_at, event_type")
      .order("preferred_date", { ascending: true })
      .limit(6),
    admin
      .from("vendor_profiles")
      .select("id, name, punctuality_rating, cost_drift_percent, weekend_reliability, notes")
      .limit(4),
    admin
      .from("opening_reservations")
      .select("id, email, preferred_date, status, notes")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const staffRows = staffResponse.data ?? [];
  const privateEvents = eventResponse.data ?? [];
  const vendorRows = vendorResponse.data ?? [];
  const referralRows = referralResponse.data ?? [];

  const energyIndex = Math.max(
    45,
    Math.min(
      100,
      60 +
        (privateEvents.length || 0) * 3 -
        Math.max(0, 4 - staffRows.length) * 2,
    ),
  );

  const recognitionQueue = staffRows.map((staff, index) => {
    const linkedEvent = privateEvents[index];
    return {
      id: staff.id ?? `staff-${index}`,
      staffer: staff.full_name ?? staff.email ?? "Team Member",
      role: staff.role ?? "Staff",
      impact: linkedEvent
        ? `Shepherded ${linkedEvent.event_type ?? "experience"} for ${linkedEvent.guest_name ?? "guest"}.`
        : "Maintained service cadence.",
      metricDelta: linkedEvent?.status ? `Status: ${linkedEvent.status}` : undefined,
    };
  });

  const rituals = [
    {
      id: "lineup",
      title: "Lineup Reflection",
      cadence: "Nightly · 4:15pm",
      status: "scheduled" as const,
      note: "Menu Builder v2 tasting tonight.",
    },
    {
      id: "family-meal",
      title: "Family Meal Highlight",
      cadence: "Thu · Chef Emma",
      status: "in-progress" as const,
      note: "Showcase winter citrus ferment",
    },
    {
      id: "owner-circle",
      title: "Owner Circle",
      cadence: "Sun · 10am",
      status: "done" as const,
      note: "Last held 3 days ago",
    },
  ];

  const guestThreads = privateEvents.map((event) => ({
    id: event.id,
    guestName: event.guest_name ?? "Guest",
    relationshipStage:
      event.status === "proposal_sent"
        ? ("vip" as const)
        : event.status === "inquiry"
          ? ("emerging" as const)
          : ("watch" as const),
    lastTouch: formatDate(event.updated_at),
    upcomingExperience: event.preferred_date
      ? `${event.event_type ?? "Experience"} · ${formatDate(event.preferred_date)}`
      : undefined,
    memoryHook: event.menu_style ?? undefined,
    sentiment: event.status ?? undefined,
  }));

  const referrals = referralRows.map((row) => ({
    id: row.id,
    source: row.notes ? "Guest Referral" : "Site Waitlist",
    guest: row.email ?? "Guest",
    status: row.status ?? "pending",
  }));

  const timeSlices = [
    {
      id: "24h",
      label: "Next 24h",
      window: "Tonight + Tomorrow",
      focusAreas: [
        `${privateEvents.slice(0, 1).length} private experience ready check`,
        "InventoryOS critical list review",
      ],
      riskFlag: energyIndex < 55 ? "Energy trending low" : undefined,
      cta: "Confirm menu block + pre-shift notes",
    },
    {
      id: "7d",
      label: "Next 7d",
      window: "Week Arc",
      focusAreas: [
        `${privateEvents.length} experiences in queue`,
        `${vendorRows.length} vendor follow-ups`,
      ],
      dependences: ["Menu Builder", "Vendor Intelligence"],
      cta: "Lock tasting menu + confirm vendor substitutions",
    },
    {
      id: "90d",
      label: "90d View",
      window: "Seasonal",
      focusAreas: [
        "Winter residency narrative",
        "Capital plan for dining room refresh",
      ],
      dependences: ["Architect", "Finance"],
      cta: "Schedule owner retreat checkpoint",
    },
  ];

  const reflectionPrompts = [
    {
      id: "culture",
      context: "Culture Signal",
      question: "Where did we see hospitality transcend service this week?",
      responses: recognitionQueue.slice(0, 2).map((rec) => rec.impact),
    },
    {
      id: "clarity",
      context: "Clarity",
      question: "What decision needs our voice before next Sunday?",
      responses: ["InventoryOS auto-replenish rollout", "Guest memory sync across channels"],
    },
  ];

  const gratitudeStream = recognitionQueue.map(
    (rec) => `${rec.staffer}: ${rec.impact}`,
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white" data-shell="owner">
      <StarField className="-z-10 opacity-70 pointer-events-none" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-5 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <p className="text-[0.65rem] uppercase tracking-[0.45em] text-white/50">Owner Console</p>
          <div className="mt-3 space-y-2">
            <h1 className="text-3xl font-light tracking-[0.25em]">
              Advanced Layer · Tom & Ken
            </h1>
            <p className="text-sm text-white/60">
              Calm, high-signal intelligence for motivation, guests, horizon, and reflection.
            </p>
          </div>
        </header>
        <OwnerConsoleAdvancedModules
          staffMotivation={{
            energyIndex,
            recognitionQueue,
            rituals,
            sentimentSnippet:
              privateEvents.length > 0
                ? `Current guest load: ${privateEvents.length} in pipeline.`
                : "Awaiting next set of experiences.",
          }}
          guestIntelligence={{
            headline: "Guest Relationship Intelligence",
            guestThreads,
            referrals,
          }}
          timeHorizon={{
            slices: timeSlices,
          }}
          reflection={{
            prompts: reflectionPrompts,
            gratitudeStream,
            nextCheckIn: "Sunday · 10:00",
          }}
        />
      </div>
    </main>
  );
}
