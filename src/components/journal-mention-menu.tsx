"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type CSSProperties,
  type PointerEvent,
  type MouseEvent,
} from "react";
import {
  AtSign,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock3,
  FolderHeart,
  MoonStar,
  Slash,
  Sun,
  Check,
  FlaskConical,
  Pill,
  X,
} from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { MedicationChoiceIcon } from "@/components/medication-choice-icon";
import { MedicationGlyph } from "@/components/medication-icon";
import { getMedicationColor } from "@/lib/medication-appearance";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { getMedicationCategory } from "@/lib/medication-categories";
import { dayKey } from "@/lib/domain";
import {
  applyJournalMention,
  getJournalMentionToken,
  getJournalMentionCategories,
  parseJournalMentionHref,
  searchJournalMentions,
  type JournalMention,
} from "@/lib/journal-mentions";
import styles from "./journal-mention-menu.module.css";

export const JOURNAL_MENTION_DELAY = 800;
type Edit = NonNullable<ReturnType<typeof applyJournalMention>>;
type Position = { left: number; top: number; width: number; maxHeight: number };

/** Measure a wrapping textarea's caret without changing its value, selection or scroll. */
function caretRect(field: HTMLTextAreaElement, caret: number) {
  const bounds = field.getBoundingClientRect();
  const style = getComputedStyle(field);
  const mirror = document.createElement("div");
  const properties = [
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "fontVariant",
    "fontStretch",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "textTransform",
    "textIndent",
    "textAlign",
    "direction",
    "tabSize",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
  ] as const;
  for (const property of properties) mirror.style[property] = style[property];
  Object.assign(mirror.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    width: `${field.offsetWidth}px`,
    height: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: style.wordBreak,
    borderStyle: "solid",
  });
  mirror.setAttribute("aria-hidden", "true");
  mirror.textContent = field.value.slice(0, caret);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);
  try {
    const point = marker.getBoundingClientRect();
    const origin = mirror.getBoundingClientRect();
    return {
      left: bounds.left + point.left - origin.left - field.scrollLeft,
      top: bounds.top + point.top - origin.top - field.scrollTop,
      height: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5,
    };
  } finally {
    mirror.remove();
  }
}

