// A longer deliberate pull leaves room for the slower exchange and ready recoil.
export const BRAND_REFRESH_THRESHOLD = 340;
export const BRAND_REFRESH_SLOP = 8;
export const BRAND_PULL_VIEWPORT_INSET = 16;
/** The exchange finishes early in the pull while later travel builds readiness. */
export const BRAND_PULL_EXCHANGE_DISTANCE = 112;
export const BRAND_PULL_EXCHANGE_END =
  BRAND_PULL_EXCHANGE_DISTANCE / BRAND_REFRESH_THRESHOLD;
export const BRAND_REFRESH_MARKER = "pill-happens:page-refresh";
export const BRAND_REFRESH_MARKER_TTL = 60_000;

export type BrandPullAction = "refresh" | "medications";
export type BrandPullThresholds = Readonly<Record<BrandPullAction, number>>;

/** Capture once at pointer-down; subsequent viewport changes cannot move the goal. */
export function getBrandPullThresholds(
  startX: number,
  startY: number,
  viewportRight: number,
  viewportBottom: number,
): BrandPullThresholds {
  const available = (start: number, edge: number) => {
    const travel = edge - start - BRAND_PULL_VIEWPORT_INSET;
    return Number.isFinite(start) &&
      Number.isFinite(edge) &&
      Number.isFinite(travel) &&
      travel > BRAND_REFRESH_SLOP
      ? Math.min(BRAND_REFRESH_THRESHOLD, travel)
      : BRAND_REFRESH_THRESHOLD;
  };
  return Object.freeze({
    refresh: available(startY, viewportBottom),
    medications: available(startX, viewportRight),
  });
}

/** Invalid thresholds never turn a tap or malformed sample into a ready pull. */
export function getBrandPullThreshold(
  action: BrandPullAction | null,
  thresholds?: BrandPullThresholds,
) {
  const threshold = action ? thresholds?.[action] : undefined;
  return typeof threshold === "number" &&
    Number.isFinite(threshold) &&
    threshold > BRAND_REFRESH_SLOP
    ? Math.min(BRAND_REFRESH_THRESHOLD, threshold)
    : BRAND_REFRESH_THRESHOLD;
}

export type BrandPullState = {
  action: BrandPullAction | null;
  lockedAction: BrandPullAction | null;
  distance: number;
  moved: boolean;
};

/** Steering stays tentative until a deliberate axis reaches the release threshold. */
export function updateBrandPull(
  previous: BrandPullState,
  x: number,
  y: number,
  thresholds?: BrandPullThresholds,
): BrandPullState {
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return { ...previous, distance: 0 };
  const moved = previous.moved || Math.hypot(x, y) > BRAND_REFRESH_SLOP;
  const action =
    previous.lockedAction ?? (moved ? getBrandPullAction(x, y) : null);
  const distance = Math.max(
    0,
    action === "medications" ? x : action === "refresh" ? y : 0,
  );
  return {
    action,
    lockedAction:
      previous.lockedAction ??
      (distance >= getBrandPullThreshold(action, thresholds) ? action : null),
    distance,
    moved,
  };
}

export type BrandPullPose = { x: number; y: number; progress: number };

/** Time-based following avoids frame-rate-dependent drag and return motion. */
export function advanceBrandPullMotion(
  current: BrandPullPose,
  target: BrandPullPose,
  elapsed: number,
  returning: boolean,
): BrandPullPose {
  const delta = Number.isFinite(elapsed)
    ? Math.max(0, Math.min(64, elapsed))
    : 0;
  const follow = 1 - Math.exp(-delta / (returning ? 72 : 38));
  const approach = (from: number, to: number, epsilon: number) => {
    const next = from + (to - from) * follow;
    return Math.abs(to - next) < epsilon ? to : next;
  };
  return {
    x: approach(current.x, target.x, 0.02),
    y: approach(current.y, target.y, 0.02),
    progress: approach(current.progress, target.progress, 0.0005),
  };
}

/** A separate, capped 160ms follower gives even fast pulls a visible icon exchange. */
export function advanceBrandPullExchange(
  current: number,
  targetProgress: number,
  elapsed: number,
) {
  const bound = (value: number) =>
    Math.max(
      0,
      Math.min(BRAND_PULL_EXCHANGE_END, Number.isFinite(value) ? value : 0),
    );
  const from = bound(current);
  const target = bound(targetProgress);
  const delta = Number.isFinite(elapsed)
    ? Math.max(0, Math.min(64, elapsed))
    : 0;
  if (!delta) return from;
  const next = from + (target - from) * (1 - Math.exp(-delta / 160));
  return Math.abs(target - next) < 0.0005 ? target : next;
}

export type BrandPullSpring = {
  readonly value: number;
  readonly velocity: number;
};

