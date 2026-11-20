"use client";

import {
  useCallback,
  useRef,
  type ComponentProps,
  type Ref,
  type RefObject,
} from "react";
import type { Dialog } from "@base-ui/react/dialog";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";

type InitialFocus = ComponentProps<typeof Dialog.Popup>["initialFocus"];
type FocusCallback = Exclude<
  InitialFocus,
  boolean | RefObject<HTMLElement | null> | undefined
>;

function resetScroll(popup: HTMLElement) {
  for (const element of [popup, ...popup.querySelectorAll<HTMLElement>("*")]) {
    if (element.scrollTop) element.scrollTop = 0;
    if (element.scrollLeft) element.scrollLeft = 0;
  }
}

/** Each opening starts at the header; focus never scrolls to a lower field. */
export function useDialogOpeningFocus(
  forwardedRef: Ref<HTMLDivElement> | undefined,
  requestedFocus: InitialFocus,
) {
  const popup = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const setPopup = useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    initialized.current = false;
    if (!node) return;

    resetScroll(node);
    // Also cover kept-mounted popups and reopening during their exit transition.
    let wasOpen = node.hasAttribute("data-open");
    const observer = new MutationObserver(() => {
      const open = node.hasAttribute("data-open");
      if (open !== wasOpen) {
        initialized.current = false;
        if (open) resetScroll(node);
        wasOpen = open;
      }
    });
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["data-open"],
    });
    return () => {
      observer.disconnect();
      if (popup.current === node) popup.current = null;
    };
  }, []);

  const initialFocus = useCallback<FocusCallback>(
    (interaction) => {
      const node = popup.current;
      if (!node || initialized.current) return false;
      initialized.current = true;
      const requested =
        typeof requestedFocus === "function"
          ? requestedFocus(interaction)
          : typeof requestedFocus === "object"
            ? requestedFocus?.current
            : requestedFocus;
      resetScroll(node);
      if (requested === false) return false;
      const candidate =
        requested instanceof HTMLElement && node.contains(requested)
          ? requested
          : node;
      const bounds = node.getBoundingClientRect();
      const candidateBounds = candidate.getBoundingClientRect();
      const target =
        candidateBounds.top >= bounds.top &&
        candidateBounds.bottom <= bounds.bottom
          ? candidate
          : node;
      // Base UI retains the focus trap and return focus. Handle this first focus
      // here so explicit heading/cancel targets also use preventScroll.
      target.focus({ preventScroll: true });
      resetScroll(node);
      return false;
    },
    [requestedFocus],
  );

  const ref = useMergedRefs(setPopup, forwardedRef);
  return { ref, initialFocus };
}
