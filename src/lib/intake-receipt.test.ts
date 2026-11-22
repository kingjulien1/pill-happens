import assert from "node:assert/strict";
import test from "node:test";
import {
  intakeReceiptDestinations,
  intakeReceiptMeta,
  isIntakeReceipt,
} from "./intake-receipt";
import type { IntakeSnapshot } from "./intake-update-preview";

const record: IntakeSnapshot = {
  kind: "intake",
  name: "Ritalin",
  quantity: 1,
  strengthMg: 10,
  form: "tablet",
  route: "oral",
  takenAt: "2026-11-22T13:39:00Z",
  timeZone: "Europe/Vienna",
};

test("the receipt layout applies to created and updated intakes without changing removals or other previews", () => {
  assert.equal(isIntakeReceipt({ after: record }), true);
  assert.equal(isIntakeReceipt({ before: record, after: record }), true);
  assert.equal(isIntakeReceipt({ before: record }), false);
  assert.equal(isIntakeReceipt(undefined), false);
  assert.equal(
    isIntakeReceipt({
      before: { kind: "timezone", timeZone: "UTC" },
      after: record,
    }),
    false,
  );
  assert.equal(
    isIntakeReceipt({ after: { kind: "timezone", timeZone: "UTC" } }),
    false,
  );
});

test("the primary destination preserves the highlighted intake and medication links exactly", () => {
  const links = [
    { label: "Earlier day", href: "/history/2026-11-21" },
    {
      label: "View Entry",
      href: "/history/2026-11-22?view=log&intake=record%2Fid#entry",
    },
    {
      label: "Medication",
      href: "/medications?medication=medicine%2Fid#details",
    },
    { label: "Guide", href: "/guide" },
  ];
  const destinations = intakeReceiptDestinations(links);
  assert.deepEqual(destinations.entry, { ...links[1], kind: "entry" });
  assert.deepEqual(destinations.medication, links[2]);
  assert.equal(links.length, 4);
});

test("day-only and missing destinations use honest existing page fallbacks", () => {
  assert.equal(
    intakeReceiptDestinations([{ label: "Day", href: "/history/2026-11-22" }])
      .entry.kind,
    "day",
  );
  assert.deepEqual(
    intakeReceiptDestinations([{ label: "Today", href: "/?view=day" }]).entry,
    { label: "Today", href: "/?view=day", kind: "today" },
  );
  assert.deepEqual(
    intakeReceiptDestinations([{ label: "Guide", href: "/guide" }]),
    {
      entry: { label: "Daily log", href: "/", kind: "today" },
      medication: { label: "Medications", href: "/medications" },
    },
  );
});

test("the subheading uses recorded date and time in the journal timezone", () => {
  assert.deepEqual(intakeReceiptMeta(record), {
    weekday: "Sunday",
    date: "November 22, 2026",
    clock: "14:39",
    trackingDay: "2026-11-22",
    trackingDate: "Sun, Nov 22",
    previousCalendarDay: false,
    route: "Swallowed",
    form: "Tablet",
  });
  assert.equal(
    intakeReceiptMeta({ ...record, timeZone: "America/New_York" }).clock,
    "08:39",
  );
});

test("before-06:00 entries explain the preceding tracking day rather than filing under the calendar date", () => {
  const early = intakeReceiptMeta({
    ...record,
    takenAt: "2026-11-22T02:30:00Z",
  });
  assert.equal(early.weekday, "Sunday");
  assert.equal(early.clock, "03:30");
  assert.equal(early.trackingDay, "2026-11-21");
  assert.equal(early.trackingDate, "Sat, Nov 21");
  assert.equal(early.previousCalendarDay, true);
  assert.equal(
    intakeReceiptMeta({ ...record, takenAt: "2026-11-22T05:00:00Z" })
      .previousCalendarDay,
    false,
  );
  assert.equal(
    intakeReceiptMeta({ ...record, takenAt: "2026-10-25T00:30:00Z" })
      .trackingDay,
    "2026-10-24",
  );
});

test("missing route and form remain explicitly unspecified", () => {
  const metadata = intakeReceiptMeta({
    ...record,
    route: undefined,
    form: undefined,
  });
  assert.equal(metadata.route, "Not specified");
  assert.equal(metadata.form, "Not specified");
});
