"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __mswWorkerStarted__?: boolean;
    Cypress?: unknown;
  }
}

function shouldEnableMocking() {
  if (typeof window === "undefined") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_DISABLE_MSW === "true") {
    return false;
  }
  if (window.Cypress) {
    return true;
  }
  if (process.env.NEXT_PUBLIC_ENABLE_MSW === "true") {
    return true;
  }
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return true;
  }
  return false;
}

export function MockServiceWorkerGate() {
  useEffect(() => {
    if (!shouldEnableMocking()) return;
    if (window.__mswWorkerStarted__) return;
    window.__mswWorkerStarted__ = true;

    let stopped = false;

    import("@/mocks/shared/browser")
      .then(({ worker }) =>
        worker.start({
          serviceWorker: { url: "/mockServiceWorker.js" },
          onUnhandledRequest: "bypass",
        }),
      )
      .catch((error) => {
        console.error("MSW worker failed to start", error);
      });

    return () => {
      if (stopped) return;
      stopped = true;
      window.__mswWorkerStarted__ = false;
    };
  }, []);

  return null;
}

export default MockServiceWorkerGate;

