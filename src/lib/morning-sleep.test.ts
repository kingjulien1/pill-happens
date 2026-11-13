import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyMorningSleep,
  getMorningSleepSummary,
  hasMorningSleepContent,
  hasMorningSleepData,
  isMorningSleepDraft,
  morningSleepDefaults,
  parseMorningSleepDraft,
} from "./morning-sleep";

test("a new sleep draft has no guessed ratings, clocks or zero durations", () => {
  const draft = morningSleepDefaults();
  assert.equal(isMorningSleepDraft(draft), true);
  assert.equal(hasMorningSleepContent(draft), false);
  assert.equal(hasMorningSleepData(emptyMorningSleep()), false);
  assert.deepEqual(parseMorningSleepDraft(draft), { value: null, error: null });
  assert.equal(draft.dreamRecall, null);
  assert.equal(draft.awakenings, "");
  assert.equal(draft.sleepHours, "");
  assert.equal(draft.extraSleepMinutes, "");
});

test("one optional response stays independent and does not fill neighboring fields", () => {
  const result = parseMorningSleepDraft({
    ...morningSleepDefaults(),
    sleepQuality: 10,
  });
  assert.equal(result.error, null);
  assert.deepEqual(result.value, { ...emptyMorningSleep(), sleepQuality: 10 });
  assert.equal(hasMorningSleepData(result.value), true);
  assert.equal(
    hasMorningSleepContent({ ...morningSleepDefaults(), dreamRecall: 1 }),
    true,
  );
});

test("explicit zero responses differ from unknown durations", () => {
  const result = parseMorningSleepDraft({
    ...morningSleepDefaults(),
    fallAsleepMinutes: "0",
    awakenings: "00",
    awakeMinutes: " 0 ",
    sleepHours: "0",
    extraSleepMinutes: "0",
  });
  assert.equal(result.error, null);
  assert.equal(result.value?.fallAsleepMinutes, 0);
  assert.equal(result.value?.awakenings, 0);
  assert.equal(result.value?.awakeMinutes, 0);
  assert.equal(result.value?.totalSleepMinutes, 0);
  assert.equal(result.value?.extraSleepMinutes, 0);
  assert.equal(result.value?.lightsOut, null);
});

test("clock-only overnight windows and efficiency use minutes without assuming a date or DST offset", () => {
  const sleep = {
    ...emptyMorningSleep(),
    lightsOut: "23:30",
    gotUp: "07:30",
    totalSleepMinutes: 420,
  };
  assert.deepEqual(getMorningSleepSummary(sleep), {
    timeInBedMinutes: 480,
    sleepEfficiency: 87.5,
  });
  assert.deepEqual(
    getMorningSleepSummary({ ...sleep, lightsOut: "01:00", gotUp: "08:00" }),
    { timeInBedMinutes: 420, sleepEfficiency: 100 },
  );
  assert.deepEqual(getMorningSleepSummary({ ...sleep, totalSleepMinutes: 0 }), {
    timeInBedMinutes: 480,
    sleepEfficiency: 0,
  });
  assert.equal(
    getMorningSleepSummary({ ...sleep, gotUp: null }).sleepEfficiency,
    null,
  );
  assert.equal(
    getMorningSleepSummary({ ...sleep, totalSleepMinutes: null })
      .sleepEfficiency,
    null,
  );
  assert.equal(
    getMorningSleepSummary({ ...sleep, lightsOut: "25:00" }).timeInBedMinutes,
    null,
  );
});

test("equal clocks are a zero window and cannot silently become a whole day", () => {
  const base = {
    ...morningSleepDefaults(),
    lightsOut: "08:00",
    gotUp: "08:00",
    sleepHours: "0",
  };
  const parsed = parseMorningSleepDraft(base);
  assert.equal(parsed.error, null);
  assert.deepEqual(getMorningSleepSummary(parsed.value), {
    timeInBedMinutes: 0,
    sleepEfficiency: null,
  });
  assert.match(
    parseMorningSleepDraft({ ...base, sleepMinutes: "1" }).error ?? "",
    /longer than/,
  );
});

