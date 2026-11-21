import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeSleepImage,
  getPendingSleepImage,
  isSleepImageToken,
  sleepImageProblem,
  stageSleepImage,
  subscribeSleepImage,
  SLEEP_IMAGE_LIMIT,
} from "./shared-sleep-image";

test("shared images accept supported nonempty raster files and enforce the OCR size bound", () => {
  for (const type of [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/heic",
    "image/heif",
    "image/bmp",
  ])
    assert.equal(sleepImageProblem({ type, size: 10 }), null);
  assert.match(
    sleepImageProblem({ type: "image/svg+xml", size: 10 })!,
    /supported image/,
  );
  assert.match(
    sleepImageProblem({ type: "text/html", size: 10 })!,
    /supported image/,
  );
  assert.match(sleepImageProblem({ type: "image/png", size: 0 })!, /empty/);
  assert.equal(
    sleepImageProblem({ type: "image/png", size: SLEEP_IMAGE_LIMIT }),
    null,
  );
  assert.match(
    sleepImageProblem({ type: "image/png", size: SLEEP_IMAGE_LIMIT + 1 })!,
    /20 MB/,
  );
});

test("incoming images stay in memory until their exact consumer acknowledges them", () => {
  let changes = 0;
  const stop = subscribeSleepImage(() => {
    changes++;
  });
  const first = stageSleepImage(
    new File(["first"], "sleep.png", { type: "image/png" }),
  );
  assert.equal(getPendingSleepImage(), first);
  assert.ok(isSleepImageToken(first.id));
  const next = stageSleepImage(
    new File(["second"], "sleep.jpg", { type: "image/jpeg" }),
  );
  acknowledgeSleepImage(first.id);
  assert.equal(getPendingSleepImage(), next);
  acknowledgeSleepImage(next.id);
  assert.equal(getPendingSleepImage(), null);
  assert.equal(changes, 3);
  stop();
});

test("invalid incoming files cannot replace the pending image", () => {
  const image = stageSleepImage(
    new File(["valid"], "sleep.png", { type: "image/png" }),
  );
  assert.throws(
    () =>
      stageSleepImage(new File(["html"], "bad.html", { type: "text/html" })),
    /supported image/,
  );
  assert.equal(getPendingSleepImage(), image);
  acknowledgeSleepImage(image.id);
});

test("only opaque UUID tokens can reach the local inbox", () => {
  assert.ok(isSleepImageToken("15cac2d5-2c21-48c6-95dd-8195fdcab12b"));
  for (const token of [
    "",
    "../../api/state",
    "https://outside.example",
    "invalid",
    "15cac2d5-2c21-18c6-95dd-8195fdcab12b",
  ])
    assert.equal(isSleepImageToken(token), false);
});

test("missing IndexedDB reports a useful retry instead of throwing a browser global error", async () => {
  const { takeSharedSleepImage } = await import("./shared-sleep-image");
  const original = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: undefined,
  });
  try {
    await assert.rejects(
      takeSharedSleepImage("15cac2d5-2c21-48c6-95dd-8195fdcab12b"),
      /Local image storage/,
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "indexedDB", original);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});

test("a blocked database that later opens is closed after its caller has already received the error", async () => {
  const { takeSharedSleepImage } = await import("./shared-sleep-image");
  const original = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  let closed = 0;
  const request = {
    onblocked: () => {},
    onsuccess: () => {},
    result: {
      close() {
        closed++;
      },
    },
  };
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: { open: () => request },
  });
  try {
    const pending = takeSharedSleepImage(
      "15cac2d5-2c21-48c6-95dd-8195fdcab12b",
    );
    request.onblocked();
    await assert.rejects(pending, /Close other app tabs/);
    request.onsuccess();
    assert.equal(closed, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, "indexedDB", original);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});
