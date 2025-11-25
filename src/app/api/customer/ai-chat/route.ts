import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/owner/openai";

const CHAT_MODEL =
  process.env.OPENAI_CUSTOMER_CHAT_MODEL ??
  process.env.OPENAI_GPT5_MODEL ??
  "gpt-4.1-mini";
const EMBEDDING_MODEL =
  process.env.OPENAI_CUSTOMER_CHAT_EMBED_MODEL ??
  "text-embedding-3-small";
const MAX_CONTEXT = 5;
const MAX_HISTORY = 8;
const SYSTEM_PROMPT = `You are "Cortex", the Snow White Laundry concierge.
- Speak in a warm, cinematic tone that matches our hospitality copy.
- Pull concrete details only from the supplied breadcrumb context. If the context lacks the answer, say so and offer to follow up.
- Keep replies under three short paragraphs or bullet lists.
- Highlight menus, rituals, and preparation notes that feel relevant to guests planning a private experience.`;

type ChatRole = "assistant" | "user";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type BreadcrumbMatch = {
  id: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  content: string;
  similarity: number | null;
};

type ChatResponse = {
  reply: string;
  sources: Array<{
    id: string;
    slug: string | null;
    title: string | null;
    category: string | null;
    similarity: number | null;
  }>;
};

function sanitizeMessages(messages: ChatMessage[] | undefined): ChatMessage[] {
  if (!messages) return [];
  return messages
    .map<ChatMessage>((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: (message.content ?? "").trim(),
    }))
    .filter((message) => Boolean(message.content));
}

function trimContent(value: string | null | undefined, limit = 1200) {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const history = sanitizeMessages(body?.messages).slice(-MAX_HISTORY);

    if (!history.length) {
      return NextResponse.json(
        { error: "messages array with at least one item is required" },
        { status: 400 },
      );
    }

    const latest = history[history.length - 1];
    if (latest.role !== "user") {
      return NextResponse.json(
        { error: "last message must be from user" },
        { status: 400 },
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { "X-Client-Info": "cortexos-customer-concierge" } },
    });

    const openai = getOpenAIClient();

    const embeddingPromise = openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: latest.content,
    });

    const [embeddingRes] = await Promise.all([embeddingPromise]);
    const embeddingVector = embeddingRes.data[0].embedding;

    const { data: matches, error: searchError } = await supabase.rpc(
      "search_breadcrumbs",
      {
        query_embedding: embeddingVector,
        match_threshold: 0.45,
        match_count: MAX_CONTEXT,
      },
    );

    if (searchError) {
      console.error("Customer concierge search error", searchError);
    }

    const breadcrumbs: BreadcrumbMatch[] = (matches ?? []) as BreadcrumbMatch[];

    const contextBlock = breadcrumbs
      .map((match, index) => {
        const title = match.title ?? match.slug ?? `Source ${index + 1}`;
        const category = match.category ?? "general";
        return `Source ${index + 1}: ${title} (${category})
${trimContent(match.content)}`;
      })
      .join("\n\n");

    const conversation = history
      .map((message) =>
        `${message.role === "assistant" ? "Concierge" : "Guest"}: ${
          message.content
        }`,
      )
      .join("\n");

    const response = await openai.responses.create({
      model: CHAT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `${SYSTEM_PROMPT}

Context from the breadcrumb atlas:
${contextBlock || "No breadcrumb context matched. Give a graceful, honest fallback without inventing specifics."}`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${conversation}

Respond as Cortex to the latest guest entry while honoring the context.`,
            },
          ],
        },
      ],
    });

    const output = response.output_text;
    const reply =
      (Array.isArray(output) ? output.join("\n").trim() : output?.trim()) ??
      "I’m still collecting the right notes—please try asking again.";

    const payload: ChatResponse = {
      reply,
      sources: breadcrumbs.map((match) => ({
        id: match.id,
        slug: match.slug,
        title: match.title,
        category: match.category,
        similarity: match.similarity,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Customer concierge chat error", error);
    return NextResponse.json(
      { error: "Unable to reach concierge right now." },
      { status: 500 },
    );
  }
}


