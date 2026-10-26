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

export function IntakeAction({ onClick }: { onClick: () => void }) {
  const mobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const action = (
    <Button
      type="button"
      onClick={onClick}
      className="pointer-events-auto h-16 w-full justify-start gap-3 rounded-lg px-4 text-sm shadow-none"
    >
      <ActionIcon name="create" weight="fill" className="size-6" />
      <span>Log an intake</span>
      <ActionIcon name="next" className="ml-auto size-5" />
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

  return <div className="mt-4">{action}</div>;
}
