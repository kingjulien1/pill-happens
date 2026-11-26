"use client";

import { Drama } from "lucide-react";
import { BatteryMediumIcon } from "@phosphor-icons/react/dist/ssr/BatteryMedium";
import { WavesIcon } from "@phosphor-icons/react/dist/ssr/Waves";
import { EveningReflectionPanel } from "./evening-reflection-panel";
import { CheckInRating } from "./check-in-rating";
import {
  checkInRatingForSlider,
  type CheckInRatingScale,
} from "@/lib/check-in-rating";
import { getEveningRatingComparison } from "@/lib/evening-rating-comparison";
import { formatDay } from "@/lib/domain";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import styles from "./evening-day-ratings.module.css";

function signed(value: number) {
  if (value > 0) return `+${value}`;
  return value < 0 ? `−${Math.abs(value)}` : "0";
}

export function EveningDayRatings({
  id,
  day,
  energy,
  stress,
  energyScale = 5,
  stressScale = 5,
  checkIns,
  disabled,
  onEnergyChange,
  onStressChange,
}: {
  id: string;
  day: string;
  energy: number | null;
  stress: number | null;
  energyScale?: CheckInRatingScale;
  stressScale?: CheckInRatingScale;
  checkIns?: readonly DailyCheckIn[];
  disabled: boolean;
  onEnergyChange: (value: number | null) => void;
  onStressChange: (value: number | null) => void;
}) {
  const comparison = getEveningRatingComparison(
    day,
    { energy, stress, energyScale, stressScale },
    checkIns,
  );
  const deltas = [
    {
      key: "energy",
      label: "Energy",
      delta: comparison.energy,
      Icon: BatteryMediumIcon,
    },
    {
      key: "stress",
      label: "Stress",
      delta: comparison.stress,
      Icon: WavesIcon,
    },
  ].filter((entry) => entry.delta !== null);
  const comparisonLabel =
    comparison.previousDay && deltas.length
      ? `Compared with ${formatDay(comparison.previousDay, { weekday: "short", month: "short" })}. ${deltas.map((entry) => `${entry.label} ${signed(entry.delta!)} points`).join(", ")} on the displayed 1–10 scale.`
      : "Both ratings use a 1–10 scale and are optional.";

  return (
    <EveningReflectionPanel
      kind="ratings"
      headingId={`${id}-heading`}
      title="What Today Cost"
      icon={<Drama size={16} strokeWidth={2.1} aria-hidden="true" />}
      detail={
        comparison.previousDay && deltas.length ? (
          <div
            className={styles.comparison}
            role="group"
            aria-label={comparisonLabel}
            title={comparisonLabel}
          >
            <span className={styles.date}>
              vs{" "}
              <time dateTime={comparison.previousDay}>
                {formatDay(comparison.previousDay, {
                  weekday: undefined,
                  month: "short",
                })}
              </time>
            </span>
            {deltas.map(({ key, delta, Icon }, index) => (
              <span key={key} className={styles.delta} aria-hidden="true">
                {index > 0 && <span className={styles.separator}>/</span>}
                <Icon size={12} weight="bold" />
                <strong>{signed(delta!)}</strong>
              </span>
            ))}
          </div>
        ) : (
          <span title={comparisonLabel}>Set your baseline</span>
        )
      }
    >
      <div className={styles.stack}>
        <CheckInRating
          id={`${id}-energy`}
          name="energy"
          label="Energy"
          value={checkInRatingForSlider(energy, energyScale)}
          low="Drained"
          high="Charged"
          disabled={disabled}
          onChange={onEnergyChange}
          icon={
            <BatteryMediumIcon size={15} weight="bold" aria-hidden="true" />
          }
          description={
            energyScale === 5 && energy !== null
              ? `Previously rated ${energy} of 5. Move the slider to choose a new rating.`
              : undefined
          }
        />
        <CheckInRating
          id={`${id}-stress`}
          name="stress"
          label="Stress"
          value={checkInRatingForSlider(stress, stressScale)}
          low="At ease"
          high="Overloaded"
          disabled={disabled}
          onChange={onStressChange}
          icon={<WavesIcon size={15} weight="bold" aria-hidden="true" />}
          description={
            stressScale === 5 && stress !== null
              ? `Previously rated ${stress} of 5. Move the slider to choose a new rating.`
              : undefined
          }
        />
      </div>
    </EveningReflectionPanel>
  );
}