/** An exact damped spring keeps ready and home rebounds independent of frame rate. */
export function advanceBrandPullSpring(
  current: BrandPullSpring,
  target: number,
  elapsed: number,
): BrandPullSpring {
  const goal = Number.isFinite(target) ? target : 0;
  const value = Number.isFinite(current.value) ? current.value : goal;
  const velocity = Number.isFinite(current.velocity) ? current.velocity : 0;
  const delta = Number.isFinite(elapsed)
    ? Math.max(0, Math.min(64, elapsed)) / 1_000
    : 0;
  if (!delta) return { value, velocity };

  const frequency = 18;
  const damping = frequency * 0.36;
  const dampedFrequency = frequency * Math.sqrt(1 - 0.36 ** 2);
  const displacement = value - goal;
  const decay = Math.exp(-damping * delta);
  const cosine = Math.cos(dampedFrequency * delta);
  const sine = Math.sin(dampedFrequency * delta);
  const nextValue =
    goal +
    decay *
      (displacement * cosine +
        ((velocity + damping * displacement) / dampedFrequency) * sine);
  const nextVelocity =
    decay *
    (velocity * cosine -
      ((damping * velocity + frequency ** 2 * displacement) / dampedFrequency) *
        sine);
  if (!Number.isFinite(nextValue) || !Number.isFinite(nextVelocity))
    return { value: goal, velocity: 0 };
  if (Math.abs(nextValue - goal) < 0.0005 && Math.abs(nextVelocity) < 0.005)
    return { value: goal, velocity: 0 };
  return { value: nextValue, velocity: nextVelocity };
}

/** Progress reverses the whole exchange; the spring adds one finite, elastic flourish. */
export function getBrandPullFeedback(
  progress: number,
  readiness: number,
  home: number,
  action: BrandPullAction | null,
  exchangeProgress: number = progress,
  heldIconTurn?: number,
) {
  const clamp = (value: number, minimum = 0, maximum = 1) =>
    Math.max(minimum, Math.min(maximum, value));
  const smooth = (value: number) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const p = clamp(Number.isFinite(progress) ? progress : 0);
  const s = clamp(Number.isFinite(readiness) ? readiness : 0, -0.5, 1.5);
  const h = clamp(Number.isFinite(home) ? home : 0, -0.6, 0.6);
  const over = Math.max(0, s - 1);
  // A separate visual clock can prolong the pills/glyph exchange without
  // delaying authoritative threshold detection or the button's tracking.
  const e = clamp(Number.isFinite(exchangeProgress) ? exchangeProgress : 0);
  const pixels = e * BRAND_REFRESH_THRESHOLD;
  const exchange = smooth((pixels - 1) / 87);
  return {
    // The original face stays put for the first pixels. Pills leave before
    // the action glyph fills their space; reversing the pull reverses both.
    reveal: smooth((pixels - 56) / 56),
    pillOpacity: 1 - exchange,
    pillScale: 1 - exchange * 0.96,
    pillTurn: -540 * exchange,
    wash: 0, // The face stays black; only geometry and edge highlights change.
    edge: smooth((p - 0.22) / 0.7),
    readiness: clamp(s),
    buttonScale: clamp(
      1 - 0.16 * p + 0.16 * s + 0.25 * clamp(s) + 1.23 * over + 0.2 * h,
      0.72,
      1.75,
    ),
    iconScale: clamp(
      0.25 +
        0.75 * p +
        0.14 * clamp(s) +
        7 * over +
        0.12 * Math.min(0, s) +
        0.12 * h,
      0.2,
      3.4,
    ),
    // Active pulling/retraction follows progress. Release or cancellation holds
    // the last painted angle while the glyph shrinks; readiness only scales it.
    iconTurn:
      typeof heldIconTurn === "number" && Number.isFinite(heldIconTurn)
        ? heldIconTurn
        : -310 * (1 - p) + 16 * h,
    buttonTilt:
      (action === "medications" ? 1 : -1) * 4 * p * (1 - clamp(s)) + 6 * h,
    flare: clamp(over * 3 + Math.abs(h) * 0.8),
  };
}

/** Pulls at the destination only recoil; drafts, scroll and navigation stay untouched. */
export function getBrandPullRelease(
  state: BrandPullState,
  pathname: string,
  thresholds?: BrandPullThresholds,
): BrandPullAction | "home" | null {
  if (
    !Number.isFinite(state.distance) ||
    state.distance < getBrandPullThreshold(state.lockedAction, thresholds) ||
    !state.lockedAction
  )
    return null;
  return state.lockedAction === "medications" && pathname === "/medications"
    ? "home"
    : state.lockedAction;
}

/** Resist the pull so the handle stays within the header's existing gap. */
export function brandPullOffset(distance: number) {
  return 84 * (1 - Math.exp(-Math.max(0, distance) / 120));
}

/** Classify tentative intent; only a reached threshold commits the chosen axis. */
export function getBrandPullAction(
  x: number,
  y: number,
): BrandPullAction | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (y > Math.abs(x) * 1.5) return "refresh";
  if (x > Math.abs(y) * 1.5) return "medications";
  return null;
}

export function isBrandRefreshPull(
  x: number,
  y: number,
  thresholds?: BrandPullThresholds,
) {
  return (
    y >= getBrandPullThreshold("refresh", thresholds) &&
    getBrandPullAction(x, y) === "refresh"
  );
}

export function isBrandMedicationsPull(
  x: number,
  y: number,
  thresholds?: BrandPullThresholds,
) {
  return (
    x >= getBrandPullThreshold("medications", thresholds) &&
    getBrandPullAction(x, y) === "medications"
  );
}

/** The marker contains timing and route metadata only, never journal data. */
export function isRecentBrandRefresh(
  marker: string | null,
  path: string,
  now: number,
) {
  if (!marker) return false;
  try {
    const value: unknown = JSON.parse(marker);
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return (
      record.path === path &&
      typeof record.at === "number" &&
      Number.isFinite(record.at) &&
      record.at <= now &&
      now - record.at < BRAND_REFRESH_MARKER_TTL
    );
  } catch {
    return false;
  }
}
