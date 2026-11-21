export const SLEEP_PILL_LIMIT = 6;
export const SLEEP_PILL_LIFETIME = 5_000;

export type SleepPill = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  reveal: number;
  size: number;
  rotation: number;
  spin: number;
  color: number;
};

export function createSleepPill(
  origin: { x: number; y: number; angle: number },
  random: () => number = Math.random,
): SleepPill {
  const direction = origin.angle + (random() - 0.5) * 0.6;
  const speed = 105 + random() * 85;
  return {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    age: 0,
    reveal: 180 + random() * 220,
    size: 16 + random() * 6,
    rotation: origin.angle,
    spin: (random() > 0.5 ? 1 : -1) * (0.45 + random() * 0.7),
    color: Math.floor(random() * 3),
  };
}

/** Pixel motion is capped after a slow frame; lifetime still follows real time. */
export function advanceSleepPill(
  pill: SleepPill,
  elapsed: number,
  bounds: { width: number; height: number },
) {
  pill.age += elapsed;
  if (pill.age >= SLEEP_PILL_LIFETIME) return { expired: true, hit: false };
  const seconds = Math.min(elapsed / 1_000, 0.08);
  pill.x += pill.vx * seconds;
  pill.y += pill.vy * seconds;
  pill.rotation += pill.spin * seconds;
  const radius = pill.size / 2 + 3;
  const right = Math.max(radius, bounds.width - radius);
  const bottom = Math.max(radius, bounds.height - radius);
  let hit = false;
  if (pill.x <= radius || pill.x >= right) {
    pill.x = Math.max(radius, Math.min(right, pill.x));
    pill.vx = (pill.x <= radius ? 1 : -1) * Math.abs(pill.vx);
    hit = true;
  }
  if (pill.y <= radius || pill.y >= bottom) {
    pill.y = Math.max(radius, Math.min(bottom, pill.y));
    pill.vy = (pill.y <= radius ? 1 : -1) * Math.abs(pill.vy);
    hit = true;
  }
  return { expired: false, hit };
}

export function sleepPillAppearance(pill: SleepPill) {
  const entrance = Math.max(0, Math.min(1, (pill.age - pill.reveal) / 320));
  const easedEntrance = 1 - (1 - entrance) ** 3;
  const life = Math.min(1, pill.age / SLEEP_PILL_LIFETIME);
  const ending = Math.max(0, (pill.age - 4_760) / 240);
  return {
    opacity: easedEntrance * (1 - ending ** 2),
    scale:
      easedEntrance *
      (1 - life * 0.68) *
      (1 + Math.sin(ending * Math.PI) * 0.3),
  };
}
