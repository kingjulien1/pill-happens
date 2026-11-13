import { api, ApiError, jsonBody } from "@/lib/server/api";
import { authenticatedJournal } from "@/lib/server/auth";
import { journalRepository } from "@/lib/server/database";
import { JSON_BODY_LIMITS } from "@/lib/server/json-body";
import { generateOpenAIReflectionInsight } from "@/lib/server/reflection-insight-openai";
import {
  getReflectionInsight,
  reflectionInsightRequestSchema,
} from "@/lib/server/reflection-insights";

export const runtime = "nodejs";
export const maxDuration = 60;

export function POST(request: Request) {
  return api(
    request,
    async () => {
      const input = reflectionInsightRequestSchema.parse(
        await jsonBody(request, { maxBytes: JSON_BODY_LIMITS.dailyCheckIn }),
      );
      const journalId = await authenticatedJournal();
      if (!journalId)
        throw new ApiError(401, "Please sign in to open your journal.");
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      return getReflectionInsight(journalRepository(), journalId, input, {
        configured: Boolean(apiKey),
        generate: (note, period) =>
          generateOpenAIReflectionInsight({
            note,
            period,
            apiKey: apiKey ?? "",
            ...(process.env.OPENAI_MODEL?.trim()
              ? { model: process.env.OPENAI_MODEL.trim() }
              : {}),
          }),
      });
    },
    { mutation: true },
  );
}
