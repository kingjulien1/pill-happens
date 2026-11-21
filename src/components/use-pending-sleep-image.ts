"use client";

import { useSyncExternalStore } from "react";
import {
  getPendingSleepImage,
  getServerSleepImage,
  subscribeSleepImage,
} from "@/lib/shared-sleep-image";

export function usePendingSleepImage() {
  return useSyncExternalStore(
    subscribeSleepImage,
    getPendingSleepImage,
    getServerSleepImage,
  );
}
