import {
  dayKey,
  doseMg,
  isValidDayKey,
  shiftDayKey,
  type AppData,
  type Intake,
} from "@/lib/domain";
import {
  DAILY_MOODS,
  type DailyCheckIn,
  type DailyMood,
} from "@/lib/daily-check-in";
import { loggingStreak, streakMilestone } from "@/lib/logging-streak";
import type { MedicationColor } from "@/lib/medication-appearance";

const earlyTargets = [2, 3, 4, 5, 7, 10, 13, 15, 17, 20, 25, 30] as const;
const dayMilliseconds = 86_400_000;
const isoTimestamp =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

export type StreakPalette = { accent: string; pop: string; spark: string };
export type RatingSummary = { mean: number | null; count: number };
export type StreakWindowSummary = {
  start: string;
  end: string;
  dayCount: number;
  loggedDays: number;
  intakeCount: number;
  checkInDays: number;
  noteDays: number;
  energy: RatingSummary;
  stress: RatingSummary;
  sleepHours: RatingSummary;
  moods: { value: DailyMood; label: string; emoji: string; count: number }[];
  checkIns: DailyCheckIn[];
};
export type StreakRatingChange = {
  key: "energy" | "stress" | "sleepHours";
  label: string;
  current: number | null;
  previous: number | null;
  currentCount: number;
  previousCount: number;
  delta: number | null;
  trend: "improved" | "worse" | "unchanged" | "neutral" | "insufficient";
};
export type StreakMedicationChange = {
  medicationId: string;
  name: string;
  color: MedicationColor;
  isBenzodiazepine: boolean;
  isOpioid: boolean;
  currentTotalMg: number | null;
  previousTotalMg: number | null;
  currentLoggedDays: number;
  previousLoggedDays: number;
  currentMeanMg: number | null;
  previousMeanMg: number | null;
  delta: number | null;
  direction: "lower" | "higher" | "same" | "insufficient";
};
export type MilestoneAnalytics = {
  current: StreakWindowSummary;
  previous: StreakWindowSummary;
  ratings: StreakRatingChange[];
  medications: StreakMedicationChange[];
};
export type StreakMilestone = {
  target: number;
  achieved: boolean;
  achievedOn: string | null;
  runStart: string | null;
  windowEnd: string | null;
  currentProgress: number;
  remaining: number;
  emoji: string;
  title: string;
  encouragement: string;
  palette: StreakPalette;
  analytics: MilestoneAnalytics | null;
};

const looks = [
  [
    "🌱",
    "A Little Momentum",
    "A small beginning can hold a lot of possibility.",
  ],
  ["✨", "Showing Up", "Every day you record adds a little more clarity."],
  ["🪁", "Finding Your Rhythm", "Your pace counts. Keep making room for it."],
  ["🙌", "High Five", "Let this little win have its moment."],
  ["🌈", "A Week Of Showing Up", "Small steps still leave a colorful trail."],
  ["🎉", "Double Digits", "You made space for ten days of your story."],
  ["🌻", "Growing A Little", "Keep what helps. There is room to begin again."],
  ["💫", "Steady Steps", "A little consistency is worth celebrating."],
  ["🦋", "More Of Your Story", "One honest entry at a time is enough."],
  [
    "🎈",
    "Twenty And Counting",
    "These recorded days are yours to look back on.",
  ],
  ["🪩", "Keep Your Spark", "Let the small wins catch the light."],
  [
    "🏵️",
    "A Month Of Momentum",
    "Take a moment for everything you have recorded.",
  ],
] as const;
const laterLooks = [
  [
    "🚀",
    "Your Next Chapter",
    "Keep going gently. There is more of your story to see.",
  ],
  ["🌟", "A Brighter Trail", "Little moments of attention add up."],
  [
    "🎊",
    "Look At You Go",
    "You can celebrate showing up without rushing ahead.",
  ],
  [
    "🧡",
    "Room To Grow",
    "Progress can be quiet and still deserve a celebration.",
  ],
  [
    "🍀",
    "Another Little Win",
    "A new day is another chance to make a useful note.",
  ],
  [
    "🪷",
    "In Your Own Time",
    "Your recorded history stays with you, even after a pause.",
  ],
] as const;
const palettes: readonly StreakPalette[] = [
  { accent: "#fb923c", pop: "#f472b6", spark: "#fbbf24" },
  { accent: "#a78bfa", pop: "#f472b6", spark: "#67e8f9" },
  { accent: "#34d399", pop: "#38bdf8", spark: "#fde047" },
  { accent: "#f472b6", pop: "#c084fc", spark: "#fdba74" },
  { accent: "#38bdf8", pop: "#818cf8", spark: "#f9a8d4" },
  { accent: "#fbbf24", pop: "#fb7185", spark: "#c4b5fd" },
];

