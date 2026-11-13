import assert from "node:assert/strict";
import test from "node:test";
import {
  getCheckInLoggedTime,
  getCheckInUpdatedTime,
  getCheckInOpenedTime,
} from "./check-in-logged-time";

test("first opened remains distinct from the most recent save and uses the journal timezone", () => {
  const openedAt = Date.parse("2026-11-11T07:04:03.123Z");
  assert.deepEqual(getCheckInOpenedTime(openedAt, "Europe/Vienna"), {
    time: "08:04",
    dateTime: "2026-11-11T07:04:03.123Z",
    label:
      "First recorded opening 2026-11-11 at 08:04 · Europe/Vienna · On this device",
  });
  assert.equal(
    getCheckInUpdatedTime(
      { updatedAt: "2026-11-11T08:00:00Z" },
      "Europe/Vienna",
    )?.label,
    "Last updated 2026-11-11 at 09:00 · Europe/Vienna",
  );
});

test("first-open display never invents an instant for missing or invalid observations", () => {
  for (const value of [
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    0,
    1.5,
    253_402_300_800_000,
  ]) {
    assert.equal(getCheckInOpenedTime(value, "Europe/Vienna"), null);
  }
  assert.equal(
    getCheckInOpenedTime("2026-11-11T08:00:00Z" as never, "Europe/Vienna"),
    null,
  );
  assert.equal(
    getCheckInOpenedTime(Date.parse("2026-11-11T08:00:00Z"), "Invalid/Zone"),
    null,
  );
});

test("first-open labels retain the observation date through midnight and DST", () => {
  assert.equal(
    getCheckInOpenedTime(Date.parse("2026-11-11T23:30:00Z"), "Europe/Vienna")
      ?.label,
    "First recorded opening 2026-11-12 at 00:30 · Europe/Vienna · On this device",
  );
  assert.equal(
    getCheckInOpenedTime(Date.parse("2026-07-11T07:30:00Z"), "Europe/Vienna")
      ?.time,
    "09:30",
  );
});

test("shows the first saved instant in the journal timezone and preserves its exact datetime", () => {
  const createdAt = "2026-11-04T20:43:15.237Z";
  assert.deepEqual(getCheckInLoggedTime(createdAt, "Europe/Vienna"), {
    time: "21:43",
    dateTime: createdAt,
    label: "Logged 2026-11-04 at 21:43 · Europe/Vienna",
  });
  assert.equal(getCheckInLoggedTime(createdAt, "UTC")?.time, "20:43");
});

test("uses the actual summer and winter offsets rather than a fixed Vienna offset", () => {
  assert.equal(
    getCheckInLoggedTime("2026-07-04T20:43:00Z", "Europe/Vienna")?.time,
    "22:43",
  );
  assert.equal(
    getCheckInLoggedTime("2026-11-04T20:43:00Z", "Europe/Vienna")?.time,
    "21:43",
  );
});

test("handles both sides of the spring and autumn DST transitions", () => {
  for (const [createdAt, expected] of [
    ["2026-03-29T00:30:00Z", "01:30"],
    ["2026-03-29T01:30:00Z", "03:30"],
    ["2026-10-25T00:30:00Z", "02:30"],
    ["2026-10-25T01:30:00Z", "02:30"],
  ]) {
    assert.equal(
      getCheckInLoggedTime(createdAt, "Europe/Vienna")?.time,
      expected,
    );
  }
});

test("after-midnight and backdated saves retain the actual logging date in their label", () => {
  assert.deepEqual(
    getCheckInLoggedTime("2026-11-04T23:18:00Z", "Europe/Vienna"),
    {
      time: "00:18",
      dateTime: "2026-11-04T23:18:00Z",
      label: "Logged 2026-11-05 at 00:18 · Europe/Vienna",
    },
  );
});

test("accepts explicit positive and negative offsets as absolute logging instants", () => {
  assert.equal(
    getCheckInLoggedTime("2026-11-04T21:43:00+01:00", "UTC")?.time,
    "20:43",
  );
  assert.equal(
    getCheckInLoggedTime("2026-11-04T15:43:00-05:00", "Europe/Vienna")?.time,
    "21:43",
  );
});

test("missing, date-only and timezone-less legacy values never invent a logging time", () => {
  for (const createdAt of [
    undefined,
    "",
    "2026-11-04",
    "2026-11-04T21:43",
    "2026-11-04T21:43:00",
    "2026-11-04 21:43:00",
    "November 4, 2026 21:43 UTC",
  ]) {
    assert.equal(getCheckInLoggedTime(createdAt, "Europe/Vienna"), null);
  }
});

test("malformed calendar dates and out-of-range clock values stay unavailable", () => {
  for (const createdAt of [
    "not-a-date",
    "2026-02-30T21:43:00Z",
    "2026-13-04T21:43:00Z",
    "2026-11-04T24:00:00Z",
    "2026-11-04T21:60:00Z",
    "2026-11-04T21:43:60Z",
    "2026-11-04T21:43:00+99:00",
  ]) {
    assert.equal(getCheckInLoggedTime(createdAt, "Europe/Vienna"), null);
  }
});

test("an invalid journal timezone falls back without silently using the device timezone", () => {
  for (const timeZone of ["", "Not/A_Timezone"]) {
    assert.equal(getCheckInLoggedTime("2026-11-04T20:43:00Z", timeZone), null);
  }
});

test("last-updated time follows the successful edit, preserving the creation instant", () => {
  const record = {
    createdAt: "2026-11-04T07:12:00.000Z",
    updatedAt: "2026-11-04T21:57:00.123Z",
  };
  assert.deepEqual(getCheckInUpdatedTime(record, "Europe/Vienna"), {
    time: "22:57",
    dateTime: record.updatedAt,
    label: "Last updated 2026-11-04 at 22:57 · Europe/Vienna",
  });
  assert.equal(record.createdAt, "2026-11-04T07:12:00.000Z");
});

test("legacy missing or malformed update timestamps fall back to a validated creation instant", () => {
  for (const updatedAt of [
    undefined,
    "",
    "not-a-date",
    "2026-02-30T20:00:00Z",
    "2026-11-04T21:57",
  ]) {
    assert.equal(
      getCheckInUpdatedTime(
        { updatedAt, createdAt: "2026-11-04T07:12:00Z" },
        "Europe/Vienna",
      )?.time,
      "08:12",
    );
  }
  assert.equal(getCheckInUpdatedTime(undefined, "Europe/Vienna"), null);
  assert.equal(
    getCheckInUpdatedTime(
      { updatedAt: "bad", createdAt: "bad" },
      "Europe/Vienna",
    ),
    null,
  );
  assert.equal(
    getCheckInUpdatedTime(
      { updatedAt: "2026-11-04T21:57:00Z" },
      "Not/A_Timezone",
    ),
    null,
  );
});

test("updated display retains the actual after-midnight date across the tracking-day boundary", () => {
  assert.deepEqual(
    getCheckInUpdatedTime(
      { updatedAt: "2026-11-04T23:18:00Z" },
      "Europe/Vienna",
    ),
    {
      time: "00:18",
      dateTime: "2026-11-04T23:18:00Z",
      label: "Last updated 2026-11-05 at 00:18 · Europe/Vienna",
    },
  );
});
