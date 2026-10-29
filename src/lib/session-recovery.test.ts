import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { probeSession, recoverSession } from "./session-recovery";

function response(authenticated: unknown) {
  return Response.json({ authenticated });
}

function cancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

describe("session checks", () => {
  it("checks only the current cookie without caching or manually sending credentials", async () => {
    const fetcher = mock.fn<typeof fetch>(async (url, options) => {
      assert.equal(url, "/api/session");
      assert.equal(options?.method, "GET");
      assert.equal(options?.cache, "no-store");
      assert.equal(options?.credentials, "same-origin");
      assert.equal(options?.body, undefined);
      assert.equal(options?.headers, undefined);
      assert.ok(options?.signal instanceof AbortSignal);
      return response(true);
    });

    assert.equal(await probeSession({}, { fetcher }), "authenticated");
    assert.equal(fetcher.mock.callCount(), 1);
  });

  it("recognizes an explicit unauthenticated response", async () => {
    assert.equal(
      await probeSession({}, { fetcher: async () => response(false) }),
      "unauthenticated",
    );
  });

  it("never mistakes a network failure or unexpected status for logout", async () => {
    const offline: typeof fetch = async () => {
      throw new TypeError("Network unavailable");
    };
    assert.equal(await probeSession({}, { fetcher: offline }), "unavailable");

    for (const status of [201, 401, 403, 500, 503]) {
      assert.equal(
        await probeSession(
          {},
          {
            fetcher: async () =>
              Response.json({ authenticated: false }, { status }),
          },
        ),
        "unavailable",
        `HTTP ${status} must not confirm logout`,
      );
    }
  });

  it("requires valid JSON with a strictly boolean authentication field", async () => {
    for (const body of [
      null,
      {},
      [],
      "authenticated",
      { authenticated: "false" },
      { authenticated: 0 },
      { authenticated: null },
    ]) {
      assert.equal(
        await probeSession({}, { fetcher: async () => Response.json(body) }),
        "unavailable",
      );
    }
    assert.equal(
      await probeSession({}, { fetcher: async () => new Response("not JSON") }),
      "unavailable",
    );
  });

  it("bounds hung requests and aborts their fetch without logging out", async () => {
    let requestSignal: AbortSignal | undefined;
    const fetcher: typeof fetch = async (_, options) => {
      requestSignal = options?.signal ?? undefined;
      return new Promise<Response>(() => {});
    };

    assert.equal(
      await probeSession({}, { fetcher, timeoutMs: 5 }),
      "unavailable",
    );
    assert.equal(requestSignal?.aborted, true);
  });

  it("also bounds a response whose JSON body never finishes", async () => {
    const fetcher: typeof fetch = async () => {
      const result = response(true);
      result.json = () => new Promise(() => {});
      return result;
    };

    assert.equal(
      await probeSession({}, { fetcher, timeoutMs: 5 }),
      "unavailable",
    );
  });

  it("cancels an in-flight check and removes its abort listener", async () => {
    const controller = new AbortController();
    const removeListener = mock.method(
      controller.signal,
      "removeEventListener",
    );
    let requestSignal: AbortSignal | undefined;
    const fetcher: typeof fetch = async (_, options) => {
      requestSignal = options?.signal ?? undefined;
      controller.abort("Navigation changed");
      return new Promise<Response>(() => {});
    };

    await assert.rejects(
      probeSession({ signal: controller.signal }, { fetcher }),
      cancelled,
    );
    assert.equal(requestSignal?.aborted, true);
    assert.equal(removeListener.mock.callCount(), 1);
  });

  it("does not start a request if the caller already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = mock.fn<typeof fetch>(async () => response(true));

    await assert.rejects(
      probeSession({ signal: controller.signal }, { fetcher }),
      cancelled,
    );
    assert.equal(fetcher.mock.callCount(), 0);
  });

  it("removes the caller listener after a completed check", async () => {
    const controller = new AbortController();
    const removeListener = mock.method(
      controller.signal,
      "removeEventListener",
    );

    assert.equal(
      await probeSession(
        { signal: controller.signal },
        { fetcher: async () => response(true) },
      ),
      "authenticated",
    );
    assert.equal(removeListener.mock.callCount(), 1);
  });
});

describe("PWA session recovery", () => {
  it("stops immediately for a saved session or an unavailable server", async () => {
    for (const savedSession of [true, "offline"]) {
      const fetcher = mock.fn<typeof fetch>(async () => {
        if (savedSession === "offline") throw new TypeError("Offline");
        return response(savedSession);
      });
      const pause = mock.fn(async () => {});

      assert.equal(
        await recoverSession({}, { fetcher, pause }),
        savedSession === true ? "authenticated" : "unavailable",
      );
      assert.equal(fetcher.mock.callCount(), 1);
      assert.equal(pause.mock.callCount(), 0);
    }
  });

  it("allows exactly four cookie checks separated by a bounded startup delay", async () => {
    const events: (string | number)[] = [];
    const fetcher: typeof fetch = async () => {
      events.push("check");
      return response(false);
    };
    const pause = async (milliseconds: number) => {
      events.push(milliseconds);
    };

    assert.equal(
      await recoverSession({}, { fetcher, pause }),
      "unauthenticated",
    );
    assert.deepEqual(events, [
      "check",
      250,
      "check",
      750,
      "check",
      1500,
      "check",
    ]);
  });

  it("returns as soon as the restored cookie is available", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => response(++calls === 3);
    const delays: number[] = [];

    assert.equal(
      await recoverSession(
        {},
        {
          fetcher,
          pause: async (milliseconds) => {
            delays.push(milliseconds);
          },
        },
      ),
      "authenticated",
    );
    assert.equal(calls, 3);
    assert.deepEqual(delays, [250, 750]);
  });

  it("keeps an interrupted recovery unavailable rather than confirming logout", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      if (++calls === 2) throw new TypeError("Connection lost");
      return response(false);
    };
    const pause = mock.fn(async () => {});

    assert.equal(await recoverSession({}, { fetcher, pause }), "unavailable");
    assert.equal(calls, 2);
    assert.equal(pause.mock.callCount(), 1);
  });

  it("cancels between checks without another request", async () => {
    const controller = new AbortController();
    const fetcher = mock.fn<typeof fetch>(async () => response(false));
    const recovery = recoverSession({ signal: controller.signal }, { fetcher });
    // The first request resolves before the timer; cancellation reaches the
    // actual default pause instead of a test substitute.
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await assert.rejects(recovery, cancelled);
    assert.equal(fetcher.mock.callCount(), 1);
  });
});
