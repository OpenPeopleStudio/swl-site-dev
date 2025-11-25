"use client";

import { usePathname } from "next/navigation";
import FloatingChat from "@/shared/ui/FloatingChat";
import { CustomerConciergeChat } from "@/domains/customer/components/CustomerConciergeChat";

const HIDDEN_PREFIX = "/gate";
const STAFF_PREFIXES = [
  "/staff",
  "/owner",
  "/owners",
  "/owner-console",
  "/console",
  "/pos",
];
const SITE_MODE = (process.env.NEXT_PUBLIC_SITE_MODE ?? "staff").toLowerCase();

export function ConditionalFloatingChat() {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith(HIDDEN_PREFIX)) {
    return null;
  }

  const isStaffSurface = STAFF_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const preferCustomerChat =
    SITE_MODE === "customer" || !isStaffSurface;

  if (preferCustomerChat) {
    return <CustomerConciergeChat />;
  }

  return <FloatingChat />;
}
