import type { MorningSleep } from "./morning-sleep";
import type { CheckInRatingScale } from "./check-in-rating";
import { dayKey, isValidDayKey, toLocalInput } from "@/lib/domain";

/** Shared by the reflection editor and API; other check-in fields stay concise. */
export const DAILY_REFLECTION_MAX_LENGTH = 100_000;

/** Stable IDs keep every earlier check-in intact; icon metadata updates its display. */
export const DAILY_MOODS = [
  {
    value: "calm",
    label: "Calm",
    icon: "leaf",
    family: "grounded",
    keywords: "settled peaceful relaxed",
    emoji: "🌿",
  },
  {
    value: "okay",
    label: "Okay",
    icon: "smile",
    family: "grounded",
    keywords: "fine alright neutral",
    emoji: "🙂",
  },
  {
    value: "hopeful",
    label: "Hopeful",
    icon: "sunrise",
    family: "bright",
    keywords: "optimistic future",
    emoji: "🌤️",
  },
  {
    value: "happy",
    label: "Happy",
    icon: "sparkles",
    family: "bright",
    keywords: "joy cheerful good",
    emoji: "✨",
  },
  {
    value: "tired",
    label: "Tired",
    icon: "battery-low",
    family: "low",
    keywords: "sleepy exhausted fatigue",
    emoji: "🥱",
  },
  {
    value: "anxious",
    label: "Anxious",
    icon: "wind",
    family: "unsettled",
    keywords: "worry nervous panic",
    emoji: "🌀",
  },
  {
    value: "low",
    label: "Low",
    icon: "cloud-rain",
    family: "low",
    keywords: "sad down blue",
    emoji: "🌧️",
  },
  {
    value: "restless",
    label: "Restless",
    icon: "waves",
    family: "unsettled",
    keywords: "fidgety unsettled",
    emoji: "〰️",
  },
  {
    value: "irritable",
    label: "Irritable",
    icon: "flame",
    family: "unsettled",
    keywords: "annoyed short tempered",
    emoji: "🌶️",
  },
  {
    value: "overwhelmed",
    label: "Overwhelmed",
    icon: "waves",
    family: "unsettled",
    keywords: "too much overloaded",
    emoji: "🌊",
  },
  {
    value: "peaceful",
    label: "Peaceful",
    icon: "leaf",
    family: "grounded",
    keywords: "quiet ease",
    emoji: "",
  },
  {
    value: "steady",
    label: "Steady",
    icon: "anchor",
    family: "grounded",
    keywords: "stable balanced",
    emoji: "",
  },
  {
    value: "safe",
    label: "Safe",
    icon: "shield",
    family: "grounded",
    keywords: "secure protected",
    emoji: "",
  },
  {
    value: "present",
    label: "Present",
    icon: "focus",
    family: "grounded",
    keywords: "mindful here now",
    emoji: "",
  },
  {
    value: "relieved",
    label: "Relieved",
    icon: "wind",
    family: "grounded",
    keywords: "exhale release",
    emoji: "",
  },
  {
    value: "patient",
    label: "Patient",
    icon: "hourglass",
    family: "grounded",
    keywords: "waiting gentle",
    emoji: "",
  },
  {
    value: "balanced",
    label: "Balanced",
    icon: "scale",
    family: "grounded",
    keywords: "even centered",
    emoji: "",
  },
  {
    value: "clear-headed",
    label: "Clear-Headed",
    icon: "sun",
    family: "grounded",
    keywords: "clarity alert",
    emoji: "",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    icon: "armchair",
    family: "grounded",
    keywords: "at ease cosy",
    emoji: "",
  },
  {
    value: "accepting",
    label: "Accepting",
    icon: "heart-handshake",
    family: "grounded",
    keywords: "acceptance allow",
    emoji: "",
  },
  {
    value: "rested",
    label: "Rested",
    icon: "battery-full",
    family: "grounded",
    keywords: "refreshed recovered",
    emoji: "",
  },
  {
    value: "unhurried",
    label: "Unhurried",
    icon: "cloud-sun",
    family: "grounded",
    keywords: "slow easy",
    emoji: "",
  },
  {
    value: "content",
    label: "Content",
    icon: "smile",
    family: "bright",
    keywords: "satisfied enough",
    emoji: "",
  },
  {
    value: "joyful",
    label: "Joyful",
    icon: "party-popper",
    family: "bright",
    keywords: "joy happiness",
    emoji: "",
  },
  {
    value: "excited",
    label: "Excited",
    icon: "zap",
    family: "bright",
    keywords: "eager anticipation",
    emoji: "",
  },
  {
    value: "playful",
    label: "Playful",
    icon: "puzzle",
    family: "bright",
    keywords: "fun silly",
    emoji: "",
  },
  {
    value: "proud",
    label: "Proud",
    icon: "award",
    family: "bright",
    keywords: "achievement progress",
    emoji: "",
  },
  {
    value: "grateful",
    label: "Grateful",
    icon: "heart",
    family: "bright",
    keywords: "thankful appreciation",
    emoji: "",
  },
  {
    value: "inspired",
    label: "Inspired",
    icon: "lightbulb",
    family: "bright",
    keywords: "ideas creative",
    emoji: "",
  },
  {
    value: "optimistic",
    label: "Optimistic",
    icon: "sunrise",
    family: "bright",
    keywords: "positive hope",
    emoji: "",
  },
  {
    value: "curious",
    label: "Curious",
    icon: "search",
    family: "bright",
    keywords: "interested explore",
    emoji: "",
  },
  {
    value: "amused",
    label: "Amused",
    icon: "laugh",
    family: "bright",
    keywords: "funny laughing",
    emoji: "",
  },
  {
    value: "lighthearted",
    label: "Lighthearted",
    icon: "feather",
    family: "bright",
    keywords: "light carefree",
    emoji: "",
  },
  {
    value: "encouraged",
    label: "Encouraged",
    icon: "sprout",
    family: "bright",
    keywords: "supported hopeful",
    emoji: "",
  },
  {
    value: "refreshed",
    label: "Refreshed",
    icon: "droplets",
    family: "bright",
    keywords: "renewed fresh",
    emoji: "",
  },
  {
    value: "connected",
    label: "Connected",
    icon: "heart-handshake",
    family: "connected",
    keywords: "together belonging",
    emoji: "",
  },
  {
    value: "loved",
    label: "Loved",
    icon: "heart",
    family: "connected",
    keywords: "care affection",
    emoji: "",
  },
  {
    value: "supported",
    label: "Supported",
    icon: "hand-heart",
    family: "connected",
    keywords: "help held",
    emoji: "",
  },
  {
    value: "understood",
    label: "Understood",
    icon: "messages-square",
    family: "connected",
    keywords: "heard seen",
    emoji: "",
  },
  {
    value: "close",
    label: "Close To Others",
    icon: "users",
    family: "connected",
    keywords: "company friends family",
    emoji: "",
  },
  {
    value: "compassionate",
    label: "Compassionate",
    icon: "hand-heart",
    family: "connected",
    keywords: "kind empathy",
    emoji: "",
  },
  {
    value: "social",
    label: "Social",
    icon: "messages-square",
    family: "connected",
    keywords: "talkative company",
    emoji: "",
  },
  {
    value: "included",
    label: "Included",
    icon: "users",
    family: "connected",
    keywords: "belong welcome",
    emoji: "",
  },
  {
    value: "tender",
    label: "Tender",
    icon: "heart",
    family: "connected",
    keywords: "soft sensitive",
    emoji: "",
  },
  {
    value: "lonely",
    label: "Lonely",
    icon: "user-round",
    family: "low",
    keywords: "alone isolated",
    emoji: "",
  },
  {
    value: "homesick",
    label: "Homesick",
    icon: "house",
    family: "low",
    keywords: "home missing",
    emoji: "",
  },
  {
    value: "withdrawn",
    label: "Withdrawn",
    icon: "shell",
    family: "low",
    keywords: "quiet isolated distant",
    emoji: "",
  },
  {
    value: "sad",
    label: "Sad",
    icon: "cloud-rain",
    family: "low",
    keywords: "sorrow unhappy",
    emoji: "",
  },
  {
    value: "flat",
    label: "Flat",
    icon: "minus",
    family: "low",
    keywords: "numb empty unmotivated",
    emoji: "",
  },
  {
    value: "empty",
    label: "Empty",
    icon: "circle-dashed",
    family: "low",
    keywords: "hollow numb",
    emoji: "",
  },
  {
    value: "heavy",
    label: "Heavy",
    icon: "cloud",
    family: "low",
    keywords: "weighted down",
    emoji: "",
  },
  {
    value: "tearful",
    label: "Tearful",
    icon: "droplet",
    family: "low",
    keywords: "cry crying",
    emoji: "",
  },
  {
    value: "foggy",
    label: "Foggy",
    icon: "cloud-fog",
    family: "low",
    keywords: "brain fog unclear",
    emoji: "",
  },
  {
    value: "sluggish",
    label: "Sluggish",
    icon: "snail",
    family: "low",
    keywords: "slow energy drained",
    emoji: "",
  },
  {
    value: "drained",
    label: "Drained",
    icon: "battery-low",
    family: "low",
    keywords: "exhausted depleted",
    emoji: "",
  },
  {
    value: "unmotivated",
    label: "Unmotivated",
    icon: "pause",
    family: "low",
    keywords: "stuck effort",
    emoji: "",
  },
  {
    value: "bored",
    label: "Bored",
    icon: "meh",
    family: "low",
    keywords: "dull uninterested",
    emoji: "",
  },
  {
    value: "disappointed",
    label: "Disappointed",
    icon: "cloud-drizzle",
    family: "low",
    keywords: "let down",
    emoji: "",
  },
  {
    value: "wistful",
    label: "Wistful",
    icon: "cloud-moon",
    family: "low",
    keywords: "longing nostalgic",
    emoji: "",
  },
  {
    value: "vulnerable",
    label: "Vulnerable",
    icon: "heart",
    family: "low",
    keywords: "exposed sensitive",
    emoji: "",
  },
  {
    value: "fragile",
    label: "Fragile",
    icon: "feather",
    family: "low",
    keywords: "delicate tender",
    emoji: "",
  },
  {
    value: "energized",
    label: "Energized",
    icon: "battery-full",
    family: "energized",
    keywords: "energy awake",
    emoji: "",
  },
  {
    value: "motivated",
    label: "Motivated",
    icon: "rocket",
    family: "energized",
    keywords: "drive ready",
    emoji: "",
  },
  {
    value: "focused",
    label: "Focused",
    icon: "focus",
    family: "energized",
    keywords: "concentration attention",
    emoji: "",
  },
  {
    value: "productive",
    label: "Productive",
    icon: "check-check",
    family: "energized",
    keywords: "done accomplished",
    emoji: "",
  },
  {
    value: "creative",
    label: "Creative",
    icon: "lightbulb",
    family: "energized",
    keywords: "ideas imagination",
    emoji: "",
  },
  {
    value: "determined",
    label: "Determined",
    icon: "mountain",
    family: "energized",
    keywords: "resolve persistent",
    emoji: "",
  },
  {
    value: "confident",
    label: "Confident",
    icon: "shield-check",
    family: "energized",
    keywords: "self assured",
    emoji: "",
  },
  {
    value: "adventurous",
    label: "Adventurous",
    icon: "compass",
    family: "energized",
    keywords: "bold explore",
    emoji: "",
  },
  {
    value: "awake",
    label: "Wide Awake",
    icon: "sun",
    family: "energized",
    keywords: "alert wakeful",
    emoji: "",
  },
  {
    value: "ready",
    label: "Ready",
    icon: "flag",
    family: "energized",
    keywords: "prepared willing",
    emoji: "",
  },
  {
    value: "restored",
    label: "Restored",
    icon: "sprout",
    family: "energized",
    keywords: "recovered recharged",
    emoji: "",
  },
  {
    value: "resilient",
    label: "Resilient",
    icon: "tree-pine",
    family: "energized",
    keywords: "bounce back strength",
    emoji: "",
  },
  {
    value: "tense",
    label: "Tense",
    icon: "activity",
    family: "unsettled",
    keywords: "tight stress",
    emoji: "",
  },
  {
    value: "worried",
    label: "Worried",
    icon: "cloud-lightning",
    family: "unsettled",
    keywords: "concern anxious",
    emoji: "",
  },
  {
    value: "uneasy",
    label: "Uneasy",
    icon: "wind",
    family: "unsettled",
    keywords: "uncomfortable unsettled",
    emoji: "",
  },
  {
    value: "on-edge",
    label: "On Edge",
    icon: "activity",
    family: "unsettled",
    keywords: "jumpy nervous",
    emoji: "",
  },
  {
    value: "frustrated",
    label: "Frustrated",
    icon: "flame",
    family: "unsettled",
    keywords: "blocked irritated",
    emoji: "",
  },
  {
    value: "angry",
    label: "Angry",
    icon: "flame",
    family: "unsettled",
    keywords: "mad upset rage",
    emoji: "",
  },
  {
    value: "impatient",
    label: "Impatient",
    icon: "timer",
    family: "unsettled",
    keywords: "rushed waiting",
    emoji: "",
  },
  {
    value: "scattered",
    label: "Scattered",
    icon: "shuffle",
    family: "unsettled",
    keywords: "distracted unfocused",
    emoji: "",
  },
  {
    value: "uncertain",
    label: "Uncertain",
    icon: "circle-help",
    family: "unsettled",
    keywords: "unsure doubt",
    emoji: "",
  },
  {
    value: "stuck",
    label: "Stuck",
    icon: "anchor",
    family: "unsettled",
    keywords: "trapped blocked",
    emoji: "",
  },
  {
    value: "pressured",
    label: "Pressured",
    icon: "gauge",
    family: "unsettled",
    keywords: "demand stress",
    emoji: "",
  },
  {
    value: "rushed",
    label: "Rushed",
    icon: "timer",
    family: "unsettled",
    keywords: "hurry hectic",
    emoji: "",
  },
  {
    value: "self-conscious",
    label: "Self-Conscious",
    icon: "eye",
    family: "unsettled",
    keywords: "judged awkward",
    emoji: "",
  },
  {
    value: "regretful",
    label: "Regretful",
    icon: "undo-2",
    family: "unsettled",
    keywords: "regret sorry",
    emoji: "",
  },
  {
    value: "ashamed",
    label: "Ashamed",
    icon: "cloud",
    family: "unsettled",
    keywords: "shame embarrassed",
    emoji: "",
  },
  {
    value: "guilty",
    label: "Guilty",
    icon: "scale",
    family: "unsettled",
    keywords: "guilt responsibility",
    emoji: "",
  },
  {
    value: "conflicted",
    label: "Conflicted",
    icon: "split",
    family: "unsettled",
    keywords: "mixed torn",
    emoji: "",
  },
  {
    value: "sensitive",
    label: "Sensitive",
    icon: "feather",
    family: "unsettled",
    keywords: "easily affected",
    emoji: "",
  },
  {
    value: "wired",
    label: "Wired",
    icon: "zap",
    family: "unsettled",
    keywords: "buzzing overstimulated",
    emoji: "",
  },
  {
    value: "shaky",
    label: "Shaky",
    icon: "vibrate",
    family: "unsettled",
    keywords: "trembly jittery",
    emoji: "",
  },
  {
    value: "spaced-out",
    label: "Spaced Out",
    icon: "orbit",
    family: "unsettled",
    keywords: "distant detached",
    emoji: "",
  },
  {
    value: "disconnected",
    label: "Disconnected",
    icon: "unlink",
    family: "low",
    keywords: "detached apart",
    emoji: "",
  },
  {
    value: "numb",
    label: "Numb",
    icon: "circle-dashed",
    family: "low",
    keywords: "nothing flat",
    emoji: "",
  },
  {
    value: "pensive",
    label: "Pensive",
    icon: "cloud-moon",
    family: "grounded",
    keywords: "thoughtful reflective",
    emoji: "",
  },
  {
    value: "nostalgic",
    label: "Nostalgic",
    icon: "history",
    family: "grounded",
    keywords: "memories past",
    emoji: "",
  },
  {
    value: "quiet",
    label: "Quiet",
    icon: "volume-1",
    family: "grounded",
    keywords: "still inward",
    emoji: "",
  },
  {
    value: "mixed",
    label: "A Bit Of Everything",
    icon: "shuffle",
    family: "unsettled",
    keywords: "mixed complicated many",
    emoji: "",
  },
  {
    value: "surprised",
    label: "Surprised",
    icon: "sparkles",
    family: "bright",
    keywords: "unexpected amazed",
    emoji: "",
  },
  {
    value: "fulfilled",
    label: "Fulfilled",
    icon: "circle-check",
    family: "bright",
    keywords: "meaning satisfied",
    emoji: "",
  },
  {
    value: "warm",
    label: "Warm",
    icon: "sun",
    family: "connected",
    keywords: "affection comfort",
    emoji: "",
  },
  {
    value: "brave",
    label: "Brave",
    icon: "shield-check",
    family: "energized",
    keywords: "courage courageous",
    emoji: "",
  },
  {
    value: "hopeful-but-tired",
    label: "Hopeful, But Tired",
    icon: "sunrise",
    family: "low",
    keywords: "hope fatigue mixed",
    emoji: "",
  },
] as const;

