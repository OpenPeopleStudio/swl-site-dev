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
    <div className="space-y-3 rounded-[24px] border border-white/5 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Compose</span>
        {uploading && <span className="text-emerald-300">Uploading…</span>}
      </div>

      {uploadUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <span className="truncate">{uploadUrl}</span>
          <button
            type="button"
            className="text-[#ff453a] hover:underline"
            onClick={() => setUploadUrl(null)}
          >
            Remove
          </button>
        </div>
      )}
      {gifUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          <span>GIF attached</span>
          <button
            type="button"
            className="text-[#ff453a] hover:underline"
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
        className="w-full resize-none rounded-2xl border border-white/10 bg-[#11111a] px-4 py-3 text-sm text-white outline-none transition focus:border-[#3c6dff]/60"
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
                ? "border-[#3c6dff] bg-[#13255a] text-white"
                : "border-white/10 text-white/70 hover:border-white/40"
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
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#355dff] to-[#6f4bff] px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(93,81,255,0.45)] transition hover:from-[#4668ff] hover:to-[#815bff]"
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
