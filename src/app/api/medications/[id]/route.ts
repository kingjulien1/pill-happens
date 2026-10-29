import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { medicationPatchSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api(
    request,
    async () => {
      const { id } = await context.params;
      const input = medicationPatchSchema.parse(await jsonBody(request));
      return mutateState((state) => {
        const medication = state.medications.find((item) => item.id === id);
        if (!medication)
          throw new ApiError(404, "This medication was not found.");
        Object.assign(medication, input);
        // The store updates every linked intake in this same atomic save.
      });
    },
    { mutation: true },
  );
}
