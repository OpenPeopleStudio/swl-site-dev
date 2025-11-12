import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CustomerEventWizard } from "@/apps/customer/components/CustomerEventWizard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listEventsForGuest } from "@/apps/events/lib/queries";
import { getSessionFromCookies } from "@/lib/session";

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
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/gate?next=/customer/events");
  }

  const events = await listEventsForGuest(session.email);

  async function handleCreate(formData: FormData) {
    "use server";
    const currentSession = await getSessionFromCookies();
    if (!currentSession) {
      redirect("/gate?next=/customer/events");
    }
    const supabase = getSupabaseAdmin();
    const payload = {
      guest_name: formData.get("guest_name")?.toString() ?? "Guest",
      organization: null,
      guest_email: currentSession.email,
      event_type: formData.get("event_type")?.toString() ?? "Private Experience",
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

    revalidatePath("/customer/events");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Snow White Laundry
        </p>
        <h1 className="text-3xl font-light">Your Event Plans</h1>
        <p className="text-sm text-white/60">
          {events.length > 0
            ? "Track proposals, menus, deposits, and service notes in one place."
            : "Request received. As soon as we confirm a date, you’ll see it here."}
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <h2 className="text-2xl font-light text-white">Plan a New Experience</h2>
        <p className="mt-2 text-sm text-white/60">
          Walk through the details and we’ll craft a proposal tailored to your night.
        </p>
        <CustomerEventWizard
          action={handleCreate}
          defaultName={session.email.split("@")[0]}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <h2 className="text-2xl font-light">Reserve Opening Week</h2>
        <p className="mt-2 text-sm text-white/70">
          We’ll email you first when the dining room opens to the public. Tell
          us your preferred evening and party size and we’ll confirm a table as
          soon as reservations go live.
        </p>
        <EarlyReservationForm email={session.email} />
      </section>

      <section className="space-y-4">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
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
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-sm uppercase tracking-[0.3em] text-white/50">
                  Proposal
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  {event.proposal_pdf_url ? (
                    <a
                      href={event.proposal_pdf_url}
                      className="text-white underline-offset-2 hover:underline"
                    >
                      Download latest proposal
                    </a>
                  ) : (
                    "We’re drafting your menu and ambiance story now."
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
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
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
            <p>
              No events are linked to <strong>{session.email}</strong> yet.
            </p>
            <p className="mt-2 text-sm">
              Submit the form above or reach out to tom@snowwhitelaundry.co and
              we’ll connect your profile.
            </p>
          </div>
        )}
      </section>
    </div>
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

async function createEarlyReservation(formData: FormData, email: string) {
  "use server";
  const supabase = getSupabaseAdmin();
  const payload = {
    email,
    preferred_date: formData.get("opening_date")?.toString() ?? null,
    party_size: Number(formData.get("opening_party")) || null,
    notes: formData.get("opening_notes")?.toString() ?? null,
  };
  const { error } = await supabase.from("opening_reservations").insert(payload);
  if (error) throw error;
}

function EarlyReservationForm({ email }: { email: string }) {
  return (
    <form
      action={async (formData) => {
        "use server";
        await createEarlyReservation(formData, email);
        revalidatePath("/customer/events");
      }}
      className="mt-6 grid gap-4 md:grid-cols-2"
    >
      <label className="text-sm text-white/70">
        Preferred Date
        <input
          type="date"
          name="opening_date"
          min={new Date().toISOString().split("T")[0]}
          max="2026-04-24"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
        />
      </label>
      <label className="text-sm text-white/70">
        Party Size
        <input
          type="number"
          min={2}
          name="opening_party"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
        />
      </label>
      <label className="text-sm text-white/70 md:col-span-2">
        Notes
        <textarea
          name="opening_notes"
          rows={3}
          placeholder="Any dietary notes or timing preferences?"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#2A63FF]"
        />
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm uppercase tracking-[0.3em] text-white transition hover:border-white/60"
        >
          Request Early Seating
        </button>
      </div>
    </form>
  );
}
