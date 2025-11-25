"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useIdleWarp(timeout = 15000) {
  const [awake, setAwake] = useState(false);
  const [wakeSignal, setWakeSignal] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerWake = useCallback(() => {
    setAwake(true);
    setWakeSignal((signal) => signal + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAwake(false);
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    function handleInteraction() {
      triggerWake();
    }
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointermove", handleInteraction, opts);
    window.addEventListener("keydown", handleInteraction, opts);
    window.addEventListener("touchstart", handleInteraction, opts);

    return () => {
      window.removeEventListener("pointermove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [triggerWake]);

  return { awake, wakeSignal, triggerWake };
}