/** One local, debounced catalogue; the actual edit still uses the writer's draft path. */
export function useJournalMentionMenu({
  value,
  caret,
  field,
  enabled,
  scope,
  onCommit,
  onFeedback,
}: {
  value: string;
  caret: { start: number; end: number };
  field: RefObject<HTMLTextAreaElement | null>;
  enabled: boolean;
  scope: string;
  onCommit: (edit: Edit) => void;
  onFeedback: (message: string) => void;
}) {
  const { data, now } = useJournal();
  const id = useId();
  const listId = `${id}-links`;
  const helpId = `${id}-help`;
  const [focused, setFocused] = useState(false);
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState({ key: "", message: "" });
  const pointer = useRef<{
    id: number;
    key: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  const [composing, setComposing] = useState(false);
  const [dismissedKey, setDismissedKey] = useState("");
  const dismissed = useRef("");
  const [result, setResult] = useState<{
    key: string;
    items: JournalMention[];
  }>({ key: "", items: [] });
  const [active, setActive] = useState({ key: "", index: 0 });
  const [expanded, setExpanded] = useState<{ key: string; keys: Set<string> }>({
    key: "",
    keys: new Set(),
  });
  const [position, setPosition] = useState<Position | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const token = useMemo(
    () =>
      enabled && focused && !composing
        ? getJournalMentionToken(value, caret.start, caret.end)
        : null,
    [value, caret.start, caret.end, enabled, focused, composing],
  );
  const key = token
    ? `${scope}:${revision}:${token.start}:${token.end}:${token.trigger}:${token.query}:${token.replacementEnd ?? token.end}`
    : "";
  const visible = Boolean(token && data && key !== dismissedKey);
  const pending = visible && result.key !== key;
  const roots = pending ? [] : result.key === key ? result.items : [];
  const expandedKeys = expanded.key === key ? expanded.keys : new Set<string>();
  const rows: {
    item: JournalMention;
    depth: number;
    parent?: string;
    position: number;
    size: number;
  }[] = [];
  roots.forEach((item, position) => {
    rows.push({ item, depth: 1, position: position + 1, size: roots.length });
    if (expandedKeys.has(item.key))
      item.children?.forEach((child, childIndex) => {
        rows.push({
          item: child,
          depth: 2,
          parent: item.key,
          position: childIndex + 1,
          size: item.children!.length,
        });
      });
  });
  const items = rows.map(({ item }) => item);
  const index =
    active.key === key
      ? Math.min(active.index, Math.max(0, items.length - 1))
      : 0;
  const today = data && now ? dayKey(now, data.settings.timezone) : "";

  useEffect(() => {
    if (!visible || !token || !data) return;
    const timer = setTimeout(() => {
      setResult({
        key,
        items: searchJournalMentions(
          data,
          token.query,
          today,
          token.trigger,
          now ?? undefined,
        ),
      });
      setActive({ key, index: 0 });
    }, JOURNAL_MENTION_DELAY);
    return () => clearTimeout(timer);
  }, [visible, key, token, data, today, now]);

  useLayoutEffect(() => {
    const node = field.current;
    const pane = node?.parentElement;
    if (!visible || !node || !pane || !token) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!node.isConnected) return;
      const parent = pane.getBoundingClientRect();
      const point = caretRect(node, token.end);
      const width = Math.max(0, Math.min(340, parent.width - 16));
      const below =
        parent.bottom - Math.max(parent.top, point.top + point.height) - 14;
      const above = Math.min(parent.bottom, point.top) - parent.top - 14;
      const lowRoom = Math.max(below, above) < 100;
      const maxHeight = Math.max(
        0,
        Math.min(280, lowRoom ? parent.height - 16 : Math.max(below, above)),
      );
      const belowCaret = below >= above || below >= 250;
      const rawTop = lowRoom
        ? 8
        : belowCaret
          ? point.top + point.height - parent.top + 6
          : point.top - parent.top - maxHeight - 6;
      const next = {
        left: Math.max(
          8,
          Math.min(point.left - parent.left, parent.width - width - 8),
        ),
        top: Math.max(8, Math.min(rawTop, parent.height - maxHeight - 8)),
        width,
        maxHeight,
      };
      setPosition((previous) =>
        previous &&
        Object.keys(next).every(
          (name) =>
            Math.abs(
              previous[name as keyof Position] - next[name as keyof Position],
            ) < 0.5,
        )
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    observer?.observe(node);
    node.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      node.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [visible, token, field, scope]);

  useLayoutEffect(() => {
    const box = list.current;
    const option = box?.querySelector<HTMLElement>("[data-active=true]");
    if (!box || !option) return;
    const boxRect = box.getBoundingClientRect(),
      optionRect = option.getBoundingClientRect();
    if (optionRect.top < boxRect.top)
      box.scrollTop -= boxRect.top - optionRect.top;
    else if (optionRect.bottom > boxRect.bottom)
      box.scrollTop += optionRect.bottom - boxRect.bottom;
  }, [index, result, visible, expanded]);

  const dismiss = () => {
    dismissed.current = key;
    setDismissedKey(key);
  };
  const choose = (item: JournalMention) => {
    if (
      !enabled ||
      !visible ||
      pending ||
      !token ||
      dismissed.current === key ||
      document.activeElement !== field.current
    )
      return;
    const current = field.current;
    if (
      !current ||
      current.value !== value ||
      current.selectionStart !== caret.start ||
      current.selectionEnd !== caret.end
    )
      return;
    const edit = applyJournalMention(value, token, item);
    if (!edit) {
      const message =
        "Not enough space for this link. Shorten the entry a little, then try again.";
      setFailure({ key, message });
      onFeedback(message);
      return;
    }
    dismiss();
    onCommit(edit);
  };
  const toggle = (item: JournalMention, optionIndex: number) => {
    if (!item.children?.length) return;
    const next = new Set(expandedKeys);
    if (next.has(item.key)) next.delete(item.key);
    else next.add(item.key);
    setExpanded({ key, keys: next });
    setActive({ key, index: optionIndex });
  };
  // Pointer selection keeps the textarea focused; a scroll gesture never inserts a link.
  const pointerProps = (
    item: JournalMention,
    optionIndex: number,
    disclosure = false,
  ) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !event.isPrimary) {
        pointer.current = null;
        ignoreClick.current = true;
        return;
      }
      pointer.current = {
        id: event.pointerId,
        key: `${item.key}:${disclosure}`,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      ignoreClick.current = false;
      event.preventDefault();
    },
    onPointerCancel: () => {
      pointer.current = null;
      ignoreClick.current = true;
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      const start = pointer.current;
      pointer.current = null;
      const valid =
        start &&
        start.id === event.pointerId &&
        start.key === `${item.key}:${disclosure}` &&
        !start.moved &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8;
      // Suppress the compatibility click after pointerup, particularly for disclosures.
      ignoreClick.current = true;
      if (valid) {
        if (disclosure) toggle(item, optionIndex);
        else choose(item);
      }
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.button === 0 && (event.detail === 0 || !ignoreClick.current)) {
        if (disclosure) toggle(item, optionIndex);
        else choose(item);
      }
    },
    onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointer.current;
      if (start && start.id === event.pointerId && event.buttons)
        start.moved = true;
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointer.current;
      if (
        start &&
        start.id === event.pointerId &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
      )
        start.moved = true;
      if (event.pointerType !== "touch" && !event.buttons)
        setActive({ key, index: optionIndex });
    },
  });
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!visible || event.nativeEvent.isComposing || composing) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return true;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!items.length) {
        dismiss();
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      if (items.length)
        setActive({
          key,
          index:
            (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length,
        });
      return true;
    }
    if (
      items.length &&
      (event.key === "ArrowRight" || event.key === "ArrowLeft")
    ) {
      const row = rows[index];
      if (event.key === "ArrowRight" && row.item.children?.length) {
        event.preventDefault();
        event.stopPropagation();
        if (!expandedKeys.has(row.item.key)) toggle(row.item, index);
        else setActive({ key, index: index + 1 });
        return true;
      }
      if (
        event.key === "ArrowLeft" &&
        (row.parent || expandedKeys.has(row.item.key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (row.parent)
          setActive({
            key,
            index: rows.findIndex(({ item }) => item.key === row.parent),
          });
        else toggle(row.item, index);
        return true;
      }
    }
    if (items.length && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      event.stopPropagation();
      choose(items[index]);
      return true;
    }
    return false;
  };

  return {
    helpId,
    visible,
    onKeyDown,
    inputProps: {
      role: "combobox" as const,
      "aria-autocomplete": "list" as const,
      "aria-haspopup": "tree" as const,
      "aria-expanded": visible,
      "aria-controls": visible ? listId : undefined,
      "aria-activedescendant":
        visible && !pending && items.length
          ? `${id}-option-${index}`
          : undefined,
      onInput: () => {
        setRevision((current) => current + 1);
        setResult({ key: "", items: [] });
        dismissed.current = "";
        setDismissedKey("");
      },
      onFocus: () => {
        setFocused(true);
        dismissed.current = "";
        setDismissedKey("");
      },
      onBlur: () => {
        setFocused(false);
        setResult({ key: "", items: [] });
        setPosition(null);
      },
      onCompositionStart: () => setComposing(true),
      onCompositionEnd: () => setComposing(false),
    },
    help: (
      <span id={helpId} className="sr-only">
        Type @ for medications, ingredients and categories, or / for days, weeks
        and journals. Pause for suggestions. Up and Down browse; Right opens
        linked intakes or journals, Left closes them. Enter or Tab inserts the
        highlighted link. A space after the trigger or Escape dismisses
        suggestions.
      </span>
    ),
    menu: visible ? (
      <div
        className={styles.menu}
        style={
          position
            ? { ...position, visibility: "visible" }
            : { visibility: "hidden" }
        }
        data-journal-mention-menu
        data-mention-state={pending ? "loading" : "ready"}
        data-compact={(position && position.maxHeight < 160) || undefined}
      >
        <div className={styles.header}>
          <span className={styles.mark} aria-hidden="true">
            {token?.trigger === "/" ? (
              <Slash size={17} strokeWidth={2.3} />
            ) : (
              <AtSign size={17} strokeWidth={2.3} />
            )}
          </span>
          <div>
            <strong>
              {token?.trigger === "/"
                ? "A day, a week, a few words"
                : "Link a little context"}
            </strong>
            <span role="status">
              {pending
                ? "Waiting for a pause…"
                : `${roots.length} ${roots.length === 1 ? "match" : "matches"} · saved in your journal`}
            </span>
          </div>
          <button
            type="button"
            tabIndex={-1}
            className={styles.close}
            aria-label="Dismiss link suggestions"
            onPointerDown={(event) => event.preventDefault()}
            onClick={dismiss}
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
        {failure.key === key && (
          <p
            className={styles.failure}
            role="status"
            data-journal-mention-feedback
          >
            {failure.message}
          </p>
        )}
        <div
          ref={list}
          id={listId}
          role="tree"
          aria-label="Journal links"
          aria-busy={pending}
          className={styles.list}
          data-journal-mention-list
        >
          {pending ? (
            <div
              className={styles.loading}
              role="presentation"
              data-journal-mention-loading
            >
              <span className={styles.orbit} aria-hidden="true">
                <i />
                <i />
                <i />
                {token?.trigger === "/" ? (
                  <Slash size={21} strokeWidth={2.1} />
                ) : (
                  <AtSign size={21} strokeWidth={2.1} />
                )}
              </span>
              <span>
                Gathering your links<span className={styles.dots}>…</span>
              </span>
              <span className={styles.loadingTrack} aria-hidden="true" />
            </div>
          ) : items.length ? (
            rows.map(
              (
                { item, depth, parent, position: rowPosition, size },
                optionIndex,
              ) => {
                const reference = parseJournalMentionHref(item.href);
                const categories = getJournalMentionCategories(
                  data?.medications ?? [],
                  reference,
                );
                const activeOption = index === optionIndex;
                const hasChildren = Boolean(item.children?.length);
                const isExpanded = expandedKeys.has(item.key);
                const Icon =
                  item.kind === "ingredient"
                    ? FlaskConical
                    : item.kind === "week"
                      ? CalendarRange
                      : item.kind === "reflection"
                        ? item.href.endsWith("/morning")
                          ? Sun
                          : MoonStar
                        : item.kind === "intake"
                          ? Clock3
                          : item.kind === "category"
                            ? FolderHeart
                            : item.kind === "medication"
                              ? Pill
                              : CalendarDays;
                const type = {
                  medication: "Medication",
                  ingredient: "Ingredient",
                  category: "Category",
                  intake: "Intake",
                  day: "Day",
                  week: "Week",
                  reflection: "Journal",
                }[item.kind];
                return (
                  <div
                    id={`${id}-option-${optionIndex}`}
                    key={item.key}
                    role="treeitem"
                    aria-label={`${item.label}, ${item.detail}${hasChildren ? `, ${item.children!.length} ${item.kind === "medication" ? "today’s intakes" : "journals"}, use Right to expand` : ""}`}
                    aria-selected={activeOption}
                    aria-level={depth}
                    aria-posinset={rowPosition}
                    aria-setsize={size}
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    className={styles.row}
                    data-journal-mention-option={item.kind}
                    data-mention-key={item.key}
                    data-active={activeOption}
                    data-depth={depth}
                    data-parent={parent}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      title={`Insert ${item.label} · ${item.detail}`}
                      aria-label={`Insert ${item.label}, ${item.detail}`}
                      className={styles.option}
                      {...pointerProps(item, optionIndex)}
                    >
                      <span
                        className={styles.optionIcon}
                        data-kind={item.kind}
                        style={
                          item.medication
                            ? ({
                                "--mention-color": getMedicationColor(
                                  item.medication.color,
                                ).hex,
                              } as CSSProperties)
                            : undefined
                        }
                        aria-hidden="true"
                      >
                        {reference?.kind === "category" ? (
                          <MedicationIndicatorMark
                            kind={reference.category}
                            size={28}
                            aria-hidden="true"
                          />
                        ) : item.medication ? (
                          <span
                            className={styles.medicationGlyph}
                            style={{
                              transform: `rotate(${item.medication.iconRotation ?? 0}deg)`,
                            }}
                          >
                            <MedicationGlyph
                              icon={item.medication.icon}
                              className={styles.medicationGlyph}
                            />
                          </span>
                        ) : (
                          <Icon size={17} strokeWidth={2.2} />
                        )}
                      </span>
                      <span className={styles.copy}>
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                        {categories.length > 0 &&
                          depth === 1 &&
                          item.kind !== "category" && (
                            <span
                              className={styles.categoryRail}
                              data-journal-mention-categories
                            >
                              {categories.map((category) => (
                                <MedicationIndicatorMark
                                  key={category}
                                  kind={category}
                                  size={15}
                                  title={getMedicationCategory(category).label}
                                />
                              ))}
                            </span>
                          )}
                      </span>
                      {item.kind === "intake" && item.intake ? (
                        <MedicationChoiceIcon
                          kind="route"
                          value={item.intake.route ?? "unspecified"}
                          className={styles.route}
                        />
                      ) : (
                        <span className={styles.type}>{type}</span>
                      )}
                      <span className={styles.checkSlot} aria-hidden="true">
                        {activeOption && <Check size={14} strokeWidth={2.4} />}
                      </span>
                    </button>
                    {hasChildren && (
                      <button
                        type="button"
                        tabIndex={-1}
                        className={styles.disclosure}
                        aria-label={`${isExpanded ? "Hide" : "Show"} ${item.kind === "medication" ? "today’s intakes for" : "journals for"} ${item.label}`}
                        title={`${isExpanded ? "Hide" : "Show"} ${item.kind === "medication" ? "today’s intakes" : "journals"}`}
                        aria-expanded={isExpanded}
                        {...pointerProps(item, optionIndex, true)}
                      >
                        <span>{item.children!.length}</span>
                        <ChevronRight size={14} strokeWidth={2.3} />
                      </button>
                    )}
                  </div>
                );
              },
            )
          ) : (
            <div className={styles.empty}>
              No matches yet.
              <span>
                {token?.trigger === "/"
                  ? "Try Today, Yesterday, ThisWeek, or a date."
                  : "Try a medication name, active ingredient, or category."}
              </span>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <span>
            {token?.trigger === "/"
              ? "Days / weeks · expand for journals"
              : "Medications / categories · expand for today’s intakes"}
          </span>
          <span>↵ link · → open</span>
        </div>
      </div>
    ) : null,
  };
}
