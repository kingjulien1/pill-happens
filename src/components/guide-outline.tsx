"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { CrosshairIcon } from "@phosphor-icons/react/dist/ssr/Crosshair";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import {
  guideOutlineEntries,
  searchGuideOutline,
  type GuideOutlineEntry,
} from "@/lib/guide-outline";
import { GUIDE_SIDEBAR_QUERY } from "@/lib/guide-responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/responsive-modal";
import styles from "./guide-outline.module.css";

const subscribe = (listener: () => void) => {
  const media = window.matchMedia(GUIDE_SIDEBAR_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const wideSnapshot = () => window.matchMedia(GUIDE_SIDEBAR_QUERY).matches;
const serverSnapshot = () => false;

function openAncestors(target: HTMLElement) {
  let node: HTMLElement | null = target;
  while (node) {
    if (node instanceof HTMLDetailsElement) node.open = true;
    node = node.parentElement;
  }
}
function alignGuideTarget(target: HTMLElement) {
  // Chromium can ignore scroll-margin on an expanded details taller than the
  // viewport. These guide anchors belong to the document, not an inner scroller.
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop);
  window.scrollTo({
    top:
      window.scrollY +
      target.getBoundingClientRect().top -
      (Number.isFinite(margin) ? margin : 28),
    behavior: "instant",
  });
}
function exposed(heading: HTMLElement) {
  if (!heading.getClientRects().length) return false;
  let parent = heading.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement && !parent.open) {
      const summary = parent.querySelector(":scope > summary");
      if (!summary?.contains(heading)) return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

/** Guide-only rail: the grid column is bounded by content, excluding footer. */
export function GuideOutline({ children }: { children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const navigationTarget = useRef<HTMLElement | null>(null);
  const targets = useRef(new Map<string, HTMLElement>());
  const [entries, setEntries] = useState<GuideOutlineEntry[]>([]);
  const [active, setActive] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const mobileListId = useId();
  const wide = useSyncExternalStore(subscribe, wideSnapshot, serverSnapshot);
  const matches = useMemo(
    () => searchGuideOutline(entries, query),
    [entries, query],
  );

  useEffect(() => {
    if (!wide) return;
    const frame = requestAnimationFrame(() => setMobileOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [wide]);

  useEffect(() => {
    const root = content.current;
    if (!root) return;
    let frame = 0;
    let disposed = false;
    const collect = () => {
      if (disposed || !root.isConnected) return;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-guide-outline-level]"),
      );
      targets.current = new Map();
      const next = guideOutlineEntries(
        nodes.map((node) => {
          const id = node.dataset.guideOutlineTarget || node.id;
          if (id) targets.current.set(id, node);
          return {
            id,
            label: node.dataset.guideOutlineLabel || node.textContent || "",
            level: Number(node.dataset.guideOutlineLevel),
          };
        }),
      );
      setEntries((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(collect);
    };
    // Background-opened tabs may suspend painting before the rail is initialized.
    queueMicrotask(collect);
    const observer = new MutationObserver(schedule);
    observer.observe(root, { subtree: true, childList: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = content.current;
    if (!root) return;
    let frame = 0;
    let followup = 0;
    const revealHash = () => {
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      openAncestors(target);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(followup);
      frame = requestAnimationFrame(() => {
        followup = requestAnimationFrame(() => {
          alignGuideTarget(target);
        });
      });
    };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    window.addEventListener("popstate", revealHash);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(followup);
      window.removeEventListener("hashchange", revealHash);
      window.removeEventListener("popstate", revealHash);
    };
  }, []);

  useEffect(() => {
    const root = content.current;
    if (!root || !entries.length) return;
    let frame = 0;
    const update = () => {
      let current = entries[0].id;
      const atPageEnd =
        Math.ceil(window.scrollY + window.innerHeight) >=
        document.documentElement.scrollHeight - 2;
      // On phones the toolbar tracks sections; the desktop rail tracks details too.
      for (const entry of wide
        ? entries
        : entries.filter((item) => item.level === 1)) {
        const node = targets.current.get(entry.id);
        if (
          node &&
          exposed(node) &&
          node.getBoundingClientRect().top <=
            (atPageEnd ? window.innerHeight : wide ? 40 : 88)
        )
          current = entry.id;
      }
      // Neighboring cards can share a heading row. Keep a followed fragment
      // selected within that row, then let normal scroll tracking take over.
      let requested = "";
      try {
        requested = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        // A malformed fragment must not interrupt scroll tracking.
      }
      const requestedNode = targets.current.get(requested);
      const currentNode = targets.current.get(current);
      if (
        requestedNode &&
        currentNode &&
        exposed(requestedNode) &&
        Math.abs(
          requestedNode.getBoundingClientRect().top -
            currentNode.getBoundingClientRect().top,
        ) <= 1
      )
        current = requested;
      setActive(current);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("popstate", schedule);
    root.addEventListener("toggle", schedule, true);
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("popstate", schedule);
      root.removeEventListener("toggle", schedule, true);
      observer.disconnect();
    };
  }, [entries, wide]);

  const findCurrent = useCallback((center = false) => {
    const scroller = list.current;
    const link = scroller?.querySelector<HTMLElement>(
      '[aria-current="location"]',
    );
    if (!scroller || !link) return;
    const box = scroller.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (center)
      scroller.scrollTop += item.top - box.top - (box.height - item.height) / 2;
    else if (item.top < box.top + 4)
      scroller.scrollTop += item.top - box.top - 4;
    else if (item.bottom > box.bottom - 4)
      scroller.scrollTop += item.bottom - box.bottom + 4;
  }, []);
  useEffect(() => {
    if (!wide) return;
    const frame = requestAnimationFrame(() => findCurrent());
    return () => cancelAnimationFrame(frame);
  }, [active, findCurrent, wide]);

  const activate = (
    event: MouseEvent<HTMLAnchorElement>,
    entry: GuideOutlineEntry,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    const target = document.getElementById(entry.id);
    if (target) openAncestors(target);
    setActive(entry.id);
    if (mobileOpen && target) {
      target.tabIndex = -1;
      target.dataset.guideOutlineFocus = "true";
      navigationTarget.current = target;
      setMobileOpen(false);
    }
    // Native anchors retain copy-link, history and modified-click behavior.
    if (window.location.hash === `#${entry.id}` && target)
      alignGuideTarget(target);
  };
  const ancestors = new Set<string>();
  let ancestor = entries.find((entry) => entry.id === active)?.parentId;
  while (ancestor) {
    ancestors.add(ancestor);
    ancestor = entries.find((entry) => entry.id === ancestor)?.parentId;
  }
  const renderEntries = (
    parentId: string | null,
    mobile = false,
  ): ReactNode => (
    <ol className={parentId ? styles.children : styles.items}>
      {(mobile ? matches : entries)
        .filter((entry) => entry.parentId === parentId)
        .map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(event) => activate(event, entry)}
              className={styles.link}
              title={entry.label}
              aria-current={active === entry.id ? "location" : undefined}
              data-guide-outline-link
              data-outline-level={entry.level}
              data-outline-target={entry.id}
              data-active-path={ancestors.has(entry.id) || undefined}
            >
              <span>{entry.label}</span>
              {mobile && !query.trim() && entry.level === 1 && (
                <small>
                  {
                    entries.filter((child) => child.parentId === entry.id)
                      .length
                  }{" "}
                  topics
                </small>
              )}
            </a>
            {(!mobile || query.trim()) &&
              (mobile ? matches : entries).some(
                (child) => child.parentId === entry.id,
              ) &&
              renderEntries(entry.id, mobile)}
          </li>
        ))}
    </ol>
  );
  const sections = entries.filter((entry) => entry.level === 1);
  const currentSection =
    sections.find((entry) => entry.id === active || ancestors.has(entry.id)) ??
    sections[0];

  return (
    <div
      className={styles.boundary}
      data-guide-outline-boundary
      data-mobile-outline-ready={entries.length > 0 || undefined}
    >
      {entries.length > 0 && (
        <div className={styles.mobileBar} data-guide-mobile-toolbar>
          <Button
            ref={mobileTrigger}
            variant="ghost"
            type="button"
            className={styles.mobileTrigger}
            aria-haspopup="dialog"
            aria-expanded={mobileOpen && !wide}
            aria-controls={mobileOpen && !wide ? mobileListId : undefined}
            onClick={() => {
              navigationTarget.current = null;
              setQuery("");
              setMobileOpen(true);
            }}
          >
            <ListBulletsIcon size={18} weight="bold" aria-hidden="true" />
            <strong>Contents</strong>
            <span>{currentSection?.label}</span>
            <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      )}
      <div ref={content} data-guide-outline-content className={styles.content}>
        {children}
      </div>
      {!wide && (
        <ResponsiveModal
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title="On This Page"
          description="Jump to a section, or search all headings for a specific topic."
          restoreScroll={false}
          returnFocus={() => navigationTarget.current ?? mobileTrigger.current}
        >
          <div className={styles.mobileContents}>
            <label htmlFor={searchId} className={styles.searchLabel}>
              Find A Topic
            </label>
            <div className={styles.search}>
              <MagnifyingGlassIcon
                size={18}
                weight="regular"
                aria-hidden="true"
              />
              <Input
                id={searchId}
                type="search"
                autoComplete="off"
                placeholder="Search topics…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-controls={mobileListId}
              />
            </div>
            <div className={styles.mobileMeta} role="status" aria-live="polite">
              <span>
                {query.trim()
                  ? `${matches.length} links`
                  : `${sections.length} sections`}
              </span>
              <span>
                {query.trim()
                  ? "Heading Matches"
                  : `${entries.length} topics to explore`}
              </span>
            </div>
            <nav
              id={mobileListId}
              className={styles.mobileList}
              aria-label="Guide topics"
            >
              {matches.length > 0 ? (
                renderEntries(null, true)
              ) : (
                <p className={styles.noResults}>
                  No matching topic yet. Try a shorter word.
                </p>
              )}
            </nav>
          </div>
        </ResponsiveModal>
      )}
      {wide && entries.length > 0 && (
        <aside className={styles.rail} data-guide-outline>
          <nav
            className={styles.panel}
            aria-label="On This Page"
            data-guide-outline-nav
          >
            <div className={styles.header}>
              <ListBulletsIcon size={15} weight="bold" aria-hidden="true" />
              <strong>On This Page</strong>
              <span>
                {entries.filter((entry) => entry.level === 1).length} sections
              </span>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => findCurrent(true)}
                aria-label="Find current section"
                title="Find current section"
              >
                <CrosshairIcon size={16} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div
              ref={list}
              className={styles.list}
              tabIndex={0}
              aria-label="Page sections"
            >
              {renderEntries(null)}
            </div>
          </nav>
        </aside>
      )}
    </div>
  );
}
