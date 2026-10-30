"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ActionIcon } from "@/components/action-icon";
import { IntakeSummary } from "@/components/intake-summary";
import { SpecularRim } from "@/components/specular-rim";
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
        className="intake-log-action pointer-events-auto h-16 w-full justify-center gap-3.5 rounded-[22px] px-4 text-[15px] shadow-lg max-[359px]:gap-3 max-[359px]:px-3 sm:gap-4 sm:px-5"
      >
        <SpecularRim radius={22} />
        <span aria-hidden="true" className="intake-specular-fallback" />
        <span className="intake-log-symbol relative inline-flex size-7 shrink-0 items-center justify-center max-[359px]:size-[26px]">
          <ActionIcon
            name="medications"
            weight="bold"
            className="absolute bottom-0 left-0 size-6 max-[359px]:size-[22px]"
          />
          <ActionIcon
            name="sparkle"
            weight="fill"
            className="absolute top-0 right-0 size-2.5"
          />
        </span>
        <span className="intake-log-copy inline-flex min-w-0 items-center justify-center gap-2 text-center leading-none whitespace-nowrap max-[359px]:gap-1.5">
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
        <span className="intake-log-next inline-flex size-[22px] shrink-0 items-center justify-center overflow-hidden">
          <ActionIcon name="next" className="size-full" />
        </span>
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
