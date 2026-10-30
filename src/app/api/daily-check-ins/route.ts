import { api, ApiError, jsonBody } from "@/lib/server/api";
import {
  DailyCheckInSaveError,
  upsertDailyCheckIn,
} from "@/lib/server/daily-check-ins";
import { mutateState } from "@/lib/server/store";
import { dailyCheckInSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = dailyCheckInSchema.parse(await jsonBody(request));
      const now = new Date();
      try {
        return await mutateState((state) =>
          upsertDailyCheckIn(state, input, now),
        );
      } catch (error) {
        if (error instanceof DailyCheckInSaveError)
          throw new ApiError(400, error.message);
        throw error;
      }
    },
    { mutation: true },
  );
}
