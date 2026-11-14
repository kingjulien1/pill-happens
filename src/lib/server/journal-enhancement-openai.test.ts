import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_JOURNAL_ENHANCEMENT_MODEL,
  generateOpenAIJournalEnhancement,
  parseOpenAIJournalEnhancement,
} from "./journal-enhancement-openai";
import type { JournalEnhancementInput } from "../journal-enhancement";

const input: JournalEnhancementInput = {
  note: "i didnt sleep well. kinda tired lol.",
  day: "2026-11-14",
  timezone: "Europe/Vienna",
  medications: [{ id: "synthetic-id", name: "Example" }],
};
const candidate = {
  body: "i didn't sleep well. kinda tired lol.",
  summary: "A tired little update",
};
const completed = (value: unknown = candidate) => ({
  status: "completed",
  output: [
    {
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify(value) }],
    },
  ],
});

test("Responses output is parsed only after completion and independent fact validation", () => {
  assert.equal(
    parseOpenAIJournalEnhancement(completed(), input).markdown,
    "# Sat, Nov 14 -- A tired little update\n\ni didn't sleep well. kinda tired lol.",
  );
  assert.throws(
    () =>
      parseOpenAIJournalEnhancement(
        completed({ ...candidate, body: "i did sleep well. kinda tired lol." }),
        input,
      ),
    /facts validation/u,
  );
});

test("refusals, truncation, ambiguity, malformed JSON and unexpected schema fields never become journal text", () => {
  const message = completed().output[0];
  for (const value of [
    null,
    {},
    {
      ...completed(),
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    },
    { ...completed(), error: { message: "Sensitive detail" } },
    { ...completed(), output: [{ ...message, status: "in_progress" }] },
    {
      ...completed(),
      output: [
        { ...message, content: [{ type: "refusal", refusal: "Declined" }] },
      ],
    },
    {
      ...completed(),
      output: [
        { ...message, content: [{ type: "output_text", text: "not json" }] },
      ],
    },
    { ...completed(), output: [] },
    { ...completed(), output: [message, message] },
    completed({ ...candidate, advice: "An unrequested extra" }),
    completed({ ...candidate, body: "" }),
    completed({ ...candidate, summary: "x".repeat(111) }),
  ])
    assert.throws(() => parseOpenAIJournalEnhancement(value, input));
});

test("transport is stateless, structured, bounded and treats notes as untrusted data", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, {
      Authorization: "Bearer synthetic-key",
      "Content-Type": "application/json",
    });
    assert.ok(init?.signal instanceof AbortSignal);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, DEFAULT_JOURNAL_ENHANCEMENT_MODEL);
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 1500);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(body.text.format.schema.required, ["body", "summary"]);
    assert.deepEqual(JSON.parse(body.input[0].content), {
      day: input.day,
      timezone: input.timezone,
      journal: input.note,
      medications: [{ name: "Example" }],
      allowedReferences: [],
    });
    assert.match(body.instructions, /untrusted journal data/u);
    assert.match(body.instructions, /never invent or repeat that H1/u);
    assert.match(body.instructions, /never interpret clinical meaning/u);
    assert.match(body.instructions, /fewer than 80 words/u);
    assert.match(body.instructions, /intentional quirks/u);
    assert.equal(body.tools, undefined);
    assert.equal(body.previous_response_id, undefined);
    return Response.json(completed());
  };
  const result = await generateOpenAIJournalEnhancement({
    ...input,
    apiKey: "synthetic-key",
    transport,
  });
  assert.equal(result.summary, candidate.summary);
  assert.equal(calls, 1);
});

test("large notes receive a larger finite output budget without input truncation", async () => {
  const note = "An ordinary day, a little context. ".repeat(2000);
  const transport: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_output_tokens, 32768);
    assert.equal(JSON.parse(body.input[0].content).journal, note);
    return Response.json(completed({ body: note, summary: "An ordinary day" }));
  };
  assert.ok(
    (
      await generateOpenAIJournalEnhancement({
        ...input,
        note,
        apiKey: "synthetic-key",
        transport,
      })
    ).markdown.endsWith(note),
  );
});

test("network/provider failures never expose key, raw response, or journal and are not retried", async () => {
  for (const mode of ["http", "throw", "json"] as const) {
    let calls = 0;
    const transport: typeof fetch = async (_url, init) => {
      calls++;
      assert.equal(JSON.parse(String(init?.body)).model, "synthetic-model");
      if (mode === "throw") throw new Error("synthetic-key PRIVATE-NOTE");
      if (mode === "json") return new Response("PRIVATE-NOTE", { status: 200 });
      return Response.json(
        { error: { message: "synthetic-key PRIVATE-NOTE" } },
        { status: 429 },
      );
    };
    await assert.rejects(
      generateOpenAIJournalEnhancement({
        ...input,
        note: "PRIVATE-NOTE",
        apiKey: "synthetic-key",
        model: "synthetic-model",
        transport,
      }),
      (error: unknown) =>
        error instanceof Error &&
        !/synthetic-key|PRIVATE-NOTE/u.test(error.message),
    );
    assert.equal(calls, 1);
  }
});

test("invalid input and absent credentials never invoke transport", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json(completed());
  };
  await assert.rejects(
    generateOpenAIJournalEnhancement({ ...input, apiKey: "", transport }),
  );
  await assert.rejects(
    generateOpenAIJournalEnhancement({
      ...input,
      note: "",
      apiKey: "synthetic-key",
      transport,
    }),
  );
  assert.equal(calls, 0);
});
