import assert from "node:assert/strict";
import test from "node:test";
import { intakeNotificationText } from "./intake-notification-text";
import type { NotificationPreviewRecord } from "./notification-change-preview";

const record: Extract<NotificationPreviewRecord, { kind: "intake" }> = {
  kind: "intake",
  name: "Ritalin",
  quantity: 1,
  strengthMg: 10,
  form: "tablet",
  route: "oral",
  takenAt: "2026-11-22T13:39:00Z",
  timeZone: "Europe/Vienna",
};

test("saved intake copy uses recorded dose, units, route and zoned intake time", () => {
  assert.deepEqual(intakeNotificationText({ after: record }), {
    heading: "10 mg recorded for Ritalin.",
    message: "1 tablet × 10 mg · 14:39 · Sun, Nov 22 · Swallowed",
  });
  assert.deepEqual(
    intakeNotificationText({
      after: {
        ...record,
        name: "Recorded name",
        quantity: 0.25,
        strengthMg: 2.5,
        form: "capsule",
        route: "nasal",
      },
    }),
    {
      heading: "0.625 mg recorded for Recorded name.",
      message: "0.25 capsules × 2.5 mg · 14:39 · Sun, Nov 22 · Nasal",
    },
  );
});

test("updated quantities lead the detail with the actual before/after values", () => {
  assert.deepEqual(
    intakeNotificationText({
      before: record,
      after: { ...record, quantity: 1.5 },
    }),
    {
      heading: "15 mg intake updated for Ritalin.",
      message: "1 → 1.5 tablets × 10 mg · 14:39 · Sun, Nov 22 · Swallowed",
    },
  );
  const text = intakeNotificationText({
    before: record,
    after: { ...record, quantity: 2, strengthMg: 5 },
  });
  assert.equal(text?.heading, "10 mg intake updated for Ritalin.");
  assert.equal(
    text?.message,
    "1 tablet × 10 mg → 2 tablets × 5 mg · 14:39 · Sun, Nov 22 · Swallowed",
  );
});

test("time-only and route-only edits describe those changes without claiming a dose change", () => {
  assert.deepEqual(
    intakeNotificationText({
      before: record,
      after: { ...record, takenAt: "2026-11-22T14:10:00Z" },
    }),
    {
      heading: "10 mg intake updated for Ritalin.",
      message: "14:39 → 15:10 · Sun, Nov 22 · 1 tablet × 10 mg · Swallowed",
    },
  );
  assert.equal(
    intakeNotificationText({
      before: record,
      after: { ...record, route: "nasal" },
    })?.message,
    "Swallowed → Nasal · 1 tablet × 10 mg · 14:39 · Sun, Nov 22",
  );
});

test("date edits use the actual calendar dates, including differing years", () => {
  const before = { ...record, takenAt: "2025-11-22T13:39:00Z" };
  assert.equal(
    intakeNotificationText({ before, after: record })?.message,
    "Nov 22, 2025 14:39 → Nov 22, 2026 14:39 · 1 tablet × 10 mg · Swallowed",
  );
});

test("a changed medication is identified and restored snapshots keep the same copy", () => {
  const preview = {
    before: record,
    after: { ...record, name: "Another medication" },
  };
  const text = intakeNotificationText(preview);
  assert.equal(text?.heading, "10 mg intake updated for Another medication.");
  assert.ok(text?.message.startsWith("Ritalin → Another medication · "));
  assert.deepEqual(
    intakeNotificationText(JSON.parse(JSON.stringify(preview))),
    text,
  );
});

test("equivalent instants do not invent a time change and unspecified metadata is not guessed", () => {
  assert.equal(
    intakeNotificationText({
      before: record,
      after: { ...record, takenAt: "2026-11-22T14:39:00+01:00" },
    })?.message,
    "1 tablet × 10 mg · 14:39 · Sun, Nov 22 · Swallowed",
  );
  assert.equal(
    intakeNotificationText({
      after: { ...record, form: undefined, route: undefined },
    })?.message,
    "1 unit × 10 mg · 14:39 · Sun, Nov 22",
  );
  assert.ok(
    intakeNotificationText({
      before: { ...record, route: undefined },
      after: record,
    })?.message.startsWith("Not specified → Swallowed · "),
  );
});

test("removals and other notification types keep their existing copy", () => {
  assert.equal(intakeNotificationText({}), undefined);
  assert.equal(intakeNotificationText({ before: record }), undefined);
  assert.equal(
    intakeNotificationText({
      after: { kind: "timezone", timeZone: "Europe/Vienna" },
    }),
    undefined,
  );
  assert.equal(
    intakeNotificationText({
      before: { kind: "timezone", timeZone: "Europe/Vienna" },
      after: record,
    }),
    undefined,
  );
});

test("display metadata errors fall back without interrupting a confirmed save", () => {
  for (const patch of [
    { takenAt: "invalid" },
    { timeZone: "Invalid/Zone" },
    { quantity: NaN },
  ])
    assert.equal(
      intakeNotificationText({ after: { ...record, ...patch } }),
      undefined,
    );
  assert.equal(
    intakeNotificationText({
      before: { ...record, takenAt: "invalid" },
      after: record,
    }),
    undefined,
  );
});

test("pump units and repeated DST clock times remain accurate", () => {
  assert.equal(
    intakeNotificationText({
      after: {
        ...record,
        name: "Tramal",
        form: "pump",
        quantity: 2,
        strengthMg: 25,
      },
    })?.message,
    "2 pumps × 25 mg · 14:39 · Sun, Nov 22 · Swallowed",
  );
  assert.equal(
    intakeNotificationText({
      before: { ...record, takenAt: "2026-10-25T00:30:00Z" },
      after: { ...record, takenAt: "2026-10-25T01:30:00Z" },
    })?.message,
    "Time adjusted · 02:30 · Sun, Oct 25 · 1 tablet × 10 mg · Swallowed",
  );
});
