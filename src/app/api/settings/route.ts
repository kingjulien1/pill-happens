import { api, jsonBody } from "@/lib/server/api";
import { mutateState } from "@/lib/server/store";
import { settingsSchema } from "@/lib/server/validation";

export const runtime = "nodejs";

export function PATCH(request: Request) {
  return api(
    request,
    async () => {
      const settings = settingsSchema.parse(await jsonBody(request));
      return mutateState((state) => {
        state.settings = settings;
      });
    },
    { mutation: true },
  );
}
