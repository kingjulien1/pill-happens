"use client";

import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import { IntakeSpecularBorder } from "@/components/specular-card-border";
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
      <IntakeSpecularBorder />
    </button>
  );
}
