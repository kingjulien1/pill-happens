import assert from "node:assert/strict";
import test from "node:test";
import { emptyData } from "./domain";
import { needsGettingStarted, newJournalData } from "./guide-onboarding";

test("only explicitly pending new journals need the first guide landing", () => {
  assert.equal(needsGettingStarted(emptyData()), false);
  assert.equal(
    needsGettingStarted({ onboarding: { guidePending: false } }),
    false,
  );
  assert.equal(needsGettingStarted(newJournalData()), true);
  // Older journals can have no records without becoming first-time journals.
  assert.deepEqual(emptyData().medications, []);
  assert.equal(Object.hasOwn(emptyData(), "onboarding"), false);
});

test("new journal onboarding starts with independent empty user data", () => {
  const first = newJournalData();
  const second = newJournalData();
  first.onboarding!.guidePending = false;
  first.settings.timezone = "Europe/London";
  assert.equal(needsGettingStarted(first), false);
  assert.equal(needsGettingStarted(second), true);
  assert.equal(second.settings.timezone, "Europe/Vienna");
  const { onboarding, ...data } = second;
  assert.deepEqual(onboarding, { guidePending: true });
  assert.deepEqual(data, emptyData());
});
