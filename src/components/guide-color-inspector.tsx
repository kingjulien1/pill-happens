"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { HashIcon } from "@phosphor-icons/react/dist/ssr/Hash";
import { ActionIcon } from "@/components/action-icon";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_THEME_VALUES } from "@/lib/app-theme";
import {
  GUIDE_THEME_ROLES,
  guideColorDetails,
  guidePreviewInk,
  type GuideThemeMode,
} from "@/lib/guide-colors";
import styles from "./guide-color-inspector.module.css";

export type GuideColorInspectorRole = {
  id: string;
  label: string;
  description: string;
  token: string;
  light: string;
  dark: string;
  pairsWith: readonly string[];
};
export type GuideColorInspectorFormat = "hex" | "rgb";
export type GuideColorInspectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: GuideColorInspectorRole;
  mode?: GuideThemeMode;
  onModeChange?: (mode: GuideThemeMode) => void;
  onInspectPair?: (id: string) => void;
  usage?: string;
  /** Additional opacity on this one painted layer; separate from color alpha. */
  layerOpacity?: number;
  format?: GuideColorInspectorFormat;
  onFormatChange?: (format: GuideColorInspectorFormat) => void;
  pairRoles?: readonly GuideColorInspectorRole[];
};

function detailsFor(value: string) {
  if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))
    return guideColorDetails(value);
  if (/^#[\da-f]{3}([\da-f])?$/i.test(value)) {
    return guideColorDetails(
      `#${[...value.slice(1)].map((part) => part.repeat(2)).join("")}`,
    );
  }
  return null;
}
const percentage = (value: number) =>
  `${new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(value * 100)}%`;

