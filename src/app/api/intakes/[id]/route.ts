import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { intakeSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return api(
    request,
    async () => {
      const { id } = await context.params;
      const input = intakeSchema.parse(await jsonBody(request));
      return mutateState((state) => {
        const intake = state.intakes.find((item) => item.id === id);
        if (!intake) throw new ApiError(404, "This intake was not found.");
        if (input.medicationId !== intake.medicationId) {
          const medication = state.medications.find(
            (item) => item.id === input.medicationId && !item.archived,
          );
          if (!medication)
            throw new ApiError(400, "Choose an active medication.");
          intake.medicationName = medication.name;
          intake.medicationForm = medication.form;
          intake.strengthMg = medication.strengthMg;
        }
        Object.assign(intake, input, {
          takenAt: new Date(input.takenAt).toISOString(),
        });
      });
    },
    { mutation: true },
  );
}

export function DELETE(request: Request, context: Context) {
  return api(
    request,
    async () => {
      const { id } = await context.params;
      return mutateState((state) => {
        const index = state.intakes.findIndex((item) => item.id === id);
        if (index < 0) throw new ApiError(404, "This intake was not found.");
        state.intakes.splice(index, 1);
      });
    },
    { mutation: true },
  );
}
