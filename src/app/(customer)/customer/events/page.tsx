import { revalidatePath } from "next/cache";
import {
  CustomerEventWizard,
  type WizardActionState,
} from "@/domains/customer/components/CustomerEventWizard";
import { ReserveOpeningWeekForm } from "@/domains/customer/components/ReserveOpeningWeekForm";
import { CustomerAiHandbook } from "@/domains/customer/components/CustomerAiHandbook";
import type { ReserveFormState } from "@/domains/customer/types";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import type { PrivateEvent } from "@/domains/events/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CustomerEventsPage() {
  // No authentication required - customers can browse freely
  const events: PrivateEvent[] = [];

  const initialActionState: WizardActionState = { status: "idle" };
  const reserveInitialState: ReserveFormState = { status: "idle" };

  async function handleCreate(
    _prevState: WizardActionState,
    formData: FormData,
  ): Promise<WizardActionState> {
    "use server";
    try {
      const guestEmail = formData.get("guest_email")?.toString()?.trim();
      const guestName = formData.get("guest_name")?.toString()?.trim();
      
      if (!guestEmail) {
        return {
          status: "error",
          message: "Email address is required.",
        };
      }
      
      if (!guestName) {
        return {
          status: "error",
          message: "Host name is required.",
        };
      }
      
      const supabase = getSupabaseAdmin();
      const payload = {
        user_id: null,
        guest_name: guestName,
        organization: null,
        guest_email: guestEmail,
        event_type:
          formData.get("event_type")?.toString() ?? "Private Experience",
        party_size: Number(formData.get("party_size")) || null,
        preferred_date: formData.get("preferred_date")?.toString() ?? null,
        start_time: formData.get("start_time")?.toString() ?? null,
        end_time: formData.get("end_time")?.toString() ?? null,
        menu_style: formData.get("menu_style")?.toString() ?? null,
        budget_range: formData.get("budget_range")?.toString() ?? null,
        special_requests: composeSpecialRequests(formData),
        status: "inquiry",
      };

      const { error } = await supabase
        .from("private_events")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      await notifyEventTeam(guestEmail, payload);
      revalidatePath("/customer/events");
      return {
        status: "success",
        message: "Your request is in the queue. We’ll email you shortly.",
      };
    } catch (error) {
      console.error("Event submission failed", error);
      return {
        status: "error",
        message:
          (error as Error).message ||
          "Unable to submit right now. Please try again.",
      };
    }
  }

  return (
    <>
      <header className="mb-16 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.5em] text-cyan-400/60">
          Private Events
        </p>
        <h1 className="font-['Eurostile',_sans-serif] text-4xl font-light tracking-wide text-white sm:text-5xl">
          Your Event Plans
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-white/60">
          {events.length > 0
            ? "Track proposals, menus, deposits, and service notes in one place."
            : "Request received. As soon as we confirm a date, you’ll see it here."}
        </p>
      </header>

      <div className="space-y-12">
        <section id="plan-new" className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm">
          <h2 className="text-2xl font-light mb-4 text-white/90">Plan a New Experience</h2>
          <p className="mb-6 text-white/60 leading-relaxed">
          Walk through the details and we’ll craft a proposal tailored to your night.
        </p>
        <CustomerEventWizard
          action={handleCreate}
          defaultName=""
          initialState={initialActionState}
        />
      </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm">
          <h2 className="text-2xl font-light mb-4 text-white/90">Reserve Opening Week</h2>
          <p className="mb-6 text-white/60 leading-relaxed">
          We’ll email you before reservations open to the public. Choose a launch
          night, dial in your party size, and add any celebration notes.
        </p>
        <ReserveOpeningWeekForm
          action={createEarlyReservation}
          initialState={reserveInitialState}
        />
      </section>

        {events.length > 0 && <CustomerAiHandbook events={events} guestEmail="" />}

        <section className="space-y-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12 backdrop-blur-sm transition-all hover:border-cyan-400/30 hover:bg-white/[0.05]"
            >
            <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
              <h2 className="text-2xl font-light">{event.event_type}</h2>
              <span className="text-sm uppercase tracking-[0.4em] text-white/50">
                {event.status.replace(/_/g, " ")}
              </span>
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Date
                </dt>
                <dd className="text-lg">{formatDate(event.preferred_date)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Party Size
                </dt>
                <dd className="text-lg">{event.party_size ?? "TBD"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Menu
                </dt>
                <dd className="text-lg">{event.menu_style ?? "Chef’s call"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Budget
                </dt>
                <dd className="text-lg">
                  {event.budget_range ?? "Custom proposal"}
                </dd>
              </div>
            </dl>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">
                  Proposal
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {event.proposal_pdf_url ? (
                    <a
                      href={event.proposal_pdf_url}
                      className="text-cyan-400/70 hover:text-cyan-400 transition-colors underline-offset-2 hover:underline"
                    >
                      Download latest proposal
                    </a>
                  ) : (
                    "We’re drafting your menu and ambiance story now."
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">
                  Deposit
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {event.deposit_paid
                    ? "Deposit received. The night is yours."
                    : "We’ll send a Stripe link as soon as the contract is ready."}
                </p>
              </div>
            </div>
            {event.special_requests && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">
                  Vision Notes
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {event.special_requests}
                </p>
              </div>
            )}
          </article>
        ))}

        {events.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/70">
            <p>
              Submit a request using the form above to get started. We'll email you with a proposal once we review your details.
            </p>
            <p className="mt-2 text-sm">
              Submit the form above or reach out to tom@snowwhitelaundry.co and
              we’ll connect your profile.
            </p>
          </div>
        )}
      </section>
      </div>
    </>
  );
}

