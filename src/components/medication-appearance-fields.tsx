"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  Check,
  Eye,
  LoaderCircle,
  Search,
  Shuffle,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { MedicationGlyph } from "@/components/medication-icon";
import { MedicationCardBase } from "@/components/medication-card-base";
import { MedicationCard } from "@/components/medication-card";
import type { MedicationCategory } from "@/lib/medication-categories";
import { SymbolSearchState } from "@/components/symbol-search-state";
import { Input } from "@/components/ui/input";
import { EMOJI_CATALOG } from "@/lib/emoji-catalog";
import { getLucideIconLabel } from "@/lib/lucide-catalog";
import { getSvgIcon, SVG_ICON_CATALOG } from "@/lib/svg-icon-catalog";
import {
  searchMedicationSymbols,
  SYMBOL_PAGE_SIZE,
  SYMBOL_SOURCE_COUNTS,
  type SymbolOption,
  type SymbolSourceFilter,
} from "@/lib/medication-symbol-browser";
import { formatDose, type Medication } from "@/lib/domain";
import {
  getMedicationType,
  isMeteredMedicationType,
} from "@/lib/medication-types";
import {
  getMedicationColorScale,
  getMedicationColorFamilyInk,
  getMedicationPreviewAccents,
} from "@/lib/medication-preview-colors";
import {
  MEDICATION_COLORS,
  getMedicationColor,
  isMedicationLucideIcon,
  type MedicationColor,
} from "@/lib/medication-appearance";
import styles from "./medication-appearance-fields.module.css";

const SEARCH_DELAY = 2500;
const LOAD_MORE_DELAY = 450;
const sourceFilters = [
  { value: "icons", label: "icons", count: SYMBOL_SOURCE_COUNTS.icons },
  { value: "emojis", label: "emojis", count: SYMBOL_SOURCE_COUNTS.emojis },
  { value: "customs", label: "customs", count: SYMBOL_SOURCE_COUNTS.customs },
] as const;
const pickerPanelClass =
  "relative h-[134px] w-full overflow-y-auto overscroll-contain rounded-2xl border border-foreground/10 bg-foreground/[.025] [scrollbar-gutter:stable]";
const pickerGridClass = "grid grid-cols-8 gap-1 p-2 max-[359px]:grid-cols-6";
const pickerChoiceClass =
  "appearance-choice relative flex h-9 w-full cursor-pointer items-center justify-center rounded-[10px] border-0 text-foreground/80 peer-disabled:pointer-events-none peer-disabled:opacity-40";
type SearchPhase = "idle" | "loading" | "ready";
type SearchFeedback = { id: number; tone: "success" | "empty" };
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