/** The milestone sequence keeps its small early steps, then grows by five. */
export function isStreakMilestoneTarget(target: number) {
  return (
    Number.isSafeInteger(target) &&
    (earlyTargets.some((value) => value === target) ||
      (target >= 35 && target % 5 === 0))
  );
}

/** Cheap, deterministic artwork metadata; safe to use in the closed popover. */
export function getMilestoneLook(target: number) {
  const earlyIndex = earlyTargets.findIndex((value) => value === target);
  const laterIndex = Number.isSafeInteger(target)
    ? Math.max(0, Math.floor((target - 35) / 5))
    : 0;
  const look =
    earlyIndex >= 0
      ? looks[earlyIndex]
      : laterLooks[laterIndex % laterLooks.length];
  const paletteIndex = earlyIndex >= 0 ? earlyIndex : laterIndex + looks.length;
  return {
    emoji: look[0],
    title: look[1],
    encouragement: look[2],
    palette: { ...palettes[paletteIndex % palettes.length] },
  };
}

type DatedIntake = { intake: Intake; day: string };
type Run = { start: string; end: string; length: number };
type Context = {
  data: AppData;
  streak: ReturnType<typeof loggingStreak>;
  entries: DatedIntake[];
  checkIns: DailyCheckIn[];
  runs: Run[];
};

function validTimestamp(value: string, now: number) {
  const match = isoTimestamp.exec(value);
  if (!match || !isValidDayKey(match[1])) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now;
}

const ordinal = (day: string) =>
  Date.parse(`${day}T00:00:00.000Z`) / dayMilliseconds;
const clean = (value: number) => Number(value.toFixed(8));

function contextFor(
  data: AppData,
  now: Date,
  includeCheckIns: boolean,
): Context {
  const today = dayKey(now, data.settings.timezone);
  const nowTimestamp = now.getTime();
  const streak = loggingStreak(data, today, now);
  const entries: DatedIntake[] = [];
  for (const intake of data.intakes) {
    if (!validTimestamp(intake.takenAt, nowTimestamp)) continue;
    try {
      const day = dayKey(intake.takenAt, data.settings.timezone);
      if (day <= today) entries.push({ intake, day });
    } catch {
      // A malformed legacy entry never interrupts the remaining journal.
    }
  }
  const days = [...new Set(entries.map((entry) => entry.day))].sort();
  const runs: Run[] = [];
  for (const day of days) {
    const previous = runs.at(-1);
    if (previous && ordinal(day) === ordinal(previous.end) + 1) {
      previous.end = day;
      previous.length += 1;
    } else {
      runs.push({ start: day, end: day, length: 1 });
    }
  }
  // One saved response per day. Prefer the latest valid edit if legacy data
  // happens to contain duplicates, without changing the stored collection.
  const checkIns = new Map<string, DailyCheckIn>();
  for (const entry of includeCheckIns ? (data.dailyCheckIns ?? []) : []) {
    if (
      !isValidDayKey(entry.day) ||
      entry.day > today ||
      !validTimestamp(entry.createdAt, nowTimestamp) ||
      !validTimestamp(entry.updatedAt, nowTimestamp)
    )
      continue;
    const previous = checkIns.get(entry.day);
    if (
      !previous ||
      Date.parse(entry.updatedAt) > Date.parse(previous.updatedAt)
    )
      checkIns.set(entry.day, entry);
  }
  return {
    data,
    streak,
    entries,
    checkIns: [...checkIns.values()].sort((a, b) => a.day.localeCompare(b.day)),
    runs,
  };
}

