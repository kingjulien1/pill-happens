import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  dailyReflectionSchema,
  DailyReflectionSaveError,
  saveDailyReflection,
} from "@/lib/server/daily-reflection";
import { JSON_BODY_LIMITS } from "@/lib/server/json-body";
import { mutateState } from "@/lib/server/store";

export const runtime = "nodejs";

export function PATCH(request: Request) {
  return api(
    request,
    async () => {
      const input = dailyReflectionSchema.parse(
        await jsonBody(request, { maxBytes: JSON_BODY_LIMITS.dailyCheckIn }),
      );
      const now = new Date();
      try {
        return await mutateState((state) =>
          saveDailyReflection(state, input, now),
        );
      } catch (error) {
        if (error instanceof DailyReflectionSaveError)
          throw new ApiError(error.status, error.message);
        throw error;
      }
    },
    { mutation: true },
  );
}
