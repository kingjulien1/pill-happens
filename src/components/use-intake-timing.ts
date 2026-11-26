"use client";

import { useEffect, useState } from "react";
import { usePersistentDraft } from "./journal-drafts";
import { dayKey } from "@/lib/domain";
import type { IntakeFormDraft } from "@/lib/intake-form-draft";
import {
  hasEditedIntakeTiming,
  INTAKE_TIMING_KEY,
  isIntakeTimingPreference,
  pinnedIntakeTiming,
  originalIntakeTiming,
  withIntakeTiming,
  type IntakeTimingPreference,
} from "@/lib/intake-timing";

export function useIntakeTiming({
  draft,
  hasDraft,
  editing,
  initialDay,
  timezone,
  now,
  savedTimestamp,
}: {
  draft: IntakeFormDraft;
  hasDraft: boolean;
  editing: boolean;
  initialDay?: string;
  timezone: string;
  now: Date;
  savedTimestamp?: string;
}) {
  const shared = usePersistentDraft<IntakeTimingPreference>(
    INTAKE_TIMING_KEY,
    () => ({ mode: "automatic" }),
    isIntakeTimingPreference,
  );
  const [resetAt, setResetAt] = useState<Date | null>(null);
  const [restoredPin, setRestoredPin] = useState(
    () => shared.restored && shared.value.mode === "pinned",
  );
  const [editingAt, setEditingAt] = useState<Date | null>(null);
  const migration =
    !shared.hasDraft && hasDraft && hasEditedIntakeTiming(draft);
  const preference = migration ? pinnedIntakeTiming(draft) : shared.value;
  const setSharedTiming = shared.setValue;
  useEffect(() => {
    if (migration) setSharedTiming(pinnedIntakeTiming(draft));
  }, [migration, draft, setSharedTiming]);

  const clock = editingAt ?? (resetAt && resetAt > now ? resetAt : now);
  const followClock =
    resetAt !== null ||
    (!editing && (!initialDay || initialDay === dayKey(clock, timezone)));
  const source =
    shared.hasDraft &&
    preference.mode === "automatic" &&
    hasEditedIntakeTiming(draft)
      ? originalIntakeTiming(draft, savedTimestamp)
      : draft;
  const effectiveDraft = withIntakeTiming(
    source,
    preference,
    timezone,
    clock,
    followClock,
  );

  return {
    draft: effectiveDraft,
    pinned: preference.mode === "pinned",
    // Refreshing the clock can also change an edit (or a historical form) for this visit.
    followingCurrentTime:
      resetAt !== null &&
      (editing ||
        Boolean(initialDay && initialDay !== dayKey(clock, timezone))),
    status: shared.status,
    restored: restoredPin,
    pin: (takenAt: string) =>
      shared.setValue(
        pinnedIntakeTiming({ ...effectiveDraft, takenAt, timezone }),
      ),
    fixTime: () => {
      // Preserve the displayed historical instant on the first hold. A live
      // clock or a repeat hold captures the exact instant of release.
      const fixed = withIntakeTiming(
        effectiveDraft,
        { mode: "automatic" },
        timezone,
        new Date(),
        preference.mode === "pinned" || followClock,
      );
      shared.setValue(pinnedIntakeTiming(fixed));
      setRestoredPin(false);
    },
    reset: (target: "clock" | "form" = "clock") => {
      // Keep an automatic marker so old per-entry timing cannot resurrect a pin.
      shared.setValue({ mode: "automatic" });
      setRestoredPin(false);
      setResetAt(target === "clock" ? new Date() : null);
      setEditingAt(null);
    },
    editingChanged: (focused: boolean) => setEditingAt(focused ? clock : null),
  };
}
