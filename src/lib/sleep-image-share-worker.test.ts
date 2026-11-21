import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import test from "node:test";
import manifest from "../app/manifest";
import { POST } from "../app/share-sleep-report/route";
import {
  SLEEP_IMAGE_DB,
  SLEEP_IMAGE_STORE,
  SLEEP_IMAGE_LIMIT,
  SLEEP_IMAGE_TTL,
} from "./shared-sleep-image";

const source = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);
const origin = "https://journal.example";
function worker(unavailable = false) {
  const stored = new Map<
    string,
    { id: string; blob: Blob; receivedAt: number }
  >();
  const listeners = new Map<
    string,
    (event: {
      request: unknown;
      respondWith: (result: Promise<Response>) => void;
    }) => void
  >();
  let network = 0;
  let closed = 0;
  const context = {
    self: {
      location: { origin },
      addEventListener(
        name: string,
        handler: (event: {
          request: unknown;
          respondWith: (result: Promise<Response>) => void;
        }) => void,
      ) {
        listeners.set(name, handler);
      },
    },
    URL,
    Request,
    Response,
    Blob,
    Date,
    crypto: { randomUUID },
    indexedDB: {
      open(name: string) {
        assert.equal(name, SLEEP_IMAGE_DB);
        const request = {} as {
          result: unknown;
          onsuccess: () => void;
          onerror: () => void;
        };
        queueMicrotask(() => {
          if (unavailable) {
            request.onerror();
            return;
          }
          request.result = {
            transaction(storeName: string, mode: string) {
              assert.equal(storeName, SLEEP_IMAGE_STORE);
              assert.equal(mode, "readwrite");
              const tx = {
                oncomplete: () => {},
                objectStore: () => ({
                  getAll() {
                    const read = {
                      result: [...stored.values()],
                      onsuccess: () => {},
                    };
                    queueMicrotask(() => {
                      read.onsuccess();
                      queueMicrotask(() => tx.oncomplete());
                    });
                    return read;
                  },
                  delete(id: string) {
                    stored.delete(id);
                  },
                  put(value: { id: string; blob: Blob; receivedAt: number }) {
                    stored.set(value.id, value);
                  },
                }),
              };
              return tx;
            },
            close() {
              closed++;
            },
          };
          request.onsuccess();
        });
        return request;
      },
    },
    fetch() {
      network++;
      throw Error("Shared bytes must not reach fetch");
    },
  };
  runInNewContext(source, context);
  return {
    stored,
    get network() {
      return network;
    },
    get closed() {
      return closed;
    },
    receive(
      files: File[],
      options: {
        path?: string;
        type?: string;
        length?: string;
        mode?: string;
        origin?: string;
      } = {},
    ) {
      let response: Promise<Response> | undefined;
      listeners.get("fetch")!({
        request: {
          method: "POST",
          mode: options.mode ?? "navigate",
          url: `${options.origin ?? origin}${options.path ?? "/share-sleep-report"}`,
          headers: new Headers({
            "content-type":
              options.type ?? "multipart/form-data; boundary=test",
            ...(options.length ? { "content-length": options.length } : {}),
          }),
          formData: async () => ({
            getAll: (name: string) => {
              assert.equal(name, "sleep-report");
              return files;
            },
          }),
        },
        respondWith(result) {
          response = result;
        },
      });
      return response;
    },
  };
}
const image = () =>
  new File(["sleep image"], "night.png", { type: "image/png" });

test("an installed share target stores only locally and redirects with an opaque one-time token", async () => {
  const sw = worker();
  const response = await sw.receive([image()])!;
  assert.equal(response.status, 303);
  const redirect = new URL(response.headers.get("location")!);
  assert.equal(redirect.origin, origin);
  assert.equal(redirect.pathname, "/sleep-import");
  assert.ok(sw.stored.has(redirect.searchParams.get("token")!));
  assert.equal(sw.network, 0);
  assert.equal(sw.closed, 1);
});

test("malformed, oversized, empty and multiple shares cannot write the inbox", async () => {
  for (const [files, options] of [
    [[], {}],
    [[image(), image()], {}],
    [[new File(["html"], "x.html", { type: "text/html" })], {}],
    [[new File([], "empty.png", { type: "image/png" })], {}],
    [[image()], { type: "application/json" }],
    [[image()], { length: String(SLEEP_IMAGE_LIMIT + 65537) }],
  ] as const) {
    const sw = worker();
    const response = await sw.receive([...files], options)!;
    assert.equal(
      new URL(response.headers.get("location")!).searchParams.get("error"),
      "invalid",
    );
    assert.equal(sw.stored.size, 0);
    assert.equal(sw.network, 0);
  }
});

test("the share inbox expires old files and keeps at most three live records", async () => {
  const sw = worker();
  sw.stored.set("expired", {
    id: "expired",
    blob: image(),
    receivedAt: Date.now() - SLEEP_IMAGE_TTL - 1,
  });
  for (let index = 0; index < 4; index++)
    sw.stored.set(`live${index}`, {
      id: `live${index}`,
      blob: image(),
      receivedAt: Date.now() - (index + 1) * 1000,
    });
  await sw.receive([image()]);
  assert.equal(sw.stored.size, 3);
  assert.ok(!sw.stored.has("expired"));
  assert.ok(sw.stored.has("live0"));
  assert.ok(sw.stored.has("live1"));
  assert.equal(sw.closed, 1);
});

test("unavailable local storage gives an honest fallback without forwarding the image", async () => {
  const sw = worker(true);
  const response = await sw.receive([image()])!;
  assert.equal(
    new URL(response.headers.get("location")!).searchParams.get("error"),
    "unavailable",
  );
  assert.equal(sw.network, 0);
});

test("only the same-origin document share POST can enter the inbox", () => {
  const sw = worker();
  assert.equal(
    sw.receive([image()], { origin: "https://outside.example" }),
    undefined,
  );
  assert.equal(sw.receive([image()], { mode: "cors" }), undefined);
  assert.equal(sw.receive([image()], { path: "/api/intakes" }), undefined);
});

test("the manifest declares image shares and desktop file opening, while server fallback never reads a body", () => {
  const app = manifest();
  assert.equal(app.share_target?.action, "/share-sleep-report");
  assert.equal(app.share_target?.method, "POST");
  assert.equal(app.share_target?.enctype, "multipart/form-data");
  assert.equal(app.file_handlers?.[0].action, "/?open-sleep-report=1");
  const response = POST({
    url: origin + "/share-sleep-report",
    get body() {
      throw Error("must not read body");
    },
  } as unknown as Request);
  assert.equal(response.status, 303);
  assert.equal(
    new URL(response.headers.get("location")!).searchParams.get("error"),
    "unavailable",
  );
});
