export type NotificationId = string | number;
export type NotificationExitReason =
  "dismiss" | "timeout" | "action" | "cancel";

/** Nominal full-speed budget; the progressive finish adds active reading time. */
export const NOTIFICATION_DEFAULT_DURATION = 22_000 / 3;
export const NOTIFICATION_COMPLETION_GRACE = 1_000;

const SLOW_START = 0.3;
const SLOW_END = 0.1;
const MINIMUM_SPEED = 0.5;
const MIDDLE_RATE = 2.5;
const MIDDLE_TIME = Math.log(2) / MIDDLE_RATE;
const SLOW_START_TIME = 1 - SLOW_START;
const SLOW_END_TIME = SLOW_START_TIME + MIDDLE_TIME;
const COMPLETE_TIME = SLOW_END_TIME + SLOW_END / MINIMUM_SPEED;

/** JSON-safe active-time checkpoint; null is an indefinite notification. */
export type NotificationClockCheckpoint = {
  version: 1;
  duration: number | null;
  elapsedActive: number;
};

export function isNotificationClockCheckpoint(
  value: unknown,
): value is NotificationClockCheckpoint {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 3
  )
    return false;
  const candidate = value as Partial<NotificationClockCheckpoint>;
  if (
    candidate.version !== 1 ||
    typeof candidate.elapsedActive !== "number" ||
    !Number.isFinite(candidate.elapsedActive) ||
    candidate.elapsedActive < 0
  )
    return false;
  if (candidate.duration === null) return candidate.elapsedActive === 0;
  return (
    typeof candidate.duration === "number" &&
    Number.isFinite(candidate.duration) &&
    candidate.duration >= 0 &&
    candidate.elapsedActive <=
      candidate.duration * COMPLETE_TIME + NOTIFICATION_COMPLETION_GRACE
  );
}

export type NotificationClockSnapshot = {
  /** Nominal remaining milliseconds, matching duration × progress. */
  remaining: number;
  progress: number;
  paused: boolean;
  /** True after the empty bar's active grace period has also elapsed. */
  expired: boolean;
  complete: boolean;
  /** Active milliseconds until the bar is empty, excluding its final grace. */
  timeUntilComplete: number;
  /** Full before completion; decreases only while the completed clock runs. */
  graceRemaining: number;
  speed: number;
  colorUrgency: number;
  /** Shared bar/card pulse ramp from 50% remaining to empty, independent of color. */
  pulseUrgency: number;
  cardUrgency: number;
};

function urgency(progress: number, start: number) {
  return Math.max(0, Math.min(1, (start - progress) / (start - SLOW_END)));
}

/**
 * Inverts the exact integrated speed curve, rather than advancing per frame.
 * In the middle segment dp/dt = −(.25 + 2.5p) / duration, hence its exponential.
 */
function progressAt(elapsed: number) {
  if (elapsed <= SLOW_START_TIME) return 1 - elapsed;
  if (elapsed < SLOW_END_TIME)
    return 0.4 * Math.exp(-MIDDLE_RATE * (elapsed - SLOW_START_TIME)) - 0.1;
  return Math.max(0, SLOW_END - (elapsed - SLOW_END_TIME) * MINIMUM_SPEED);
}

/** Every clock integrates its own active time; all overlapping pauses must clear. */
export class NotificationClock {
  private readonly nominalDuration: number;
  private readonly completeAt: number;
  private readonly expiresAt: number;
  private elapsed = 0;
  private last: number;
  private pauses = new Set<string>();

  constructor(
    readonly duration: number,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.nominalDuration = Number.isFinite(duration)
      ? Math.max(0, duration)
      : Infinity;
    this.completeAt = this.nominalDuration * COMPLETE_TIME;
    this.expiresAt = this.completeAt + NOTIFICATION_COMPLETION_GRACE;
    this.last = now();
  }

  /** Closed/refresh time is deliberately free; interaction pauses are transient. */
  static restore(
    checkpoint: NotificationClockCheckpoint,
    now: () => number = () => performance.now(),
  ) {
    if (!isNotificationClockCheckpoint(checkpoint))
      throw new RangeError("Invalid notification clock checkpoint.");
    const clock = new NotificationClock(checkpoint.duration ?? Infinity, now);
    clock.elapsed = checkpoint.elapsedActive;
    return clock;
  }

