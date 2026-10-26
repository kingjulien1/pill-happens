import { api, ApiError } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";

export const runtime = "nodejs";

export function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async () => {
    const { id } = await context.params;
    return mutateState((state) => {
      const index = state.goals.findIndex((item) => item.id === id);
      if (index < 0) throw new ApiError(404, "This goal was not found.");
      state.goals.splice(index, 1);
    });
  }, { mutation: true });
}
