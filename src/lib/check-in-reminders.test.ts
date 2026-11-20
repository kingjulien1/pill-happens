import assert from "node:assert/strict";
import test from "node:test";
import { checkInDefaults, isCheckInDraft } from "./check-in-draft";
import {
  reminderItems,
  remindersCount,
  serializeReminders,
} from "./check-in-reminders";

test("older multiline reminders preserve every character through conversion", () => {
  const text = "  A walk.\r\n\n- Call a friend\n";
  const rows = reminderItems(text);
  assert.deepEqual(
    rows.map(({ text }) => text),
    ["  A walk.\r", "", "- Call a friend", ""],
  );
  assert.equal(serializeReminders(rows), text);
  assert.deepEqual(reminderItems(text), rows);
  assert.deepEqual(reminderItems(""), []);
  assert.equal(remindersCount(text), 2);
  assert.equal(remindersCount(" \n\r\n"), 0);
});

test("blank and unfinished draft rows retain stable identity on reopening", () => {
  const rows = [
    { id: "first", text: "" },
    { id: "second", text: "Call " },
    { id: "third", text: "" },
  ];
  const text = serializeReminders(rows);
  const restored = reminderItems(text, JSON.parse(JSON.stringify(rows)));
  assert.deepEqual(restored, rows);
  assert.notEqual(restored, rows);
  assert.deepEqual(reminderItems("", [{ id: "empty-editor", text: "" }]), [
    { id: "empty-editor", text: "" },
  ]);
});

test("stale, duplicate, malformed or multiline metadata falls back to the complete saved text", () => {
  const text = "Walk\nTalk";
  const fallback = reminderItems(text);
  for (const raw of [
    { rows: [] },
    null,
    [{ id: "a", text: "different" }],
    [
      { id: "a", text: "Walk" },
      { id: "a", text: "Talk" },
    ],
    [{ id: "", text: text }],
    [{ id: "x".repeat(81), text }],
    [{ id: "a", text: 1 }],
    [{ id: "a", text }],
    [null],
  ]) {
    assert.deepEqual(reminderItems(text, raw), fallback);
  }
});

test("draft metadata never makes otherwise recoverable writing fail validation", () => {
  const draft = {
    ...checkInDefaults(),
    note: "Words worth keeping.",
    helped: "A walk.",
    helpedList: { corrupted: true },
  };
  assert.equal(isCheckInDraft(draft), true);
  assert.equal(
    reminderItems(draft.helped, draft.helpedList)[0].text,
    "A walk.",
  );
});

test("the existing 800-character budget includes separators and empty rows", () => {
  const rows = [
    { id: "a", text: "a".repeat(799) },
    { id: "b", text: "" },
  ];
  const text = serializeReminders(rows);
  assert.equal(text.length, 800);
  assert.deepEqual(reminderItems(text, rows), rows);
  const beyond = [...rows, { id: "c", text: "" }];
  assert.equal(serializeReminders(beyond).length, 801);
  assert.equal(
    isCheckInDraft({
      ...checkInDefaults(),
      helped: serializeReminders(beyond),
      helpedList: beyond,
    }),
    false,
  );
  assert.deepEqual(
    reminderItems(
      "",
      Array.from({ length: 802 }, (_, index) => ({
        id: String(index),
        text: "",
      })),
    ),
    [],
  );
});
