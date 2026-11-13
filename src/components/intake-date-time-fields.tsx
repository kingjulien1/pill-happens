"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

type IntakeDateTimeFieldsProps = {
  value: string;
  onChange: (combined: string) => void;
  timezone: string;
  disabled?: boolean;
};

/** Separate controls retain the existing draft's local date/time representation. */
export function IntakeDateTimeFields({
  value,
  onChange,
  timezone,
  disabled = false,
}: IntakeDateTimeFieldsProps) {
  const id = useId();
  const separator = value.indexOf("T");
  const date = separator < 0 ? value : value.slice(0, separator);
  const time = separator < 0 ? "" : value.slice(separator + 1);
  const localNow = toLocalInput(new Date(), timezone);
  const [confirmed, setConfirmed] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const resetTime = () => {
    if (disabled) return;
    const currentTime = toLocalInput(new Date(), timezone).slice(11);
    onChange(`${date}T${currentTime}`);
    if (timer.current !== null) clearTimeout(timer.current);
    setResetVersion((version) => version + 1);
    setConfirmed(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setConfirmed(false);
    }, 1500);
  };

  return (
    <div className={styles.fields} data-intake-date-time-fields>
      <div className={styles.field}>
        <Label htmlFor={`${id}-date`}>Date Taken</Label>
        <Input
          id={`${id}-date`}
          name="takenAtDate"
          type="date"
          value={date}
          max={localNow.slice(0, 10)}
          onChange={(event) => onChange(`${event.target.value}T${time}`)}
          disabled={disabled}
          required
          className={`${styles.input} ${styles.dateInput}`}
          data-intake-date
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor={`${id}-time`}>Time Taken</Label>
        <div className={styles.timeControls}>
          <Input
            id={`${id}-time`}
            name="takenAtTime"
            type="time"
            value={time}
            max={
              date === localNow.slice(0, 10) ? localNow.slice(11) : undefined
            }
            step={60}
            onChange={(event) => onChange(`${date}T${event.target.value}`)}
            disabled={disabled}
            required
            className={`${styles.input} ${styles.timeInput}`}
            data-intake-clock
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={resetTime}
            disabled={disabled}
            aria-label="Reset time to now"
            title="Reset time to now"
            className={styles.resetButton}
            data-dialog-corner="control"
            data-intake-time-reset
            data-confirmed={confirmed || undefined}
          >
            <span
              key={resetVersion}
              className={styles.resetVisual}
              data-feedback={
                resetVersion === 0
                  ? undefined
                  : confirmed
                    ? "confirmed"
                    : "idle"
              }
              aria-hidden="true"
            >
              <span className={styles.resetGlyph}>
                <ActionIcon name="retry" className="size-4" />
              </span>
              <span className={styles.checkGlyph}>
                <ActionIcon name="selected" className="size-4" />
              </span>
            </span>
          </Button>
        </div>
        <span role="status" aria-atomic="true" className="sr-only">
          {confirmed && <span key={resetVersion}>Time reset</span>}
        </span>
      </div>
    </div>
  );
}
