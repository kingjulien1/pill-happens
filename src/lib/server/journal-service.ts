import { randomUUID } from "node:crypto";
import { hashPassword, passwordSchema, verifyPassword } from "./passwords";
import {
  JOURNAL_LIMIT,
  LEGACY_JOURNAL_ID,
  type JournalCredential,
  type JournalRepository,
} from "./journal-repository";
import { passwordMatchesValue } from "./security";

export class JournalCreationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function findCredential(
  password: string,
  credentials: JournalCredential[],
) {
  if (credentials.length > JOURNAL_LIMIT)
    throw new Error("The journal registry exceeds its supported size.");
  for (const credential of credentials) {
    if (await verifyPassword(password, credential)) return credential.id;
  }
  return null;
}

export function createJournalService(
  repository: JournalRepository,
  legacyPassword: string,
) {
  return {
    async signIn(password: string): Promise<string | null> {
      passwordSchema.parse(password);
      if (passwordMatchesValue(password, legacyPassword))
        return LEGACY_JOURNAL_ID;
      const { credentials } = await repository.credentialSnapshot();
      return findCredential(password, credentials);
    },
    async create(password: string): Promise<string> {
      passwordSchema.parse(password);
      if (passwordMatchesValue(password, legacyPassword))
        throw new JournalCreationError(
          409,
          "This journal already exists. Sign in again with this password.",
        );
      const credential = {
        id: randomUUID(),
        ...(await hashPassword(password)),
      };
      for (let attempt = 0; attempt < 8; attempt++) {
        const snapshot = await repository.credentialSnapshot();
        if (await findCredential(password, snapshot.credentials))
          throw new JournalCreationError(
            409,
            "This journal already exists. Sign in again with this password.",
          );
        if (snapshot.credentials.length >= JOURNAL_LIMIT)
          throw new JournalCreationError(
            409,
            `This app has reached its limit of ${JOURNAL_LIMIT} journals. Sign in to an existing journal.`,
          );
        if (await repository.createJournal(snapshot.version, credential))
          return credential.id;
      }
      throw new JournalCreationError(
        409,
        "Another journal was created at the same time. Please try again or sign in with this password.",
      );
    },
  };
}
