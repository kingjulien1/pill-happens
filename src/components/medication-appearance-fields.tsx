"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Check, Eye, Search, Shuffle, Undo2, X } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { MedicationGlyph, MedicationIcon } from "@/components/medication-icon";
import { Input } from "@/components/ui/input";
import { EMOJI_CATALOG, searchEmoji } from "@/lib/emoji-catalog";
import { getLucideIconLabel, searchLucideIcons } from "@/lib/lucide-catalog";
import {
  getSvgIcon,
  isMedicationSvgIcon,
  searchSvgIcons,
  SVG_ICON_CATALOG,
} from "@/lib/svg-icon-catalog";
import { formatDose, type Medication } from "@/lib/domain";
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
const pickerPanelClass =
  "relative h-[134px] w-full overflow-y-auto overscroll-contain rounded-2xl border border-foreground/10 bg-foreground/[.025] [scrollbar-gutter:stable]";
const pickerGridClass = "grid grid-cols-8 gap-1 p-2 max-[359px]:grid-cols-6";
const previewActionClass =
  "inline-flex h-11 items-center rounded-lg text-[10px] font-medium text-muted-foreground transition-colors hover:[&>span]:bg-foreground/[.06] disabled:opacity-35";
const previewActionFaceClass =
  "inline-flex h-7 items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[.025] px-2 transition-colors";
type SearchPhase = "idle" | "loading" | "ready";
type SymbolOption = {
  value: string;
  label: string;
  source: "Icon" | "SVG" | "Color" | "Emoji";
};
type Look = { color: MedicationColor; icon: string };
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
const typeLabels = {
  tablet: "Tablet",
  capsule: "Capsule",
  drops: "Drops",
  other: "Other",
};

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

function checkColor(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.18
    ? "#120f17"
    : "#fff1d6";
}

function SearchState({ phase }: { phase: "idle" | "loading" | "empty" }) {
  const messages = {
    idle: ["Find your symbol", "Try a name, “outline”, or “color”."],
    loading: ["Looking around…", "Results appear when you pause typing."],
    empty: ["No matches this time", "Try a different word or an emoji."],
  };
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
      data-symbol-state={phase}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-xl bg-foreground/5 text-foreground/80",
          phase === "loading" && "motion-safe:animate-pulse",
        )}
      >
        <ActionIcon name="discover" weight="duotone" className="size-8" />
      </span>
      <div>
        <p className="text-xs font-medium">{messages[phase][0]}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {messages[phase][1]}
        </p>
      </div>
    </div>
  );
}

