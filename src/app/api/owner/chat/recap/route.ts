import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/owner/openai";

const MODEL = process.env.OPENAI_GPT5_MODEL ?? "gpt-4.1-mini";

type RecapRequest = {
  messages: Array<{ author: string; content: string | null }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecapRequest;
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 },
      );
    }

    const transcript = body.messages
      .map(
        (message) =>
          `${message.author ?? "Staff"}: ${message.content ?? "[media]"} `,
      )
      .join("\n");

    const prompt = `Summarize the Snow White Laundry staff chat into at most 5 concise bullets with actionable insights plus a one-line emotional climate reading.\nTranscript:\n${transcript}`;

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You are Cortex, an operations analyst summarizing staff communications.",
        },
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    });

    const output = response.output_text;
    const summary = Array.isArray(output)
      ? output.join("\n").trim()
      : output?.toString();
    return NextResponse.json({ summary: summary ?? "No insight generated." });
  } catch (error) {
    console.error("Recap error", error);
    return NextResponse.json(
      { error: "Unable to generate recap" },
      { status: 500 },
    );
  }
}
