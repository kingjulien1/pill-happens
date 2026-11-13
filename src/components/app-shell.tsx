"use client";

import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type SyntheticEvent } from "react";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";
import { CompactRefreshBrand } from "@/components/page-refresh";
import { HeaderNavigation } from "@/components/header-navigation";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { CardEntrySequence } from "@/components/card-entry-sequence";
import { JournalReferenceArrival } from "@/components/journal-reference-arrival";
import layoutStyles from "./page-layout.module.css";
import guideStyles from "./guide-shell.module.css";
import topbarStyles from "./page-topbar.module.css";

/** An interacted control stays settled even after its menu closes or focus leaves. */
function settleTopbarControl(event: SyntheticEvent<HTMLElement>) {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLElement>("[data-topbar-entry]");
  if (control && event.currentTarget.contains(control))
    control.dataset.topbarSettled = "true";
}

function finishTopbarControl(event: SyntheticEvent<HTMLElement>) {
  if (
    event.target instanceof HTMLElement &&
    event.target.hasAttribute("data-topbar-entry") &&
    event.currentTarget.contains(event.target)
  )
    event.target.dataset.topbarSettled = "true";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const topbar = useRef<HTMLElement>(null);
  const path = usePathname();
  const intakePage =
    path === "/" || /^\/history\/\d{4}-\d{2}-\d{2}$/.test(path);
  const guidePage = path === "/guide" || path === "/developer-guide";
  const { data, error, refresh } = useJournal();
  const { ready } = useJournalWorkspace();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => {
      if (!reduced.matches && !document.hidden) return;
      topbar.current
        ?.querySelectorAll<HTMLElement>("[data-topbar-entry]")
        .forEach((control) => {
          control.dataset.topbarSettled = "true";
        });
    };
    settle();
    const adoptFinished = () => {
      if (!getPageEntryReadiness()) return;
      // A server-rendered entrance can finish before hydration attaches its handler.
      topbar.current
        ?.querySelectorAll<HTMLElement>("[data-topbar-entry]")
        .forEach((control) => {
          if (
            typeof control.getAnimations === "function" &&
            control.getAnimations().length === 0
          )
            control.dataset.topbarSettled = "true";
        });
    };
    const unsubscribeEntry = subscribePageEntryReadiness(adoptFinished);
    adoptFinished();
    reduced.addEventListener("change", settle);
    document.addEventListener("visibilitychange", settle);
    return () => {
      unsubscribeEntry();
      reduced.removeEventListener("change", settle);
      document.removeEventListener("visibilitychange", settle);
    };
  }, []);
  return (
    <div
      className={
        guidePage
          ? guideStyles.shell
          : `${layoutStyles.shell} ${intakePage ? layoutStyles.timeline : ""} ${path === "/" ? "with-intake-dock" : ""}`
      }
      data-guide-shell={guidePage || undefined}
      data-page-layout={
        guidePage ? "guide" : intakePage ? "timeline" : "collection"
      }
    >
      <header
        ref={topbar}
        className={
          guidePage
            ? `${topbarStyles.header} ${topbarStyles.guideHeader}`
            : topbarStyles.header
        }
        data-page-topbar
        onPointerDownCapture={settleTopbarControl}
        onFocusCapture={settleTopbarControl}
        onAnimationEndCapture={finishTopbarControl}
      >
        <div className={topbarStyles.leftControls} data-header-left-controls>
          <div className={topbarStyles.control} data-topbar-entry="0">
            <CompactRefreshBrand />
          </div>
        </div>
        <div className={topbarStyles.rightControls} data-header-right-controls>
          <nav
            aria-label="Main navigation"
            className={topbarStyles.control}
            data-topbar-entry="1"
          >
            <HeaderNavigation />
          </nav>
        </div>
      </header>
      <div
        className={topbarStyles.separator}
        data-page-topbar-separator
        aria-hidden="true"
      />
      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {error && (
          <div
            role="alert"
            className={
              data
                ? "surface mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
                : "surface rounded-3xl p-8 text-center"
            }
          >
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className={
                data
                  ? "h-10 shrink-0 gap-2 px-3 text-xs"
                  : "mt-5 h-11 gap-2 px-5"
              }
              onClick={() => void refresh()}
            >
              <ActionIcon name="retry" />
              Try again
            </Button>
          </div>
        )}
        {!data && !error && (
          <div
            role="status"
            className="canvas-copy flex min-h-64 flex-1 items-center justify-center gap-2 text-sm"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Opening your space…
          </div>
        )}
        {data && !ready && (
          <div
            role="status"
            className="canvas-copy flex min-h-64 flex-1 items-center justify-center gap-2 text-sm"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Restoring your last screen…
          </div>
        )}
        {data && ready && (
          <CardEntrySequence
            key={path}
            className={`min-w-0 flex-1 ${intakePage ? "" : "page-enter"} ${path === "/" ? "flex flex-col" : ""}`}
          >
            <JournalReferenceArrival />
            {children}
          </CardEntrySequence>
        )}
      </main>
    </div>
  );
}
