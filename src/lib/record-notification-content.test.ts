import assert from "node:assert/strict";
import test from "node:test";
import {
  recordNoticeChanges,
  recordNotificationContent,
} from "./record-notification-content";
import type {
  NotificationPreviewRecord,
  NotificationMedicationSnapshot,
} from "./notification-change-preview";

const medication: NotificationMedicationSnapshot = {
  name: "Ritalin",
  strengthMg: 10,
  defaultQuantity: 1,
  form: "tablet",
  color: "rose",
  archived: false,
  categories: ["stimulant"],
};
const med: NotificationPreviewRecord = { kind: "medication", medication };
const intake: NotificationPreviewRecord = {
  kind: "intake",
  name: "Ritalin",
  quantity: 1,
  strengthMg: 10,
  form: "tablet",
  route: "oral",
  takenAt: "2026-11-22T13:39:00Z",
  timeZone: "Europe/Vienna",
};
const checkIn: NotificationPreviewRecord = {
  kind: "check-in",
  day: "2026-11-22",
  period: "morning",
  words: 42,
  moods: ["calm"],
  energy: 0,
  energyScale: 5,
  stress: 0,
  stressScale: 5,
  sleepHours: 7.5,
};

test("intake headers retain their actual recorded values and removals name the removed dose", () => {
  const saved = recordNotificationContent({ after: intake })!;
  assert.equal(saved.heading, "10 mg recorded for Ritalin.");
  assert.equal(
    saved.message,
    "1 tablet × 10 mg · 14:39 · Sun, Nov 22 · Swallowed",
  );
  const updated = recordNotificationContent({
    before: intake,
    after: { ...intake, quantity: 1.5 },
  })!;
  assert.equal(updated.heading, "15 mg intake updated for Ritalin.");
  const removed = recordNotificationContent({ before: intake })!;
  assert.equal(removed.heading, "10 mg removed for Ritalin.");
  assert.equal(removed.operation, "removed");
  assert.equal(removed.primary, "Sunday");
  assert.match(removed.secondary, /November 22, 2026 · 14:39/);
});

test("medication saves summarize actual strength, type and default amount without implying a dose was taken", () => {
  const content = recordNotificationContent({ after: med })!;
  assert.equal(content.heading, "Ritalin added.");
  assert.equal(content.message, "10 mg · Tablet · Default 1 tablet");
  assert.match(content.guidance, /does not record a dose/);
  const updated = recordNotificationContent({
    before: med,
    after: {
      kind: "medication",
      medication: { ...medication, strengthMg: 20, defaultQuantity: 2 },
    },
  })!;
  assert.equal(updated.heading, "Ritalin updated.");
  assert.equal(updated.message, "Strength: 10 mg → 20 mg");
  assert.deepEqual(
    updated.changes.map((row) => row.label),
    ["Strength", "Default amount"],
  );
  assert.deepEqual(updated.changes[1], {
    label: "Default amount",
    before: "1 tablet",
    after: "2 tablets",
  });
});

test("bench and return outcomes state selector availability and retain the saved history distinction", () => {
  const archived: NotificationPreviewRecord = {
    kind: "medication",
    medication: { ...medication, archived: true },
  };
  const removal = recordNotificationContent({ before: med, after: archived })!;
  assert.equal(removal.heading, "Ritalin benched.");
  assert.equal(removal.message, "Hidden from new intakes · Past entries kept");
  assert.match(removal.guidance, /Return to rotation/);
  const restoration = recordNotificationContent({
    before: archived,
    after: med,
  })!;
  assert.equal(restoration.heading, "Ritalin back in rotation.");
  assert.equal(
    restoration.message,
    "Available for new intakes · Past entries kept",
  );
});

test("check-in summaries use the saved period, tracking date and values including zero ratings", () => {
  const content = recordNotificationContent({ after: checkIn })!;
  assert.equal(content.heading, "Morning check-in saved.");
  assert.equal(
    content.message,
    "Sun, Nov 22 · 42 words · 1 feeling · 7.5h sleep",
  );
  assert.equal(content.primary, "Sunday Morning");
  const minimal = recordNotificationContent({
    after: {
      ...checkIn,
      period: "evening",
      words: 0,
      moods: [],
      sleepHours: null,
    },
  })!;
  assert.equal(minimal.message, "Sun, Nov 22 · Energy 0/5");
  assert.equal(minimal.heading, "Evening check-in saved.");
  assert.equal(
    recordNoticeChanges({
      before: checkIn,
      after: { ...checkIn, energy: 1 },
    })[0].before,
    "0/5",
  );
});

test("goal summaries keep zero maximums and cross-year ranges exact", () => {
  const goal: NotificationPreviewRecord = {
    kind: "goal",
    medication,
    dailyLimitMg: 0,
    startsOn: "2026-12-31",
    endsOn: "2027-01-02",
  };
  const saved = recordNotificationContent({ after: goal })!;
  assert.equal(saved.heading, "0 mg daily max saved.");
  assert.match(saved.message, /Ritalin · Thu, Dec 31, 2026 → Sat, Jan 2, 2027/);
  const removed = recordNotificationContent({ before: goal })!;
  assert.equal(removed.heading, "0 mg daily max removed.");
  assert.match(removed.title, /Entries kept/);
  assert.match(saved.guidance, /do not change intake records/);
});

test("timezone outcomes distinguish the display change from saved instants", () => {
  const content = recordNotificationContent({
    before: { kind: "timezone", timeZone: "Europe/Vienna" },
    after: { kind: "timezone", timeZone: "America/New_York" },
  })!;
  assert.equal(content.heading, "Journal timezone updated.");
  assert.equal(content.message, "America/New York · Days begin at 06:00");
  assert.deepEqual(content.changes, [
    { label: "Timezone", before: "Europe/Vienna", after: "America/New York" },
  ]);
  assert.match(content.guidance, /Saved instants stay the same/);
});

test("equal display facts never claim no changes and category ordering does not invent edits", () => {
  const equal = recordNotificationContent({ before: checkIn, after: checkIn })!;
  assert.equal(equal.heading, "Morning check-in updated.");
  assert.deepEqual(equal.changes, []);
  assert.equal(equal.operation, "updated");
  const before: NotificationPreviewRecord = {
    kind: "medication",
    medication: { ...medication, categories: ["stimulant", "supplement"] },
  };
  const after: NotificationPreviewRecord = {
    kind: "medication",
    medication: { ...medication, categories: ["supplement", "stimulant"] },
  };
  assert.deepEqual(recordNoticeChanges({ before, after }), []);
});

test("unsupported and invalid display data fall back without interrupting a confirmed save", () => {
  assert.equal(recordNotificationContent({}), undefined);
  assert.equal(
    recordNotificationContent({ before: med, after: intake }),
    undefined,
  );
  assert.equal(
    recordNotificationContent({ after: { ...intake, takenAt: "invalid" } }),
    undefined,
  );
  assert.equal(
    recordNotificationContent({ after: { ...checkIn, day: "invalid" } }),
    undefined,
  );
});
