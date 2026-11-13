import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, type Intake } from "./domain";
import {
  intakeReferenceDestination,
  referenceScrollTop,
} from "./journal-reference-navigation";

const entry = (id: string, takenAt: string): Intake => ({
  id,
  takenAt,
  medicationId: "med-1",
  medicationName: "Saved medication",
  strengthMg: 5,
  quantity: 1,
  createdAt: takenAt,
  note: "",
});

test("intake links follow the live journal day through the 06:00 boundary and timezone changes", () => {
  const data = emptyData();
  data.intakes = [
    entry("one", "2026-11-11T04:45:00Z"),
    entry("two", "2026-11-11T05:30:00Z"),
  ];
  const now = new Date("2026-11-11T10:00:00Z");
  assert.equal(
    intakeReferenceDestination(data, "one", now),
    "/history/2026-11-10?intake=one",
  );
  assert.equal(intakeReferenceDestination(data, "two", now), "/?intake=two");
  data.settings.timezone = "America/New_York";
  assert.equal(intakeReferenceDestination(data, "two", now), "/?intake=two");
  assert.equal(
    intakeReferenceDestination(data, "two", new Date("2026-11-11T12:00:00Z")),
    "/history/2026-11-10?intake=two",
  );
});

test("missing or future intake references never create a destination and IDs are URL-encoded", () => {
  const data = emptyData();
  data.intakes = [
    entry("future", "2026-11-12T12:00:00Z"),
    entry("a&b", "2026-11-11T09:00:00Z"),
  ];
  const now = new Date("2026-11-11T10:00:00Z");
  assert.equal(intakeReferenceDestination(data, "absent", now), null);
  assert.equal(intakeReferenceDestination(data, "future", now), null);
  assert.equal(intakeReferenceDestination(data, "a&b", now), "/?intake=a%26b");
});

test("reference placement centers above the dock and clamps short pages and tall cards", () => {
  const box = {
    top: 600,
    height: 80,
    scrollY: 100,
    viewportHeight: 800,
    maxScroll: 2000,
  };
  assert.equal(referenceScrollTop(box), 340);
  assert.equal(referenceScrollTop({ ...box, dockHeight: 160 }), 420);
  assert.equal(referenceScrollTop({ ...box, maxScroll: 90 }), 90);
  assert.equal(referenceScrollTop({ ...box, top: 0, scrollY: 0 }), 0);
  assert.equal(referenceScrollTop({ ...box, height: 1000 }), 684);
  assert.equal(referenceScrollTop({ ...box, top: NaN }), 0);
});
