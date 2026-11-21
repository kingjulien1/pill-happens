import { useId } from "react";
import styles from "./journal-preview-artwork.module.css";

/** An open book, tucked bookmark and two quiet cover layers share the check-in frame. */
export function JournalPreviewArtwork({ paused }: { paused: boolean }) {
  const id = useId();

  return (
    <span
      className={styles.artwork}
      aria-hidden="true"
      data-journal-preview-artwork
      data-artwork-dialog-open={paused}
    >
      <span className={`${styles.cover} ${styles.coverBack}`} />
      <span className={`${styles.cover} ${styles.coverFront}`} />
      <span className={styles.arrival}>
        <span className={styles.tile} data-journal-icon-tile>
          <svg className={styles.frame} viewBox="0 0 48 48" fill="none">
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
              x="2.5"
              y="2.5"
              width="43"
              height="43"
              rx="14"
              pathLength="100"
              stroke={`url(#${id})`}
            />
          </svg>
          <span className={styles.symbol}>
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
    </span>
  );
}
