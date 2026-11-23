import { randomUUID } from "node:crypto";
import { api, ApiError, jsonBody } from "@/lib/server/api";
import { mutateStateWithUndo } from "@/lib/server/store";
import { intakeSchema } from "@/lib/server/validation";
import { intakeEditMutation } from "@/lib/server/intake-edit";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return api(
    request,
    async () => {
      const { id } = await context.params;
      const input = intakeSchema.parse(await jsonBody(request));
      const edit = intakeEditMutation(id, input, {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      });
      return mutateStateWithUndo(edit.target, edit.mutate);
    },
    { mutation: true },
  );
}

export function DELETE(request: Request, context: Context) {
  return api(
    request,
    async () => {
      const { id } = await context.params;
      return mutateStateWithUndo({ kind: "intake", id }, (state) => {
        const index = state.intakes.findIndex((item) => item.id === id);
        if (index < 0) throw new ApiError(404, "This intake was not found.");
        state.intakes.splice(index, 1);
      });
    },
    { mutation: true },
  );
}
