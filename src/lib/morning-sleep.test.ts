import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyMorningSleep,
  getMorningSleepSummary,
  hasMorningSleepContent,
  hasMorningSleepData,
  isMorningSleepDraft,
  morningSleepDefaults,
  nightFeelingPercent,
  parseMorningSleepDraft,
  withSleepStageTotals,
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

test("complete report stages derive total sleep and the gap to 10 h 30 min through saving and reopening", () => {
  const draft = {
    ...morningSleepDefaults(),
    lightsOut: "01:40",
    gotUp: "12:49",
    lightMinutes: "227",
    dreamMinutes: "55",
    deepMinutes: "65",
  };
  const calculated = withSleepStageTotals(Object.freeze(draft));
  assert.equal(calculated.sleepHours, "5");
  assert.equal(calculated.sleepMinutes, "47");
  assert.equal(calculated.extraSleepHours, "4");
  assert.equal(calculated.extraSleepMinutes, "43");
  const parsed = parseMorningSleepDraft(draft);
  assert.equal(parsed.error, null);
  assert.equal(parsed.value?.totalSleepMinutes, 347);
  assert.equal(parsed.value?.extraSleepMinutes, 283);
  const reopened = morningSleepDefaults(parsed.value);
  assert.equal(reopened.sleepMinutes, "47");
  assert.equal(reopened.extraSleepMinutes, "43");
});

test("zero stage values remain valid and sleep at or beyond the reference yields zero extra sleep", () => {
  for (const [light, dream, deep, total, extra] of [
    [0, 0, 0, 0, 630],
    [600, 30, 0, 630, 0],
    [600, 60, 60, 720, 0],
  ]) {
    const parsed = parseMorningSleepDraft({
      ...morningSleepDefaults(),
      lightMinutes: String(light),
      dreamMinutes: String(dream),
      deepMinutes: String(deep),
    });
    assert.equal(parsed.error, null);
    assert.equal(parsed.value?.totalSleepMinutes, total);
    assert.equal(parsed.value?.extraSleepMinutes, extra);
    const reopened = morningSleepDefaults(parsed.value);
    assert.equal(reopened.sleepMinutes, String(total % 60));
    assert.equal(reopened.extraSleepMinutes, String(extra % 60));
  }
});

test("partial stages replace a legacy total while invalid stage edits cannot be saved", () => {
  const base = {
    ...morningSleepDefaults({
      ...emptyMorningSleep(),
      totalSleepMinutes: 455,
      extraSleepMinutes: 35,
    }),
    lightMinutes: "227",
    dreamMinutes: "55",
  };
  for (const deepMinutes of ["-", "1.5", "-1", "1441", "1440"]) {
    const draft = { ...base, deepMinutes };
    const calculated = withSleepStageTotals(draft);
    assert.equal(calculated, draft);
    assert.equal(calculated.sleepHours, "7");
    assert.equal(calculated.sleepMinutes, "35");
    assert.equal(calculated.extraSleepHours, "0");
    assert.equal(calculated.extraSleepMinutes, "35");
    assert.ok(parseMorningSleepDraft(draft).error);
  }
  assert.equal(parseMorningSleepDraft(base).value?.totalSleepMinutes, 282);
});

test("the recorded stages give the same total for missing and zero deep sleep", () => {
  for (const deepMinutes of [undefined, "", "0"]) {
    const draft = {
      ...morningSleepDefaults(),
      lightMinutes: "379",
      dreamMinutes: "107",
      deepMinutes,
      lightsOut: "00:34",
      gotUp: "12:37",
      regularity: "81",
      snoringMinutes: "0",
      coughingRate: "0.4",
    };
    const { value, error } = parseMorningSleepDraft(draft);
    assert.equal(error, null);
    assert.equal(value?.totalSleepMinutes, 486);
    assert.equal(value.extraSleepMinutes, 144);
    assert.equal(value.deepMinutes, deepMinutes === "0" ? 0 : undefined);
    assert.deepEqual(value.nightSounds, {
      snoringMinutes: 0,
      coughingRate: 0.4,
    });
    assert.equal(value.coughingRate, undefined);
    assert.equal(value.regularity, 81);
    const { timeInBedMinutes, sleepEfficiency } = getMorningSleepSummary(value);
    assert.equal(timeInBedMinutes, 723);
    assert.equal(Math.round(sleepEfficiency!), 67);
    assert.equal(morningSleepDefaults(value).coughingRate, "0.4");
  }
});

test("night feeling scales answered ratings from 0 to 100 and reverses sleepiness", () => {
  const empty = emptyMorningSleep();
  assert.equal(
    nightFeelingPercent({ ...empty, dreamRecall: 10 } as typeof empty),
    null,
  );
  assert.equal(nightFeelingPercent({ ...empty, sleepiness: 10 }), 0);
  assert.equal(nightFeelingPercent({ ...empty, sleepiness: 1 }), 100);
  assert.equal(
    nightFeelingPercent({ ...empty, sleepQuality: 10, sleepDepth: 1 }),
    50,
  );
  assert.equal(nightFeelingPercent({ ...empty, restfulness: 7 }), 67);
});
