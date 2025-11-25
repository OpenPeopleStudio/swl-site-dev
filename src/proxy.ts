import { NextResponse, type NextRequest } from "next/server";

const STAFF_COOKIE = "swl_staff";

export const config = {
  matcher: ["/", "/staff/:path*"],
};

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookie = request.cookies.get(STAFF_COOKIE);
  const requestedHost = request.headers.get("host")?.toLowerCase() ?? "";
  const gateHost = process.env.GATE_HOST?.toLowerCase();

  const isGateDomain = Boolean(
    gateHost && requestedHost && requestedHost === gateHost,
  );

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