function ratingSummary(values: (number | null)[]): RatingSummary {
  const present = values.filter((value): value is number => value !== null);
  return {
    mean: present.length
      ? Number(
          (
            present.reduce((sum, value) => sum + value, 0) / present.length
          ).toFixed(2),
        )
      : null,
    count: present.length,
  };
}

function validScale(value: number | null) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
    ? value
    : null;
}

function summarizeWindow(
  context: Context,
  start: string,
  end: string,
  dayCount: number,
): StreakWindowSummary {
  const entries = context.entries.filter(
    (entry) => entry.day >= start && entry.day <= end,
  );
  const checkIns = context.checkIns.filter(
    (entry) => entry.day >= start && entry.day <= end,
  );
  const noteDays = new Set(
    entries
      .filter(({ intake }) => intake.note.trim())
      .map((entry) => entry.day),
  );
  for (const entry of checkIns) {
    if (entry.note.trim() || entry.helped.trim()) noteDays.add(entry.day);
  }
  return {
    start,
    end,
    dayCount,
    loggedDays: new Set(entries.map((entry) => entry.day)).size,
    intakeCount: entries.length,
    checkInDays: checkIns.length,
    noteDays: noteDays.size,
    energy: ratingSummary(checkIns.map((entry) => validScale(entry.energy))),
    stress: ratingSummary(checkIns.map((entry) => validScale(entry.stress))),
    sleepHours: ratingSummary(
      checkIns.map((entry) =>
        typeof entry.sleepHours === "number" &&
        Number.isFinite(entry.sleepHours) &&
        entry.sleepHours >= 0 &&
        entry.sleepHours <= 24
          ? entry.sleepHours
          : null,
      ),
    ),
    moods: DAILY_MOODS.map((mood) => ({
      ...mood,
      count: checkIns.filter((entry) => entry.moods.includes(mood.value))
        .length,
    })).filter((mood) => mood.count > 0),
    checkIns: checkIns.map((entry) => ({ ...entry, moods: [...entry.moods] })),
  };
}

function ratingChange(
  current: StreakWindowSummary,
  previous: StreakWindowSummary,
  key: StreakRatingChange["key"],
  label: string,
): StreakRatingChange {
  const currentValue = current[key];
  const previousValue = previous[key];
  const sufficient = currentValue.count >= 2 && previousValue.count >= 2;
  const delta = sufficient
    ? Number((currentValue.mean! - previousValue.mean!).toFixed(2))
    : null;
  const trend = !sufficient
    ? "insufficient"
    : key === "sleepHours"
      ? "neutral"
      : delta === 0
        ? "unchanged"
        : (key === "energy" ? delta! > 0 : delta! < 0)
          ? "improved"
          : "worse";
  return {
    key,
    label,
    current: currentValue.mean,
    previous: previousValue.mean,
    currentCount: currentValue.count,
    previousCount: previousValue.count,
    delta,
    trend,
  };
}

