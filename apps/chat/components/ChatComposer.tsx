"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { GifPicker } from "@/apps/chat/components/GifPicker";
import { UploadButton } from "@/apps/chat/components/UploadButton";

type ComposerProps = {
  onSend: (payload: {
    content?: string;
    imageUrl?: string | null;
    gifUrl?: string | null;
  }) => Promise<void>;
};

export function ChatComposer({ onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!text.trim() && !uploadUrl && !gifUrl) return;
    await onSend({
      content: text.trim() || undefined,
      imageUrl: uploadUrl,
      gifUrl,
    });
    setText("");
    setUploadUrl(null);
    setGifUrl(null);
  }, [gifUrl, onSend, text, uploadUrl]);

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
        <span>Compose</span>
        {uploading && <span className="text-emerald-300">Uploading…</span>}
      </div>

      {uploadUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
          <span className="truncate">{uploadUrl}</span>
          <button
            type="button"
            className="text-white/60 hover:text-white"
            onClick={() => setUploadUrl(null)}
          >
            Remove
          </button>
        </div>
      )}
      {gifUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
          <span>GIF attached</span>
          <button
            type="button"
            className="text-white/60 hover:text-white"
            onClick={() => setGifUrl(null)}
          >
            Remove
          </button>
        </div>
      )}

      <textarea
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        placeholder="Update the kitchen, share photos, or drop a note…"
        className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/50"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadButton
            onUploaded={(url) => setUploadUrl(url)}
            onUploadingChange={setUploading}
          />
          <button
            type="button"
            onClick={() => setGifOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
              gifOpen
                ? "border-white/70 text-white"
                : "border-white/10 text-white/70 hover:border-white/40 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            GIF
          </button>
        </div>

        <motion.button
          type="button"
          onClick={() => void handleSend()}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-gradient-to-r from-blue-600/80 to-violet-600/80 px-4 py-2 text-sm font-medium text-white shadow-[0_10px_40px_rgba(59,130,246,0.35)] transition hover:from-blue-500 hover:to-violet-500"
        >
          Send
          <Send className="h-4 w-4" />
        </motion.button>
      </div>

      {gifOpen && (
        <GifPicker
          onSelect={(url) => {
            setGifUrl(url);
            setGifOpen(false);
          }}
        />
      )}
    </div>
  );
}
