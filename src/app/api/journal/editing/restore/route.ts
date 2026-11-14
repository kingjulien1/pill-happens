import { z } from "zod";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import {
  JournalEditingConflict,
  restoreJournalEditingRevision,
} from "@/lib/server/journal-editing";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const { revisionId } = z
        .object({ revisionId: z.string().uuid() })
        .parse(await jsonBody(request));
      try {
        return await mutateState((state) =>
          restoreJournalEditingRevision(state, revisionId, new Date()),
        );
      } catch (error) {
        if (error instanceof JournalEditingConflict)
          throw new ApiError(409, error.message);
        throw error;
      }
    },
    { mutation: true },
  );
}
