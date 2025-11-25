import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/owner/openai";

const MODEL = process.env.OPENAI_GPT5_MODEL ?? "gpt-4.1-mini";

type EmotionRequest = {
  content: string;
};

const LABELS = ["Urgent", "Positive", "Concern", "Calm", "Neutral"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmotionRequest;
    if (!body?.content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const openai = getOpenAIClient();
    const prompt = `Classify the emotional tone of the following staff message into one of these labels: ${LABELS.join(
      ", ",
    )}. Reply in JSON with keys "label" and "confidence" (0-1).\nMessage: "${body.content}"`;

    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content: "Return valid JSON only.",
        },
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    });

    const output = response.output_text;
    const raw = Array.isArray(output)
      ? output.join("\n").trim()
      : (output ?? "{}");
    let parsed: { label?: string; confidence?: number } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { label: "Neutral", confidence: 0.5 };
    }

    if (!LABELS.includes(parsed.label ?? "")) {
      parsed.label = "Neutral";
    }

    return NextResponse.json({
      label: parsed.label,
      confidence: parsed.confidence ?? 0.5,
    });
  } catch (error) {
    console.error("Emotion error", error);
    return NextResponse.json(
      { error: "Unable to classify message" },
      { status: 500 },
    );
  }
}
