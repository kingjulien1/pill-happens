import {
  parseReflectionInsightResponse,
  type ReflectionInsightRequest,
  type ReflectionInsightResponse,
} from "./reflection-insights";

type CachedInsight = {
  value: ReflectionInsightResponse;
  retryAt: number;
};

export const reflectionInsightKey = (input: ReflectionInsightRequest) =>
  JSON.stringify([input.day, input.period, input.note]);

async function sendInsight(input: ReflectionInsightRequest) {
  const response = await fetch("/api/daily-check-ins/insights", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(40_000),
  });
  if (!response.ok) throw new Error("Reflection insight unavailable.");
  const value = parseReflectionInsightResponse(await response.json());
  if (!value) throw new Error("Invalid reflection insight.");
  return value;
}

/** One memory cache per authenticated workspace; server storage survives reloads. */
export function createReflectionInsightClient({
  send = sendInsight,
  now = Date.now,
}: {
  send?: (
    input: ReflectionInsightRequest,
  ) => Promise<ReflectionInsightResponse>;
  now?: () => number;
} = {}) {
  const settled = new Map<string, CachedInsight>();
  const requests = new Map<string, Promise<CachedInsight>>();
  const remember = (key: string, value: CachedInsight) => {
    settled.delete(key);
    settled.set(key, value);
    // Eviction only causes a server cache lookup, never forced regeneration.
    if (settled.size > 24) settled.delete(settled.keys().next().value!);
  };
  return {
    peek: (input: ReflectionInsightRequest) =>
      settled.get(reflectionInsightKey(input)),
    request(input: ReflectionInsightRequest): Promise<CachedInsight> {
      const key = reflectionInsightKey(input);
      const running = requests.get(key);
      if (running) return running;
      const previous = settled.get(key);
      if (
        previous &&
        (!input.retry ||
          previous.value.status === "ready" ||
          previous.retryAt > now())
      )
        return Promise.resolve(previous);
      const promise = Promise.resolve()
        .then(() => send(input))
        .catch((): ReflectionInsightResponse => ({
          status: "unavailable",
          reason: "failed",
          retryAfterMs: 60_000,
        }))
        .then((value) => {
          const result = {
            value,
            retryAt:
              now() +
              (value.status === "unavailable" ? (value.retryAfterMs ?? 0) : 0),
          };
          if (
            value.status === "ready" ||
            (value.status === "unavailable" &&
              ["failed", "not_configured"].includes(value.reason))
          )
            remember(key, result);
          return result;
        })
        .finally(() => requests.delete(key));
      requests.set(key, promise);
      return promise;
    },
  };
}

export type ReflectionInsightClient = ReturnType<
  typeof createReflectionInsightClient
>;
