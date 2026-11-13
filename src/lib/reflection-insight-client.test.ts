import assert from "node:assert/strict";
import test from "node:test";
import { createReflectionInsightClient } from "./reflection-insight-client";
import type {
  ReflectionInsightRequest,
  ReflectionInsightResponse,
} from "./reflection-insights";

const input: ReflectionInsightRequest = {
  day: "2026-11-07",
  period: "morning",
  note: "An exact reflection source.",
};
const ready: ReflectionInsightResponse = {
  status: "ready",
  noteHash: "a".repeat(64),
  summary: "A quiet morning and time to think.",
  advice: [
    "Keep a little time for yourself.",
    "Write down what you want to keep.",
  ],
  generatedAt: "2026-11-07T09:00:00Z",
};

test("reopening unchanged words and simultaneous mounts share one request", async () => {
  let calls = 0;
  let finish!: (value: ReflectionInsightResponse) => void;
  const client = createReflectionInsightClient({
    send: async () => {
      calls++;
      return new Promise((resolve) => (finish = resolve));
    },
  });
  const first = client.request(input);
  const second = client.request(input);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish(ready);
  await first;
  assert.deepEqual((await client.request(input)).value, ready);
  assert.deepEqual(
    (await client.request({ ...input, retry: true })).value,
    ready,
  );
  assert.equal(calls, 1);
});

test("exact source, day, period and authenticated client remain independent", async () => {
  let calls = 0;
  const send = async () => {
    calls++;
    return ready;
  };
  const client = createReflectionInsightClient({ send });
  await client.request(input);
  await client.request({ ...input, note: input.note + " " });
  await client.request({ ...input, period: "evening" });
  await client.request({ ...input, day: "2026-11-06" });
  await createReflectionInsightClient({ send }).request(input);
  assert.equal(calls, 5);
  assert.deepEqual((await client.request(input)).value, ready);
  assert.equal(calls, 5);
});

test("network failure is remembered until an explicit retry after cooldown", async () => {
  let now = 0;
  let calls = 0;
  const client = createReflectionInsightClient({
    now: () => now,
    send: async () => {
      if (++calls === 1) throw new Error("offline");
      return ready;
    },
  });
  assert.equal((await client.request(input)).value.status, "unavailable");
  await client.request({ ...input, retry: true });
  assert.equal(calls, 1);
  now = 61_000;
  await client.request(input);
  assert.equal(calls, 1, "elapsed time/reopen alone does not retry");
  assert.equal(
    (await client.request({ ...input, retry: true })).value.status,
    "ready",
  );
  assert.equal(calls, 2);
});

test("pending responses permit status checks; unsaved conflicts are not cached", async () => {
  let calls = 0;
  const replies: ReflectionInsightResponse[] = [
    { status: "pending", noteHash: "b".repeat(64), retryAfterMs: 3000 },
    { status: "unavailable", reason: "save_first" },
    ready,
  ];
  const client = createReflectionInsightClient({
    send: async () => replies[calls++],
  });
  assert.equal((await client.request(input)).value.status, "pending");
  assert.equal((await client.request(input)).value.status, "unavailable");
  assert.equal((await client.request(input)).value.status, "ready");
  assert.equal(calls, 3);
});

test("missing provider configuration is cached but can be checked explicitly", async () => {
  let calls = 0;
  const client = createReflectionInsightClient({
    send: async () =>
      ++calls === 1
        ? { status: "unavailable", reason: "not_configured" }
        : ready,
  });
  await client.request(input);
  await client.request(input);
  assert.equal(calls, 1);
  assert.equal(
    (await client.request({ ...input, retry: true })).value.status,
    "ready",
  );
  assert.equal(calls, 2);
});
