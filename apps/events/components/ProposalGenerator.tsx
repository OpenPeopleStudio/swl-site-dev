import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import type { PrivateEvent } from "@/apps/events/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { renderProposalPdf } from "@/apps/events/lib/pdf";

const MODEL = process.env.OPENAI_GPT5_MODEL ?? "gpt-4o-mini";
const DOCS_BUCKET = process.env.NEXT_PUBLIC_EVENT_DOCS_BUCKET ?? "event-docs";

type ProposalGeneratorProps = {
  event: PrivateEvent;
  user: { full_name?: string | null } | null;
  path?: string;
};

function buildPrompt(event: PrivateEvent) {
  return `You are the soul of Snow White Laundry — a fine dining sanctuary.
Write a 1-page event proposal for:
- Guest: ${event.guest_name}${event.organization ? ` (${event.organization})` : ""}
- Type: ${event.event_type ?? "private experience"}
- Size: ${event.party_size ?? "N/A"} guests
- Date: ${event.preferred_date ?? "TBD"} (${event.start_time ?? "evening"}–${event.end_time ?? "night"})
- Menu: ${event.menu_style ?? "Chef's tasting"}
- Budget: ${event.budget_range ?? "confidential"}
- Vision: "${event.special_requests ?? "No special requests provided."}"

Structure:
1. Opening — a poetic welcome
2. The Space — describe the sanctuary
3. The Menu — tasting journey
4. The Flow — timing, service
5. Investment — transparent pricing
6. Next Step — gentle call to action

Tone: warm, precise, slightly mystical. No corporate jargon.
Use "we" and "you". End with "In service,".`;
}

async function fetchEvent(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("private_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Event not found");
  return data as PrivateEvent;
}

export async function ProposalGenerator({
  event,
  user,
  path = `/events/proposal/${event.id}`,
}: ProposalGeneratorProps) {
  async function generateProposal(formData: FormData) {
    "use server";
    const eventId = formData.get("eventId");
    if (typeof eventId !== "string") return;
    const latest = await fetchEvent(eventId);
    const prompt = buildPrompt(latest);
    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You write bespoke, poetic proposals for Snow White Laundry private events.",
        },
        { role: "user", content: [{ type: "input_text", text: prompt }] },
      ],
    });
    const output = response.output_text;
    const proposalText = Array.isArray(output)
      ? output.join("\n").trim()
      : output?.toString()?.trim();
    if (!proposalText) {
      throw new Error("Proposal text not generated");
    }
    const supabase = getSupabaseAdmin();
    await supabase
      .from("private_events")
      .update({
        proposal_text: proposalText,
        status:
          latest.status === "inquiry" ? "proposal_drafting" : latest.status,
      })
      .eq("id", eventId);
    revalidatePath(path);
  }

  async function sendProposal(formData: FormData) {
    "use server";
    const eventId = formData.get("eventId");
    if (typeof eventId !== "string") return;
    const latest = await fetchEvent(eventId);
    const text =
      latest.proposal_text ??
      "Snow White Laundry is honored to host your event. Proposal text pending.";
    const pdfBytes = await renderProposalPdf(text);
    const fileName = `proposals/${eventId}-${Date.now()}.pdf`;
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(fileName, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(DOCS_BUCKET)
      .getPublicUrl(fileName);
    const sender =
      user?.full_name ??
      latest.notes_internal ??
      "Snow White Laundry Cortex Staff";
    await supabase
      .from("private_events")
      .update({
        status: "proposal_sent",
        proposal_pdf_url: publicUrlData.publicUrl,
        notes_internal: `${sender} sent proposal on ${new Date().toLocaleDateString()}`,
      })
      .eq("id", eventId);
    revalidatePath(path);
  }

  const proposalBody =
    event.proposal_text ??
    "No proposal has been generated yet. Use the action below to craft the first draft.";

  return (
    <section className="glass-morphic rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Ritual Draft
          </p>
          <h2 className="text-2xl font-light text-white">AI Proposal</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={generateProposal}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/60"
            >
              {event.proposal_text ? "Regenerate" : "Generate Draft"}
            </button>
          </form>
          <form action={sendProposal}>
            <input type="hidden" name="eventId" value={event.id} />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-purple-900 to-indigo-900 px-4 py-2 text-sm text-white shadow-lg transition hover:from-purple-800 hover:to-indigo-800"
            >
              Send to Guest
            </button>
          </form>
          {event.proposal_pdf_url && (
            <a
              href={event.proposal_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/60"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
      <article className="prose prose-invert max-w-none whitespace-pre-wrap pt-4 text-sm leading-relaxed text-white/80">
        {proposalBody}
      </article>
    </section>
  );
}
