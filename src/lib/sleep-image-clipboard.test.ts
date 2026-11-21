import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pastedSleepImage,
  readSleepImageClipboard,
} from "./sleep-image-clipboard";

test("paste selects actual image attachments and ignores text, URLs and HTML", () => {
  const image = new File(["image"], "report.png", { type: "image/png" });
  const text = new File(["text"], "report.txt", { type: "text/plain" });
  const transfer = {
    items: [
      { kind: "string", type: "text/html", getAsFile: () => null },
      { kind: "file", type: "text/plain", getAsFile: () => text },
      { kind: "file", type: "image/png", getAsFile: () => image },
    ] as unknown as DataTransferItemList,
    files: [text, image] as unknown as FileList,
  };
  assert.equal(pastedSleepImage(transfer), image);
  assert.equal(
    pastedSleepImage({
      items: [] as unknown as DataTransferItemList,
      files: [image] as unknown as FileList,
    }),
    image,
  );
  assert.equal(
    pastedSleepImage({
      items: [] as unknown as DataTransferItemList,
      files: [text] as unknown as FileList,
    }),
    null,
  );
  assert.equal(pastedSleepImage(null), null);
});

test("clipboard read starts synchronously in the gesture and selects image representation", async () => {
  let started = false;
  const result = readSleepImageClipboard(() => {
    started = true;
    return Promise.resolve([
      { types: ["text/plain"], getType: async () => new Blob(["text"]) },
      {
        types: ["text/html", "image/png"],
        getType: async (type: string) => new Blob(["image"], { type }),
      },
    ]);
  });
  assert.equal(started, true);
  const file = await result;
  assert.equal(file?.type, "image/png");
  assert.equal(await file?.text(), "image");
});

test("empty/text clipboards return no image and denied clipboard access propagates", async () => {
  assert.equal(await readSleepImageClipboard(async () => []), null);
  assert.equal(
    await readSleepImageClipboard(async () => [
      { types: ["text/plain"], getType: async () => new Blob() },
    ]),
    null,
  );
  await assert.rejects(
    readSleepImageClipboard(async () => {
      throw new Error("Denied");
    }),
    /Denied/,
  );
});

test("clipboard prefers the lossless PNG representation when several images are offered", async () => {
  let chosen = "";
  await readSleepImageClipboard(async () => [
    {
      types: ["image/tiff", "image/png"],
      getType: async (type: string) => {
        chosen = type;
        return new Blob(["image"], { type });
      },
    },
  ]);
  assert.equal(chosen, "image/png");
});