function composeSpecialRequests(formData: FormData) {
  const base = formData.get("special_requests")?.toString()?.trim();
  const layout = formData.get("space_layout")?.toString()?.trim();
  const dietary = formData.get("dietary_notes")?.toString()?.trim();
  const sections = [
    base,
    layout ? `Layout preference: ${layout}` : "",
    dietary ? `Dietary notes: ${dietary}` : "",
  ].filter(Boolean);
  return sections.length ? sections.join("\n\n") : null;
}


async function notifyEventTeam(
  guestEmail: string,
  payload: Record<string, unknown>,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY not configured. Skipping event email notification.",
    );
    return;
  }
  const detailRows = [
    { label: "Guest", value: (payload.guest_name ?? "Guest") as string },
    { label: "Email", value: guestEmail },
    { label: "Event Type", value: (payload.event_type ?? "Private Experience") as string },
    { label: "Preferred Date", value: (payload.preferred_date ?? "TBD") as string },
    { label: "Party Size", value: String(payload.party_size ?? "TBD") },
    { label: "Menu Style", value: (payload.menu_style ?? "Chef's choice") as string },
    { label: "Budget Range", value: (payload.budget_range ?? "Custom") as string },
  ];
  const plainText = detailRows.map((row) => `${row.label}: ${row.value}`).join("\n");
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; background-color: #070910; color: #ECEFF6;">
      <h1 style="font-weight: 300; margin-bottom: 8px;">New Private Event Request</h1>
      <p style="margin: 0 0 20px; color: #9CA3C1;">Submitted via customer portal</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        ${detailRows
          .map(
            (row) => `
              <tr>
                <td style="padding: 10px 6px; border-bottom: 1px solid #1b2033; text-transform: uppercase; font-size: 11px; letter-spacing: 0.2em; color: #7C86AF;">
                  ${row.label}
                </td>
                <td style="padding: 10px 6px; border-bottom: 1px solid #1b2033; font-size: 14px; color: #F7F9FF;">
                  ${row.value}
                </td>
              </tr>`,
          )
          .join("")}
      </table>
      ${
        payload.special_requests
          ? `<div style="margin-top: 12px;">
              <h3 style="margin: 0 0 8px; font-weight: 400; color: #AEB6D9;">Guest Notes</h3>
              <p style="white-space: pre-line; margin: 0; color: #ECEFF6;">${payload.special_requests}</p>
            </div>`
          : ""
      }
      <p style="margin-top: 24px; font-size: 13px; color: #9CA3C1;">
        Reply to this email to reach the guest directly.
      </p>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Snow White Laundry <noreply@snowwhitelaundry.co>",
        to: ["tom@snowwhitelaundry.co", "ken@snowwhitelaundry.co"],
        subject: "New private event inquiry submitted",
        text: plainText,
        html,
      }),
    });
  } catch (error) {
    console.error("Failed to notify event team", error);
  }
}

async function createEarlyReservation(
  _prev: ReserveFormState,
  formData: FormData,
): Promise<ReserveFormState> {
  "use server";
  try {
    const email = formData.get("email")?.toString()?.trim();
    const guestName = formData.get("guest_name")?.toString()?.trim();
    
    if (!email) {
      return {
        status: "error",
        message: "Email address is required.",
      };
    }
    
    const supabase = getSupabaseAdmin();
    const payload = {
      email: email,
      guest_name: guestName ?? null,
      preferred_date: formData.get("opening_date")?.toString() ?? null,
      party_size: Number(formData.get("opening_party")) || null,
      notes: formData.get("opening_notes")?.toString() ?? null,
    };
    const { error } = await supabase
      .from("opening_reservations")
      .insert(payload);
    if (error) throw error;
    revalidatePath("/customer/events");
    return {
      status: "success",
      message: "You’re on the opening list. We’ll confirm once tables open.",
    };
  } catch (error) {
    console.error("Early reservation failed", error);
    return {
      status: "error",
      message:
        (error as Error).message ?? "Unable to save request. Please try again.",
    };
  }
}
