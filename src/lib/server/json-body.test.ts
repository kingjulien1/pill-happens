import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_REFLECTION_MAX_LENGTH } from "@/lib/daily-check-in";
import { ApiError } from "./api-error";
import { JSON_BODY_LIMITS, jsonBody } from "./json-body";
import { dailyCheckInSchema } from "./validation";

function request(
  body: string,
  declaredLength?: string,
  contentType = "application/json",
) {
  const headers = new Headers({ "content-type": contentType });
  if (declaredLength !== undefined)
    headers.set("content-length", declaredLength);
  return new Request("https://journal.example.test/api/synthetic", {
    method: "POST",
    headers,
    body,
  });
}

function bodyAtBytes(bytes: number) {
  const overhead = Buffer.byteLength(JSON.stringify({ note: "" }), "utf8");
  return JSON.stringify({ note: "x".repeat(bytes - overhead) });
}

const status = (expected: number) => (error: unknown) =>
  error instanceof ApiError && error.status === expected;

test("the default JSON byte cap stays at 16 KiB and accepts its exact boundary", async () => {
  assert.equal(JSON_BODY_LIMITS.default, 16_384);
  const body = bodyAtBytes(16_384);
  for (const declared of [undefined, "16384"]) {
    assert.deepEqual(await jsonBody(request(body, declared)), JSON.parse(body));
  }
});

test("actual UTF-8 bytes enforce the default limit even without an honest Content-Length", async () => {
  const body = bodyAtBytes(16_385);
  for (const declared of [undefined, "0", "10", "16384", "not-a-number"]) {
    await assert.rejects(jsonBody(request(body, declared)), status(413));
  }
  const multibyte = JSON.stringify({ note: "静".repeat(8_000) });
  assert.ok(multibyte.length < 16_384);
  assert.ok(Buffer.byteLength(multibyte, "utf8") > 16_384);
  await assert.rejects(jsonBody(request(multibyte)), status(413));
});

test("oversized declared bodies are rejected before they are consumed", async () => {
  for (const maxBytes of [
    JSON_BODY_LIMITS.default,
    JSON_BODY_LIMITS.dailyCheckIn,
  ]) {
    const input = request("{}", String(maxBytes + 1));
    await assert.rejects(jsonBody(input, { maxBytes }), status(413));
    assert.equal(input.bodyUsed, false);
  }
});

test("the check-in override accepts exactly 64 KiB but rejects a byte more", async () => {
  const maxBytes = JSON_BODY_LIMITS.dailyCheckIn;
  assert.equal(maxBytes, 65_536);
  const atLimit = bodyAtBytes(maxBytes);
  for (const declared of [undefined, String(maxBytes)]) {
    assert.deepEqual(
      await jsonBody(request(atLimit, declared), { maxBytes }),
      JSON.parse(atLimit),
    );
  }
  await assert.rejects(jsonBody(request(atLimit)), status(413));
  for (const declared of [undefined, "1", String(maxBytes)]) {
    await assert.rejects(
      jsonBody(request(bodyAtBytes(maxBytes + 1), declared), { maxBytes }),
      status(413),
    );
  }
});

test("full-length multilingual reflections survive transport and schema validation", async () => {
  const paragraph = "今日の気持ち・오늘하루・مرحبا\n\n";
  const note =
    paragraph
      .repeat(Math.ceil(DAILY_REFLECTION_MAX_LENGTH / paragraph.length))
      .slice(0, DAILY_REFLECTION_MAX_LENGTH - 1) + "終";
  assert.equal(note.length, 8_000);
  const body = JSON.stringify({
    day: "2026-10-30",
    note,
    helped: "Fresh air.",
  });
  assert.ok(Buffer.byteLength(body, "utf8") > JSON_BODY_LIMITS.default);
  const parsed = await jsonBody(request(body), {
    maxBytes: JSON_BODY_LIMITS.dailyCheckIn,
  });
  assert.equal(dailyCheckInSchema.parse(parsed).note, note);
});

test("full-length Unicode-escaped reflections retain newlines, quotes and backslashes", async () => {
  const suffix = '\n"\\\t終';
  const note =
    "静".repeat(DAILY_REFLECTION_MAX_LENGTH - suffix.length) + suffix;
  const body = JSON.stringify({
    day: "2026-10-30",
    note,
    helped: "静".repeat(160),
  }).replace(
    /[^\u0000-\u007f]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  assert.equal(note.length, 8_000);
  const bytes = Buffer.byteLength(body, "utf8");
  assert.ok(
    bytes > JSON_BODY_LIMITS.default && bytes < JSON_BODY_LIMITS.dailyCheckIn,
  );
  const parsed = await jsonBody(request(body, String(bytes)), {
    maxBytes: JSON_BODY_LIMITS.dailyCheckIn,
  });
  assert.equal(dailyCheckInSchema.parse(parsed).note, note);
  await assert.rejects(jsonBody(request(body)), status(413));
});

test("JSON media-type and malformed-body errors retain their API statuses", async () => {
  await assert.rejects(
    jsonBody(request("{}", undefined, "text/plain")),
    status(415),
  );
  await assert.rejects(jsonBody(request("{")), status(400));
  assert.deepEqual(
    await jsonBody(request("{}", undefined, "application/json; charset=utf-8")),
    {},
  );
});
