import { neon } from "@neondatabase/serverless";
import { createPostgresJournalRepository } from "@/lib/server/journal-repository";
import {
  journalEditingAuthorized,
  runJournalEditing,
} from "@/lib/server/journal-editing";
import { generateOpenAIJournalEnhancement } from "@/lib/server/journal-enhancement-openai";
import { isJournalId } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (
    !journalEditingAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  const journalId = process.env.JOURNAL_EDITING_JOURNAL_ID?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const databaseUrl = process.env.DATABASE_URL;
  if (!isJournalId(journalId) || !apiKey || !databaseUrl)
    return Response.json(
      { error: "Daily journal editing is not configured." },
      { status: 503, headers },
    );
  try {
    const sql = neon(databaseUrl);
    const repository = createPostgresJournalRepository(
      async (text, parameters) => await sql.query(text, parameters),
    );
    const result = await runJournalEditing({
      repository,
      journalId,
      generate: (input) =>
        generateOpenAIJournalEnhancement({
          ...input,
          apiKey,
          ...(process.env.JOURNAL_EDITING_MODEL?.trim()
            ? { model: process.env.JOURNAL_EDITING_MODEL.trim() }
            : {}),
        }),
    });
    return Response.json(result, {
      headers,
      status: result.failed > 0 ? 207 : 200,
    });
  } catch {
    return Response.json(
      {
        error:
          "Daily journal editing could not finish. Your saved writing was kept.",
      },
      { status: 500, headers },
    );
  }
}
