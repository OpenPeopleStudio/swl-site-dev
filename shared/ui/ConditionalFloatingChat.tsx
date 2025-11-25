"use client";

import { usePathname } from "next/navigation";
import FloatingChat from "@/shared/ui/FloatingChat";
import { CustomerConciergeChat } from "@/domains/customer/components/CustomerConciergeChat";

const HIDDEN_PREFIX = "/gate";

export function ConditionalFloatingChat() {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith(HIDDEN_PREFIX)) {
    return null;
  }

  if (pathname.startsWith("/customer")) {
    return <CustomerConciergeChat />;
  }

  return <FloatingChat />;
}
