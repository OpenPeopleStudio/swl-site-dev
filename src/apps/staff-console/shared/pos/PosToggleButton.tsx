"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "swl-last-console-route";

export function PosToggleButton() {
  const router = useRouter();
  const pathname = usePathname();
  const siteMode = useSyncExternalStore(subscribeToSiteMode, readSiteMode, () => null);
  const defaultConsoleRoute = siteMode === "owner" ? "/owners/console" : "/staff";

  const onPosRoute = pathname?.startsWith("/pos");
  const onGateRoute = pathname?.startsWith("/gate");
  const onCustomerSurface = pathname?.startsWith("/customer");
  const onLandingPage = pathname === "/";
  const onReservePage = pathname?.startsWith("/reserve");
  const onPreludePage = pathname?.startsWith("/prelude");
  const onContactPage = pathname?.startsWith("/contact");
  
  // Hide POS button on all customer-facing routes
  const isCustomerRoute = 
    siteMode === "customer" || 
    onGateRoute || 
    onCustomerSurface || 
    onLandingPage || 
    onReservePage || 
    onPreludePage || 
    onContactPage;

  useEffect(() => {
    if (!pathname || pathname.startsWith("/pos")) return;
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, pathname);
    } catch {
      // ignore
    }
  }, [pathname]);

  const label = useMemo(
    () => (onPosRoute ? "Back to Console" : "Open POS"),
    [onPosRoute],
  );

  if (isCustomerRoute) {
    return null;
  }

  function handleClick() {
    if (onPosRoute) {
      const fallback =
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) ||
        defaultConsoleRoute;
      router.push(fallback);
      return;
    }
    router.push("/pos");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed top-6 right-6 z-[1200] rounded-full border border-white/20 bg-black/40 px-5 py-2 text-[0.58rem] uppercase tracking-[0.45em] text-white/80 backdrop-blur hover:border-white/50"
    >
      {label}
    </button>
  );
}

export default PosToggleButton;

function readSiteMode() {
  if (typeof document === "undefined") return null;
  return document.body.dataset.siteMode ?? null;
}

function subscribeToSiteMode(callback: () => void) {
  if (typeof document === "undefined") {
    return () => undefined;
  }
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "data-site-mode")) {
      callback();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-site-mode"] });
  return () => observer.disconnect();
}
