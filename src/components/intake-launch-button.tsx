"use client";

import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import { CheckInCardRim } from "@/components/check-in-card-rim";
import { useVisibleMotion } from "@/components/use-visible-motion";
import styles from "./intake-launch-button.module.css";

export function IntakeLaunchButton({ onClick }: { onClick: () => void }) {
  const ref = useVisibleMotion<HTMLButtonElement>(true);
  const id = useId();
  return (
    <button
      ref={ref}
      className={styles.button}
      type="button"
      onClick={onClick}
      aria-labelledby={id}
      aria-describedby={id + "-detail"}
      aria-haspopup="dialog"
    >
      <IntakeLogSymbol variant="layers-arrow-up" className={styles.mark} />
      <span className={styles.copy}>
        <span id={id} className={styles.title}>
          Log Intake
        </span>
        <span id={id + "-detail"} className={styles.detail}>
          Medication, dose &amp; time
        </span>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        <ArrowRight size={19} strokeWidth={2.6} />
      </span>
      <span className={styles.rim} data-specular-frame aria-hidden="true">
        <CheckInCardRim palette="spectrum" glow={false} />
        <svg className={styles.fallback} focusable="false">
          <defs>
            <linearGradient id={id + "-rim"} x2="100%" y2="100%">
              <stop stopColor="var(--intake-rim-stop-1)" />
              <stop offset=".25" stopColor="var(--intake-rim-stop-2)" />
              <stop offset=".5" stopColor="var(--intake-rim-stop-3)" />
              <stop offset=".75" stopColor="var(--intake-rim-stop-4)" />
              <stop offset="1" stopColor="var(--intake-rim-stop-5)" />
            </linearGradient>
          </defs>
          <rect stroke={`url(#${id}-rim)`} />
          <rect className={styles.reflections} pathLength="100" />
        </svg>
      </span>
    </button>
  );
}
