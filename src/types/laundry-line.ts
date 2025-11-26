export type LaundryLineSender = "guest" | "assistant" | "staff";

export type LaundryLineIntent =
  | "visit_prelude"
  | "visit_main"
  | "private_event"
  | "philosophy_only"
  | "other";

export interface LaundryLineThread {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  status: string | null;
  topic: string | null;
  needs_staff_followup: boolean | null;
}

export interface LaundryLineMessage {
  id: string;
  thread_id: string;
  sender: LaundryLineSender;
  content: string;
  created_at: string;
  meta: Record<string, unknown> | null;
}

export interface LaundryLineLead {
  id: string;
  thread_id: string | null;
  created_at: string;
  intent: LaundryLineIntent;
  name: string | null;
  email: string | null;
  party_size: number | null;
  date_window_start: string | null;
  date_window_end: string | null;
  is_flexible: boolean | null;
  notes: string | null;
  consent_to_email: boolean | null;
  internal_status: string | null;
}

export type LaundryLineConversationMessage = {
  id: string;
  sender: Extract<LaundryLineSender, "guest" | "assistant">;
  content: string;
  createdAt: string;
};


