import assert from "node:assert/strict";
import { test } from "node:test";
import { morningSleepDefaults, parseMorningSleepDraft } from "./morning-sleep";
import { readReportValue } from "./sleep-cycle-report";

test("Sleep Cycle readings retain clock times, stages and measured zeroes on reopening", () => {
  const fields = {
    reportScore: "84",
    lightsOut: "01:40",
    gotUp: "12:49",
    awakeMinutes: "5h 24m",
    dreamMinutes: "55 min",
    lightMinutes: "3h 47m",
    deepMinutes: "1h 05m",
    fallAsleepMinutes: "1h 09m",
    regularity: "83%",
    snoringMinutes: "0 min",
    coughingRate: "0.0 /h",
  } as const;
  const draft = morningSleepDefaults();
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    const value = readReportValue(key, fields[key]);
    assert.ok(value !== undefined);
    draft[key] = value;
  }
  const saved = parseMorningSleepDraft(draft);
  assert.equal(saved.error, null);
  assert.equal(saved.value?.awakeMinutes, 324);
  assert.equal(saved.value?.deepMinutes, 65);
  const reopened = morningSleepDefaults(saved.value);
  assert.equal(reopened.coughingRate, "0");
  assert.equal(reopened.snoringMinutes, "0");
  assert.equal(reopened.gotUp, "12:49");
  assert.equal(readReportValue("deepMinutes", "illegible"), undefined);
  assert.equal(readReportValue("regularity", "108%"), undefined);
  assert.equal(readReportValue("deepMinutes", "0"), "0");
  assert.equal(readReportValue("coughingRate", "0,4 /h"), "0.4");
  assert.equal(readReportValue("coughingRate", "04 /h"), undefined);
});