test("total sleep longer than a known window is rejected and invalid stored estimates never show efficiency above 100%", () => {
  const draft = {
    ...morningSleepDefaults(),
    lightsOut: "00:00",
    gotUp: "07:00",
    sleepHours: "8",
  };
  assert.match(
    parseMorningSleepDraft(draft).error ?? "",
    /Total sleep cannot be longer/,
  );
  assert.equal(
    getMorningSleepSummary({
      ...emptyMorningSleep(),
      lightsOut: "00:00",
      gotUp: "07:00",
      totalSleepMinutes: 480,
    }).sleepEfficiency,
    null,
  );
  assert.equal(
    parseMorningSleepDraft({ ...draft, gotUp: "" }).error,
    null,
    "an unknown window does not guess a conflicting duration",
  );
});

test("five ratings accept only whole 1–10 values and have no inferred middle point", () => {
  for (const value of [1, 10])
    assert.equal(
      parseMorningSleepDraft({ ...morningSleepDefaults(), dreamRecall: value })
        .value?.dreamRecall,
      value,
    );
  for (const value of [0, 11, 1.5, NaN, Infinity]) {
    const draft = { ...morningSleepDefaults(), sleepDepth: value };
    assert.equal(isMorningSleepDraft(draft), false);
    assert.notEqual(parseMorningSleepDraft(draft).error, null);
  }
});

test("raw unfinished text can survive a draft but save parsing enforces clocks and duration bounds", () => {
  for (const patch of [
    { fallAsleepMinutes: "-" },
    { awakeMinutes: "1.5" },
    { awakenings: "101" },
    { fallAsleepMinutes: "1441" },
    { awakeMinutes: "NaN" },
    { sleepMinutes: "60" },
    { sleepHours: "24", sleepMinutes: "1" },
    { extraSleepHours: "25" },
    { extraSleepMinutes: "-1" },
    { lightsOut: "24:00" },
    { gotUp: "7:05" },
  ]) {
    const draft = { ...morningSleepDefaults(), ...patch };
    assert.equal(isMorningSleepDraft(draft), true);
    assert.notEqual(
      parseMorningSleepDraft(draft).error,
      null,
      JSON.stringify(patch),
    );
  }
  assert.equal(
    isMorningSleepDraft({
      ...morningSleepDefaults(),
      sleepHours: "1".repeat(257),
    }),
    false,
  );
  assert.equal(isMorningSleepDraft([]), false);
  assert.equal(isMorningSleepDraft(null), false);
  assert.equal(
    parseMorningSleepDraft({
      ...morningSleepDefaults(),
      sleepHours: "24",
      extraSleepHours: "24",
    }).value?.totalSleepMinutes,
    1_440,
  );
});

test("legacy sleep hours prefill only a known duration and canonical unknown stays unknown", () => {
  assert.equal(morningSleepDefaults(undefined, 7.5).sleepHours, "7");
  assert.equal(morningSleepDefaults(undefined, 7.5).sleepMinutes, "30");
  assert.equal(morningSleepDefaults(undefined, 0).sleepHours, "0");
  assert.equal(morningSleepDefaults(undefined, 7.5).sleepQuality, null);
  assert.equal(morningSleepDefaults(emptyMorningSleep(), 7.5).sleepHours, "");
  for (const invalid of [NaN, Infinity, -1, 25, null])
    assert.equal(morningSleepDefaults(undefined, invalid).sleepHours, "");
  const saved = Object.freeze({
    ...emptyMorningSleep(),
    totalSleepMinutes: 455,
    extraSleepMinutes: 35,
  });
  const draft = morningSleepDefaults(saved);
  assert.equal(draft.sleepHours, "7");
  assert.equal(draft.sleepMinutes, "35");
  assert.equal(draft.extraSleepHours, "0");
  assert.equal(draft.extraSleepMinutes, "35");
  assert.deepEqual(parseMorningSleepDraft(Object.freeze(draft)), {
    value: saved,
    error: null,
  });
});
