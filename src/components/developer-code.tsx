"use client";

import { useEffect, useRef, useState } from "react";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { ActionIcon } from "@/components/action-icon";
import styles from "./developer-guide.module.css";

/** Copy is explicit and local; a selectable fallback keeps every example usable. */
export function DeveloperCode({
  label,
  language = "text",
  code,
}: {
  label: string;
  language?: string;
  code: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);

  useEffect(
    () => () => {
      attempt.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const current = ++attempt.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Copy unavailable.");
      await navigator.clipboard.writeText(code);
      if (current !== attempt.current) return;
      if (timer.current) clearTimeout(timer.current);
      setState("copied");
      timer.current = setTimeout(() => setState("idle"), 1800);
    } catch {
      if (current !== attempt.current) return;
      if (timer.current) clearTimeout(timer.current);
      setState("manual");
    }
  }

  return (
    <div className={styles.codeBlock} data-developer-code>
      <div className={styles.codeHeading}>
        <span>
          <strong>{label}</strong>
          <small>{language}</small>
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className={styles.copyButton}
        >
          {state === "copied" ? (
            <ActionIcon name="selected" className="size-3.5" />
          ) : (
            <CopyIcon size={14} weight="bold" aria-hidden="true" />
          )}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0} aria-label={label}>
        <code>{code}</code>
      </pre>
      <span className="sr-only" role="status">
        {state === "copied"
          ? `${label} copied.`
          : state === "manual"
            ? "Automatic copy is unavailable. A selectable example is available below."
            : ""}
      </span>
      {state === "manual" && (
        <div className={styles.manualCopy}>
          <label>
            Automatic copy is unavailable. Select and copy the example below.
            <textarea
              readOnly
              value={code}
              rows={5}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={`Select ${label} to copy`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
