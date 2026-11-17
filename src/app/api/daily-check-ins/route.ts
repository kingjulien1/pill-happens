import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  DailyCheckInSaveError,
  upsertDailyCheckIn,
} from "@/lib/server/daily-check-ins";
import { mutateStateWithUndo } from "@/lib/server/store";
import { dailyCheckInSchema } from "@/lib/server/validation";
import { JSON_BODY_LIMITS } from "@/lib/server/json-body";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = dailyCheckInSchema.parse(
        await jsonBody(request, { maxBytes: JSON_BODY_LIMITS.dailyCheckIn }),
      );
      const now = new Date();
      try {
        return await mutateStateWithUndo(
          { kind: "check-in", day: input.day, period: input.period },
          (state) => upsertDailyCheckIn(state, input, now),
        );
      } catch (error) {
        if (error instanceof DailyCheckInSaveError)
          throw new ApiError(error.status, error.message);
        throw error;
      }
    },
    { mutation: true },
  );
}
