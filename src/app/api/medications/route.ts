import { randomUUID } from "node:crypto";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { medicationSchema } from "@/lib/server/validation";
import { resolveMedicationCategoryPatch } from "@/lib/server/medication-category-patch";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = medicationSchema.parse(await jsonBody(request));
      const medication = {
        ...input,
        ...resolveMedicationCategoryPatch(undefined, input),
        id: randomUUID(),
        archived: false,
        createdAt: new Date().toISOString(),
      };
      return mutateState((state) => {
        if (state.medications.length >= 1000)
          throw new ApiError(
            400,
            "Your medication list has reached its limit.",
          );
        state.medications.push(medication);
      });
    },
    { mutation: true },
  );
}
