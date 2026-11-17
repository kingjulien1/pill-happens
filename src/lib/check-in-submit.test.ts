import assert from "node:assert/strict";
import test from "node:test";
import { checkInDefaults } from "./check-in-draft";
import {
  checkInSubmissionDraftUnchanged,
  prepareCheckInSubmission,
} from "./check-in-submit";

const base = "2026-11-16T20:00:00.000Z";
const acknowledged = "2026-11-16T20:01:00.000Z";
const draft = () => ({
  ...checkInDefaults(),
  note: "Original words.\n\n---\n\nA later addition.",
  reflectionBaseUpdatedAt: base,
});

test("full submission uses the autosave acknowledgement received while draining", () => {
  const submitted = draft();
  const latest = { ...submitted, reflectionBaseUpdatedAt: acknowledged };
  const before = structuredClone({ submitted, latest });
  assert.equal(
    prepareCheckInSubmission(submitted, latest, true).reflectionBaseUpdatedAt,
    acknowledged,
  );
  assert.deepEqual({ submitted, latest }, before);
});

test("unknown legacy writing bases never become authorization to replace newer writing", () => {
  const submitted = draft();
  const latest = { ...submitted, reflectionBaseUpdatedAt: undefined };
  assert.equal(
    prepareCheckInSubmission(submitted, latest, true).reflectionBaseUpdatedAt,
    undefined,
  );
  assert.equal(
    prepareCheckInSubmission(submitted, undefined, false),
    submitted,
    "a form without a stored draft keeps its original known baseline",
  );
});

test("new writing, changed check-in fields or a concurrent reset stop an outdated submission", () => {
  const submitted = draft();
  for (const latest of [
    { ...submitted, note: `${submitted.note}\nMore words from another tab.` },
    { ...submitted, moods: ["hopeful"] },
    { ...submitted, helped: "Another detail" },
    undefined,
    { note: "Invalid partial record" },
  ])
    assert.throws(
      () => prepareCheckInSubmission(submitted, latest, true),
      /draft changed/,
    );
  assert.equal(submitted.note, draft().note);
});

test("editor open state and acknowledgement metadata do not change submitted content", () => {
  const submitted = draft();
  const latest = {
    ...submitted,
    writingOpen: !submitted.writingOpen,
    reflectionBaseUpdatedAt: acknowledged,
  };
  assert.equal(
    prepareCheckInSubmission(submitted, latest, true).note,
    submitted.note,
  );
});

test("success cleanup keeps every newer or different local draft, even within one millisecond", () => {
  const submitted = { value: draft(), updatedAt: 1_000 };
  assert.equal(
    checkInSubmissionDraftUnchanged(submitted, structuredClone(submitted)),
    true,
  );
  for (const current of [
    { ...submitted, updatedAt: 1_001 },
    {
      ...submitted,
      value: { ...submitted.value, note: "Continued while the request ran." },
    },
    { ...submitted, value: { ...submitted.value, helped: "A later detail." } },
    undefined,
  ])
    assert.equal(checkInSubmissionDraftUnchanged(submitted, current), false);
  assert.equal(checkInSubmissionDraftUnchanged(undefined, submitted), false);
  assert.equal(checkInSubmissionDraftUnchanged(undefined, undefined), true);
});
