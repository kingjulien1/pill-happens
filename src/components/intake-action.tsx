"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ActionIcon } from "@/components/action-icon";
import { IntakeSummary } from "@/components/intake-summary";
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
    <div className="pointer-events-auto space-y-3">
      <IntakeSummary count={todayCount} today />
      <Button
        type="button"
        onClick={onClick}
        className="pointer-events-auto h-16 w-full justify-start gap-3.5 rounded-[22px] px-4 text-[15px] shadow-lg shadow-primary/10 max-[359px]:gap-3 max-[359px]:px-3 sm:gap-4 sm:px-5"
      >
        <ActionIcon
          name="record"
          weight="bold"
          className="mr-1.5 size-7 max-[359px]:mr-1 max-[359px]:size-[26px] sm:mr-2"
        />
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left leading-none whitespace-nowrap max-[359px]:gap-1.5">
          <span className="shrink-0 leading-none">Log an Intake</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-normal whitespace-nowrap text-inherit opacity-[.65] max-[359px]:gap-1 max-[359px]:text-[11px]">
            <span aria-hidden="true" className="leading-none">
              /
            </span>
            <span className="sr-only">, </span>
            <span className="leading-none tabular-nums">
              {todayCount} today
            </span>
          </span>
        </span>
        <ActionIcon name="next" className="ml-auto size-[22px]" />
      </Button>
    </div>
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
