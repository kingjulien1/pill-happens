import "server-only";

import { cookies } from "next/headers";
import {
  configurationIssueFor,
  createSessionToken,
  passwordMatchesValue,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/server/security";

export { SESSION_MAX_AGE } from "@/lib/server/security";

export const SESSION_COOKIE = "pill-happens-session";

export function configurationIssue(): string | null {
  return configurationIssueFor({
    production: process.env.NODE_ENV === "production",
    password: process.env.APP_PASSWORD,
    secret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL,
  });
}

export function configurationReady(): boolean {
  return configurationIssue() === null;
}

function developmentWithoutPassword(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.APP_PASSWORD &&
    !process.env.DATABASE_URL
  );
}

function credentials() {
  return {
    password: process.env.APP_PASSWORD ?? "",
    secret: process.env.SESSION_SECRET ?? "",
  };
}

export function passwordMatches(password: string): boolean {
  return passwordMatchesValue(password, process.env.APP_PASSWORD ?? "");
}

export function createSession(): string {
  return createSessionToken(credentials());
}

export async function isAuthenticated(): Promise<boolean> {
  if (!configurationReady()) return false;
  if (developmentWithoutPassword()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(token && verifySessionToken(token, credentials()));
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
