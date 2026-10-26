import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  cookieOptions,
  createSession,
  passwordMatches,
  SESSION_COOKIE,
} from "@/lib/server/auth";
import { consumeLoginAttempt, resetLoginAttempts } from "@/lib/server/store";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      if (!(await consumeLoginAttempt()))
        throw new ApiError(
          429,
          "Too many sign-in attempts. Please wait 15 minutes and try again.",
        );
      const { password } = z
        .object({
          password: z.string().min(1, "Enter your password.").max(1024),
        })
        .parse(await jsonBody(request));
      if (!passwordMatches(password))
        throw new ApiError(
          401,
          "That password did not match. Please try again.",
        );
      await resetLoginAttempts();
      const response = NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(SESSION_COOKIE, createSession(), cookieOptions());
      return response;
    },
    { public: true, mutation: true },
  );
}
