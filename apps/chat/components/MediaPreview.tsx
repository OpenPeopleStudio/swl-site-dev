"use client";

type MediaPreviewProps = {
  imageUrl?: string | null;
  gifUrl?: string | null;
};

export function MediaPreview({ imageUrl, gifUrl }: MediaPreviewProps) {
  const url = gifUrl ?? imageUrl ?? undefined;
  if (!url) return null;

  const isGif = Boolean(gifUrl);

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Shared media"
        className={`max-h-64 w-full object-cover ${isGif ? "bg-black" : ""}`}
      />
    </div>
  );
}

export default MediaPreview;
