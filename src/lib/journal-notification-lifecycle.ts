export type NotificationId = string | number;
export type NotificationExitReason =
  "dismiss" | "timeout" | "action" | "cancel";

export const NOTIFICATION_DEFAULT_DURATION = 11_000;

/** A monotonic reading clock: every independent pause must clear before it runs. */
export class NotificationClock {
  private remaining: number;
  private last: number;
  private pauses = new Set<string>();

  constructor(
    readonly duration: number,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.remaining = Number.isFinite(duration)
      ? Math.max(0, duration)
      : Infinity;
    this.last = now();
  }

  private sample() {
    const current = Math.max(this.last, this.now());
    if (this.pauses.size === 0 && Number.isFinite(this.remaining))
      this.remaining = Math.max(0, this.remaining - (current - this.last));
    this.last = current;
  }

  pause(reason: string, paused: boolean) {
    this.sample();
    if (paused) this.pauses.add(reason);
    else this.pauses.delete(reason);
    return this.snapshot();
  }

  snapshot() {
    this.sample();
    return {
      remaining: this.remaining,
      progress: Number.isFinite(this.duration)
        ? this.duration > 0
          ? this.remaining / this.duration
          : 0
        : 1,
      paused: this.pauses.size > 0,
      expired: this.remaining === 0,
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
