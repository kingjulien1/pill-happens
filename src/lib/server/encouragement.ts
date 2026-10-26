import "server-only";

import { randomInt } from "node:crypto";
import { JOURNAL_ENCOURAGEMENTS } from "@/lib/server/encouragement-data";
import type {
  JournalEncouragement,
  StreakIconName,
} from "@/lib/streak-presentation";

export type {
  JournalEncouragement,
  StreakIconName,
} from "@/lib/streak-presentation";

const STREAK_ICONS = [
  "fire",
  "sparkle",
  "lightning",
  "shootingStar",
  "flower",
  "confetti",
] as const satisfies readonly StreakIconName[];

/** Call once per server request, then pass only the selection to the client. */
export function getJournalEncouragement(): JournalEncouragement {
  return {
    message: JOURNAL_ENCOURAGEMENTS[randomInt(JOURNAL_ENCOURAGEMENTS.length)],
    streakIcon: STREAK_ICONS[randomInt(STREAK_ICONS.length)],
    milestoneSeed: randomInt(0x80000000),
  };
}
