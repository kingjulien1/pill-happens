"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, RotateCw, Search, Shuffle, Undo2, X } from "lucide-react";
import { BenzodiazepineBadge } from "@/components/benzodiazepine-badge";
import { FinalLookStar } from "@/components/final-look-star";
import { MedicationGlyph, MedicationIcon } from "@/components/medication-icon";
import { SymbolSearchState } from "@/components/symbol-search-state";
import { Input } from "@/components/ui/input";
import { EMOJI_CATALOG, searchEmoji } from "@/lib/emoji-catalog";
import {
  getLucideIconLabel,
  LUCIDE_ICON_CATALOG,
  searchLucideIcons,
} from "@/lib/lucide-catalog";
import {
  getSvgIcon,
  isMedicationSvgIcon,
  searchSvgIcons,
  SVG_ICON_CATALOG,
} from "@/lib/svg-icon-catalog";
import { formatDose, type Medication } from "@/lib/domain";
import {
  getMedicationType,
  isMeteredMedicationType,
} from "@/lib/medication-types";
import {
  getMedicationColorScale,
  getMedicationPreviewAccents,
  getMedicationPreviewSurface,
} from "@/lib/medication-preview-colors";
import {
  MEDICATION_COLORS,
  getMedicationColor,
  isMedicationIcon,
  isMedicationLucideIcon,
  type MedicationColor,
} from "@/lib/medication-appearance";
import { cn } from "@/lib/utils";

const SEARCH_DELAY = 2500;
const RESULT_LIMIT = 96;
const iconCount = LUCIDE_ICON_CATALOG.length + SVG_ICON_CATALOG.length;
const customIconCount = SVG_ICON_CATALOG.length;
const coloredIconCount = SVG_ICON_CATALOG.filter(
  (item) => item.variant === "color",
).length;
const tintableIconCount = customIconCount - coloredIconCount;
const customIconDescription = `${tintableIconCount} tintable SVGs and ${coloredIconCount} colored SVGs, each counted separately in the icon total.`;
const emojiCount = EMOJI_CATALOG.length;
const pickerPanelClass =
  "relative h-[134px] w-full overflow-y-auto overscroll-contain rounded-2xl border border-foreground/10 bg-foreground/[.025] [scrollbar-gutter:stable]";
const pickerGridClass = "grid grid-cols-8 gap-1 p-2 max-[359px]:grid-cols-6";
const pickerChoiceClass =
  "appearance-choice relative flex h-9 w-full cursor-pointer items-center justify-center rounded-[10px] border-2 border-transparent text-foreground/80 hover:bg-foreground/5 peer-disabled:pointer-events-none peer-disabled:opacity-40";
const previewActionClass =
  "inline-flex h-11 items-center rounded-lg text-[10px] font-medium text-muted-foreground transition-colors hover:[&>span]:bg-foreground/[.06] disabled:opacity-35";
const previewActionFaceClass =
  "inline-flex h-7 items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[.025] px-2 transition-colors";
type SearchPhase = "idle" | "loading" | "ready";
type SearchFeedback = { id: number; tone: "success" | "empty" };
type SymbolOption = {
  value: string;
  label: string;
  source: "Icon" | "SVG" | "Color" | "Emoji";
};
type Look = { color: MedicationColor; icon: string; rotation: number };
const surpriseIcons = [
  "sun",
  "leaf",
  "heart",
  "sparkles",
  "flower-2",
  "coffee",
  "smile",
  "star",
  "moon",
  "gem",
  "🌿",
  "🌻",
  "🌈",
  "🍵",
  "🎵",
  "🦋",
  "🚲",
  "💜",
  ...SVG_ICON_CATALOG.map((item) => item.value),
];

