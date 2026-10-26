import { NextResponse } from "next/server";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  cookieOptions,
  createSession,
  passwordAuthenticationReady,
  passwordJournals,
  SESSION_COOKIE,
} from "@/lib/server/auth";
import { consumeLoginAttempt } from "@/lib/server/store";
import { passwordBodySchema } from "@/lib/server/passwords";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      if (!passwordAuthenticationReady())
        throw new ApiError(
          503,
          "Password sign-in is not configured on this server.",
        );
      const { password } = passwordBodySchema.parse(await jsonBody(request));
      if (!(await consumeLoginAttempt()))
        throw new ApiError(
          429,
          "Too many sign-in attempts. Please wait 15 minutes and try again.",
        );
      const journalId = await passwordJournals().signIn(password);
      if (!journalId)
        return NextResponse.json(
          { needsCreation: true },
          {
            headers: { "Cache-Control": "private, no-store" },
          },
        );
      const response = NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(
        SESSION_COOKIE,
        createSession(journalId),
        cookieOptions(),
      );
      return response;
    },
    { public: true, mutation: true },
  );
}
