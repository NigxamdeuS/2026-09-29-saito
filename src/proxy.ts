import { NextResponse, type NextRequest } from "next/server";
import { INBOX_COOKIE, inboxToken } from "@/lib/inbox-auth";

export async function proxy(request: NextRequest) {
  if (request.cookies.get(INBOX_COOKIE)?.value === (await inboxToken())) {
    return NextResponse.next();
  }
  const url = new URL("/unlock", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/nigxam", "/nigxam/:path*"],
};
