"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Shuffle, Sparkles, X } from "lucide-react";
import { DailyMoodIcon } from "@/components/daily-mood-icon";
import { Input } from "@/components/ui/input";
import {
  DAILY_MOODS,
  DAILY_MOOD_FAMILIES,
  matchesDailyMood,
  rankDailyMoods,
  type DailyCheckIn,
  type DailyMood,
  type DailyMoodFamily,
} from "@/lib/daily-check-in";
import styles from "./daily-mood-picker.module.css";

/** A bounded mood library; the saved IDs remain identical to earlier check-ins. */
export function DailyMoodPicker({
  value,
  onChange,
  checkIns,
  seed,
  disabled = false,
}: {
  value: readonly DailyMood[];
  onChange: (value: DailyMood[]) => void;
  checkIns?: readonly Pick<DailyCheckIn, "moods">[];
  seed: string;
  disabled?: boolean;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const [mix, setMix] = useState(0);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<DailyMoodFamily | "all">("all");
  const ranked = useMemo(
    () => rankDailyMoods(checkIns, `${seed}:${mix}`),
    [checkIns, seed, mix],
  );
  const results = ranked.filter(
    (mood) =>
      (family === "all" || mood.family === family) &&
      matchesDailyMood(mood, query),
  );
  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [query, family, mix]);
  const toggle = (mood: DailyMood) => {
    if (disabled) return;
    if (value.includes(mood)) onChange(value.filter((entry) => entry !== mood));
    else if (value.length < 4) onChange([...value, mood]);
  };

  return (
    <div className={styles.picker} data-mood-library>
      <div className={styles.searchRow}>
        <div className={styles.search}>
          <Search size={16} strokeWidth={2.1} aria-hidden="true" />
          <Input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a feeling…"
            aria-label="Find a mood"
            aria-controls={`${id}-results`}
            disabled={disabled}
            autoComplete="off"
            className={styles.searchInput}
          />
          {query && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Clear mood search"
              disabled={disabled}
              onClick={() => setQuery("")}
            >
              <X size={13} strokeWidth={2.1} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.shuffle}
          disabled={disabled}
          onClick={() => setMix((current) => current + 1)}
          aria-label="Shuffle feelings with equal usage"
          title="A fresh mix. Your most-used feelings still come first."
          data-mood-shuffle
        >
          <Shuffle size={17} strokeWidth={2.1} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.families} role="group" aria-label="Mood families">
        <button
          type="button"
          aria-pressed={family === "all"}
          onClick={() => setFamily("all")}
          disabled={disabled}
        >
          All Feelings
        </button>
        {DAILY_MOOD_FAMILIES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={family === option.value}
            onClick={() => setFamily(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.caption}>
        <span id={`${id}-sort`}>
          Your Regulars First <span aria-hidden="true">·</span> Then A Fresh Mix
        </span>
        <span aria-live="polite">
          <strong>{results.length}</strong>{" "}
          {results.length === 1 ? "feeling" : "feelings"}
        </span>
      </div>
      <div
        ref={viewport}
        id={`${id}-results`}
        className={styles.viewport}
        role="group"
        aria-label="Choose up to four moods"
        aria-describedby={`${id}-sort`}
        data-mood-viewport
        tabIndex={disabled ? -1 : 0}
      >
        {results.length ? (
          <div className={styles.grid}>
            {results.map((mood) => {
              const selected = value.includes(mood.value);
              return (
                <button
                  key={mood.value}
                  type="button"
                  className={styles.mood}
                  data-mood-family={mood.family}
                  aria-pressed={selected}
                  disabled={disabled || (!selected && value.length >= 4)}
                  onClick={() => toggle(mood.value)}
                  title={mood.label}
                  data-mood-value={mood.value}
                >
                  <DailyMoodIcon mood={mood.value} />
                  <span>{mood.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <Sparkles size={26} strokeWidth={1.7} aria-hidden="true" />
            <span>No exact feeling? Try a different word.</span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFamily("all");
              }}
              disabled={disabled}
            >
              Show All Feelings
            </button>
          </div>
        )}
      </div>
      <div
        className={styles.selection}
        role="group"
        aria-label="Selected moods"
      >
        {value.length ? (
          value.map((selected) => {
            const mood = DAILY_MOODS.find((entry) => entry.value === selected);
            return mood ? (
              <button
                key={selected}
                type="button"
                onClick={() => toggle(selected)}
                disabled={disabled}
                aria-label={`Remove ${mood.label}`}
              >
                <DailyMoodIcon mood={selected} size={14} />
                <span>{mood.label}</span>
                <X size={12} aria-hidden="true" />
              </button>
            ) : null;
          })
        ) : (
          <span className={styles.selectionHint}>
            Your picks stay here, even while you search.
          </span>
        )}
      </div>
    </div>
  );
}
