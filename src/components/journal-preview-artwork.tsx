"use client";

import { useEffect, useId, useRef } from "react";
import { CardIconSettle } from "@/components/card-icon-settle";
import scene from "./check-in-card-artwork.module.css";
import styles from "./journal-preview-artwork.module.css";

/** An open book, tucked bookmark and two quiet cover layers share the check-in frame. */
export function JournalPreviewArtwork({ paused }: { paused: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const card = element.closest<HTMLElement>("[data-card-entry]");
    const ready = element.closest<HTMLElement>("[data-page-entry-ready]");
    const refresh = element.closest<HTMLElement>("[data-page-refresh-content]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = !("IntersectionObserver" in window);
    let frame = 0;
    const sync = () => {
      element.dataset.artworkActive = String(
        visible &&
          !paused &&
          !document.hidden &&
          !reduced.matches &&
          card?.dataset.cardEntryState !== "pending" &&
          getComputedStyle(element)
            .getPropertyValue("--page-entry-play-state")
            .trim() !== "paused",
      );
    };
    const queue = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          sync();
        });
    };
    const intersection =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    intersection?.observe(element);
    const mutations = new MutationObserver(queue);
    for (const target of new Set([
      document.documentElement,
      document.body,
      card,
      ready,
      refresh,
    ]))
      if (target)
        mutations.observe(target, {
          attributes: true,
          attributeFilter: [
            "class",
            "style",
            "data-card-entry-state",
            "data-page-entry-ready",
            "data-page-refresh-active",
          ],
        });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", queue);
    queue();
    return () => {
      cancelAnimationFrame(frame);
      intersection?.disconnect();
      mutations.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", queue);
    };
  }, [paused]);

  return (
    <span
      ref={root}
      className={`${scene.stage} ${styles.artwork}`}
      aria-hidden="true"
      data-journal-preview-artwork
      data-artwork-active="false"
      data-artwork-dialog-open={paused}
    >
      <span className={scene.halo} />
      <span className={`${styles.cover} ${styles.coverBack}`} />
      <span className={`${styles.cover} ${styles.coverFront}`} />
      <span className={`${scene.arrival} ${styles.arrival}`}>
        <span className={`${scene.tile} ${styles.tile}`} data-journal-icon-tile>
          <span className={scene.wash} />
          <svg className={scene.frame} viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient
                id={id}
                x1="4"
                y1="3"
                x2="43"
                y2="45"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="var(--journal-accent)" />
                <stop offset=".5" stopColor="var(--journal-complement)" />
                <stop offset="1" stopColor="var(--journal-accent)" />
              </linearGradient>
            </defs>
            <rect
              className={scene.frameTrace}
              x="2.5"
              y="2.5"
              width="43"
              height="43"
              rx="14"
              pathLength="100"
              stroke={`url(#${id})`}
            />
          </svg>
          <span className={scene.symbolArrival}>
            <svg
              className={styles.book}
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <g className={styles.leftPage}>
                <path
                  className={styles.leftFill}
                  d="M16 8.5C12.8 6.6 8.8 6.4 5 8v16.5c3.8-1.6 7.8-1.4 11 .5Z"
                />
                <path
                  d="M8.5 12.1c1.5-.3 2.8-.2 4 .2m-4 3.6c1.5-.3 2.8-.2 4 .2"
                  opacity=".55"
                />
              </g>
              <g className={styles.rightPage}>
                <path
                  className={styles.rightFill}
                  d="M16 8.5c3.2-1.9 7.2-2.1 11-.5v16.5c-3.8-1.6-7.8-1.4-11 .5Z"
                />
                <path
                  d="M19.5 16c1.2-.4 2.5-.5 4-.2m-4 3.5c1.2-.4 2.5-.5 4-.2"
                  opacity=".55"
                />
              </g>
              <path d="M16 9v15.5" opacity=".85" />
              <path
                className={styles.bookmark}
                d="M20.3 6.8v6l2-1.3 2 1.3V6.5"
                strokeWidth="1.25"
              />
              <path
                className={styles.sparkle}
                d="m16.8 2.5.55 1.55 1.55.55-1.55.55-.55 1.55-.55-1.55-1.55-.55 1.55-.55Z"
                strokeWidth=".8"
              />
            </svg>
          </span>
        </span>
      </span>
      <CardIconSettle owner="check-in" />
    </span>
  );
}
