"use client";

import { useEffect } from "react";

export function useMessageAlert(newMessageCount: number) {
  useEffect(() => {
    if (newMessageCount <= 0) return;

    const audio = new Audio("/sounds/new-message.mp3");
    audio.volume = 0.08;
    audio.play().catch(() => undefined);

    const bubble = document.getElementById("chat-bubble");
    bubble?.classList.add("neon-glow");
    const timeout = setTimeout(() => bubble?.classList.remove("neon-glow"), 800);

    return () => clearTimeout(timeout);
  }, [newMessageCount]);
}
