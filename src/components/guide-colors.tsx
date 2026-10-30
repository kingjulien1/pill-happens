"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { ActionIcon } from "@/components/action-icon";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GUIDE_COLOR_FAMILIES,
  GUIDE_MEDICATION_COLORS,
  GUIDE_THEME_COPY,
  GUIDE_THEME_GROUPS,
} from "@/lib/guide-colors";
import styles from "./guide-colors.module.css";

export function GuideColors() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState("Tap a color to copy its hex value.");
  const [manual, setManual] = useState<{ label: string; value: string } | null>(
    null,
  );
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAttempt = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const colors = GUIDE_MEDICATION_COLORS.filter((color) => {
    if (family !== "all" && color.family !== family) return false;
    const text =
      `${color.label} ${color.value} ${color.hex} ${color.family}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      copyAttempt.current += 1;
    },
    [],
  );

  async function copy(value: string, label: string, key: string) {
    const attempt = ++copyAttempt.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Copy unavailable.");
      await navigator.clipboard.writeText(value);
      if (attempt !== copyAttempt.current) return;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setCopied(key);
      setMessage(`${label} copied.`);
      feedbackTimer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      if (attempt !== copyAttempt.current) return;
      setManual({ label, value });
      setMessage(
        "Automatic copy is unavailable. Select and copy the value instead.",
      );
    }
  }

  return (
    <div className={styles.reference} data-guide-colors>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Exact values, ready to reuse.</p>
        <button
          type="button"
          className={styles.copyAction}
          onClick={() => void copy(GUIDE_THEME_COPY, "Theme palette", "theme")}
        >
          {copied === "theme" ? (
            <ActionIcon name="selected" className="size-3.5" />
          ) : (
            <CopyIcon size={14} weight="bold" aria-hidden="true" />
          )}
          Copy Theme
        </button>
      </div>
      <p
        className={styles.feedback}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>

      <div className={styles.groups}>
        {GUIDE_THEME_GROUPS.map((group, groupIndex) => (
          <details
            key={group.id}
            className={styles.group}
            open={groupIndex === 0}
          >
            <summary className={styles.groupSummary}>
              <span className={styles.groupTitle}>{group.title}</span>
              <span className={styles.groupCount}>
                {group.colors.length} colors
              </span>
              <ActionIcon name="expand" className={styles.chevron} />
            </summary>
            <p className={styles.groupDescription}>{group.description}</p>
            <div className={styles.swatches}>
              {group.colors.map((color, index) => {
                const key = `${group.id}-${index}`;
                return (
                  <button
                    type="button"
                    key={key}
                    className={styles.swatch}
                    onClick={() =>
                      void copy(color.hex, `${color.label} ${color.hex}`, key)
                    }
                    aria-label={`Copy ${color.label} ${color.hex}`}
                    title={color.usage}
                  >
                    <span className={styles.colorWell} aria-hidden="true">
                      <span style={{ backgroundColor: color.hex }} />
                    </span>
                    <span className={styles.swatchText}>
                      <span className={styles.swatchHeading}>
                        <span className={styles.swatchLabel}>
                          {color.label}
                        </span>
                        <code>{color.hex}</code>
                      </span>
                      <span className={styles.swatchUsage}>{color.usage}</span>
                    </span>
                    {copied === key && (
                      <ActionIcon
                        name="selected"
                        className={styles.copiedMark}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      <div className={styles.notes}>
        <p>
          <strong>Color follows your device.</strong> Light and dark mode switch
          with your system appearance; this reference does not change the theme.
        </p>
        <p>
          Six-digit hex is a solid color. In <code>#RRGGBBAA</code>, the final
          two digits set opacity. Glass, gradients and overlays can change how a
          color looks on screen.
        </p>
        <p>
          Dark secondary text uses Sand at 60%. The background adds a 45% Ink
          overlay in dark mode and an 18% white overlay in light mode;
          intake-card backgrounds add 70% Ink.
        </p>
        <p>
          The brand keeps its original <code>#f97316</code>. The installed
          Tailwind palette uses <code>#ff6900</code> for Orange 500; both appear
          here exactly as used.
        </p>
      </div>

      <div className={styles.medicationPalette}>
        <div className={styles.paletteHeading}>
          <h3>Medication Accents</h3>
          <span>{GUIDE_MEDICATION_COLORS.length} choices</span>
        </div>
        <p className={styles.paletteDescription}>
          The complete in-app selection: 24 original accents plus the installed
          Tailwind shades, Black and White. Copying a swatch does not change a
          medication.
        </p>
        <div className={styles.filters}>
          <div className={styles.search}>
            <label htmlFor={`${id}-search`} className="sr-only">
              Search medication colors
            </label>
            <Input
              ref={searchInput}
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a color"
              className="h-10 rounded-xl text-base md:text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-family`} className="sr-only">
              Filter color family
            </label>
            <select
              id={`${id}-family`}
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className={styles.family}
            >
              <option value="all">All Families</option>
              {GUIDE_COLOR_FAMILIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.resultRow}>
          <span aria-live="polite">
            <strong>{colors.length}</strong>{" "}
            {colors.length === 1 ? "color" : "colors"}{" "}
            {query || family !== "all" ? "found" : "to explore"}
          </span>
          <button
            type="button"
            className={styles.copyAction}
            disabled={!colors.length}
            onClick={() =>
              void copy(
                colors
                  .map((color) => `${color.label}: ${color.hex}`)
                  .join("\n"),
                "Color results",
                "results",
              )
            }
          >
            {copied === "results" ? (
              <ActionIcon name="selected" className="size-3" />
            ) : (
              <CopyIcon size={12} weight="bold" aria-hidden="true" />
            )}
            Copy Results
          </button>
        </div>
        <div
          className={styles.paletteGrid}
          role="region"
          aria-label="Medication color swatches"
        >
          {colors.length ? (
            colors.map((color) => (
              <button
                type="button"
                className={styles.accent}
                key={color.value}
                onClick={() =>
                  void copy(
                    color.hex,
                    `${color.label} ${color.hex}`,
                    color.value,
                  )
                }
                aria-label={`Copy ${color.label} ${color.hex}`}
                title={`${color.label} · ${color.hex}`}
                data-copied={copied === color.value}
              >
                <span
                  className={styles.accentColor}
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                >
                  {copied === color.value && (
                    <span className={styles.accentCopied}>
                      <ActionIcon name="selected" className="size-3" />
                    </span>
                  )}
                </span>
                <span className={styles.accentLabel}>{color.label}</span>
                <code>{color.hex}</code>
              </button>
            ))
          ) : (
            <div className={styles.empty}>
              <ActionIcon name="discover" className="size-7" />
              <p>No colors found.</p>
              <span>Try a name, shade number or hex value.</span>
              <button
                type="button"
                className={styles.copyAction}
                onClick={() => {
                  setQuery("");
                  setFamily("all");
                  searchInput.current?.focus();
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <ResponsiveModal
        open={Boolean(manual)}
        onOpenChange={(open) => !open && setManual(null)}
        title="Copy Values"
        context="Select & Copy"
        description="Your browser couldn't copy automatically. Select the text below and use your device's Copy action."
      >
        {manual && (
          <div className={styles.manualCopy}>
            <label htmlFor={`${id}-manual`}>{manual.label}</label>
            <Textarea
              id={`${id}-manual`}
              autoFocus
              readOnly
              value={manual.value}
              onFocus={(event) => event.target.select()}
              rows={manual.value.includes("\n") ? 7 : 2}
              className="min-h-20 rounded-xl font-mono text-base md:text-sm"
            />
            <Button
              type="button"
              className="mt-3 h-11 w-full gap-2 rounded-xl"
              onClick={() => setManual(null)}
            >
              <ActionIcon name="selected" className="size-4" />
              Done
            </Button>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
}