function searchSymbols(query: string): SymbolOption[] {
  const icons = searchLucideIcons(query, RESULT_LIMIT);
  const svgs = searchSvgIcons(query, RESULT_LIMIT);
  const emoji = searchEmoji(query, RESULT_LIMIT);
  const results: SymbolOption[] = [];
  for (
    let index = 0;
    index < Math.max(icons.length, svgs.length, emoji.length);
    index++
  ) {
    if (icons[index]) results.push({ ...icons[index], source: "Icon" });
    if (svgs[index])
      results.push({
        ...svgs[index],
        source: svgs[index].variant === "color" ? "Color" : "SVG",
      });
    if (emoji[index]) results.push({ ...emoji[index], source: "Emoji" });
    if (results.length >= RESULT_LIMIT) break;
  }
  if (
    !isMedicationLucideIcon(query) &&
    !isMedicationSvgIcon(query) &&
    isMedicationIcon(query) &&
    !results.some(
      (item) =>
        item.value.replaceAll("\uFE0F", "") === query.replaceAll("\uFE0F", ""),
    )
  ) {
    results.unshift({ value: query, label: "Your emoji", source: "Emoji" });
  }
  return results.slice(0, RESULT_LIMIT);
}

function choiceStyle(hex: string): CSSProperties {
  return {
    "--choice-accent": hex,
    "--choice-fill": `${hex}24`,
    "--choice-glow": `${hex}38`,
  } as CSSProperties;
}

