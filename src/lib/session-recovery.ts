export type SessionStatus = "authenticated" | "unauthenticated" | "unavailable";

type SessionOptions = { signal?: AbortSignal };

type SessionDependencies = {
  fetcher?: typeof fetch;
  pause?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  timeoutMs?: number;
};

const requestTimeoutMs = 5_000;
const recoveryDelaysMs = [250, 750, 1_500];

function abortError() {
  return new DOMException("Session check cancelled.", "AbortError");
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function pause(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, milliseconds);

    function cancel() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      reject(abortError());
    }

    signal?.addEventListener("abort", cancel, { once: true });
  });
}

/**
 * Checks only the HttpOnly session cookie, without reading journal data.
 * Network failures, malformed responses and timeouts are "unavailable", never
 * proof of a logout. Caller cancellation rejects with an AbortError.
 */
export async function probeSession(
  { signal }: SessionOptions = {},
  dependencies: SessionDependencies = {},
): Promise<SessionStatus> {
  throwIfAborted(signal);

  const controller = new AbortController();
  const fetcher = dependencies.fetcher ?? fetch;
  let interrupt: (error: DOMException) => void;
  const interruption = new Promise<never>((_, reject) => {
    interrupt = reject;
  });
  const cancel = () => {
    controller.abort();
    interrupt(abortError());
  };
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    controller.abort();
    interrupt(new DOMException("Session check timed out.", "TimeoutError"));
  }, dependencies.timeoutMs ?? requestTimeoutMs);

  async function readStatus(): Promise<SessionStatus> {
    const response = await fetcher("/api/session", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (response.status !== 200) return "unavailable";

    const body: unknown = await response.json();
    if (body && typeof body === "object" && "authenticated" in body) {
      if (body.authenticated === true) return "authenticated";
      if (body.authenticated === false) return "unauthenticated";
    }
    return "unavailable";
  }

  try {
    // Also bounds an unresponsive response body or a fetch that ignores abort.
    const status = await Promise.race([readStatus(), interruption]);
    throwIfAborted(signal);
    return status;
  } catch {
    throwIfAborted(signal);
    return "unavailable";
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

/**
 * Gives a newly opened PWA a short, bounded window to expose its saved cookie.
 * Only an explicit unauthenticated response is retried. Unavailable servers
 * return immediately so callers can preserve their current screen and retry.
 * Caller cancellation rejects with an AbortError, including between requests.
 */
export async function recoverSession(
  options: SessionOptions = {},
  dependencies: SessionDependencies = {},
): Promise<SessionStatus> {
  const wait = dependencies.pause ?? pause;
  let status = await probeSession(options, dependencies);

  for (const delay of recoveryDelaysMs) {
    if (status !== "unauthenticated") return status;
    await wait(delay, options.signal);
    throwIfAborted(options.signal);
    status = await probeSession(options, dependencies);
  }

  return status;
}
