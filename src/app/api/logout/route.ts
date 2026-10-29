import { NextResponse } from "next/server";
import { api } from "@/lib/server/api";
import { cookieOptions, SESSION_COOKIE } from "@/lib/server/auth";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const response = NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
      return response;
    },
    // Clearing this browser's cookie is safe even after its session expires.
    // The same-origin mutation check still applies.
    { public: true, mutation: true },
  );
}
