import "server-only";

import { cookies } from "next/headers";
import {
  configurationIssueFor,
  createJournalSessionToken,
  journalFromSessionToken,
  LEGACY_JOURNAL_ID,
  SESSION_MAX_AGE,
} from "@/lib/server/security";
import { journalRepository } from "./database";
import { createJournalService } from "./journal-service";

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

/** File-only development may bypass login, but cannot create unsigned journals. */
export function passwordAuthenticationReady(): boolean {
  return (
    Boolean(process.env.APP_PASSWORD) &&
    (process.env.SESSION_SECRET?.length ?? 0) >= 32 &&
    configurationReady()
  );
}

export function passwordJournals() {
  if (!passwordAuthenticationReady())
    throw new Error("Password authentication is not configured.");
  return createJournalService(
    journalRepository(),
    process.env.APP_PASSWORD ?? "",
  );
}

export function createSession(journalId: string): string {
  return createJournalSessionToken(journalId, credentials());
}

/** The only journal scope accepted by server data access is a verified cookie. */
export async function authenticatedJournal(): Promise<string | null> {
  if (!configurationReady()) return null;
  if (developmentWithoutPassword()) return LEGACY_JOURNAL_ID;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? journalFromSessionToken(token, credentials()) : null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await authenticatedJournal()) !== null;
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
