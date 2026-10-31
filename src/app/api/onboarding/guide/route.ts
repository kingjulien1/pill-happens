import { api, ApiError } from "@/lib/server/api";
import { authenticatedJournal } from "@/lib/server/auth";
import { journalRepository } from "@/lib/server/database";
import { acknowledgeGettingStarted } from "@/lib/server/guide-onboarding";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const journalId = await authenticatedJournal();
      if (!journalId)
        throw new ApiError(401, "Please sign in to your journal.");
      await acknowledgeGettingStarted(journalRepository(), journalId);
      return { ok: true };
    },
    { mutation: true },
  );
}
