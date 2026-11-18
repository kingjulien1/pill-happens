import type { DailyCheckInPeriod } from "./daily-check-in";

const headings = {
  morning: [
    "Fine. I’ll haunt the kitchen.",
    "Dawn has filed a noise complaint.",
    "Back by clerical error.",
    "The coffin had no snooze button.",
    "My ghost called in sick.",
    "Ah. The sequel nobody ordered.",
    "Coffee before the inquest.",
    "The early worm wants a lawyer.",
    "Death took the duvet.",
    "The rooster has chosen litigation.",
    "Another shift in the meat suit.",
    "Sunrise could’ve been an email.",
    "Still warm. Put the kettle on.",
    "The crypt has terrible curtains.",
    "My skeleton requests five minutes.",
    "The alarm has diplomatic immunity.",
    "Daylight. How inconsiderate.",
    "Who let Tuesday’s understudy in?",
    "Present, against my better judgment.",
    "The séance worked. Unfortunately.",
  ],
  evening: [
    "The autopsy can wait.",
    "Today has left the group chat.",
    "One star. Would still nap.",
    "The plot died around lunch.",
    "Last orders at the haunted house.",
    "Roll credits. Blame management.",
    "Another day enters evidence.",
    "An obituary for my to-do list.",
    "The night shift is mostly ghosts.",
    "My skeleton has clocked out.",
    "Let the record show: yikes.",
    "Closing arguments, from bed.",
    "The moon declines to comment.",
    "Today owes me a written apology.",
    "Please return your borrowed chaos.",
    "The haunting resumes tomorrow.",
    "A minute of silence for my plans.",
    "The jury recommends pajamas.",
    "Case closed. Socks missing.",
    "Nobody tell the sequel.",
  ],
} as const;

/** The tracking day doubles as the seed, including when reopening a past entry. */
export function checkInHeading(day: string, period: DailyCheckInPeriod) {
  let hash = 2166136261;
  for (const character of `${period}:${day}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  const choices = headings[period];
  return choices[(hash >>> 0) % choices.length];
}
