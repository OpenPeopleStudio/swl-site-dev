"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MessageFeed } from "@/apps/chat/components/MessageFeed";
import { ChatComposer } from "@/apps/chat/components/ChatComposer";
import { PresenceBar } from "@/apps/chat/components/PresenceBar";
import { useRealtimeChat } from "@/apps/chat/hooks/useRealtimeChat";
import { usePresence } from "@/apps/chat/hooks/usePresence";

type ChatDrawerProps = {
  open: boolean;
  onClose?: () => void;
  variant?: "overlay" | "page";
  channelId?: string;
};

export function ChatDrawer({
  open,
  onClose,
  variant = "overlay",
  channelId,
}: ChatDrawerProps) {
  const { messages, user, error, loading, sendMessage, editMessage, deleteMessage, toggleReaction } =
    useRealtimeChat(channelId);
  const { onlineUsers } = usePresence(user);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  async function handleSend(payload: {
    content?: string;
    imageUrl?: string | null;
    gifUrl?: string | null;
  }) {
    await sendMessage(payload);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    await editMessage(editing.id, editing.text);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this message for everyone?")) return;
    void deleteMessage(id);
  }

  const content = (
    <motion.div
      initial={variant === "overlay" ? { y: 40, opacity: 0 } : { opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className={`flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-black/80 p-4 shadow-[0_50px_140px_rgba(0,0,0,0.85)] ${
        variant === "page" ? "min-h-[80vh]" : "h-[85vh] md:h-[90vh] md:max-w-lg"
      }`}
    >
      <header className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Cortex Chat v2
          </p>
          <h2 className="text-2xl font-light text-white">Staff Line</h2>
        </div>
        {variant === "overlay" && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <PresenceBar users={onlineUsers} />

      <MessageFeed
        messages={messages}
        loading={loading}
        currentUserId={user?.id}
        onReact={(id, emoji) => void toggleReaction(id, emoji)}
        onEdit={(id, text) => setEditing({ id, text: text ?? "" })}
        onDelete={handleDelete}
        onPreviewMedia={(url) => setPreviewUrl(url)}
      />

      <ChatComposer onSend={handleSend} />
    </motion.div>
  );

  return (
    <>
      {variant === "page" ? (
        <div className="px-4 py-8">{content}</div>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-end bg-black/70 p-4 md:items-center md:justify-center"
              onClick={onClose}
            >
              <div className="w-full" onClick={(event) => event.stopPropagation()}>
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={() => setPreviewUrl(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Attachment preview"
              className="max-h-[90vh] max-w-[90vw] rounded-3xl border border-white/20 object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 rounded-3xl border border-white/10 bg-black/90 p-4 text-white shadow-2xl"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Edit message</p>
            <textarea
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/60"
              rows={3}
              value={editing.text}
              onChange={(event) => setEditing({ ...editing, text: event.target.value })}
            />
            <div className="mt-3 flex justify-end gap-3 text-sm">
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-1 text-white/70"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full border border-white/40 bg-white/10 px-4 py-1 text-white"
                onClick={() => void handleSaveEdit()}
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
