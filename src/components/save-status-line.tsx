"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { ActionIcon } from "./action-icon";
import styles from "./save-status-line.module.css";

type Tone = "normal" | "saved" | "restored" | "warning";
type Status = { text: string; tone?: Tone };
type Exit = Status & { scope: string; started: number };

// Keep only the outgoing caption through the new-entry → edit-form handoff.
const duration = 480;
let exit: Exit | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: Exit | null) {
  exit = next;
  listeners.forEach((listener) => listener());
}
const idle = () => null;

export function playSaveStatusExit(form: HTMLFormElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const line = form.querySelector<HTMLElement>("[data-save-status-scope]");
  const text = line?.querySelector("[role=status]")?.textContent;
  const scope = line?.dataset.saveStatusScope;
  if (!text || !scope) return;
  const { tone } = line.dataset;
  window.clearTimeout(timer);
  publish({
    scope,
    tone:
      tone === "saved" || tone === "restored" || tone === "warning"
        ? tone
        : "normal",
    text,
    started: performance.now(),
  });
  timer = window.setTimeout(() => publish(null), duration);
}

function Caption({ text, tone = "normal" }: Status) {
  return (
    <span className={styles.caption} data-tone={tone}>
      <span className={styles.mark}>
        <ActionIcon
          name={tone === "warning" ? "retry" : "save"}
          className={styles.icon}
        />
      </span>
      <span className={styles.text}>{text}</span>
    </span>
  );
}

export function SaveStatusLine({
  text,
  tone = "normal",
  scope,
}: Status & { scope?: string }) {
  const outgoing = useSyncExternalStore(
    subscribe,
    () => (scope && exit?.scope === scope ? exit : null),
    idle,
  );
  const flight = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!outgoing || !flight.current) return;
    // A replacement form continues at the same frame, even on a very fast save.
    flight.current.style.setProperty(
      "--status-delay",
      `-${performance.now() - outgoing.started}ms`,
    );
  }, [outgoing]);
  return (
    <span
      className={styles.line}
      data-save-status-line=""
      data-save-status-scope={scope}
      data-tone={tone}
    >
      <span
        className={styles.live}
        role="status"
        data-leaving={outgoing ? "" : undefined}
      >
        <Caption text={text} tone={tone} />
      </span>
      {outgoing && (
        <span
          key={outgoing.started}
          className={styles.flight}
          ref={flight}
          aria-hidden="true"
          style={{ "--status-duration": `${duration}ms` } as CSSProperties}
        >
          <Caption text={outgoing.text} tone={outgoing.tone} />
        </span>
      )}
    </span>
  );
}
