"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ActionIcon } from "@/components/action-icon";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { Button } from "@/components/ui/button";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import {
  createReflectionInsightClient,
  reflectionInsightKey,
  type ReflectionInsightClient,
} from "@/lib/reflection-insight-client";
import type { ReflectionInsightResponse } from "@/lib/reflection-insights";
import { reflectionStats } from "@/lib/reflection-writing";
import styles from "./reflection-insights.module.css";

const clients = new WeakMap<object, ReflectionInsightClient>();
const numberFormat = new Intl.NumberFormat("en-GB");
type Props = {
  day: string;
  period: DailyCheckInPeriod;
  note: string;
  savedNote: string;
  enabled: boolean;
};

export function ReflectionInsights(props: Props) {
  const stats = useMemo(() => reflectionStats(props.note), [props.note]);
  return stats.words > 20 ? <InsightPanel {...props} stats={stats} /> : null;
}

function InsightPanel({
  day,
  period,
  note,
  savedNote,
  enabled,
  stats,
}: Props & { stats: ReturnType<typeof reflectionStats> }) {
  const { store } = useJournalWorkspace();
  const client = useMemo(() => {
    let cached = clients.get(store);
    if (!cached) {
      cached = createReflectionInsightClient();
      clients.set(store, cached);
    }
    return cached;
  }, [store]);
  const heading = useId();
  const input = useMemo(() => ({ day, period, note }), [day, period, note]);
  const key = reflectionInsightKey(input);
  const synced = note === savedNote;
  const [retry, setRetry] = useState<{ key: string; count: number } | null>(
    null,
  );
  const attempt = retry?.key === key ? retry.count : 0;
  const consumedRetry = useRef<{
    client: ReflectionInsightClient;
    key: string;
    count: number;
  } | null>(null);
  const [result, setResult] = useState<{
    client: ReflectionInsightClient;
    key: string;
    value: ReflectionInsightResponse;
    retryAt: number;
  } | null>(null);
  const [requesting, setRequesting] = useState("");
  const [retryReady, setRetryReady] = useState(0);
  const cached = client.peek(input);
  const current =
    result?.key === key && result.client === client ? result : cached;
  const value = synced ? current?.value : undefined;
  const ready = value?.status === "ready" ? value : null;
  const unavailable = value?.status === "unavailable" ? value : null;
  const retryAt = current?.retryAt ?? 0;
  const canRetry =
    synced &&
    enabled &&
    requesting !== key &&
    (retryAt === 0 || retryReady === retryAt);

  useEffect(() => {
    if (!synced || !enabled) return;
    let live = true;
    let inFlight = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    const request = async () => {
      if (!live || inFlight || document.hidden || !navigator.onLine) return;
      inFlight = true;
      setRequesting(key);
      const explicitRetry =
        attempt > 0 &&
        !(
          consumedRetry.current?.client === client &&
          consumedRetry.current.key === key &&
          consumedRetry.current.count === attempt
        );
      if (explicitRetry)
        consumedRetry.current = { client, key, count: attempt };
      const next = await client.request({
        ...input,
        ...(explicitRetry ? { retry: true } : {}),
      });
      inFlight = false;
      if (!live) return;
      setRequesting("");
      setResult({ client, key, ...next });
      if (next.value.status === "pending" && ++polls < 8)
        timer = setTimeout(
          () => void request(),
          Math.min(10_000, Math.max(3_000, next.value.retryAfterMs)),
        );
    };
    const resume = () => {
      if (document.hidden || !navigator.onLine || client.peek(input)) return;
      clearTimeout(timer);
      timer = setTimeout(() => void request(), 900);
    };
    timer = setTimeout(() => void request(), attempt ? 0 : 900);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [client, key, input, synced, enabled, attempt]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryReady(retryAt),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [key, retryAt]);

  let message = "A short summary and a few gentle ideas from your words.";
  if (!synced)
    message = "Your writing is changing. Insights will follow once it’s saved.";
  else if (!enabled && !ready)
    message = "Finish your writing first. We’ll pick up from your saved words.";
  else if (unavailable?.reason === "not_configured")
    message =
      "AI reflections aren’t connected yet. Your entry is safely saved.";
  else if (unavailable?.reason === "failed")
    message = "The AI reflection couldn’t be completed. Your writing is safe.";
  else if (unavailable)
    message = "Waiting for the latest saved version of your words.";
  else if (requesting === key || value?.status === "pending")
    message = "Finding the thread in your words…";

  return (
    <section
      className={styles.panel}
      aria-labelledby={heading}
      data-reflection-insights={period}
      data-insight-state={ready ? "ready" : (value?.status ?? "waiting")}
    >
      <div className={styles.headingRow}>
        <h3 id={heading}>
          <ActionIcon name="sparkle" className="size-4" />A Little Perspective
        </h3>
        <span className={styles.source}>OpenAI</span>
      </div>
      <dl className={styles.stats} aria-label="Journal entry statistics">
        <div>
          <dt>Words</dt>
          <dd>{numberFormat.format(stats.words)}</dd>
        </div>
        <div>
          <dt>{stats.paragraphs === 1 ? "Paragraph" : "Paragraphs"}</dt>
          <dd>{numberFormat.format(stats.paragraphs)}</dd>
        </div>
        <div>
          <dt>Read</dt>
          <dd>~{stats.readingMinutes} min</dd>
        </div>
      </dl>
      {ready ? (
        <>
          <p className={styles.summary} data-insight-summary>
            {ready.summary}
          </p>
          <div className={styles.advice}>
            <h4>A few gentle ideas</h4>
            <ul data-insight-advice>
              {ready.advice.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          <p className={styles.footnote}>
            <ActionIcon name="selected" className="size-3" />
            Saved · Reused while your words stay the same.
          </p>
        </>
      ) : (
        <div className={styles.status}>
          <p role="status" aria-live="polite">
            {requesting === key && (
              <ActionIcon name="loading" className={styles.spinner} />
            )}
            {message}
          </p>
          {synced &&
            enabled &&
            (unavailable || value?.status === "pending") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.retry}
                disabled={!canRetry}
                onClick={() => setRetry({ key, count: attempt + 1 })}
              >
                <ActionIcon name="retry" className="size-3.5" />
                {unavailable?.reason === "failed" ? "Try again" : "Check again"}
              </Button>
            )}
        </div>
      )}
    </section>
  );
}
