"use client";

import { useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useDialogSweepFrame } from "./use-dialog-sweep-frame";
import { Scissors } from "lucide-react";
import styles from "./intake-deletion-exit.module.css";

// The cutting edge is outside the popup's clip so the strips can fall past it.
export function IntakeDeletionExit() {
  const marker = useRef<HTMLSpanElement>(null);
  const frame = useDialogSweepFrame(marker, true, "up");
  return (
    <>
      <span hidden ref={marker} />
      {frame &&
        createPortal(
          <div
            aria-hidden="true"
            data-intake-shred=""
            className={styles.frame}
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
            }}
          >
            <div className={styles.carriage}>
              <div className={styles.rail}>
                <i />
                <span className={styles.blade}>
                  <Scissors size={15} strokeWidth={2.2} />
                </span>
              </div>
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  className={styles.strip}
                  style={
                    {
                      left: 7 + i * 10.75 + "%",
                      "--drift": ((i % 3) - 1) * 18 + "px",
                      "--turn": (i % 2 ? 1 : -1) * (16 + i * 3) + "deg",
                      "--delay": 650 + (i % 4) * 128 + "ms",
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className={styles.lastCut}>
              <i />
              <i />
              <i />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
