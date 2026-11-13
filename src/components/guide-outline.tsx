"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { CrosshairIcon } from "@phosphor-icons/react/dist/ssr/Crosshair";
import {
  guideOutlineEntries,
  type GuideOutlineEntry,
} from "@/lib/guide-outline";
import { GUIDE_SIDEBAR_QUERY } from "@/lib/guide-responsive";
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
  const targets = useRef(new Map<string, HTMLElement>());
  const [entries, setEntries] = useState<GuideOutlineEntry[]>([]);
  const [active, setActive] = useState("");
  const wide = useSyncExternalStore(subscribe, wideSnapshot, serverSnapshot);

  useEffect(() => {
    const root = content.current;
    if (!root || !wide) return;
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
  }, [wide]);

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
          target.scrollIntoView({ block: "start", behavior: "auto" });
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
    if (!root || !wide || !entries.length) return;
    let frame = 0;
    const update = () => {
      let current = entries[0].id;
      const atPageEnd =
        Math.ceil(window.scrollY + window.innerHeight) >=
        document.documentElement.scrollHeight - 2;
      for (const entry of entries) {
        const node = targets.current.get(entry.id);
        if (
          node &&
          exposed(node) &&
          node.getBoundingClientRect().top <=
            (atPageEnd ? window.innerHeight : 40)
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
    // Native anchors retain copy-link, history and modified-click behavior.
    if (window.location.hash === `#${entry.id}`)
      target?.scrollIntoView({ block: "start", behavior: "auto" });
  };
  const ancestors = new Set<string>();
  let ancestor = entries.find((entry) => entry.id === active)?.parentId;
  while (ancestor) {
    ancestors.add(ancestor);
    ancestor = entries.find((entry) => entry.id === ancestor)?.parentId;
  }
  const renderEntries = (parentId: string | null): ReactNode => (
    <ol className={parentId ? styles.children : styles.items}>
      {entries
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
              {entry.label}
            </a>
            {entries.some((child) => child.parentId === entry.id) &&
              renderEntries(entry.id)}
          </li>
        ))}
    </ol>
  );

  return (
    <div className={styles.boundary} data-guide-outline-boundary>
      <div ref={content} data-guide-outline-content className={styles.content}>
        {children}
      </div>
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
              <button
                type="button"
                onClick={() => findCurrent(true)}
                aria-label="Find current section"
                title="Find current section"
              >
                <CrosshairIcon size={16} weight="regular" aria-hidden="true" />
              </button>
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
