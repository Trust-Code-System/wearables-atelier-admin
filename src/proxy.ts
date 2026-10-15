import { NextRequest, NextResponse } from "next/server";
/** Fast cookie-presence check only. The layout and API verify the actual session/role. */
export function proxy(request: NextRequest) {
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (
    !request.cookies.get("better-auth.session_token")?.value &&
    !request.cookies.get("__Secure-better-auth.session_token")?.value
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set("x-wearables-admin-next", next);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/admin/:path*"] };
