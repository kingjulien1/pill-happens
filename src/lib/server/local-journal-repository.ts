import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyData, type AppData } from "@/lib/domain";
import {
  JOURNAL_LIMIT,
  LEGACY_JOURNAL_ID,
  type AuthAttemptKind,
  type JournalCredential,
  type JournalRepository,
} from "./journal-repository";
import { isJournalId } from "./security";

type LocalRegistry = {
  version: number;
  credentials: JournalCredential[];
  states: Record<string, AppData>;
};
type LocalWindow = { startedAt: number; attempts: number };
type LocalRuntime = {
  queue: Promise<unknown>;
  attempts: Record<AuthAttemptKind, LocalWindow>;
};
// Share the write queue across repository instances and development hot reloads.
const shared = globalThis as typeof globalThis & {
  __pillHappensLocalJournals?: Map<string, LocalRuntime>;
};
const runtimes = (shared.__pillHappensLocalJournals ??= new Map<
  string,
  LocalRuntime
>());

function validateState(data: unknown): AppData {
  if (
    !data ||
    typeof data !== "object" ||
    !("medications" in data) ||
    !Array.isArray(data.medications) ||
    !("intakes" in data) ||
    !Array.isArray(data.intakes) ||
    !("goals" in data) ||
    !Array.isArray(data.goals) ||
    !("settings" in data) ||
    !data.settings ||
    typeof data.settings !== "object"
  )
    throw new Error(
      "The local journal is invalid. Restore a JSON backup before continuing.",
    );
  return data as AppData;
}

async function readJson(file: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Development-only adapter; the runtime wrapper never selects this in production. */
export function createLocalJournalRepository(
  directory: string,
): JournalRepository {
  const registryFile = path.join(directory, "journals.json");
  const personalFile = path.join(directory, "state.json");
  const runtime = runtimes.get(directory) ?? {
    queue: Promise.resolve(),
    attempts: {
      signin: { startedAt: 0, attempts: 0 },
      creation: { startedAt: 0, attempts: 0 },
    },
  };
  runtimes.set(directory, runtime);

  async function registry(): Promise<LocalRegistry> {
    const data = await readJson(registryFile);
    if (data === undefined) return { version: 0, credentials: [], states: {} };
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      !Number.isSafeInteger(data.version) ||
      !("credentials" in data) ||
      !Array.isArray(data.credentials) ||
      data.credentials.length > JOURNAL_LIMIT ||
      !("states" in data) ||
      !data.states ||
      typeof data.states !== "object"
    )
      throw new Error("The local journal registry is invalid.");
    return data as LocalRegistry;
  }
  async function atomicWrite(file: string, data: unknown) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  function exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = runtime.queue.catch(() => undefined).then(operation);
    runtime.queue = result.catch(() => undefined);
    return result;
  }
  function validId(id: string) {
    if (!isJournalId(id)) throw new Error("The journal identifier is invalid.");
  }

  return {
    async credentialSnapshot() {
      await runtime.queue;
      const { version, credentials } = await registry();
      return { version, credentials };
    },
    async createJournal(version, credential) {
      validId(credential.id);
      if (credential.id === LEGACY_JOURNAL_ID)
        throw new Error("The personal journal is reserved.");
      return exclusive(async () => {
        const data = await registry();
        if (
          data.version !== version ||
          data.credentials.length >= JOURNAL_LIMIT
        )
          return false;
        if (data.credentials.some((existing) => existing.id === credential.id))
          throw new Error("The journal already exists.");
        data.credentials.push(credential);
        data.states[credential.id] = emptyData();
        data.version++;
        // Credential and empty state are one atomic file replacement.
        await atomicWrite(registryFile, data);
        return true;
      });
    },
    async readState(journalId) {
      validId(journalId);
      await runtime.queue;
      if (journalId === LEGACY_JOURNAL_ID) {
        const personal = await readJson(personalFile);
        return personal === undefined ? emptyData() : validateState(personal);
      }
      const data = await registry();
      if (!Object.hasOwn(data.states, journalId))
        throw new Error("The signed-in journal is unavailable.");
      return validateState(data.states[journalId]);
    },
    async mutateState(journalId, mutate) {
      validId(journalId);
      return exclusive(async () => {
        if (journalId === LEGACY_JOURNAL_ID) {
          const data = await readJson(personalFile);
          const state = data === undefined ? emptyData() : validateState(data);
          mutate(state);
          await atomicWrite(personalFile, state);
          return state;
        }
        const data = await registry();
        if (!Object.hasOwn(data.states, journalId))
          throw new Error("The signed-in journal is unavailable.");
        const state = validateState(data.states[journalId]);
        mutate(state);
        await atomicWrite(registryFile, data);
        return state;
      });
    },
    async consumeAuthAttempt(kind) {
      const now = Date.now();
      const window = runtime.attempts[kind];
      if (now - window.startedAt > 15 * 60_000) {
        window.startedAt = now;
        window.attempts = 0;
      }
      return ++window.attempts <= 10;
    },
  };
}
