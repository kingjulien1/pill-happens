import "server-only";

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyData, type AppData } from "@/lib/domain";

const stateDirectory = path.join(process.cwd(), ".data");
const stateFile = path.join(stateDirectory, "state.json");
let localQueue: Promise<unknown> = Promise.resolve();
let initialization: Promise<void> | undefined;

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("A database connection is required.");
  return neon(url);
}

async function initializeDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const sql = database();
      await sql`CREATE TABLE IF NOT EXISTS pill_happens_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`INSERT INTO pill_happens_state (id, data)
        VALUES ('personal', ${JSON.stringify(emptyData())}::jsonb)
        ON CONFLICT (id) DO NOTHING`;
      await sql`CREATE TABLE IF NOT EXISTS pill_happens_login_attempts (
        id TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        window_start TIMESTAMPTZ NOT NULL
      )`;
    })().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

function allowLocalStorage() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production. Local storage is development-only.",
    );
  }
}

async function readLocal(): Promise<AppData> {
  allowLocalStorage();
  try {
    const data: unknown = JSON.parse(await readFile(stateFile, "utf8"));
    if (
      !data ||
      typeof data !== "object" ||
      !("medications" in data) ||
      !("intakes" in data) ||
      !("goals" in data) ||
      !("settings" in data)
    ) {
      throw new Error(
        "The local data file is invalid. Restore a JSON backup before continuing.",
      );
    }
    return data as AppData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
    throw error;
  }
}

export async function readState(): Promise<AppData> {
  if (!process.env.DATABASE_URL) {
    await localQueue;
    return readLocal();
  }
  await initializeDatabase();
  const sql = database();
  const rows =
    await sql`SELECT data FROM pill_happens_state WHERE id = 'personal'`;
  return rows[0].data as AppData;
}

/** The mutation may run more than once on contention; keep side effects outside it. */
export async function mutateState(
  mutate: (state: AppData) => void,
): Promise<AppData> {
  if (!process.env.DATABASE_URL) {
    allowLocalStorage();
    const operation = localQueue
      .catch(() => undefined)
      .then(async () => {
        const state = await readLocal();
        mutate(state);
        await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
        const temporaryFile = `${stateFile}.${randomUUID()}.tmp`;
        await writeFile(temporaryFile, JSON.stringify(state), { mode: 0o600 });
        await rename(temporaryFile, stateFile);
        return state;
      });
    localQueue = operation.catch(() => undefined);
    return operation;
  }

  await initializeDatabase();
  const sql = database();
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows =
      await sql`SELECT data, version FROM pill_happens_state WHERE id = 'personal'`;
    const { data, version } = rows[0];
    const state = data as AppData;
    mutate(state);
    const result = await sql`UPDATE pill_happens_state
      SET data = ${JSON.stringify(state)}::jsonb, version = version + 1, updated_at = NOW()
      WHERE id = 'personal' AND version = ${version}
      RETURNING version`;
    if (result.length) return state;
  }
  throw new Error("Your data changed in another request. Please try again.");
}

let localLoginWindow = { startedAt: 0, attempts: 0 };

/** Global account limit avoids trusting spoofable client IP headers. */
export async function consumeLoginAttempt(): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    await initializeDatabase();
    const sql = database();
    const result =
      await sql`INSERT INTO pill_happens_login_attempts (id, attempts, window_start)
      VALUES ('personal', 1, NOW())
      ON CONFLICT (id) DO UPDATE SET
        attempts = CASE WHEN pill_happens_login_attempts.window_start < NOW() - INTERVAL '15 minutes'
          THEN 1 ELSE pill_happens_login_attempts.attempts + 1 END,
        window_start = CASE WHEN pill_happens_login_attempts.window_start < NOW() - INTERVAL '15 minutes'
          THEN NOW() ELSE pill_happens_login_attempts.window_start END
      RETURNING attempts`;
    return result[0].attempts <= 10;
  }
  allowLocalStorage();
  const now = Date.now();
  if (now - localLoginWindow.startedAt > 15 * 60_000) {
    localLoginWindow = { startedAt: now, attempts: 0 };
  }
  return ++localLoginWindow.attempts <= 10;
}

export async function resetLoginAttempts() {
  if (process.env.DATABASE_URL) {
    const sql = database();
    await sql`DELETE FROM pill_happens_login_attempts WHERE id = 'personal'`;
  } else {
    localLoginWindow = { startedAt: 0, attempts: 0 };
  }
}
