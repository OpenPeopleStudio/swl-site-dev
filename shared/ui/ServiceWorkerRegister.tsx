"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

const shouldRegisterServiceWorker = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (
    process.env.NEXT_PUBLIC_ENABLE_SW === "true" ||
    process.env.NODE_ENV === "production"
  ) {
    return true;
  }

  return false;
};

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!shouldRegisterServiceWorker()) {
      return;
    }

    let refreshing = false;
    const maybeReload = () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH, {
          scope: "/",
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.error("Failed to register service worker", error);
      }
    };

    const controllerChangeHandler = () => {
      maybeReload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", controllerChangeHandler);
    register();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChangeHandler,
      );
    };
  }, []);

  return null;
}
