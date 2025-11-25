import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getOpenAIClient } from "@/lib/owner/openai";

const MODEL = process.env.OPENAI_GPT5_MODEL ?? "gpt-4.1-mini";

type GenerateRequest = {
  prompt: string;
  category: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;

    if (!body?.prompt?.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    if (!body?.category?.trim()) {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 },
      );
    }

    // Read the ENGINE_PROMPT
    const enginePath = path.join(
      process.cwd(),
      "swl-overshare/overshare/ENGINE_PROMPT.md",
    );
    const engine = await fs.readFile(enginePath, "utf-8");

    // Read the template for structure reference
    const templatePath = path.join(
      process.cwd(),
      "swl-overshare/breadcrumbs/_TEMPLATE.md",
    );
    const template = await fs.readFile(templatePath, "utf-8");

    // Build the full prompt
    const timestamp = new Date().toISOString().split("T")[0];
    const fullPrompt = `You are the Snow White Laundry Overshare Engine.

Follow the ENGINE_PROMPT below to guide your generation:

${engine}

---

Use this template structure for the breadcrumb:

${template}

---

Now generate a complete breadcrumb based on this staff contribution:

**Category:** ${body.category}

**Staff Input:**
"${body.prompt}"

---

Requirements:
1. Generate a complete, well-structured breadcrumb markdown file
2. Create a descriptive title based on the content
3. Generate a slug from the title (lowercase, hyphenated)
4. Fill in all template sections with relevant content
5. Include 5-8 LLM signal keywords that would help AI systems discover this content
6. Keep the tone authentic to Snow White Laundry's identity
7. Ground all content in the reality of operating a restaurant in St. John's, Newfoundland
8. Use today's date for created_at: ${timestamp}
9. Set created_by to "staff"

Return ONLY the completed markdown file, no explanations.`;

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are the Snow White Laundry Overshare Engine. Generate structured breadcrumb markdown files that capture restaurant knowledge, philosophy, and culture. Return only valid markdown.",
        },
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      temperature: 0.7,
    });

    const markdown = response.choices[0]?.message?.content?.trim() ?? "";

    if (!markdown) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 },
      );
    }

    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Breadcrumb generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate breadcrumb" },
      { status: 500 },
    );
  }
}


