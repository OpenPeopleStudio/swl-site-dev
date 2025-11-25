import { NextResponse, type NextRequest } from "next/server";

const STAFF_COOKIE = "swl_staff";
const DEFAULT_GATE_HOSTS = [
  "ai.snowwhitelaundry.co",
  "www.ai.snowwhitelaundry.co",
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

export const config = {
  matcher: ["/", "/staff/:path*"],
};

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookie = request.cookies.get(STAFF_COOKIE);
  const requestedHost = request.headers.get("host")?.toLowerCase() ?? "";
  const normalizedRequestHost = requestedHost.split(":")[0] ?? "";

  const isGateDomain =
    normalizedRequestHost.length > 0 && GATE_HOSTS.has(normalizedRequestHost);

  if (isGateDomain && !pathname.startsWith("/gate")) {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.rewrite(url);
  }

  if (!cookie && pathname.startsWith("/staff")) {
    const url = request.nextUrl.clone();
    const search = request.nextUrl.search ?? "";
    url.pathname = "/gate";
    url.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
