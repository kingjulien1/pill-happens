import { emptyData, type AppData } from "@/lib/domain";
import { newJournalData } from "@/lib/guide-onboarding";
import type { PasswordVerifier } from "./passwords";

export const JOURNAL_LIMIT = 50;
export const LEGACY_JOURNAL_ID = "personal";
export type AuthAttemptKind = "signin" | "creation";
export type JournalCredential = PasswordVerifier & { id: string };
export type CredentialSnapshot = {
  version: number;
  credentials: JournalCredential[];
};
export type Query = (
  text: string,
  parameters?: unknown[],
) => Promise<Record<string, unknown>[]>;

/** Internal repository IDs must come from verified sessions, never request input. */
export interface JournalRepository {
  credentialSnapshot(): Promise<CredentialSnapshot>;
  createJournal(
    version: number,
    credential: JournalCredential,
  ): Promise<boolean>;
  readState(journalId: string): Promise<AppData>;
  mutateState(
    journalId: string,
    mutate: (state: AppData) => void,
  ): Promise<AppData>;
  consumeAuthAttempt(kind: AuthAttemptKind): Promise<boolean>;
}

/** Additive, repeatable migration; the legacy personal row is never replaced. */
export const JOURNAL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pill_happens_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS pill_happens_login_attempts (
    id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    window_start TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pill_happens_journal_registry (
    id TEXT PRIMARY KEY CHECK (id = 'journals'),
    version INTEGER NOT NULL DEFAULT 0
  )`,
  `INSERT INTO pill_happens_journal_registry (id, version)
    VALUES ('journals', 0) ON CONFLICT (id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS pill_happens_journals (
    id TEXT PRIMARY KEY CHECK (id <> 'personal'),
    password_scheme TEXT NOT NULL CHECK (password_scheme = 'scrypt-v1'),
    password_salt TEXT NOT NULL CHECK (length(password_salt) = 22),
    password_hash TEXT NOT NULL CHECK (length(password_hash) = 86),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
] as const;

export function createPostgresJournalRepository(
  query: Query,
): JournalRepository {
  let initialization: Promise<void> | undefined;
  async function initialize() {
    initialization ??= (async () => {
      for (const statement of JOURNAL_SCHEMA) await query(statement);
      await query(
        `INSERT INTO pill_happens_state (id, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [LEGACY_JOURNAL_ID, JSON.stringify(emptyData())],
      );
    })().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
    await initialization;
  }

  return {
    async credentialSnapshot() {
      await initialize();
      // One statement gives the registry version and credentials the same snapshot.
      const rows = await query(`SELECT registry.version,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'scheme', password_scheme, 'salt', password_salt, 'hash', password_hash
        ) ORDER BY id) FROM pill_happens_journals), '[]'::jsonb) AS credentials
        FROM pill_happens_journal_registry registry WHERE registry.id = 'journals'`);
      if (!rows[0]) throw new Error("The journal registry is unavailable.");
      return rows[0] as unknown as CredentialSnapshot;
    },
    async createJournal(version, credential) {
      await initialize();
      // The registry CAS serializes password uniqueness checks without a fast
      // password lookup hash. Both INSERTs depend on its RETURNING row; the
      // entire statement commits or rolls back, including the registry version.
      const rows = await query(
        `WITH reserved AS (
          UPDATE pill_happens_journal_registry SET version = version + 1
          WHERE id = 'journals' AND version = $1
            AND (SELECT COUNT(*) FROM pill_happens_journals) < $7
          RETURNING id
        ), created AS (
          INSERT INTO pill_happens_journals (id, password_scheme, password_salt, password_hash)
          SELECT $2, $3, $4, $5 FROM reserved RETURNING id
        )
        INSERT INTO pill_happens_state (id, data)
        SELECT id, $6::jsonb FROM created RETURNING id`,
        [
          version,
          credential.id,
          credential.scheme,
          credential.salt,
          credential.hash,
          JSON.stringify(newJournalData()),
          JOURNAL_LIMIT,
        ],
      );
      return rows.length === 1;
    },
    async readState(journalId) {
      await initialize();
      const rows = await query(
        `SELECT data FROM pill_happens_state WHERE id = $1`,
        [journalId],
      );
      if (!rows[0]) throw new Error("The signed-in journal is unavailable.");
      return rows[0].data as AppData;
    },
    async mutateState(journalId, mutate) {
      await initialize();
      for (let attempt = 0; attempt < 8; attempt++) {
        const rows = await query(
          `SELECT data, version FROM pill_happens_state WHERE id = $1`,
          [journalId],
        );
        if (!rows[0]) throw new Error("The signed-in journal is unavailable.");
        const state = rows[0].data as AppData;
        mutate(state);
        const result = await query(
          `UPDATE pill_happens_state SET data = $1::jsonb, version = version + 1, updated_at = NOW()
           WHERE id = $2 AND version = $3 RETURNING version`,
          [JSON.stringify(state), journalId, rows[0].version],
        );
        if (result.length) return state;
      }
      throw new Error(
        "Your data changed in another request. Please try again.",
      );
    },
    async consumeAuthAttempt(kind) {
      await initialize();
      const result = await query(
        `INSERT INTO pill_happens_login_attempts (id, attempts, window_start)
         VALUES ($1, 1, NOW()) ON CONFLICT (id) DO UPDATE SET
           attempts = CASE WHEN pill_happens_login_attempts.window_start < NOW() - INTERVAL '15 minutes'
             THEN 1 ELSE pill_happens_login_attempts.attempts + 1 END,
           window_start = CASE WHEN pill_happens_login_attempts.window_start < NOW() - INTERVAL '15 minutes'
             THEN NOW() ELSE pill_happens_login_attempts.window_start END
         RETURNING attempts`,
        [kind === "signin" ? LEGACY_JOURNAL_ID : "journal-creation"],
      );
      return Number(result[0].attempts) <= 10;
    },
  };
}
