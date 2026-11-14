import { z } from "zod";
import { api, jsonBody } from "@/lib/server/api";
import { undoState } from "@/lib/server/store";
import {
  UNDO_BODY_MAX_BYTES,
  UNDO_MAX_TOKEN_LENGTH,
} from "@/lib/server/journal-undo";

export const runtime = "nodejs";

const undoSchema = z.object({
  token: z.string().min(1).max(UNDO_MAX_TOKEN_LENGTH),
});

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = undoSchema.parse(
        await jsonBody(request, { maxBytes: UNDO_BODY_MAX_BYTES }),
      );
      return undoState(input.token);
    },
    { mutation: true },
  );
}
