import "server-only";

import { neon } from "@neondatabase/serverless";
import path from "node:path";
import {
  createPostgresJournalRepository,
  type JournalRepository,
} from "./journal-repository";
import { createLocalJournalRepository } from "./local-journal-repository";

let cached:
  { url: string | undefined; repository: JournalRepository } | undefined;

export function journalRepository(): JournalRepository {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production")
    throw new Error("A database connection is required in production.");
  if (cached && cached.url === url) return cached.repository;
  const repository = url
    ? createPostgresJournalRepository(async (text, parameters) => {
        const sql = neon(url);
        return await sql.query(text, parameters);
      })
    : createLocalJournalRepository(path.join(process.cwd(), ".data"));
  cached = { url, repository };
  return repository;
}