export function MedicationAppearanceFields({
  color,
  icon,
  iconRotation = 0,
  name = "",
  activeIngredient = "",
  categories,
  strength = "",
  defaultQuantity = "1",
  medicationType = "tablet",
  isBenzodiazepine = false,
  isOpioid = false,
  onColorChange,
  onIconChange,
  searchQuery,
  onSearchQueryChange,
  symbolSource,
  onSymbolSourceChange,
  previewMotion,
  onPreviewMotionChange,
}: {
  color: MedicationColor;
  icon: string;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  symbolSource?: SymbolSourceFilter;
  onSymbolSourceChange?: (value: SymbolSourceFilter) => void;
  previewMotion?: boolean;
  onPreviewMotionChange?: (value: boolean) => void;
  iconRotation?: number;
  name?: string;
  activeIngredient?: string;
  categories?: MedicationCategory[];
  strength?: string;
  defaultQuantity?: string;
  medicationType?: Medication["form"];
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
  onColorChange: (value: MedicationColor) => void;
  onIconChange: (value: string) => void;
}) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const symbolPanel = useRef<HTMLDivElement>(null);
  const colorPanel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequence = useRef(0);
  const composing = useRef(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = searchQuery ?? internalQuery;
  const lastQuery = useRef("");
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [internalSourceFilter, setInternalSourceFilter] =
    useState<SymbolSourceFilter>("all");
  const sourceFilter = symbolSource ?? internalSourceFilter;
  const lastSourceFilter = useRef<SymbolSourceFilter>("all");
  const [results, setResults] = useState<SymbolOption[]>([]);
  const [visibleCount, setVisibleCount] = useState(SYMBOL_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [revealedFrom, setRevealedFrom] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<SearchFeedback | null>(null);
  const [undo, setUndo] = useState<Look | null>(null);
  const [internalPreviewMotion, setInternalPreviewMotion] = useState(true);
  const motionEnabled = previewMotion ?? internalPreviewMotion;
  useEffect(
    () => () => {
      clearTimeout(timer.current ?? undefined);
      clearTimeout(loadMoreTimer.current ?? undefined);
      clearTimeout(feedbackTimer.current ?? undefined);
      searchSequence.current++;
      timer.current = null;
      loadMoreTimer.current = null;
      feedbackTimer.current = null;
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
  const colorFamilyInk = getMedicationColorFamilyInk(color);
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
  const previewMedication: Medication = {
    id: `${id}-medication-preview`,
    name: previewName,
    activeIngredient,
    categories,
    strengthMg: hasStrength ? amount : 0,
    defaultQuantity: hasQuantity ? quantity : 1,
    form: medicationType,
    color,
    icon,
    iconRotation,
    isBenzodiazepine,
    isOpioid,
    archived: false,
    createdAt: "",
  };

  const runSearch = useCallback(
    (value: string, filter: SymbolSourceFilter, immediate = false) => {
      clearTimeout(timer.current ?? undefined);
      clearTimeout(loadMoreTimer.current ?? undefined);
      clearTimeout(feedbackTimer.current ?? undefined);
      timer.current = null;
      loadMoreTimer.current = null;
      feedbackTimer.current = null;
      setFeedback(null);
      setLoadingMore(false);
      setVisibleCount(SYMBOL_PAGE_SIZE);
      setRevealedFrom(null);
      const sequence = ++searchSequence.current;
      setResults([]);
      if (symbolPanel.current) symbolPanel.current.scrollTop = 0;
      const search = value.trim();
      if (!search && filter === "all") {
        setPhase("idle");
        return;
      }
      setPhase("loading");
      if (composing.current) return;

      const finishSearch = () => {
        if (sequence !== searchSequence.current || composing.current) return;
        const matches = searchMedicationSymbols(search, filter);
        setResults(matches);
        setPhase("ready");
        if (search) {
          setFeedback({
            id: sequence,
            tone: matches.length ? "success" : "empty",
          });
          const pendingFeedback = setTimeout(() => {
            if (
              sequence === searchSequence.current &&
              feedbackTimer.current === pendingFeedback
            ) {
              setFeedback(null);
              feedbackTimer.current = null;
            }
          }, 1680);
          feedbackTimer.current = pendingFeedback;
        }
        timer.current = null;
      };
      if (!search || immediate) finishSearch();
      else timer.current = setTimeout(finishSearch, SEARCH_DELAY);
    },
    [],
  );

  // Re-run restored or explicitly reset searches without persisting transient results.
  useEffect(() => {
    const sourceChanged = lastSourceFilter.current !== sourceFilter;
    if (lastQuery.current === query && !sourceChanged) return;
    const restoredSearch = setTimeout(() => {
      lastQuery.current = query;
      lastSourceFilter.current = sourceFilter;
      runSearch(query, sourceFilter, sourceChanged);
    }, 0);
    return () => clearTimeout(restoredSearch);
  }, [query, runSearch, sourceFilter]);

  function updateQuery(value: string) {
    lastQuery.current = value;
    if (onSearchQueryChange) onSearchQueryChange(value);
    else setInternalQuery(value);
    runSearch(value, sourceFilter);
  }
  function chooseSource(value: Exclude<SymbolSourceFilter, "all">) {
    const next = sourceFilter === value ? "all" : value;
    lastSourceFilter.current = next;
    if (onSymbolSourceChange) onSymbolSourceChange(next);
    else setInternalSourceFilter(next);
    runSearch(query, next, true);
  }
  function loadMore() {
    if (
      phase !== "ready" ||
      loadMoreTimer.current !== null ||
      visibleCount >= results.length
    )
      return;
    const sequence = searchSequence.current;
    const nextCount = Math.min(visibleCount + SYMBOL_PAGE_SIZE, results.length);
    setLoadingMore(true);
    const pending = setTimeout(() => {
      if (
        sequence !== searchSequence.current ||
        loadMoreTimer.current !== pending
      )
        return;
      loadMoreTimer.current = null;
      setRevealedFrom(visibleCount);
      setVisibleCount(nextCount);
      setLoadingMore(false);
    }, LOAD_MORE_DELAY);
    loadMoreTimer.current = pending;
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

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleResults.length < results.length;

  return (
    <section
      aria-label="Medication appearance"
      className={`medication-appearance w-full min-w-0 space-y-5 ${styles.appearance}`}
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
          Make it easy to spot. Choose a familiar symbol and color.
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
              maxLength={1000}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onCompositionStart={() => {
                composing.current = true;
                clearTimeout(timer.current ?? undefined);
                clearTimeout(loadMoreTimer.current ?? undefined);
                clearTimeout(feedbackTimer.current ?? undefined);
                timer.current = null;
                loadMoreTimer.current = null;
                feedbackTimer.current = null;
                searchSequence.current++;
                setFeedback(null);
                setLoadingMore(false);
                setVisibleCount(SYMBOL_PAGE_SIZE);
                setRevealedFrom(null);
                setResults([]);
                setPhase("loading");
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
                data-dialog-corner="compact"
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
            selected icon. Choose a source to browse, then load more symbols in
            groups of 100.
          </p>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            data-appearance-search-status
          >
            {loadingMore
              ? "Loading more symbols."
              : phase === "loading"
                ? "Searching symbols."
                : phase === "ready"
                  ? `${visibleResults.length} of ${results.length} symbols shown${query.trim() ? ` for “${query.trim()}”` : ""}.`
                  : "Search for an icon or emoji."}
          </p>
          <div
            role="group"
            aria-label="Symbol sources"
            aria-describedby={`${id}-source-help`}
            className={styles.sourceFilters}
            data-appearance-symbol-header
          >
            {sourceFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={styles.sourceFilter}
                onClick={() => chooseSource(filter.value)}
                aria-pressed={sourceFilter === filter.value}
                aria-controls={`${id}-results`}
                data-symbol-filter={filter.value}
              >
                <span>{filter.count.toLocaleString("en")}</span> {filter.label}
              </button>
            ))}
          </div>
          <p id={`${id}-source-help`} className="sr-only">
            Icons includes custom symbols. Customs shows only those symbols.
            Activate the selected source again to search all sources.
          </p>
          <div className="relative rounded-2xl" data-appearance-result-frame>
            <div
              id={`${id}-results`}
              ref={symbolPanel}
              className={pickerPanelClass}
              aria-busy={phase === "loading" || loadingMore}
              data-appearance-results
              data-symbol-source={sourceFilter}
              data-symbol-phase={phase}
              data-symbol-total={results.length}
              data-symbol-visible={visibleResults.length}
              data-symbol-loading-more={loadingMore}
            >
              {phase !== "ready" || !results.length ? (
                <SymbolSearchState
                  phase={phase === "ready" ? "empty" : phase}
                />
              ) : (
                <>
                  <div
                    role="radiogroup"
                    aria-label="Icon search results"
                    className={pickerGridClass}
                    data-symbol-result-grid
                  >
                    {visibleResults.map((item, index) => (
                      <Fragment key={`${item.source}-${item.value}`}>
                        {index > 0 && index % SYMBOL_PAGE_SIZE === 0 && (
                          <div
                            aria-hidden="true"
                            className={styles.batchSeparator}
                            data-symbol-batch-separator
                            data-after-count={index}
                          />
                        )}
                        <div
                          className={`relative min-w-0 ${revealedFrom !== null && index >= revealedFrom ? styles.revealedChoice : ""}`}
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
                            data-appearance-choice="symbol"
                            data-selected={icon === item.value}
                          >
                            <MedicationGlyph
                              icon={item.value}
                              className="size-5"
                            />
                          </label>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {results.length > SYMBOL_PAGE_SIZE && (
                    <div className={styles.paginationFooter}>
                      <button
                        type="button"
                        onClick={loadMore}
                        className={styles.loadMore}
                        aria-disabled={loadingMore || !hasMore}
                        aria-busy={loadingMore}
                        aria-controls={`${id}-results`}
                        data-symbol-load-more
                        data-loading={loadingMore}
                        data-has-more={hasMore}
                        data-complete={!hasMore}
                      >
                        {loadingMore ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className={styles.loadIcon}
                            size={14}
                            data-symbol-load-spinner
                          />
                        ) : hasMore ? (
                          <ArrowDown
                            aria-hidden="true"
                            className={styles.loadIcon}
                            size={14}
                          />
                        ) : (
                          <Check
                            aria-hidden="true"
                            className={styles.loadIcon}
                            size={14}
                          />
                        )}
                        {loadingMore
                          ? "Loading…"
                          : hasMore
                            ? "Load more"
                            : "All shown"}
                      </button>
                      <span className={styles.pageCount} aria-hidden="true">
                        {visibleResults.length.toLocaleString("en")} /{" "}
                        {results.length.toLocaleString("en")}
                      </span>
                    </div>
                  )}
                </>
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
                    data-appearance-choice="color"
                    data-selected={color === item.value}
                  >
                    <span
                      className={styles.paletteSwatch}
                      data-palette-swatch
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
        className={styles.previewSection}
        data-appearance-preview-section
      >
        <div
          className={`final-look-showcase ${styles.showcase}`}
          style={
            {
              "--preview-accent": selectedColor.hex,
              "--preview-color-ink": colorFamilyInk,
              "--preview-color-wash": `${selectedColor.hex}66`,
              "--preview-light-wash": `${colorScale.lighter}80`,
              "--preview-deep-wash": `${colorScale.darker}59`,
              "--preview-pop-wash": `${accents.pop}70`,
              "--preview-spark-wash": `${accents.spark}66`,
            } as CSSProperties
          }
          data-appearance-preview
          data-preview-motion={motionEnabled ? "on" : "off"}
        >
          <span
            aria-hidden="true"
            className="final-look-ambience"
            data-preview-ambience
          />
          <span
            aria-hidden="true"
            className="final-look-wash"
            data-preview-wash
          />
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 360 400"
            preserveAspectRatio="xMidYMid slice"
            className={styles.previewPattern}
            data-preview-pattern
          >
            <path d="M-12 64 50 28 112 64 112 136 50 172-12 136ZM248 256 310 220 372 256 372 328 310 364 248 328ZM248-32 310 4 310 76 372 112M50 172 50 244-12 280M112 64 176 28 238 64M248 256 186 292 186 364 124 400" />
            <g>
              <circle cx="50" cy="28" r="2" />
              <circle cx="112" cy="64" r="2" />
              <circle cx="50" cy="172" r="2" />
              <circle cx="176" cy="28" r="2" />
              <circle cx="310" cy="220" r="2" />
              <circle cx="248" cy="256" r="2" />
              <circle cx="310" cy="364" r="2" />
              <circle cx="186" cy="292" r="2" />
            </g>
          </svg>
          <div
            className={`final-look-content ${styles.previewContent}`}
            data-preview-content
          >
            <header className={styles.previewHeader} data-preview-header>
              <div className={styles.titlePill} data-preview-title-pill>
                <h3 id={`${id}-preview-title`}>Final Look</h3>
                <span aria-hidden="true" className={styles.titleSeparator} />
                <span>Live Preview</span>
              </div>
              <span className={styles.colorChip} data-preview-color-chip>
                <span
                  aria-hidden="true"
                  className={styles.colorSwatch}
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <span className={styles.colorName} title={selectedColor.label}>
                  {selectedColor.label}
                </span>
              </span>
            </header>
            <div className={`final-look-icon-stage ${styles.iconStage}`}>
              <div className={styles.previewSway} data-preview-sway>
                <MedicationCardBase
                  color={color}
                  icon={icon}
                  iconRotation={iconRotation}
                  disabled
                  aria-label={`Preview icon: ${symbolLabel}`}
                  className={`final-look-icon-frame ${styles.iconSurface}`}
                  data-preview-icon-surface
                />
              </div>
            </div>
            <div className={styles.symbolLabelRow}>
              <p className={styles.symbolLabel} data-preview-symbol-label>
                {symbolLabel}
              </p>
              <button
                type="button"
                className={styles.motionToggle}
                aria-label="Animate medication preview"
                aria-pressed={motionEnabled}
                title={
                  motionEnabled ? "Pause preview motion" : "Play preview motion"
                }
                data-preview-motion-toggle
                onClick={() => {
                  const next = !motionEnabled;
                  if (onPreviewMotionChange) onPreviewMotionChange(next);
                  else setInternalPreviewMotion(next);
                }}
              >
                <Sparkles size={12} strokeWidth={2} aria-hidden="true" />
                <span aria-hidden="true" className={styles.toggleTrack}>
                  <span className={styles.toggleThumb} />
                </span>
              </button>
            </div>
            {fixedColor && (
              <p className={styles.fixedColor}>
                Fixed artwork color <span aria-hidden="true">/</span>{" "}
                {selectedColor.label} accent
              </p>
            )}
            <div className={styles.journalPreview} data-preview-journal-row>
              <div className={styles.journalHeading}>
                <p className={styles.rowLabel} data-preview-journal-caption>
                  <span>Your medication</span>
                  <span
                    aria-hidden="true"
                    className={styles.titleSeparator}
                    data-preview-journal-separator
                  />
                  <span>In Your Journal</span>
                </p>
                <span className={styles.rowContext}>
                  <Eye size={11} strokeWidth={2} aria-hidden="true" />
                  <span>Journal view</span>
                </span>
              </div>
              <MedicationCard
                medication={previewMedication}
                name={previewName}
                form={medicationType}
                ingredient={activeIngredient}
                quantity={hasQuantity ? quantity : 1}
                disabled
                aria-label={`Preview of ${previewName}, ${strengthLabel}, ${type.label}${activeIngredient.trim() ? `, active substance ${activeIngredient.trim()}` : ""}`}
                className={`medication-library-card final-look-journal ${styles.journalCard}`}
                trailing={
                  hasStrength && hasQuantity ? (
                    <div
                      className={`intake-card-dose-group ${styles.previewDose}`}
                      data-dose-source="default"
                    >
                      <span
                        className={`intake-card-amount ${styles.doseCalculation}`}
                        data-medication-strength
                        title={`${formatDose(quantity)} × ${strengthLabel}`}
                      >
                        <span>
                          <strong data-preview-quantity>
                            {formatDose(quantity)}
                          </strong>{" "}
                          {quantity === 1 ? type.unit : type.units}
                        </span>
                        <span className={styles.doseSlash} aria-hidden="true">
                          /
                        </span>
                        <strong
                          data-preview-unit-strength
                          data-medication-strength-value
                        >
                          {strengthLabel}
                        </strong>
                      </span>
                      <span
                        className={`intake-card-total ${styles.doseTotal}`}
                        data-medication-default-dose
                        title={`Default intake: ${doseLabel}`}
                        data-preview-total
                      >
                        <span
                          className="intake-card-total-value"
                          data-medication-default-dose-value
                        >
                          {formatDose(amount * quantity)}
                        </span>
                        <span className="intake-card-total-unit">mg</span>
                      </span>
                    </div>
                  ) : (
                    <span
                      className="intake-card-dose-group"
                      data-preview-strength
                    >
                      <span className="intake-card-amount">Set amount</span>
                      <span
                        className="intake-card-total"
                        title="Default dose not set"
                      >
                        <span className="intake-card-total-value">—</span>
                        <span className="intake-card-total-unit">mg</span>
                      </span>
                    </span>
                  )
                }
              />
              <div className={styles.defaultDose} data-preview-default-dose>
                <span>Default intake</span>
                <span className={styles.defaultSummary}>
                  <span aria-label="Default intake quantity">
                    {quantityLabel}
                  </span>
                  <span aria-hidden="true">/</span>
                  <strong aria-label="Default intake dose">
                    {strengthLabel}
                  </strong>
                </span>
              </div>
            </div>
            <div className={styles.previewActions}>
              <button
                type="button"
                disabled={!undo}
                onClick={() => {
                  if (!undo) return;
                  onColorChange(undo.color);
                  onIconChange(undo.icon);
                  setUndo(null);
                }}
                className={styles.previewAction}
                aria-label="Undo shuffled look"
              >
                <span
                  className={styles.previewActionFace}
                  data-preview-action-face="undo"
                >
                  <Undo2 size={12} strokeWidth={2} aria-hidden="true" /> Undo
                </span>
              </button>
              <button
                type="button"
                onClick={shuffleLook}
                className={styles.previewAction}
              >
                <span
                  className={styles.previewActionFace}
                  data-preview-action-face="surprise"
                >
                  <Shuffle size={12} strokeWidth={2} aria-hidden="true" />{" "}
                  Surprise Me
                </span>
              </button>
            </div>
            <p className="sr-only" role="status">
              Selected {symbolLabel}, {selectedColor.label} color.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
