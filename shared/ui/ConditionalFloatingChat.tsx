"use client";

import { usePathname } from "next/navigation";
import FloatingChat from "@/shared/ui/FloatingChat";

const HIDDEN_PREFIXES = ["/customer", "/gate"];

export function ConditionalFloatingChat() {
  const pathname = usePathname();
  if (
    pathname &&
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }
  return <FloatingChat />;
}
