import assert from "node:assert/strict";
import test from "node:test";
import {
  reflectionInsightEligible,
  reflectionInsightWordCount,
  parseReflectionInsightResponse,
} from "./reflection-insights";

test("insights require more than twenty visible words and ignore Markdown scaffolding", () => {
  const words = Array.from({ length: 20 }, () => "word").join(" ");
  assert.equal(
    reflectionInsightWordCount(
      `## ${words}\n\n---\n<!-- hidden words do not count -->`,
    ),
    20,
  );
  assert.equal(reflectionInsightEligible(words), false);
  assert.equal(reflectionInsightEligible(`${words} extra`), true);
});

test("client parser accepts only complete bounded response payloads", () => {
  const ready = {
    status: "ready",
    noteHash: "a".repeat(64),
    summary: "A short summary.",
    advice: ["A small suggestion.", "Another small suggestion."],
    generatedAt: "2026-11-07T09:00:00.000Z",
  };
  assert.deepEqual(parseReflectionInsightResponse(ready), ready);
  assert.deepEqual(
    parseReflectionInsightResponse({
      status: "pending",
      noteHash: ready.noteHash,
      retryAfterMs: 1000,
    }),
    { status: "pending", noteHash: ready.noteHash, retryAfterMs: 1000 },
  );
  assert.deepEqual(
    parseReflectionInsightResponse({
      status: "unavailable",
      reason: "failed",
      retryAfterMs: 0,
    }),
    { status: "unavailable", reason: "failed", retryAfterMs: 0 },
  );
  for (const value of [
    null,
    {},
    { ...ready, noteHash: "bad" },
    { ...ready, advice: ["one"] },
    { ...ready, summary: "" },
    { ...ready, generatedAt: "bad" },
    { status: "pending", noteHash: ready.noteHash, retryAfterMs: -1 },
    { status: "unavailable", reason: "bad" },
  ])
    assert.equal(parseReflectionInsightResponse(value), null);
});
