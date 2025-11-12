"use client";

import { useEffect } from "react";
import { Paperclip } from "lucide-react";
import { useUpload } from "@/apps/chat/hooks/useUpload";

type UploadButtonProps = {
  onUploaded: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function UploadButton({ onUploaded, onUploadingChange }: UploadButtonProps) {
  const { uploadFile, uploading } = useUpload();

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      onUploaded(url);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white">
      <Paperclip className="h-4 w-4" />
      {uploading ? "Uploading…" : "Upload"}
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
      />
    </label>
  );
}
