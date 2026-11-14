import type { DailyCheckInPeriod } from "./daily-check-in";

/** Private, exportable revision history; never contains model credentials. */
export type JournalEditingRevision = {
  id: string;
  day: string;
  period: DailyCheckInPeriod;
  policy: string;
  sourceHash: string;
  outputHash: string;
  originalNote: string;
  editedNote: string;
  sourceUpdatedAt: string;
  appliedUpdatedAt: string;
  reviewedAt: string;
  restoredAt?: string;
};

export type JournalEditingReport = {
  reviewed: number;
  changed: number;
  skipped: number;
  failed: number;
  remaining: number;
  busy: boolean;
};

export type JournalEditingState = {
  revisions: JournalEditingRevision[];
  /** Safe retry metadata only; failed model output is never retained. */
  failures?: {
    day: string;
    period: DailyCheckInPeriod;
    sourceHash: string;
    attempts: number;
    retryAfter: string;
  }[];
  lease?: { id: string; expiresAt: string };
  lastRun?: JournalEditingReport & { finishedAt: string };
};