function ValueField({
  id,
  label,
  value,
  field,
  copied,
  multiline = false,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  field: string;
  copied: boolean;
  multiline?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={styles.valueField} data-color-inspector-field={field}>
      <label htmlFor={id}>{label}</label>
      <div
        className={styles.valueControl}
        data-multiline={multiline || undefined}
      >
        {multiline ? (
          <Textarea
            id={id}
            readOnly
            value={value}
            rows={2}
            onFocus={(event) => event.target.select()}
            className={styles.valueTextarea}
          />
        ) : (
          <Input
            id={id}
            readOnly
            value={value}
            onFocus={(event) => event.target.select()}
            className={styles.valueInput}
          />
        )}
        <button
          type="button"
          className={styles.copyButton}
          onClick={onCopy}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          title={copied ? "Copied" : `Copy ${label}`}
          data-color-inspector-copy={field}
          data-copied={copied || undefined}
        >
          {copied ? (
            <ActionIcon name="selected" className="size-3.5" />
          ) : (
            <CopyIcon size={14} weight="bold" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

/** Inspect source pigments independently from the application's current theme. */
export function GuideColorInspector({
  open,
  onOpenChange,
  role,
  mode,
  onModeChange,
  onInspectPair,
  usage,
  layerOpacity = 1,
  format,
  onFormatChange,
  pairRoles = GUIDE_THEME_ROLES,
}: GuideColorInspectorProps) {
  const id = useId();
  const [internalMode, setInternalMode] = useState<GuideThemeMode>("light");
  const [internalFormat, setInternalFormat] =
    useState<GuideColorInspectorFormat>("hex");
  const activeMode = mode ?? internalMode;
  const activeFormat = format ?? internalFormat;
  const raw = role[activeMode];
  const details = detailsFor(raw);
  const opacity = Number.isFinite(layerOpacity)
    ? Math.max(0, Math.min(1, layerOpacity))
    : 1;
  const effectiveAlpha = details ? details.alpha * opacity : null;
  const scope = `${role.id}:${activeMode}`;
  const [copied, setCopied] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    scope: string;
    text: string;
  } | null>(null);
  const [manual, setManual] = useState<{
    scope: string;
    label: string;
    value: string;
  } | null>(null);
  const manualInput = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  useEffect(
    () => () => {
      attempt.current++;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (manual?.scope === scope) {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [manual, scope]);
  const srgb = details
    ? `rgb(${details.red} ${details.green} ${details.blue}${details.alpha === 1 ? "" : ` / ${details.alpha}`})`
    : null;
  const reference = `var(${role.token})`;
  const declaration = `${role.token}: ${raw};`;
  const previewHex = details
    ? `#${[details.red, details.green, details.blue, Math.round((effectiveAlpha ?? 1) * 255)].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
    : null;
  const canvas = APP_THEME_VALUES[activeMode].background;
  const ink = previewHex
    ? guidePreviewInk(previewHex, activeMode)
    : APP_THEME_VALUES[activeMode].foreground;
  async function copy(value: string, label: string, field: string) {
    const current = ++attempt.current;
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      if (current !== attempt.current) return;
      setManual(null);
      setCopied(`${scope}:${field}`);
      setFeedback({ scope, text: `${label} copied.` });
      timer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      if (current !== attempt.current) return;
      setCopied(null);
      setManual({ scope, label, value });
      setFeedback({
        scope,
        text: "Automatic copy is unavailable. The value is selected below; use your device's Copy action.",
      });
    }
  }
  const field = (
    key: string,
    label: string,
    value: string,
    multiline = false,
  ) => (
    <ValueField
      key={key}
      id={`${id}-${key}`}
      label={label}
      value={value}
      field={key}
      multiline={multiline}
      copied={copied === `${scope}:${key}`}
      onCopy={() => void copy(value, label, key)}
    />
  );
  const valueFields = details
    ? activeFormat === "hex"
      ? [
          field("hex", "Exact HEX source", raw),
          field("srgb", "sRGB channels", srgb!),
        ]
      : [
          field("srgb", "sRGB channels", srgb!),
          field("hex", "Exact HEX source", raw),
        ]
    : [field("source", "Literal CSS source", raw)];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={role.label}
      titleIcon="palette"
      context="Color Inspector"
      description={role.description}
      scrollKey={`color-inspection:${role.id}`}
    >
      <div
        className={styles.inspector}
        data-guide-color-inspection
        data-color-inspector={role.id}
        data-inspection-mode={activeMode}
        data-layer-opacity={opacity}
      >
        <div
          className={styles.preview}
          data-color-inspector-preview
          style={{ backgroundColor: canvas }}
        >
          <span
            className={styles.previewPaint}
            style={{ backgroundColor: raw, opacity }}
            aria-hidden="true"
            data-color-inspector-paint
          />
          <div className={styles.previewCopy} style={{ color: ink }}>
            <span className={styles.previewCaption}>
              {activeMode === "light" ? (
                <SunIcon size={13} aria-hidden="true" />
              ) : (
                <MoonIcon size={13} aria-hidden="true" />
              )}{" "}
              On the {activeMode} page base
            </span>
            <span className={styles.previewLetters} aria-hidden="true">
              Aa<span>↗</span>
            </span>
            <span className={styles.previewToken}>{role.token}</span>
          </div>
          <span
            className={styles.checker}
            role="img"
            aria-label="Source color and layer opacity over a transparency grid"
          >
            <span style={{ backgroundColor: raw, opacity }} />
          </span>
        </div>
        <p className={styles.previewNote}>
          Preview only. Your application appearance stays unchanged.
        </p>
        <div className={styles.controls}>
          <div className={styles.control}>
            <label htmlFor={`${id}-mode`}>Preview mode</label>
            <Select
              value={activeMode}
              onValueChange={(next) => {
                if (next === "light" || next === "dark") {
                  if (onModeChange) onModeChange(next);
                  else setInternalMode(next);
                }
              }}
            >
              <SelectTrigger id={`${id}-mode`} className={styles.selectTrigger}>
                {activeMode === "light" ? (
                  <SunIcon size={15} weight="duotone" aria-hidden="true" />
                ) : (
                  <MoonIcon size={15} weight="duotone" aria-hidden="true" />
                )}
                <SelectValue>
                  <span>{activeMode === "light" ? "Light" : "Dark"}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={styles.selectMenu}
                align="start"
                alignItemWithTrigger={false}
              >
                <SelectItem
                  value="light"
                  label="Light"
                  className={styles.selectItem}
                >
                  Light
                </SelectItem>
                <SelectItem
                  value="dark"
                  label="Dark"
                  className={styles.selectItem}
                >
                  Dark
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={styles.control}>
            <label htmlFor={`${id}-format`}>Value format</label>
            <Select
              value={activeFormat}
              onValueChange={(next) => {
                if (next === "hex" || next === "rgb") {
                  if (onFormatChange) onFormatChange(next);
                  else setInternalFormat(next);
                }
              }}
            >
              <SelectTrigger
                id={`${id}-format`}
                className={styles.selectTrigger}
              >
                <HashIcon size={15} aria-hidden="true" />
                <SelectValue>
                  <span>
                    {activeFormat === "hex" ? "HEX first" : "sRGB first"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={styles.selectMenu}
                align="end"
                alignItemWithTrigger={false}
              >
                <SelectItem
                  value="hex"
                  label="HEX first"
                  className={styles.selectItem}
                >
                  HEX first
                </SelectItem>
                <SelectItem
                  value="rgb"
                  label="sRGB first"
                  className={styles.selectItem}
                >
                  sRGB first
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <section
          className={styles.section}
          aria-labelledby={`${id}-values-title`}
        >
          <div className={styles.sectionHeading}>
            <h3 id={`${id}-values-title`}>Source &amp; CSS</h3>
            <span>Read-only · Select or copy</span>
          </div>
          <div className={styles.fields}>
            {valueFields}
            {field("css", "CSS token reference", reference)}
            {field("declaration", "CSS declaration", declaration, true)}
          </div>
        </section>
        <section
          className={styles.composition}
          aria-labelledby={`${id}-composition-title`}
          data-color-inspector-composition
        >
          <h3 id={`${id}-composition-title`}>Alpha &amp; Layering</h3>
          <dl className={styles.facts}>
            <div>
              <dt>Color alpha</dt>
              <dd>{details ? percentage(details.alpha) : "Defined by CSS"}</dd>
            </div>
            <div>
              <dt>Layer opacity</dt>
              <dd>{percentage(opacity)}</dd>
            </div>
            <div>
              <dt>Single-layer coverage</dt>
              <dd>
                {effectiveAlpha === null
                  ? "Depends on resolved color"
                  : percentage(effectiveAlpha)}
              </dd>
            </div>
            {details && (
              <div>
                <dt>8-bit sRGB channels</dt>
                <dd>
                  {details.red} / {details.green} / {details.blue}
                </dd>
              </div>
            )}
          </dl>
          <p>
            {details ? (
              <>
                The color value supplies {percentage(details.alpha)} alpha. This
                preview applies {percentage(opacity)} opacity to the painted
                layer separately: {percentage(details.alpha)} ×{" "}
                {percentage(opacity)} = {percentage(effectiveAlpha!)} coverage.
              </>
            ) : (
              <>
                The source is a CSS expression. Its resolved alpha is kept
                separate from the layer’s {percentage(opacity)} opacity; no
                numeric color alpha is assumed.
              </>
            )}
          </p>
          <p>
            Each layer composites over what is already behind it. Overlapping
            opacities do not add; gradients, glows and other layers can make the
            final pixel differ from this single-color preview.
          </p>
        </section>
        {usage && (
          <section
            className={styles.usage}
            aria-labelledby={`${id}-usage-title`}
          >
            <h3 id={`${id}-usage-title`}>Where It Is Used</h3>
            <p>{usage}</p>
          </section>
        )}
        {role.pairsWith.length > 0 && (
          <section
            className={styles.section}
            aria-labelledby={`${id}-pairs-title`}
          >
            <div className={styles.sectionHeading}>
              <h3 id={`${id}-pairs-title`}>Pairs With</h3>
              <span>Inspect a related role</span>
            </div>
            <div className={styles.pairs}>
              {role.pairsWith.map((pair) => {
                const paired = pairRoles.find(
                  (candidate) => candidate.id === pair,
                );
                return (
                  <button
                    type="button"
                    key={pair}
                    className={styles.pair}
                    onClick={() => onInspectPair?.(pair)}
                    disabled={!onInspectPair}
                    data-color-inspector-pair={pair}
                  >
                    {paired && (
                      <span
                        className={styles.pairSwatch}
                        style={{ backgroundColor: paired[activeMode] }}
                        aria-hidden="true"
                      />
                    )}
                    {paired?.label ?? pair}
                    <ActionIcon name="open" className="size-3" />
                  </button>
                );
              })}
            </div>
          </section>
        )}
        <p
          className={styles.feedback}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-color-inspector-feedback
        >
          {feedback?.scope === scope
            ? feedback.text
            : "Use the copy icon beside any value, or select the text directly."}
        </p>
        {manual?.scope === scope && (
          <div className={styles.manual} data-color-inspector-manual>
            <label htmlFor={`${id}-manual`}>
              {manual.label} · Select &amp; copy
            </label>
            <Textarea
              ref={manualInput}
              id={`${id}-manual`}
              readOnly
              value={manual.value}
              rows={manual.value.includes("\n") ? 4 : 2}
              onFocus={(event) => event.target.select()}
              className={styles.manualTextarea}
            />
            <button
              type="button"
              onClick={() => setManual(null)}
              className={styles.hideManual}
            >
              Hide manual copy
            </button>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
