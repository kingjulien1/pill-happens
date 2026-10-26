import { randomUUID } from "node:crypto";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { goalSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = goalSchema.parse(await jsonBody(request));
      const goal = {
        ...input,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      return mutateState((state) => {
        if (
          !state.medications.some(
            (item) => item.id === input.medicationId && !item.archived,
          )
        ) {
          throw new ApiError(400, "Choose an active medication.");
        }
        if (state.goals.length >= 10_000)
          throw new ApiError(400, "Your goal list has reached its limit.");
        state.goals.push(goal);
      });
    },
    { mutation: true },
  );
}
