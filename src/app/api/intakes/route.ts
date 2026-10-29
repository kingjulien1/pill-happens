import { randomUUID } from "node:crypto";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { intakeSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = intakeSchema.parse(await jsonBody(request));
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      return mutateState((state) => {
        const medication = state.medications.find(
          (item) => item.id === input.medicationId && !item.archived,
        );
        if (!medication)
          throw new ApiError(400, "Choose an active medication.");
        if (state.intakes.length >= 200_000)
          throw new ApiError(
            400,
            "Your journal has reached its limit. Export a backup before continuing.",
          );
        state.intakes.push({
          ...input,
          id,
          takenAt: new Date(input.takenAt).toISOString(),
          createdAt,
          medicationName: medication.name,
          medicationForm: medication.form,
          strengthMg: medication.strengthMg,
        });
      });
    },
    { mutation: true },
  );
}
