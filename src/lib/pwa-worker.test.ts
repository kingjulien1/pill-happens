import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import manifest from "../app/manifest";

const source = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);
const origin = "https://journal.example";

function worker() {
  type Event = {
    request?: { url: string; method: string; mode: string };
    data?: unknown;
    waitUntil?: (work: Promise<unknown>) => void;
    respondWith?: (response: Promise<Response>) => void;
  };
  const listeners = new Map<string, (event: Event) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const added: Request[] = [];
  const deleted: string[] = [];
  let claimed = 0;
  let skipped = 0;
  let fetches = 0;
  let puts = 0;
  let network: (request: unknown) => Promise<Response> = async () =>
    new Response("private journal");
  const cache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name)!;
    return {
      async addAll(requests: Request[]) {
        for (const request of requests) {
          added.push(request);
          entries.set(request.url, new Response("public offline page"));
        }
      },
      async match(path: string) {
        return entries.get(new URL(path, origin).href)?.clone();
      },
      async put() {
        puts++;
      },
    };
  };
  runInNewContext(source, {
    self: {
      location: { origin },
      addEventListener(type: string, listener: (event: Event) => void) {
        listeners.set(type, listener);
      },
      clients: {
        async claim() {
          claimed++;
        },
      },
      async skipWaiting() {
        skipped++;
      },
    },
    caches: {
      async open(name: string) {
        return cache(name);
      },
      async keys() {
        return Array.from(stores.keys());
      },
      async delete(name: string) {
        deleted.push(name);
        return stores.delete(name);
      },
    },
    async fetch(request: unknown) {
      fetches++;
      return network(request);
    },
    URL,
    Request,
    Response,
  });
  return {
    added,
    deleted,
    stores,
    get fetches() {
      return fetches;
    },
    get puts() {
      return puts;
    },
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
    setNetwork(value: typeof network) {
      network = value;
    },
    async lifecycle(type: string, data?: unknown) {
      const work: Promise<unknown>[] = [];
      listeners.get(type)!({ data, waitUntil: (value) => work.push(value) });
      await Promise.all(work);
    },
    request(path: string, method = "GET", mode = "navigate") {
      let response: Promise<Response> | undefined;
      listeners.get("fetch")!({
        request: { url: new URL(path, origin).href, method, mode },
        respondWith: (value) => {
          response = value;
        },
      });
      return response;
    },
  };
}

test("installation caches only the neutral offline page and public icons without credentials", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.deepEqual(
    sw.added.map((request) => new URL(request.url).pathname),
    [
      "/offline.html",
      "/icons/app/icon-192.png",
      "/icons/app/icon-512.png",
      "/icons/app/icon-maskable-512.png",
      "/icons/app/apple-touch-icon.png",
    ],
  );
  for (const request of sw.added) {
    assert.equal(request.credentials, "omit");
    assert.equal(request.cache, "reload");
  }
  assert.equal(sw.skipped, 0);
});

test("private navigations always use the network and are never written to Cache Storage", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  for (const path of ["/", "/medications", "/history/2026-10-28", "/login"]) {
    const response = await sw.request(path);
    assert.equal(await response!.text(), "private journal");
  }
  assert.equal(sw.fetches, 4);
  assert.equal(sw.puts, 0);
  assert.ok(
    sw.added.every(
      (request) => !new URL(request.url).pathname.startsWith("/api"),
    ),
  );
});

test("failed page navigations get a neutral fallback while HTTP errors stay visible", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  sw.setNetwork(async () => {
    throw new TypeError("offline");
  });
  assert.equal(
    await (await sw.request("/goals"))!.text(),
    "public offline page",
  );
  sw.setNetwork(async () => new Response("server error", { status: 503 }));
  const error = await sw.request("/goals");
  assert.equal(error!.status, 503);
  assert.equal(await error!.text(), "server error");
  assert.equal(sw.puts, 0);
});

test("API writes, exports, RSC requests, assets, and other origins are never intercepted", () => {
  const sw = worker();
  for (const [path, method, mode] of [
    ["/api/state", "GET", "cors"],
    ["/api/export", "GET", "navigate"],
    ["/api", "GET", "navigate"],
    ["/api/intakes", "POST", "cors"],
    ["/api/login", "POST", "cors"],
    ["/medications?_rsc=example", "GET", "cors"],
    ["/_next/static/chunk.js", "GET", "cors"],
    ["/icon.svg", "GET", "cors"],
    ["https://other.example/page", "GET", "navigate"],
  ]) {
    assert.equal(sw.request(path, method, mode), undefined, path);
  }
  assert.equal(sw.fetches, 0);
  assert.equal(sw.puts, 0);
});

test("evicted public storage still returns an honest unavailable response", async () => {
  const sw = worker();
  sw.setNetwork(async () => {
    throw new TypeError("offline");
  });
  const response = await sw.request("/");
  assert.equal(response!.status, 503);
  assert.equal(response!.headers.get("Cache-Control"), "no-store");
  assert.match(await response!.text(), /offline/);
});

test("activation cleans only old app public caches and updates require an explicit message", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  sw.stores.set("pill-happens-public-old", new Map());
  sw.stores.set("another-app-cache", new Map());
  await sw.lifecycle("activate");
  assert.deepEqual(sw.deleted, ["pill-happens-public-old"]);
  assert.equal(sw.stores.has("another-app-cache"), true);
  assert.equal(sw.stores.has("pill-happens-public-v1"), true);
  assert.equal(sw.claimed, 1);
  assert.equal(sw.skipped, 0);
  await sw.lifecycle("message", { type: "UNRELATED" });
  assert.equal(sw.skipped, 0);
  await sw.lifecycle("message", { type: "SKIP_WAITING" });
  assert.equal(sw.skipped, 1);
});

test("the install manifest has stable scope, standalone mode, and correctly sized raster icons", () => {
  const app = manifest();
  assert.equal(app.id, "/");
  assert.equal(app.scope, "/");
  assert.equal(app.start_url, "/");
  assert.equal(app.display, "standalone");
  assert.equal(app.prefer_related_applications, false);
  const rasterIcons = app.icons!.filter((icon) => icon.type === "image/png");
  assert.ok(
    rasterIcons.some(
      (icon) => icon.sizes === "192x192" && icon.purpose === "any",
    ),
  );
  assert.ok(
    rasterIcons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "any",
    ),
  );
  assert.ok(
    rasterIcons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  );
  for (const [src, size] of [
    ...rasterIcons.map(
      (icon) => [icon.src, Number(icon.sizes!.split("x")[0])] as const,
    ),
    ["/icons/app/apple-touch-icon.png", 180] as const,
  ]) {
    const png = readFileSync(new URL(`../../public${src}`, import.meta.url));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
