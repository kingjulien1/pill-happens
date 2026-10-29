import { NextResponse } from "next/server";
import { api } from "@/lib/server/api";
import {
  cookieOptions,
  isAuthenticated,
  SESSION_COOKIE,
  sessionCookieForRefresh,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cookie-only session check: resuming the app never needs a journal data load. */
export function GET(request: Request) {
  return api(
    request,
    async () => {
      const authenticated = await isAuthenticated();
      const response = NextResponse.json(
        { authenticated },
        { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
      );
      if (authenticated) {
        const token = await sessionCookieForRefresh();
        if (token) response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      }
      return response;
    },
    { public: true },
  );
}
