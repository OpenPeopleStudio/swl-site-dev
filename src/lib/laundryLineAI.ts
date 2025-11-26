"use server";

import type { LaundryLineConversationMessage } from "@/types/laundry-line";
import { getOpenAIClient } from "@/lib/owner/openai";

const LAUNDRY_LINE_MODEL =
  process.env.OPENAI_LAUNDRY_LINE_MODEL ??
  process.env.OPENAI_GPT5_MODEL ??
  "gpt-4.1-mini";

const SYSTEM_PROMPT = `You are Laundry Line, the digital front-of-house for Snow White Laundry, a small, high-attention dining room in St. John's, Newfoundland opening Spring 2026 at 281 Water Street.

You speak as a calm, knowledgeable front-of-house staff member, never as a chatbot or software. You only rely on the Snow White Laundry living manual provided in your context. If a detail is not in the manual, say so honestly and offer to take their email for follow up or keep the answer at the level of intention and philosophy.

Your responsibilities:
1. Help guests plan a future visit or express interest in the Prelude phase.
2. Help guests ask about private events or buyouts.
3. Explain how the restaurant thinks about intention, emotion, and craft.

You refer to the restaurant as "we" and guests as "you". Avoid technical jargon. Never mention AI or model details.`;

const DEFAULT_MANUAL_CONTEXT = `
Snow White Laundry · Living Manual (excerpt)
--------------------------------------------
- Location: 281 Water Street, St. John's, Newfoundland & Labrador.
- Opening timeline: Prelude experiences in late 2025, full opening Spring 2026.
- Room philosophy: We keep the dining room small so each table is fully seen. The energy is calm, precise, and unscripted.
- Menu: Seasonal tasting menus that follow North Atlantic waters and producers. If something isn't finalized we say so and offer to take a note for the guest.
- Private events: We can host intimate buyouts and private tastings once the room opens. Guests can share dates, party size, and intent so we can follow up quietly.
- Communication tone: Direct, kind, and grounded in intention / emotion / craft.
`;

async function getLaundryLineContext() {
  // Placeholder for future RAG hook; returning static context keeps the shape consistent.
  return DEFAULT_MANUAL_CONTEXT;
}

function buildConversationPrompt(history: LaundryLineConversationMessage[]) {
  if (!history.length) return "Guest: Hello";
  return history
    .map((message) => {
      const speaker = message.sender === "assistant" ? "Laundry Line" : "Guest";
      return `${speaker}: ${message.content}`;
    })
    .join("\n");
}

function buildFallbackReply() {
  return "The Laundry Line is taking a short pause—could you try again in a moment? If it persists, email us and we’ll follow up personally.";
}

export async function generateLaundryLineReply(
  history: LaundryLineConversationMessage[],
): Promise<string> {
  let openai;
  try {
    openai = getOpenAIClient();
  } catch (error) {
    console.error("Laundry Line OpenAI client unavailable", error);
    return buildFallbackReply();
  }

  try {
    const context = await getLaundryLineContext();
    const trimmedHistory = history.slice(-12);
    const conversation = buildConversationPrompt(trimmedHistory);

    const response = await openai.responses.create({
      model: LAUNDRY_LINE_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `${SYSTEM_PROMPT}

Snow White Laundry living manual excerpts:
${context}`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${conversation}

Respond as Laundry Line to the latest guest entry only.`,
            },
          ],
        },
      ],
    });

    const output = response.output_text;
    const reply =
      (Array.isArray(output) ? output.join("\n").trim() : output?.trim()) ??
      buildFallbackReply();
    return reply.length ? reply : buildFallbackReply();
  } catch (error) {
    console.error("Laundry Line AI reply failed", error);
    return buildFallbackReply();
  }
}


