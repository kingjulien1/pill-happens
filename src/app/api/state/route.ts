import { NextResponse } from "next/server";
import { api } from "@/lib/server/api";
import {
  cookieOptions,
  sessionCookieForRefresh,
  SESSION_COOKIE,
} from "@/lib/server/auth";
import { readState } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return api(request, async () => {
    const state = await readState();
    const response = NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
    const token = await sessionCookieForRefresh();
    if (token) response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  });
}