export function MedicationAppearanceFields({
  color,
  icon,
  iconRotation = 0,
  name = "",
  strength = "",
  defaultQuantity = "1",
  medicationType = "tablet",
  isBenzodiazepine = false,
  onColorChange,
  onIconChange,
  onRotationChange,
}: {
  color: MedicationColor;
  icon: string;
  iconRotation?: number;
  name?: string;
  strength?: string;
  defaultQuantity?: string;
  medicationType?: Medication["form"];
  isBenzodiazepine?: boolean;
  onColorChange: (value: MedicationColor) => void;
  onIconChange: (value: string) => void;
  onRotationChange: (value: number) => void;
}) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const colorPanel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequence = useRef(0);
  const composing = useRef(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [results, setResults] = useState<SymbolOption[]>([]);
  const [feedback, setFeedback] = useState<SearchFeedback | null>(null);
  const [undo, setUndo] = useState<Look | null>(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current ?? undefined);
      clearTimeout(feedbackTimer.current ?? undefined);
    },
    [],
  );
  useEffect(() => {
    const panel = colorPanel.current;
    const tile =
      panel?.querySelector<HTMLInputElement>("input:checked")?.parentElement;
    if (!panel || !tile) return;
    const top = tile.offsetTop;
    const bottom = top + tile.offsetHeight;
    if (top < panel.scrollTop + 8) panel.scrollTop = Math.max(0, top - 8);
    else if (bottom > panel.scrollTop + panel.clientHeight - 8)
      panel.scrollTop = bottom - panel.clientHeight + 8;
  }, [color]);
  const selectedColor = getMedicationColor(color);
  const colorScale = getMedicationColorScale(color);
  const accents = getMedicationPreviewAccents(color);
  const svg = getSvgIcon(icon);
  const fixedColor = svg?.variant === "color" ? svg.color : undefined;
  const source = svg
    ? svg.variant === "color"
      ? "Color"
      : "SVG"
    : isMedicationLucideIcon(icon)
      ? "Icon"
      : "Emoji";
  const symbolLabel =
    svg?.label ??
    (source === "Icon"
      ? (getLucideIconLabel(icon) ?? "Icon")
      : (EMOJI_CATALOG.find((item) => item.value === icon)?.label ??
        "Your emoji"));
  const previewName = name.trim() || "Your medication";
  const amount = Number(strength);
  const quantity = Number(defaultQuantity);
  const type = getMedicationType(medicationType);
  const hasStrength = strength.trim() && Number.isFinite(amount) && amount > 0;
  const hasQuantity =
    defaultQuantity.trim() && Number.isFinite(quantity) && quantity > 0;
  const strengthLabel = hasStrength
    ? `${formatDose(amount)} ${isMeteredMedicationType(medicationType) ? "mg/pump" : "mg"}`
    : "Strength not set";
  const doseLabel =
    hasStrength && hasQuantity ? `${formatDose(amount * quantity)} mg` : "— mg";
  const quantityLabel = hasQuantity
    ? `${formatDose(quantity)} ${quantity === 1 ? type.unit : type.units}`
    : "Set amount";

  function updateQuery(value: string) {
    clearTimeout(timer.current ?? undefined);
    clearTimeout(feedbackTimer.current ?? undefined);
    timer.current = null;
    feedbackTimer.current = null;
    setFeedback(null);
    const sequence = ++searchSequence.current;
    setQuery(value);
    setResults([]);
    const search = value.trim();
    setPhase(search ? "loading" : "idle");
    if (!search || composing.current) return;
    timer.current = setTimeout(() => {
      if (sequence !== searchSequence.current || composing.current) return;
      const matches = searchSymbols(search);
      setResults(matches);
      setPhase("ready");
      setFeedback({ id: sequence, tone: matches.length ? "success" : "empty" });
      feedbackTimer.current = setTimeout(() => {
        if (sequence === searchSequence.current) setFeedback(null);
        feedbackTimer.current = null;
      }, 1400);
      timer.current = null;
    }, SEARCH_DELAY);
  }
  function chooseColor(value: MedicationColor) {
    setUndo(null);
    onColorChange(value);
  }
  function chooseIcon(value: string) {
    setUndo(null);
    onIconChange(value);
  }
  function shuffleLook() {
    setUndo({ color, icon, rotation: iconRotation });
    const colors = MEDICATION_COLORS.filter((item) => item.value !== color);
    const icons = surpriseIcons.filter((value) => value !== icon);
    onColorChange(colors[Math.floor(Math.random() * colors.length)].value);
    onIconChange(icons[Math.floor(Math.random() * icons.length)]);
  }
  function rotateIcon(angle: number) {
    setUndo(null);
    onRotationChange((angle + 360) % 360);
  }

  return (
    <section
      aria-label="Medication appearance"
      className="medication-appearance w-full min-w-0 space-y-5"
      data-medication-appearance
    >
      <header className="space-y-1.5">
        <h3 id={`${id}-appearance-title`} className="text-[13px] font-[550]">
          Appearance
        </h3>
        <p
          id={`${id}-appearance-description`}
          className="text-[11px] leading-relaxed text-muted-foreground"
        >
          Choose a symbol and a color that feel like yours. A familiar look
          makes this medication easier to spot.
        </p>
      </header>

      <div className="space-y-4">
        <section
          aria-label="Medication symbol"
          className="w-full min-w-0 space-y-2"
        >
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2.75}
            />
            <Input
              ref={searchInput}
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onCompositionStart={() => {
                composing.current = true;
                clearTimeout(timer.current ?? undefined);
                clearTimeout(feedbackTimer.current ?? undefined);
                timer.current = null;
                feedbackTimer.current = null;
                searchSequence.current++;
                setFeedback(null);
                setResults([]);
                setPhase(query.trim() ? "loading" : "idle");
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                updateQuery(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              aria-label="Search icons, SVGs, and emoji"
              aria-describedby={`${id}-appearance-description ${id}-search-help`}
              aria-controls={`${id}-results`}
              autoComplete="off"
              spellCheck={false}
              placeholder="Find its symbol…"
              enterKeyHint="search"
              className="h-10 rounded-xl pr-10 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  updateQuery("");
                  searchInput.current?.focus();
                }}
                aria-label="Clear icon search"
                className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5"
              >
                <X className="size-4" strokeWidth={2.75} aria-hidden="true" />
              </button>
            )}
          </div>
          <p id={`${id}-search-help`} className="sr-only">
            Search component names, display names, and keywords in English or
            German. Type “svg” for local artwork, “outline” for medication
            outlines, or “color” for flat-color artwork. Results appear 2.5
            seconds after you stop typing. Searching does not change your
            selected icon.
          </p>
          <p role="status" aria-live="polite" className="sr-only">
            {phase === "loading"
              ? "Searching icons, SVGs, and emoji."
              : phase === "ready"
                ? `${results.length}${results.length === RESULT_LIMIT ? " or more" : ""} icons found for “${query.trim()}”.`
                : "Search for an icon or emoji."}
          </p>
          <div
            className="flex min-h-4 items-center justify-between gap-2 text-[10px] leading-4 text-muted-foreground"
            data-appearance-symbol-header
          >
            <span className="shrink-0">Lucide · SVG · Emoji</span>
            <span
              className="flex min-w-0 items-center justify-end gap-1 text-right"
              data-appearance-search-status
            >
              {phase === "idle" ? (
                <span className="inline-flex flex-col items-end gap-0.5">
                  <span data-appearance-symbol-total>
                    <span className="font-[550] tabular-nums">
                      {iconCount.toLocaleString("en")}
                    </span>{" "}
                    icons,{" "}
                    <span className="font-[550] tabular-nums">
                      {emojiCount.toLocaleString("en")}
                    </span>{" "}
                    emojis
                  </span>{" "}
                  <span
                    data-appearance-custom-count
                    title={customIconDescription}
                  >
                    incl.{" "}
                    <span className="font-[550] tabular-nums">
                      {customIconCount.toLocaleString("en")}
                    </span>{" "}
                    custom SVGs
                    <span className="sr-only">. {customIconDescription}</span>
                  </span>
                </span>
              ) : phase === "loading" ? (
                "On it…"
              ) : (
                <>
                  <span className="shrink-0 font-[550] tabular-nums">
                    {results.length}
                    {results.length === RESULT_LIMIT ? "+" : ""}
                  </span>
                  <span className="shrink-0">
                    {results.length === 1 ? "icon" : "icons"} for
                  </span>
                  <span className="truncate" title={query.trim()}>
                    “{query.trim()}”
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="relative rounded-2xl" data-appearance-result-frame>
            <div
              id={`${id}-results`}
              className={pickerPanelClass}
              aria-busy={phase === "loading"}
              data-appearance-results
            >
              {phase !== "ready" || !results.length ? (
                <SymbolSearchState
                  phase={phase === "ready" ? "empty" : phase}
                />
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Icon search results"
                  className={pickerGridClass}
                >
                  {results.map((item) => (
                    <div
                      key={`${item.source}-${item.value}`}
                      className="relative min-w-0"
                    >
                      <input
                        type="radio"
                        id={`${id}-symbol-${item.source}-${item.value}`}
                        name={`${id}-symbol`}
                        value={item.value}
                        checked={icon === item.value}
                        onChange={() => chooseIcon(item.value)}
                        aria-label={`${item.label} · ${item.source}`}
                        data-medication-icon={item.value}
                        data-symbol-source={item.source}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={`${id}-symbol-${item.source}-${item.value}`}
                        title={`${item.label} · ${item.source}`}
                        className={pickerChoiceClass}
                        style={choiceStyle(selectedColor.hex)}
                        data-selected={icon === item.value}
                      >
                        <MedicationGlyph icon={item.value} className="size-5" />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {feedback && (
              <span
                key={feedback.id}
                aria-hidden="true"
                className="symbol-results-feedback"
                data-search-feedback={feedback.tone}
              />
            )}
          </div>
        </section>

        <fieldset className="w-full min-w-0 space-y-2">
          <legend className="sr-only">Medication color</legend>
          <div
            className="flex min-h-4 items-center justify-between gap-2 text-[10px] leading-4 text-muted-foreground"
            data-appearance-color-header
          >
            <span className="shrink-0">Color Palette</span>
            <span className="flex min-w-0 items-center justify-end gap-1 text-right">
              <span className="shrink-0 font-[550] tabular-nums">
                {MEDICATION_COLORS.length}
              </span>
              <span className="shrink-0">shades</span>
              <span className="mx-0.5 shrink-0" aria-hidden="true">
                ·
              </span>
              <span className="truncate" title={selectedColor.label}>
                {selectedColor.label}
              </span>
            </span>
          </div>
          <div
            ref={colorPanel}
            className={pickerPanelClass}
            data-appearance-color-results
          >
            <div className={pickerGridClass} data-appearance-colors>
              {MEDICATION_COLORS.map((item) => (
                <div key={item.value} className="relative min-w-0">
                  <input
                    type="radio"
                    id={`${id}-color-${item.value}`}
                    name={`${id}-color`}
                    value={item.value}
                    checked={color === item.value}
                    onChange={() => chooseColor(item.value)}
                    aria-label={`${item.label} medication color`}
                    data-medication-color={item.value}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`${id}-color-${item.value}`}
                    title={item.label}
                    className={pickerChoiceClass}
                    style={choiceStyle(item.hex)}
                    data-selected={color === item.value}
                  >
                    <span
                      className="flex size-5 items-center justify-center rounded-full border border-black/10 dark:border-foreground/20"
                      style={{
                        backgroundColor: item.hex,
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <section
        aria-labelledby={`${id}-preview-title`}
        className="w-full min-w-0 pt-2"
        data-appearance-preview-section
      >
        <div
          className="final-look-showcase relative w-full overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[.025] p-4"
          style={
            {
              "--preview-accent": selectedColor.hex,
              "--preview-light": colorScale.lighter,
              "--preview-deep": colorScale.darker,
              "--preview-icon": colorScale.icon,
              "--preview-pop": accents.pop,
              "--preview-spark": accents.spark,
              "--preview-color-wash": `${selectedColor.hex}66`,
              "--preview-light-wash": `${colorScale.lighter}80`,
              "--preview-deep-wash": `${colorScale.darker}59`,
              "--preview-pop-wash": `${accents.pop}70`,
              "--preview-spark-wash": `${accents.spark}66`,
              "--preview-action-pop": `${accents.pop}26`,
              "--preview-action-spark": `${accents.spark}26`,
              "--preview-icon-action-pop": `${accents.pop}38`,
              "--preview-icon-action-spark": `${accents.spark}38`,
              "--preview-header-pop": `${accents.pop}14`,
              "--preview-header-spark": `${accents.spark}14`,
              "--preview-outline": `${selectedColor.hex}38`,
              "--preview-shadow": `${selectedColor.hex}1a`,
            } as CSSProperties
          }
          data-appearance-preview
        >
          <span aria-hidden="true" className="final-look-pattern" />
          <span aria-hidden="true" className="final-look-ambience" />
          <span aria-hidden="true" className="final-look-color-outline" />
          <svg
            aria-hidden="true"
            className="final-look-swoosh"
            viewBox="0 0 320 400"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M-45 160C30 40 112 238 225 131S337 48 370 88" />
            <path d="M-42 252C66 338 176 119 257 253S343 357 365 300" />
          </svg>
          <div
            className="final-look-header relative flex items-center justify-between gap-2"
            data-preview-header
          >
            <div className="flex min-w-0 items-center gap-2">
              <h3
                id={`${id}-preview-title`}
                className="final-look-title inline-flex shrink-0 items-center gap-1.5 font-[550] text-foreground"
              >
                <FinalLookStar variant="title" />
                Final Look
              </h3>
              <span className="truncate">Live Preview</span>
            </div>
            <span className="inline-flex min-w-0 items-center justify-end gap-2">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full ring-1 ring-foreground/10"
                style={{
                  backgroundColor: selectedColor.hex,
                }}
              />
              <span className="truncate" title={selectedColor.label}>
                {selectedColor.label}
              </span>
            </span>
          </div>
          <div className="final-look-icon-stage relative flex h-44 items-center justify-center">
            <span aria-hidden="true" className="final-look-icon-halo" />
            <span
              aria-hidden="true"
              className="final-look-orbit-track final-look-orbit-track--back"
            />
            <span
              aria-hidden="true"
              className="final-look-orbit-track final-look-orbit-track--front"
            >
              <span className="final-look-orbit-bead" />
              <span className="final-look-orbit-bead final-look-orbit-bead--second" />
            </span>
            <span
              aria-hidden="true"
              className="final-look-sticker final-look-sticker--back"
            />
            <span
              aria-hidden="true"
              className="final-look-sticker final-look-sticker--front"
            />
            <FinalLookStar variant="star" />
            <FinalLookStar variant="cluster" />
            <FinalLookStar variant="shooting" />
            <FinalLookStar variant="twinkle" />
            <span
              className={cn(
                "final-look-icon-frame relative inline-flex size-24 rounded-[28px] bg-popover",
                isBenzodiazepine && "benzodiazepine-highlight",
              )}
              data-benzodiazepine={isBenzodiazepine || undefined}
              style={{
                backgroundColor: getMedicationPreviewSurface(
                  fixedColor?.hex ?? colorScale.icon,
                ),
              }}
              data-preview-icon-surface
            >
              <span
                aria-hidden="true"
                data-medication-mark
                data-medication-color={color}
                className="flex size-24 items-center justify-center rounded-[28px] ring-1 ring-foreground/10"
                style={
                  {
                    color: "var(--preview-icon)",
                    backgroundColor:
                      "color-mix(in srgb, var(--preview-accent) 12%, transparent)",
                    "--medication-rotation": `${iconRotation}deg`,
                  } as CSSProperties
                }
              >
                <MedicationGlyph icon={icon} className="size-12" />
              </span>
              <span aria-hidden="true" className="final-look-icon-rim" />
            </span>
          </div>
          <div className="relative flex min-w-0 items-center justify-center gap-3">
            {isBenzodiazepine && <BenzodiazepineBadge />}
            <p
              className="truncate text-xs font-medium"
              data-preview-symbol-label
            >
              {symbolLabel}
            </p>
            <span aria-hidden="true" className="final-look-swatch-trail">
              <span />
              <span />
              <span />
            </span>
          </div>
          <div
            role="group"
            aria-label="Icon rotation"
            className="final-look-rotation relative mx-auto mt-3 flex w-fit items-center justify-center gap-1 rounded-full px-1"
            data-appearance-rotation-controls
          >
            <button
              type="button"
              aria-label="Rotate icon left by 45 degrees"
              onClick={() => rotateIcon(iconRotation - 45)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5"
            >
              <RotateCcw
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.25}
              />
            </button>
            <button
              type="button"
              aria-label="Reset icon rotation"
              title="Reset to 0°"
              disabled={iconRotation === 0}
              onClick={() => rotateIcon(0)}
              className="inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-1.5 text-[10px] font-medium text-muted-foreground tabular-nums hover:bg-foreground/5 disabled:opacity-60"
              data-rotation-angle={iconRotation}
            >
              {iconRotation}°
            </button>
            <button
              type="button"
              aria-label="Rotate icon right by 45 degrees"
              onClick={() => rotateIcon(iconRotation + 45)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5"
            >
              <RotateCw
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.25}
              />
            </button>
          </div>
          {fixedColor && (
            <p className="relative mt-1 text-center text-[10px] text-muted-foreground">
              Fixed artwork color
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
              {selectedColor.label} accent
            </p>
          )}
          <div
            className={cn(
              "final-look-journal relative mt-4 flex w-full min-w-0 items-center gap-3 rounded-2xl bg-popover p-3",
              isBenzodiazepine && "benzodiazepine-highlight",
            )}
            data-preview-journal-row
            data-benzodiazepine={isBenzodiazepine || undefined}
          >
            <MedicationIcon
              color={color}
              icon={icon}
              rotation={iconRotation}
              isBenzodiazepine={isBenzodiazepine}
              small
              className="size-10 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[9px] text-muted-foreground">
                In Your Journal
              </p>
              <div className="flex min-w-0 items-center gap-1.5">
                <p
                  className="min-w-0 truncate text-xs font-medium"
                  title={previewName}
                  data-preview-medication-name
                >
                  {previewName}
                </p>
                {isBenzodiazepine && <BenzodiazepineBadge />}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {strengthLabel}
                <span className="mx-1.5" aria-hidden="true">
                  /
                </span>
                {type.label}
              </p>
            </div>
            <div
              className="min-w-0 shrink-0 text-right"
              data-preview-default-dose
            >
              <p
                className="text-xs font-[550] tabular-nums"
                aria-label="Default intake dose"
              >
                {doseLabel}
              </p>
              <p
                className="mt-1 text-[10px] text-muted-foreground"
                aria-label="Default intake quantity"
              >
                {quantityLabel}
              </p>
            </div>
          </div>
          <div className="relative mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!undo}
              onClick={() => {
                if (!undo) return;
                onColorChange(undo.color);
                onIconChange(undo.icon);
                onRotationChange(undo.rotation);
                setUndo(null);
              }}
              className={previewActionClass}
              aria-label="Undo shuffled look"
            >
              <span
                className={previewActionFaceClass}
                data-preview-action-face="undo"
              >
                <Undo2
                  className="size-3"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                Undo
              </span>
            </button>
            <button
              type="button"
              onClick={shuffleLook}
              className={previewActionClass}
            >
              <span
                className={previewActionFaceClass}
                data-preview-action-face="surprise"
              >
                <Shuffle
                  className="size-3"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                Surprise Me
              </span>
            </button>
          </div>
          <p className="sr-only" role="status">
            Selected {symbolLabel}, {selectedColor.label} color. Rotation{" "}
            {iconRotation} degrees.
          </p>
        </div>
      </section>
    </section>
  );
}
