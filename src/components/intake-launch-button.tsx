"use client";

import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import { CheckInCardBorder } from "@/components/check-in-card-border";
import { useVisibleMotion } from "@/components/use-visible-motion";
import {
  getMedicationColor,
  type MedicationColor,
} from "@/lib/medication-appearance";
import { colorContrast, mixAppColors } from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import frameStyles from "./card-frame.module.css";
import styles from "./intake-launch-button.module.css";

export function IntakeLaunchButton({
  onClick,
  ritalinColor,
}: {
  onClick: () => void;
  ritalinColor?: MedicationColor;
}) {
  const ref = useVisibleMotion<HTMLDivElement>(true);
  const id = useId();
  const rim = getMedicationColor(ritalinColor ?? "tw-zinc-300").hex;
  const face = mixAppColors(rim, "#ffffff", 0.67);
  return (
    <div className={styles.frame} ref={ref}>
      <CheckInCardBorder palette="sky-indigo" />
      <button
        className={cn(
          "intake-log-card",
          frameStyles.card,
          frameStyles.checkInBands,
          styles.button,
        )}
        data-intake-launch
        data-dark-face={colorContrast(face, "#000000") < 4.5 || undefined}
        style={{ backgroundColor: face }}
        type="button"
        onClick={onClick}
        aria-labelledby={id}
        aria-describedby={id + "-detail"}
        aria-haspopup="dialog"
      >
        <span
          data-card-rim-detail
          className={frameStyles.detailRim}
          aria-hidden="true"
        />
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
      </button>
    </div>
  );
}
