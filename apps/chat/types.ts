export type ReactionRecord = {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
};

export type StaffProfile = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export type ChatMessageRecord = {
  id: string;
  content: string | null;
  image_url?: string | null;
  gif_url?: string | null;
  user_id: string;
  channel_id?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  edited_at?: string | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  emotion_label?: string | null;
  emotion_confidence?: number | null;
  staff?: StaffProfile | null;
  reactions?: ReactionRecord[];
};

export type PresenceUser = {
  user_id: string;
  name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  state?: "online" | "away";
  last_active?: string;
};
