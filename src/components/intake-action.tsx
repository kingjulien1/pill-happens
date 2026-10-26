"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";

const mobileQuery = "(max-width: 767px)";
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

export function IntakeAction({
  onClick,
  todayCount,
}: {
  onClick: () => void;
  todayCount: number;
}) {
  const mobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const action = (
    <Button
      type="button"
      onClick={onClick}
      className="pointer-events-auto h-16 w-full justify-start gap-2.5 rounded-[22px] px-4 text-[15px] shadow-lg shadow-primary/10 sm:gap-3 sm:px-5"
    >
      <ActionIcon name="log" weight="fill" className="size-8" />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left">
        <span>Log an intake</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-[#bbb7bf] dark:text-[#625d65]">
          <span aria-hidden="true">/</span>
          <span className="sr-only">, </span>
          <span className="tabular-nums">{todayCount} today</span>
        </span>
      </span>
      <ActionIcon name="next" className="ml-auto size-[22px]" />
    </Button>
  );

  if (mobile) {
    // Animated page wrappers can anchor fixed elements; the body portal avoids that.
    return createPortal(
      <div className="intake-dock" role="region" aria-label="Intake actions">
        <div className="intake-dock-inner">{action}</div>
      </div>,
      document.body,
    );
  }

  return <div className="mt-6">{action}</div>;
}
