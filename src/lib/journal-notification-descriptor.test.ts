import assert from "node:assert/strict";
import test from "node:test";
import {
  isPersistedNotificationDescriptor,
  journalNotificationDescriptor,
} from "./journal-notification-descriptor";

const notice = {
  version: 1,
  kind: "success",
  heading: "Intake saved",
  message: "Your entry is back in place.",
  dismissible: true,
  details: {
    preview: {
      after: {
        kind: "intake",
        name: "Synthetic tablet",
        quantity: 0.5,
        strengthMg: 2,
        takenAt: "2026-11-17T18:00:00Z",
        timeZone: "Europe/Vienna",
        form: "tablet",
        route: "oral",
      },
    },
    links: [
      { label: "View entry", href: "/history/2026-11-17?intake=synthetic" },
    ],
  },
  undo: {
    receipt: {
      token: "synthetic-signed-receipt",
      expiresAt: "2026-11-17T18:15:00Z",
    },
  },
};

test("a confirmed intake, links and original Undo expiry round-trip as data", () => {
  const value = JSON.parse(JSON.stringify(notice));
  assert.equal(isPersistedNotificationDescriptor(value), true);
  assert.deepEqual(journalNotificationDescriptor.parse(value), notice);
});

test("unchanged notices retain their informational treatment and destinations after restoring", () => {
  const value = {
    ...notice,
    kind: "info",
    variant: "unchanged",
    heading: "Nothing changed.",
    message: "Your saved details already match.",
    undo: undefined,
  };
  const restored = journalNotificationDescriptor.parse(
    JSON.parse(JSON.stringify(value)),
  );
  assert.equal(restored.variant, "unchanged");
  assert.equal(restored.kind, "info");
  assert.equal(restored.undo, undefined);
  assert.deepEqual(restored.details?.links, notice.details.links);
});

test("medication switches preserve the confirmed identity comparison without record IDs", () => {
  for (const medicationChanged of [true, false]) {
    const value = structuredClone(notice);
    const preview = {
      ...value.details.preview,
      before: value.details.preview.after,
      medicationChanged,
    };
    value.details.preview = preview;
    const parsed = journalNotificationDescriptor.parse(value);
    assert.equal(parsed.details?.preview?.medicationChanged, medicationChanged);
    assert.equal(JSON.stringify(parsed).includes("medicationId"), false);
  }
});

test("restored previews reject invalid calendar dates, timezones and dose data", () => {
  for (const patch of [
    { takenAt: "not a date" },
    { timeZone: "Made/Up" },
    { quantity: -1 },
    { strengthMg: Infinity },
    { form: "unknown-form" },
  ]) {
    const value = structuredClone(notice);
    Object.assign(value.details.preview.after, patch);
    assert.equal(isPersistedNotificationDescriptor(value), false);
  }
  assert.equal(
    isPersistedNotificationDescriptor({
      ...notice,
      details: {
        preview: {
          after: {
            kind: "goal",
            dailyLimitMg: 1,
            startsOn: "2026-02-30",
            endsOn: null,
          },
        },
      },
    }),
    false,
  );
});

test("saved related links stay within known local journal destinations", () => {
  for (const href of [
    "javascript:alert(1)",
    "//example.com",
    "/\\example.com",
    "https://example.com",
    "/api/logout",
  ]) {
    const value = structuredClone(notice);
    value.details.links[0].href = href;
    assert.equal(isPersistedNotificationDescriptor(value), false, href);
  }
  for (const href of [
    "/",
    "/journal",
    "/medications?medication=synthetic",
    "/guide#start",
    "/developer-guide#notifications",
    "/streaks",
  ]) {
    const value = structuredClone(notice);
    value.details.links[0].href = href;
    assert.equal(isPersistedNotificationDescriptor(value), true, href);
  }
});

test("malformed record types and Undo receipt metadata are refused", () => {
  for (const patch of [
    { version: 2 },
    { kind: "invented" },
    { dismissible: "yes" },
    { undo: { receipt: { token: "", expiresAt: "2026-11-17T18:15:00Z" } } },
    { undo: { receipt: { token: "synthetic", expiresAt: "later" } } },
    { details: { preview: { after: { kind: "invented" } } } },
  ])
    assert.equal(
      isPersistedNotificationDescriptor({ ...notice, ...patch }),
      false,
    );
});

test("medication snapshots require supported colors, categories and symbols", () => {
  const medication = {
    name: "Synthetic",
    strengthMg: 2,
    defaultQuantity: 1,
    form: "tablet",
    color: "pink",
    icon: "pill",
    archived: false,
    categories: ["benzodiazepine"],
  };
  const make = (patch = {}) => ({
    ...notice,
    details: {
      preview: {
        after: { kind: "medication", medication: { ...medication, ...patch } },
      },
    },
  });
  assert.equal(isPersistedNotificationDescriptor(make()), true);
  for (const patch of [
    { color: "made-up" },
    { icon: "<svg/>" },
    { categories: ["made-up"] },
  ])
    assert.equal(isPersistedNotificationDescriptor(make(patch)), false);
});
