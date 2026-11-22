import { Rocket } from "lucide-react";

/** Fixed, decorative exhaust: no particle timers or per-frame React updates. */
export function NotificationRocket() {
  return (
    <span className="notification-rocket" aria-hidden="true">
      <svg
        className="notification-rocket-wake"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <path d="m14 26-7 7" />
        <path d="m11 22-5 5" />
        <path d="m18 30-5 5" />
        <circle cx="8" cy="31" r="1" fill="currentColor" stroke="none" />
        <circle cx="6" cy="27" r=".8" fill="currentColor" stroke="none" />
        <circle cx="13" cy="34" r=".7" fill="currentColor" stroke="none" />
      </svg>
      <Rocket className="notification-rocket-body" />
    </span>
  );
}
