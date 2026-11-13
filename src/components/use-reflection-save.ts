"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useJournal } from "@/components/journal-provider";
import type { CheckInDraft } from "@/lib/check-in-draft";
import type { DailyCheckIn, DailyCheckInPeriod } from "@/lib/daily-check-in";
import {
  createReflectionSaveController,
  reflectionSaveDisplay,
  type ReflectionSaveControls,
} from "@/lib/reflection-save";

export type { ReflectionSaveControls } from "@/lib/reflection-save";
const subscribeOnline = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
const subscribeVisible = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
};

/** Saving writing never submits or resets the other raw check-in fields. */
export function useReflectionSave({
  day,
  period,
  note,
  checkIn,
  baseUpdatedAt,
  setDraft,
  disabled,
}: {
  day: string;
  period: DailyCheckInPeriod;
  note: string;
  checkIn?: DailyCheckIn;
  baseUpdatedAt: string | null | undefined;
  setDraft: (next: (current: CheckInDraft) => CheckInDraft) => void;
  disabled: boolean;
}) {
  const { saveReflection, refresh, busy } = useJournal();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const visible = useSyncExternalStore(
    subscribeVisible,
    () => !document.hidden,
    () => false,
  );
  const key = `${day}:${period}`;
  const create = () => ({
    key,
    controller: createReflectionSaveController({
      initial: {
        note,
        savedNote: checkIn?.note ?? "",
        savedAt: checkIn?.updatedAt ?? null,
        baseUpdatedAt,
        enabled: false,
        busy,
        online,
      },
      send: (value, expectedUpdatedAt) =>
        saveReflection({ day, period, note: value, expectedUpdatedAt }),
      acknowledge: (updatedAt) =>
        setDraft((current) => ({
          ...current,
          reflectionBaseUpdatedAt: updatedAt,
        })),
      conflict: () => {
        void refresh();
      },
    }),
  });
  const [binding, setBinding] = useState(create);
  if (binding.key !== key) setBinding(create());
  const controller = binding.controller;
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.start();
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => {
    controller.update({
      note,
      savedNote: checkIn?.note ?? "",
      savedAt: checkIn?.updatedAt ?? null,
      baseUpdatedAt,
      enabled: visible && !disabled,
      busy,
      online,
    });
  }, [
    controller,
    note,
    checkIn?.note,
    checkIn?.updatedAt,
    baseUpdatedAt,
    visible,
    disabled,
    busy,
    online,
  ]);
  useEffect(() => {
    const resume = () => controller.online();
    window.addEventListener("online", resume);
    return () => window.removeEventListener("online", resume);
  }, [controller]);
  const controls: ReflectionSaveControls = {
    ...reflectionSaveDisplay(state, note, checkIn?.note ?? "", online),
    onSave: () => {
      void controller.save();
    },
  };
  return {
    controls,
    pauseAndDrain: controller.pauseAndDrain,
    resume: controller.resume,
  };
}