export function MedicationAppearanceFields({
  color,
  icon,
  name = "",
  strength = "",
  medicationType = "tablet",
  onColorChange,
  onIconChange,
}: {
  color: MedicationColor;
  icon: string;
  name?: string;
  strength?: string;
  medicationType?: Medication["form"];
  onColorChange: (value: MedicationColor) => void;
  onIconChange: (value: string) => void;
}) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const colorPanel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [results, setResults] = useState<SymbolOption[]>([]);
  const [undo, setUndo] = useState<Look | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
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
  const strengthLabel =
    strength.trim() && Number.isFinite(amount) && amount > 0
      ? `${formatDose(amount)} mg`
      : "Strength not set";

  function updateQuery(value: string) {
    clearTimeout(timer.current ?? undefined);
    timer.current = null;
    setQuery(value);
    setResults([]);
    const search = value.trim();
    setPhase(search ? "loading" : "idle");
    if (!search || composing.current) return;
    timer.current = setTimeout(() => {
      setResults(searchSymbols(search));
      setPhase("ready");
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
    setUndo({ color, icon });
    const colors = MEDICATION_COLORS.filter((item) => item.value !== color);
    const icons = surpriseIcons.filter((value) => value !== icon);
    onColorChange(colors[Math.floor(Math.random() * colors.length)].value);
    onIconChange(icons[Math.floor(Math.random() * icons.length)]);
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
              className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-muted-foreground"
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
                timer.current = null;
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
              className="h-12 rounded-xl pr-11 pl-11 text-base md:text-base [&::-webkit-search-cancel-button]:appearance-none"
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
            German. Type “svg” for local artwork, “outline” for tablet outlines,
            or “color” for flat-color tablets. Results appear 2.5 seconds after
            you stop typing. Searching does not change your selected icon.
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
                "Your move"
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
          <div
            id={`${id}-results`}
            className={pickerPanelClass}
            aria-busy={phase === "loading"}
            data-appearance-results
          >
            {phase !== "ready" || !results.length ? (
              <SearchState phase={phase === "ready" ? "empty" : phase} />
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
                      className={cn(
                        "relative flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-transparent text-foreground/80 transition-colors hover:bg-foreground/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:pointer-events-none peer-disabled:opacity-40",
                        icon === item.value &&
                          "border-foreground/40 bg-foreground/10 text-foreground",
                      )}
                    >
                      <MedicationGlyph icon={item.value} className="size-5" />
                      {icon === item.value && (
                        <Check
                          aria-hidden="true"
                          className="absolute top-0.5 right-0.5 size-2.5"
                          strokeWidth={3}
                        />
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <fieldset className="w-full min-w-0 space-y-2">
          <legend className="sr-only">Medication color</legend>
          <div
            className="flex min-h-4 items-center justify-between gap-2 text-[10px] leading-4 text-muted-foreground"
            data-appearance-color-header
          >
            <span className="shrink-0">Color palette</span>
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
                    className={cn(
                      "flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-transparent transition-colors hover:bg-foreground/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:pointer-events-none peer-disabled:opacity-40",
                      color === item.value &&
                        "border-foreground/40 bg-foreground/5",
                    )}
                  >
                    <span
                      className="flex size-5 items-center justify-center rounded-full border border-black/10 dark:border-foreground/20"
                      style={{
                        backgroundColor: item.hex,
                        color: checkColor(item.hex),
                      }}
                    >
                      {color === item.value && (
                        <Check
                          className="size-3"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <section
        aria-labelledby={`${id}-preview-title`}
        className="w-full min-w-0"
      >
        <div
          className="final-look-showcase relative w-full overflow-hidden rounded-3xl bg-foreground/[.025] p-[18px]"
          style={
            {
              "--preview-accent": selectedColor.hex,
              "--preview-pigment": fixedColor?.hex ?? selectedColor.hex,
            } as CSSProperties
          }
          data-appearance-preview
        >
          <span aria-hidden="true" className="final-look-pattern" />
          <span aria-hidden="true" className="final-look-glass-blur-x" />
          <span aria-hidden="true" className="final-look-glass-blur-y" />
          <span aria-hidden="true" className="final-look-glass-band" />
          <span aria-hidden="true" className="final-look-ambience" />
          <span aria-hidden="true" className="final-look-rim" />
          <span aria-hidden="true" className="final-look-accent-edge" />
          <div
            className="relative flex items-center justify-between gap-2 text-[10px] leading-4 text-muted-foreground"
            data-preview-header
          >
            <div className="flex min-w-0 items-center gap-2">
              <h3
                id={`${id}-preview-title`}
                className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium"
              >
                <Eye
                  aria-hidden="true"
                  className="size-3 shrink-0"
                  strokeWidth={2.25}
                />
                Final look
              </h3>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: fixedColor?.hex ?? selectedColor.hex,
                  }}
                />
                <span
                  className="truncate"
                  title={fixedColor?.name ?? selectedColor.label}
                >
                  {fixedColor?.name ?? selectedColor.label}
                </span>
              </span>
            </div>
            <span className="shrink-0">Live preview</span>
          </div>
          <div className="final-look-icon-stage relative flex justify-center py-5">
            <span aria-hidden="true" className="final-look-icon-halo" />
            <span
              className="final-look-icon-frame relative inline-flex size-24 rounded-[28px] bg-popover"
              data-preview-icon-surface
            >
              <MedicationIcon
                color={color}
                icon={icon}
                className="size-24 rounded-[28px] ring-1 ring-foreground/10 [&_[data-medication-glyph]]:size-12"
              />
              <span aria-hidden="true" className="final-look-icon-rim" />
            </span>
          </div>
          <p
            className="relative text-center text-xs font-medium"
            data-preview-symbol-label
          >
            {symbolLabel}
          </p>
          {fixedColor && (
            <p className="relative mt-1 text-center text-[10px] text-muted-foreground">
              Fixed tablet color
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
              {selectedColor.label} accent
            </p>
          )}
          <div
            className="final-look-journal relative mt-4 flex w-full min-w-0 items-center gap-3 rounded-2xl bg-popover p-3"
            data-preview-journal-row
          >
            <MedicationIcon
              color={color}
              icon={icon}
              small
              className="size-10 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[9px] text-muted-foreground">
                In your journal
              </p>
              <p
                className="truncate text-xs font-medium"
                title={previewName}
                data-preview-medication-name
              >
                {previewName}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {strengthLabel}
                <span className="mx-1.5" aria-hidden="true">
                  /
                </span>
                {typeLabels[medicationType]}
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
                setUndo(null);
              }}
              className={previewActionClass}
              aria-label="Undo shuffled look"
            >
              <span className={previewActionFaceClass} data-preview-action-face>
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
              <span className={previewActionFaceClass} data-preview-action-face>
                <Shuffle
                  className="size-3"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                Surprise me
              </span>
            </button>
          </div>
          <p className="sr-only" role="status">
            Selected {symbolLabel}, {selectedColor.label} color.
          </p>
        </div>
      </section>
    </section>
  );
}
