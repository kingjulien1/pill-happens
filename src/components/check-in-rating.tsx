"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import styles from "./check-in-rating.module.css";

/** A native optional rating, shared by Morning sleep and Evening check-ins. */
export function CheckInRating({
  id,
  name,
  label,
  value,
  low,
  high,
  disabled,
  onChange,
  icon,
  description,
  morning = false,
}: {
  id: string;
  name: string;
  label: string;
  value: number | null;
  low: string;
  high: string;
  disabled: boolean;
  onChange: (next: number | null) => void;
  icon?: ReactNode;
  description?: string;
  morning?: boolean;
}) {
  const rated = value !== null;
  const range = useRef<HTMLInputElement>(null);
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div
      className={styles.rating}
      data-check-in-rating={name}
      data-check-in-section={morning ? undefined : name}
      data-morning-sleep-rating={morning ? name : undefined}
      data-sleep-rating={morning ? name : undefined}
      data-rated={rated}
    >
      <div className={styles.ratingHeading}>
        <Label htmlFor={id}>
          {icon}
          {label}
        </Label>
        <div className={styles.ratingValue}>
          <output
            htmlFor={id}
            data-check-in-rating-value
            data-morning-rating-value={morning ? "" : undefined}
          >
            {rated ? (
              <>
                <strong>{value}</strong>
                <span> / 10</span>
              </>
            ) : (
              "Not rated"
            )}
          </output>
          {rated && (
            <button
              type="button"
              className={styles.clearRating}
              aria-label={`Clear ${label.toLowerCase()} rating`}
              disabled={disabled}
              onClick={() => {
                onChange(null);
                range.current?.focus();
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <input
        ref={range}
        id={id}
        name={name}
        data-check-in-rating-input={name}
        data-sleep-field={morning ? name : undefined}
        className={styles.range}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 1}
        disabled={disabled}
        aria-describedby={[`${id}-scale`, descriptionId]
          .filter(Boolean)
          .join(" ")}
        aria-valuetext={rated ? `${value} of 10` : "Not rated"}
        style={
          {
            "--rating-progress": rated ? `${((value - 1) / 9) * 100}%` : "0%",
          } as CSSProperties
        }
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={(event) => {
          // Native ranges may not emit change when an unanswered minimum is tapped.
          if (!rated && !disabled && event.isPrimary && event.button === 0)
            onChange(Number(event.currentTarget.value));
        }}
        onKeyDown={(event) => {
          if (
            !rated &&
            !disabled &&
            ["Home", "ArrowLeft", "ArrowDown"].includes(event.key)
          ) {
            event.preventDefault();
            onChange(1);
          }
        }}
      />
      <div id={`${id}-scale`} className={styles.ratingCaptions}>
        <span>1 · {low}</span>
        <span>10 · {high}</span>
      </div>
      {description && (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
    </div>
  );
}
