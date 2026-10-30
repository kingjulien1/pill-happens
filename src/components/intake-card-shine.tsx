"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** A rare, independently phased sweep; hidden and folded cards do no work. */
export function IntakeCardShine({
  seed,
  eligible,
}: {
  seed: string;
  eligible: boolean;
}) {
  const element = useRef<HTMLSpanElement>(null);
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++)
    hash = Math.imul(hash ^ seed.charCodeAt(index), 0x01000193);
  const value = hash >>> 0;

  useEffect(() => {
    if (!eligible) return;
    const node = element.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      node.dataset.shineActive = String(
        visible && !document.hidden && !reduced.matches,
      );
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    if (observer) observer.observe(node);
    else {
      visible = true;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      node.dataset.shineActive = "false";
    };
  }, [eligible]);

  if (!eligible) return null;
  return (
    <span
      ref={element}
      className="intake-card-shine"
      data-intake-shine
      data-shine-active="false"
      aria-hidden="true"
      style={
        {
          "--intake-shine-wait": `${45 + (value % 41)}s`,
          "--intake-shine-cycle": `${92 + ((value >>> 8) % 29)}s`,
        } as CSSProperties
      }
    >
      <span className="intake-card-shine-beam" />
    </span>
  );
}
