import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

type RichMessageInputProps = {
  channelId?: string | null;
  userId: string;
  onRecapRequest: () => Promise<void>;
  onTypingSignal: (isTyping: boolean) => void;
  replyTo?: {
    id: string;
    content: string | null;
    author?: string | null;
  } | null;
  onCancelReply: () => void;
};

type GifResult = {
  id: string;
  url: string;
  tinygif?: { url: string };
};

const GIF_API = "https://tenor.googleapis.com/v2/search";

export function RichMessageInput({
  channelId,
  userId,
  onRecapRequest,
  onTypingSignal,
  replyTo,
  onCancelReply,
}: RichMessageInputProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const bucketName =
    process.env.NEXT_PUBLIC_CHAT_BUCKET?.trim() || "chat_uploads";
  const channelReady = Boolean(channelId);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  function emitTypingSignal() {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTypingSignal(true);
    typingTimeout.current = setTimeout(() => onTypingSignal(false), 1500);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelReady) return;
    if (!text.trim() && !mediaFile) return;

    if (text.trim().startsWith("/recap")) {
      setText("");
      await onRecapRequest();
      return;
    }

    if (text.trim().startsWith("/gif ")) {
      const query = text.trim().replace("/gif", "").trim();
      void searchGif(query);
      setIsGifPickerOpen(true);
      return;
    }

    await sendMessage();
  }

  async function sendMessage(extra?: { gifUrl?: string }) {
    if (isSending) return;
    if (!channelId) {
      console.warn("Channel not resolved yet; message discarded.");
      return;
    }
    setIsSending(true);

    let imageUrl: string | undefined;
    const content = text.trim() || null;

    try {
      if (mediaFile) {
        const path = `${channelId}/${Date.now()}-${mediaFile.name}`;
        const { error: uploadError } = await supabaseBrowser.storage
          .from(bucketName)
          .upload(path, mediaFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabaseBrowser.storage
          .from(bucketName)
          .getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      await supabaseBrowser.from("messages").insert({
        content,
        channel_id: channelId,
        user_id: userId,
        image_url: imageUrl,
        gif_url: extra?.gifUrl ?? null,
        parent_id: replyTo?.id ?? null,
      });

      setText("");
      setMediaFile(null);
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
      setGifResults([]);
      setIsGifPickerOpen(false);
      onTypingSignal(false);
      onCancelReply();
    } finally {
      setIsSending(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function searchGif(query: string) {
    const apiKey = process.env.NEXT_PUBLIC_TENOR_API_KEY;
    if (!apiKey || !query) return;
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      limit: "8",
      media_filter: "gif,tinygif",
    });

    const response = await fetch(`${GIF_API}?${params.toString()}`);
    const payload = (await response.json()) as {
      results?: Array<{ id: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>;
    };

    const formatted =
      payload.results?.map((item) => ({
        id: item.id,
        url: item.media_formats.gif.url,
        tinygif: item.media_formats.tinygif,
      })) ?? [];

    setGifResults(formatted);
  }

  async function handleGifSelect(result: GifResult) {
    if (!channelReady) return;
    await sendMessage({ gifUrl: result.url });
  }

  return (
    <div className="mt-4 space-y-3">
      {replyTo && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          <div>
            Replying to{" "}
            <span className="font-semibold">
              {replyTo.author ?? "Staff"}
            </span>
            : {replyTo.content ?? "[media]"}
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {mediaPreview && (
        <div className="relative w-32 overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaPreview} alt="preview" className="h-32 w-32 object-cover" />
          <button
            onClick={() => {
              setMediaFile(null);
              if (mediaPreview) URL.revokeObjectURL(mediaPreview);
              setMediaPreview(null);
            }}
            className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
          >
            ✕
          </button>
        </div>
      )}

      {isGifPickerOpen && gifResults.length > 0 && (
        <div className="grid grid-cols-4 gap-3 rounded-3xl border border-white/10 bg-black/80 p-3">
          {gifResults.map((gif) => (
            <button
              key={gif.id}
              onClick={() => handleGifSelect(gif)}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gif.tinygif?.url ?? gif.url}
                alt="gif option"
                className="h-20 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-lg"
      >
        <input
          type="file"
          accept="image/*"
          id="chat_media_upload"
          className="hidden"
          onChange={handleFileChange}
          disabled={!channelReady}
        />
        <button
          type="button"
          onClick={() => {
            if (!channelReady) return;
            document.getElementById("chat_media_upload")?.click();
          }}
          className="rounded-full border border-white/10 p-2 text-sm text-white/70 hover:border-white/40 disabled:opacity-40"
          disabled={!channelReady}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (!channelReady) return;
            setIsGifPickerOpen((prev) => !prev);
          }}
          className="rounded-full border border-white/10 p-2 text-sm text-white/70 hover:border-white/40 disabled:opacity-40"
          disabled={!channelReady}
        >
          GIF
        </button>
        <input
          type="text"
          value={text}
          placeholder={
            channelReady ? "Send a message…" : "Connecting to channel…"
          }
          onChange={(event) => {
            setText(event.target.value);
            emitTypingSignal();
          }}
          onBlur={() => onTypingSignal(false)}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          disabled={isSending || !channelReady}
        />
        <button
          type="submit"
          disabled={
            !channelReady || isSending || (!text.trim() && !mediaFile)
          }
          className="rounded-full bg-[#007aff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1a7fff] disabled:cursor-not-allowed disabled:bg-[#1b2b44]"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default RichMessageInput;