  checkpoint(): NotificationClockCheckpoint {
    this.sample();
    return {
      version: 1,
      duration: Number.isFinite(this.nominalDuration)
        ? this.nominalDuration
        : null,
      elapsedActive: this.elapsed,
    };
  }

  private sample() {
    const current = Math.max(this.last, this.now());
    if (this.pauses.size === 0 && Number.isFinite(this.completeAt))
      this.elapsed = Math.min(
        this.expiresAt,
        this.elapsed + (current - this.last),
      );
    this.last = current;
  }

  pause(reason: string, paused: boolean) {
    this.sample();
    if (paused) this.pauses.add(reason);
    else this.pauses.delete(reason);
    return this.snapshot();
  }

  snapshot(): NotificationClockSnapshot {
    this.sample();
    const finite = Number.isFinite(this.nominalDuration);
    const timeUntilComplete = finite
      ? Math.max(0, this.completeAt - this.elapsed)
      : Infinity;
    const complete = timeUntilComplete === 0;
    const progress = !finite
      ? 1
      : complete
        ? 0
        : progressAt(this.elapsed / this.nominalDuration);
    const graceRemaining = finite
      ? complete
        ? Math.max(0, this.expiresAt - this.elapsed)
        : NOTIFICATION_COMPLETION_GRACE
      : 0;
    const pulseUrgency = finite
      ? Math.max(0, Math.min(1, (0.5 - progress) / 0.5))
      : 0;
    return {
      remaining: finite ? progress * this.nominalDuration : Infinity,
      progress,
      paused: this.pauses.size > 0,
      expired: finite && this.elapsed >= this.expiresAt,
      complete,
      timeUntilComplete,
      graceRemaining,
      speed:
        !finite || complete
          ? 0
          : Math.max(MINIMUM_SPEED, Math.min(1, 0.25 + MIDDLE_RATE * progress)),
      colorUrgency: finite ? urgency(progress, 0.4) : 0,
      pulseUrgency,
      cardUrgency: pulseUrgency,
    };
  }
}

type ExitEntry = {
  version: number;
  reason?: NotificationExitReason;
  exit?: (reason: NotificationExitReason) => void;
  cancel?: () => void;
};

/** Same-ID updates invalidate old exit timers, including dismiss-before-mount. */
export class NotificationExitRegistry {
  private entries = new Map<NotificationId, ExitEntry>();
  private nextVersion = 0;

  begin(id: NotificationId) {
    this.entries.get(id)?.cancel?.();
    const version = ++this.nextVersion;
    this.entries.set(id, { version });
    return version;
  }

  attach(
    id: NotificationId,
    version: number,
    exit: (reason: NotificationExitReason) => void,
    cancel: () => void,
  ) {
    const entry = this.entries.get(id);
    if (!entry || entry.version !== version) return () => {};
    entry.exit = exit;
    entry.cancel = cancel;
    if (entry.reason) exit(entry.reason);
    return () => {
      if (this.entries.get(id) === entry) {
        entry.exit = undefined;
        entry.cancel = undefined;
      }
    };
  }

  request(id: NotificationId, reason: NotificationExitReason = "dismiss") {
    const entry = this.entries.get(id);
    if (!entry) return false;
    if (!entry.reason) {
      entry.reason = reason;
      entry.exit?.(reason);
    }
    return true;
  }

  /** Only the currently displayed generation may dismiss the native toast. */
  finish(id: NotificationId, version: number) {
    if (this.entries.get(id)?.version !== version) return false;
    this.entries.delete(id);
    return true;
  }

  isCurrent(id: NotificationId, version: number) {
    return this.entries.get(id)?.version === version;
  }

  ids() {
    return [...this.entries.keys()];
  }
}

export const NOTIFICATION_EXIT_TIMING = {
  collapse: 280,
  anticipate: 180,
  depart: 360,
  reducedDepart: 80,
} as const;

/** An in-flight server change outlives its card; a late rejection still needs a visible outcome. */
export async function settleNotificationUndo({
  undo,
  isCurrent,
  onSuccess,
  onFailure,
  onDetachedFailure,
}: {
  undo: () => Promise<void> | void;
  isCurrent: () => boolean;
  onSuccess: () => void;
  onFailure: (error: unknown) => void;
  onDetachedFailure: (error: unknown) => void;
}) {
  try {
    await undo();
  } catch (error) {
    if (isCurrent()) onFailure(error);
    else onDetachedFailure(error);
    return;
  }
  if (isCurrent()) onSuccess();
}
