"use client";

import type { ReactNode } from "react";
import { ArrowUpToLine, PanelsTopLeft, X } from "lucide-react";
import { DialogClose } from "./ui/dialog";
import styles from "./dialog-footer-navigation.module.css";

export function DialogFooterNavigation({
  children,
  disabled = false,
}: {
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={children ? `${styles.row} ${styles.withActions}` : styles.row}
      data-dialog-footer-navigation
    >
      <DialogClose
        type="button"
        className={`${styles.labeledControl} ${styles.control} ${styles.close}`}
        aria-label="Close dialog"
        title="Close dialog"
        disabled={disabled}
      >
        <span className={styles.face} aria-hidden="true">
          <PanelsTopLeft className={styles.window} />
          <X className={styles.cross} />
        </span>
        <span>Close Dialog</span>
      </DialogClose>
      {children}
      <button
        type="button"
        className={`${styles.labeledControl} ${styles.control} ${styles.top}`}
        aria-label="Back to top"
        title="Back to top"
        disabled={disabled}
        onClick={(event) => {
          const button = event.currentTarget;
          const surface = button.closest<HTMLElement>("[data-dialog-surface]");
          if (!surface) return;
          const scroller =
            button.closest<HTMLElement>(
              "[data-dialog-scroll], [data-writing-scroll]",
            ) ?? surface;
          const title = surface.querySelector<HTMLElement>(
            '[data-slot="dialog-title"], [data-slot="drawer-title"]',
          );
          title?.focus({ preventScroll: true });
          scroller.scrollTo({
            top: 0,
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }}
      >
        <span className={styles.face} aria-hidden="true">
          <ArrowUpToLine className={styles.arrow} />
        </span>
        <span>Back to Top</span>
      </button>
    </div>
  );
}
