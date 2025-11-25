"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/shared/supabaseBrowser";

export function useUpload(bucket = "chat_uploads") {
  const [uploading, setUploading] = useState(false);
  const supabase = supabaseBrowser;

  async function uploadFile(file: File) {
    if (!file) throw new Error("No file selected");
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name}`.replace(/\s+/g, "_");
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error || !data?.path) {
        throw error ?? new Error("Upload failed");
      }
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      if (!urlData?.publicUrl) {
        throw new Error("Unable to fetch uploaded file URL");
      }
      return urlData.publicUrl;
    } finally {
      setUploading(false);
    }
  }

  return { uploadFile, uploading };
}