export type DailyMood = (typeof DAILY_MOODS)[number]["value"];
export type DailyMoodOption = (typeof DAILY_MOODS)[number];
export type DailyMoodFamily = DailyMoodOption["family"];
export const DAILY_MOOD_VALUES = DAILY_MOODS.map((mood) => mood.value);
export const DAILY_MOOD_FAMILIES = [
  { value: "grounded", label: "Steady" },
  { value: "bright", label: "Bright" },
  { value: "connected", label: "Connected" },
  { value: "energized", label: "Energized" },
  { value: "low", label: "Low" },
  { value: "unsettled", label: "Unsettled" },
] as const;

/** Stable shuffle: no hydration randomness, mutation, or changing order while choosing. */
function moodRank(value: string, seed: string) {
  let hash = 2166136261;
  for (const character of `${seed}:${value}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function rankDailyMoods(
  checkIns: readonly Pick<DailyCheckIn, "moods">[] = [],
  seed = "daily-moods",
) {
  const usage = new Map<DailyMood, number>();
  for (const checkIn of checkIns) {
    for (const value of new Set(checkIn.moods)) {
      usage.set(value, (usage.get(value) ?? 0) + 1);
    }
  }
  return [...DAILY_MOODS].sort(
    (left, right) =>
      (usage.get(right.value) ?? 0) - (usage.get(left.value) ?? 0) ||
      moodRank(left.value, seed) - moodRank(right.value, seed) ||
      left.value.localeCompare(right.value),
  );
}

export function matchesDailyMood(mood: DailyMoodOption, query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text =
    `${mood.label} ${mood.value} ${mood.family} ${mood.keywords}`.toLocaleLowerCase();
  return words.every((word) => text.includes(word));
}

export const DAILY_CHECK_IN_PERIODS = ["morning", "evening"] as const;
export type DailyCheckInPeriod = (typeof DAILY_CHECK_IN_PERIODS)[number];

/** One personal reflection for a tracking day and period, independent of intakes. */
export type DailyCheckIn = {
  day: string;
  /** Omitted by legacy Evening records; new saves always specify the period. */
  period?: DailyCheckInPeriod;
  note: string;
  moods: DailyMood[];
  energy: number | null;
  stress: number | null;
  /** Untagged historical ratings retain their original five-point meaning. */
  energyScale?: CheckInRatingScale;
  stressScale?: CheckInRatingScale;
  sleepHours: number | null;
  /** Present only for Morning; absent on legacy records and Evening. */
  morningSleep?: MorningSleep | null;
  /** Evening's intended bedtime for this day; absent on earlier records. */
  bedtime?: string | null;
  helped: string;
  createdAt: string;
  updatedAt: string;
};

export function getCheckInPeriod(checkIn: Pick<DailyCheckIn, "period">) {
  return checkIn.period ?? "evening";
}

export function checkInForDay(
  checkIns: readonly DailyCheckIn[] | undefined,
  day: string,
  period: DailyCheckInPeriod = "evening",
) {
  return checkIns?.find(
    (checkIn) => checkIn.day === day && getCheckInPeriod(checkIn) === period,
  );
}

/**
 * Morning is available for the entire tracking day, beginning at 06:00.
 * Evening becomes available at 17:00 in the journal timezone.
 * Evenings continue after midnight until the journal's 06:00 boundary.
 * Past days stay available for a missed reflection; future days never do.
 */
export function canCheckIn(
  day: string,
  now: Date,
  timeZone: string,
  period: DailyCheckInPeriod = "evening",
) {
  if (!isValidDayKey(day)) return false;
  const today = dayKey(now, timeZone);
  if (day !== today) return day < today;
  if (period === "morning") return true;
  const local = toLocalInput(now, timeZone);
  return local.slice(0, 10) > day || local.slice(11) >= "17:00";
}

/** Include reflection-only days in history, without counting them as intakes. */
export function journalDays(
  intakes: readonly { takenAt: string }[],
  checkIns: readonly DailyCheckIn[] | undefined,
  timeZone: string,
) {
  return [
    ...new Set([
      ...intakes.map((intake) => dayKey(intake.takenAt, timeZone)),
      ...(checkIns ?? []).map((checkIn) => checkIn.day).filter(isValidDayKey),
    ]),
  ].sort((a, b) => b.localeCompare(a));
}
