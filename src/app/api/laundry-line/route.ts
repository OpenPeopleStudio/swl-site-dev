import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/shared/supabase";
import { generateLaundryLineReply } from "@/lib/laundryLineAI";
import {
  detectLaundryLineIntent,
  maybeCreateLaundryLineLead,
} from "@/lib/laundryLineLead";
import type { LaundryLineConversationMessage } from "@/types/laundry-line";

type IntentHint = "visit" | "private_event" | "philosophy" | "other";

type LaundryLineRequest = {
  threadId?: string;
  message?: string;
  metadata?: {
    intentHint?: IntentHint;
    source?: string;
  };
};

const MAX_HISTORY = 12;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LaundryLineRequest;
    const content = (body.message ?? "").trim();

    if (!content) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    let threadId = body.threadId?.trim() ?? null;

    if (!threadId) {
      const { data, error } = await supabase
        .from("laundry_line_threads")
        .insert({
          source: body.metadata?.source ?? "web",
          topic: body.metadata?.intentHint ?? null,
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        console.error("Failed to create Laundry Line thread", error);
        return NextResponse.json(
          {
            error:
              "Laundry Line is unavailable right now. Please try again shortly.",
          },
          { status: 500 },
        );
      }
      threadId = data.id;
    }

    if (!threadId) {
      console.error("Laundry Line thread missing after creation");
      return NextResponse.json(
        { error: "Laundry Line is unavailable right now." },
        { status: 500 },
      );
    }

    const guestInsert = await supabase.from("laundry_line_messages").insert({
      thread_id: threadId,
      sender: "guest",
      content,
      meta: body.metadata ?? {},
    });

    if (guestInsert.error) {
      console.error("Failed to record Laundry Line message", guestInsert.error);
      return NextResponse.json(
        { error: "Unable to save your message right now." },
        { status: 500 },
      );
    }

    const { data: historyRows, error: historyError } = await supabase
      .from("laundry_line_messages")
      .select("id, sender, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);

    if (historyError) {
      console.error("Failed to load Laundry Line history", historyError);
      return NextResponse.json(
        { error: "Laundry Line is unavailable right now." },
        { status: 500 },
      );
    }

    const history: LaundryLineConversationMessage[] =
      historyRows?.map((row) => ({
        id: row.id,
        sender:
          (row.sender as "guest" | "assistant" | "staff") === "guest"
            ? "guest"
            : "assistant",
        content: row.content ?? "",
        createdAt: row.created_at ?? new Date().toISOString(),
      })) ?? [];

    const reply = await generateLaundryLineReply(history);

    const assistantInsert = await supabase
      .from("laundry_line_messages")
      .insert({
        thread_id: threadId,
        sender: "assistant",
        content: reply,
      })
      .select("id")
      .single();

    if (assistantInsert.error) {
      console.error(
        "Failed to save Laundry Line assistant reply",
        assistantInsert.error,
      );
    }

    const intent = detectLaundryLineIntent(content, body.metadata?.intentHint);
    if (intent) {
      await maybeCreateLaundryLineLead({
        supabase,
        threadId,
        intent,
        notes: content,
      });
    }

    return NextResponse.json({
      threadId,
      reply,
    });
  } catch (error) {
    console.error("Laundry Line API error", error);
    return NextResponse.json(
      {
        error:
          "Laundry Line is taking a pause. Please try again or email us so we can follow up.",
      },
      { status: 500 },
    );
  }
}


