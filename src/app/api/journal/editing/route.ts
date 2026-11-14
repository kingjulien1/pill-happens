import { z } from "zod";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { isValidDayKey } from "@/lib/domain";
import { DAILY_REFLECTION_MAX_LENGTH } from "@/lib/daily-check-in";
import { JournalEnhancementValidationError } from "@/lib/journal-enhancement";
import { JSON_BODY_LIMITS } from "@/lib/server/json-body";
import {
  JournalEditingConflict,
  saveReviewedJournalEntry,
} from "@/lib/server/journal-editing";

export const runtime = "nodejs";

const schema = z
  .object({
    day: z.string().refine(isValidDayKey),
    period: z.enum(["morning", "evening"]),
    expectedHash: z.string().regex(/^[0-9a-f]{64}$/),
    expectedUpdatedAt: z
      .string()
      .max(64)
      .refine((value) => Number.isFinite(Date.parse(value))),
    candidate: z
      .object({
        body: z.string().max(DAILY_REFLECTION_MAX_LENGTH),
        summary: z.string().min(1).max(110),
      })
      .strict(),
  })
  .strict();

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = schema.parse(
        await jsonBody(request, { maxBytes: JSON_BODY_LIMITS.dailyCheckIn }),
      );
      const now = new Date();
      try {
        return await mutateState((state) =>
          saveReviewedJournalEntry(state, input, now),
        );
      } catch (error) {
        if (error instanceof JournalEditingConflict)
          throw new ApiError(409, error.message);
        if (error instanceof JournalEnhancementValidationError)
          throw new ApiError(
            400,
            "This edit did not pass the journal preservation checks. The original was kept.",
          );
        throw error;
      }
    },
    { mutation: true },
  );
}
