"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIntakeDock } from "@/components/use-intake-dock";

const query = "(max-width: 767px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

/** One measured mobile dock and fade stack for prominent page actions. */
export function PageActionDock({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const dock = useRef<HTMLDivElement>(null);
  const mobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  useIntakeDock(dock, mobile);

  if (mobile)
    return createPortal(
      <div
        ref={dock}
        className="intake-dock"
        role="region"
        aria-label={label}
        data-page-action-dock
      >
        <div className="intake-dock-inner">{children}</div>
      </div>,
      document.body,
    );

  return (
    <div className="intake-action-desktop page-action-desktop">{children}</div>
  );
}