type MedicationWindow = { total: number; days: Set<string> };
function medicationChanges(
  context: Context,
  current: StreakWindowSummary,
  previous: StreakWindowSummary,
): StreakMedicationChange[] {
  const medications = new Map(
    context.data.medications.map((entry) => [entry.id, entry]),
  );
  const records = new Map<
    string,
    { name: string; current?: MedicationWindow; previous?: MedicationWindow }
  >();
  for (const { intake, day } of context.entries) {
    const window =
      day >= current.start && day <= current.end
        ? "current"
        : day >= previous.start && day <= previous.end
          ? "previous"
          : null;
    if (!window) continue;
    const medication = medications.get(intake.medicationId);
    const strengthMg = medication?.strengthMg ?? intake.strengthMg;
    if (
      !Number.isFinite(strengthMg) ||
      strengthMg < 0 ||
      !Number.isFinite(intake.quantity) ||
      intake.quantity < 0
    )
      continue;
    const amount = doseMg({ strengthMg, quantity: intake.quantity });
    if (!Number.isFinite(amount)) continue;
    let record = records.get(intake.medicationId);
    if (!record) {
      record = { name: medication?.name ?? intake.medicationName };
      records.set(intake.medicationId, record);
    }
    const bucket = (record[window] ??= { total: 0, days: new Set() });
    bucket.total = clean(bucket.total + amount);
    bucket.days.add(day);
  }
  return [...records.entries()]
    .map<StreakMedicationChange>(([medicationId, record]) => {
      const medication = medications.get(medicationId);
      const currentMeanMg = record.current
        ? clean(record.current.total / record.current.days.size)
        : null;
      const previousMeanMg = record.previous
        ? clean(record.previous.total / record.previous.days.size)
        : null;
      const delta =
        currentMeanMg !== null && previousMeanMg !== null
          ? clean(currentMeanMg - previousMeanMg)
          : null;
      return {
        medicationId,
        name: record.name,
        color: medication?.color ?? "rose",
        isBenzodiazepine: medication?.isBenzodiazepine === true,
        isOpioid: medication?.isOpioid === true,
        currentTotalMg: record.current?.total ?? null,
        previousTotalMg: record.previous?.total ?? null,
        currentLoggedDays: record.current?.days.size ?? 0,
        previousLoggedDays: record.previous?.days.size ?? 0,
        currentMeanMg,
        previousMeanMg,
        delta,
        direction:
          delta === null
            ? "insufficient"
            : delta < 0
              ? "lower"
              : delta > 0
                ? "higher"
                : "same",
      };
    })
    .sort(
      (a, b) =>
        Number(b.isBenzodiazepine) - Number(a.isBenzodiazepine) ||
        a.name.localeCompare(b.name) ||
        a.medicationId.localeCompare(b.medicationId),
    );
}

function milestoneFor(
  context: Context,
  target: number,
  includeAnalytics = false,
): StreakMilestone {
  const run = context.runs.find((entry) => entry.length >= target);
  const achievedOn = run ? shiftDayKey(run.start, target - 1) : null;
  let analytics: MilestoneAnalytics | null = null;
  if (includeAnalytics && run && achievedOn) {
    try {
      const current = summarizeWindow(context, run.start, achievedOn, target);
      const previous = summarizeWindow(
        context,
        shiftDayKey(run.start, -target),
        shiftDayKey(run.start, -1),
        target,
      );
      analytics = {
        current,
        previous,
        ratings: [
          ratingChange(current, previous, "energy", "Energy"),
          ratingChange(current, previous, "stress", "Stress"),
          ratingChange(current, previous, "sleepHours", "Sleep Hours"),
        ],
        medications: medicationChanges(context, current, previous),
      };
    } catch {
      // Calendar dates outside the app's four-digit day range cannot be compared.
    }
  }
  return {
    target,
    achieved: Boolean(run),
    achievedOn,
    runStart: run?.start ?? null,
    windowEnd: achievedOn,
    currentProgress: Math.min(context.streak.current, target),
    remaining: Math.max(0, target - context.streak.current),
    ...getMilestoneLook(target),
    analytics,
  };
}

function previousTarget(target: number) {
  return target > 30
    ? target - 5
    : earlyTargets[
        earlyTargets.indexOf(target as (typeof earlyTargets)[number]) - 1
      ];
}
function nextTarget(target: number) {
  return target >= 30
    ? target + 5
    : earlyTargets[
        earlyTargets.indexOf(target as (typeof earlyTargets)[number]) + 1
      ];
}

export function getStreakMilestones(data: AppData, now: Date) {
  const context = contextFor(data, now, false);
  const reached = streakMilestone(context.streak.best);
  const achieved: StreakMilestone[] = [];
  let target = reached.reached;
  while (target !== null && target !== undefined && achieved.length < 3) {
    achieved.push(milestoneFor(context, target));
    target = previousTarget(target);
  }
  const upcoming: StreakMilestone[] = [];
  let next = reached.next;
  while (upcoming.length < 3) {
    upcoming.push(milestoneFor(context, next));
    next = nextTarget(next);
  }
  return { streak: context.streak, achieved, upcoming };
}

export function getStreakMilestone(data: AppData, now: Date, target: number) {
  if (!isStreakMilestoneTarget(target)) return null;
  return milestoneFor(contextFor(data, now, true), target, true);
}
