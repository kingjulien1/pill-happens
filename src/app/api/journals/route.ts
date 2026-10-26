import { NextResponse } from "next/server";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  cookieOptions,
  createSession,
  passwordAuthenticationReady,
  passwordJournals,
  SESSION_COOKIE,
} from "@/lib/server/auth";
import { JournalCreationError } from "@/lib/server/journal-service";
import { passwordBodySchema } from "@/lib/server/passwords";
import {
  consumeCreationAttempt,
  consumeLoginAttempt,
} from "@/lib/server/store";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      // Check this before persistence: a file-only dev bypass has no signing key.
      if (!passwordAuthenticationReady())
        throw new ApiError(
          503,
          "Password sign-in is not configured on this server.",
        );
      const { password } = passwordBodySchema.parse(await jsonBody(request));
      if (!(await consumeCreationAttempt()) || !(await consumeLoginAttempt()))
        throw new ApiError(
          429,
          "Too many sign-in or creation attempts. Please wait 15 minutes and try again.",
        );
      let journalId: string;
      try {
        journalId = await passwordJournals().create(password);
      } catch (error) {
        if (error instanceof JournalCreationError)
          throw new ApiError(error.status, error.message);
        throw error;
      }
      const response = NextResponse.json(
        { ok: true },
        {
          status: 201,
          headers: { "Cache-Control": "private, no-store" },
        },
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
