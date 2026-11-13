import {
  getPageRefreshPhase,
  subscribePageRefresh,
} from "@/lib/page-refresh-handoff";

const CHANGE_EVENT = "pill:page-entry-readiness";

/** The real curtain phase wins over a React render that has not committed yet. */
export function getPageEntryReadiness(): boolean {
  if (typeof document === "undefined") return false;
  const scope = document.querySelector("[data-page-refresh-content]");
  return (
    scope?.getAttribute("data-page-entry-ready") !== "false" &&
    getPageRefreshPhase() === "idle"
  );
}

export function getServerPageEntryReadiness(): boolean {
  return false;
}

export function subscribePageEntryReadiness(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const unsubscribe = subscribePageRefresh(listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    unsubscribe();
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

/** Notify only after the provider's readiness attribute has committed to the DOM. */
export function notifyPageEntryReadiness() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
