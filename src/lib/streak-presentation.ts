export type StreakIconName =
  "fire" | "sparkle" | "lightning" | "shootingStar" | "flower" | "confetti";

export type JournalEncouragement = {
  message: string;
  streakIcon: StreakIconName;
  milestoneSeed: number;
};

const milestoneEmojis = [
  "🌱",
  "🌿",
  "🌼",
  "🌻",
  "✨",
  "⭐",
  "🌈",
  "🦋",
  "🪴",
  "🌸",
  "🍀",
  "🐣",
  "🪁",
  "🎈",
  "🧡",
  "🐝",
  "🦊",
  "🪻",
  "🫶",
  "🌟",
] as const;

/** A server-chosen seed keeps each badge playful and stable during a visit. */
export function milestoneEmoji(seed: number, milestone: number) {
  return milestoneEmojis[(seed + milestone * 7) % milestoneEmojis.length];
}
