import { NextResponse, type NextRequest } from "next/server";

const STAFF_COOKIE = "swl_staff";
const DEFAULT_GATE_HOSTS = [
  "ai.snowwhitelaundry.co",
  "www.ai.snowwhitelaundry.co",
];
const DEFAULT_CUSTOMER_HOSTS = [
  "snowwhitelaundry.co",
  "www.snowwhitelaundry.co",
];

const GATE_HOSTS = (() => {
  const hosts = new Set(DEFAULT_GATE_HOSTS);
  const envHost = process.env.GATE_HOST?.toLowerCase();
  if (envHost) {
    const normalizedEnvHost = envHost.split(":")[0];
    if (normalizedEnvHost) {
      hosts.add(normalizedEnvHost);
    }
  }
  return hosts;
})();

const CUSTOMER_HOSTS = (() => {
  const hosts = new Set(DEFAULT_CUSTOMER_HOSTS);
  const envHost = process.env.CUSTOMER_HOST?.toLowerCase();
  if (envHost) {
    const normalizedEnvHost = envHost.split(":")[0];
    if (normalizedEnvHost) {
      hosts.add(normalizedEnvHost);
    }
  }
  return hosts;
})();

const PROTECTED_PATH_PREFIXES = [
  "/staff",
  "/owner-console",
  "/owner",
  "/owners",
  "/console",
  "/pos",
];

export const config = {
  matcher: ["/((?!_next|api|public).*)"],
};

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search ?? "";
  const cookie = request.cookies.get(STAFF_COOKIE);
  const requestedHost = request.headers.get("host")?.toLowerCase() ?? "";
  const normalizedRequestHost = requestedHost.split(":")[0] ?? "";

  const isGateDomain =
    normalizedRequestHost.length > 0 && GATE_HOSTS.has(normalizedRequestHost);
  const isCustomerDomain =
    normalizedRequestHost.length > 0 &&
    CUSTOMER_HOSTS.has(normalizedRequestHost);

  const requiresProtectedAccess = PROTECTED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const buildGateRedirectUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    const target = `${pathname}${search}`;
    if (pathname !== "/gate" && target && target !== "/") {
      url.searchParams.set("next", target);
    }
    return url;
  };

  if (isGateDomain) {
    if (pathname.startsWith("/gate")) {
      return NextResponse.next();
    }

    if (cookie) {
      return NextResponse.next();
    }

    const redirectUrl = buildGateRedirectUrl();
    return NextResponse.redirect(redirectUrl);
  }

  if (isCustomerDomain) {
    const url = request.nextUrl.clone();
    if (pathname === "/gate") {
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
    if (requiresProtectedAccess) {
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
  }

  if (!cookie && requiresProtectedAccess) {
    const redirectUrl = buildGateRedirectUrl();
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}
