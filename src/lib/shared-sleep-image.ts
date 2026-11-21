/** Local-only, short-lived handoff between the PWA worker and the report reader. */
export const SLEEP_IMAGE_DB = "pill-happens-sleep-image-inbox-v1";
export const SLEEP_IMAGE_STORE = "images";
export const SLEEP_IMAGE_TTL = 30 * 60 * 1_000;
export const SLEEP_IMAGE_LIMIT = 20 * 1024 * 1024;
export const SLEEP_IMAGE_RESUME_KEY = "pill-happens:sleep-image-resume:v1";
const TOKEN =
  /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const IMAGE = /^image\/(?:png|jpeg|webp|gif|avif|heic|heif|bmp)$/i;

export type PendingSleepImage = { id: string; file: File };
let pending: PendingSleepImage | null = null;
const listeners = new Set<() => void>();
export const subscribeSleepImage = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getPendingSleepImage = () => pending;
export const getServerSleepImage = () => null;
export const isSleepImageToken = (token: string) => TOKEN.test(token);

export function sleepImageProblem(file: Pick<Blob, "size" | "type">) {
  if (!IMAGE.test(file.type))
    return "Choose a PNG, JPEG or another supported image.";
  if (file.size <= 0) return "This image is empty. Try choosing it again.";
  if (file.size > SLEEP_IMAGE_LIMIT)
    return "Choose an image smaller than 20 MB.";
  return null;
}

export function stageSleepImage(file: File) {
  const problem = sleepImageProblem(file);
  if (problem) throw new Error(problem);
  pending = { id: crypto.randomUUID(), file };
  listeners.forEach((listener) => listener());
  return pending;
}

export function acknowledgeSleepImage(id: string) {
  if (pending?.id !== id) return;
  pending = null;
  listeners.forEach((listener) => listener());
}

export function rememberSleepImage(token: string) {
  if (
    !isSleepImageToken(token) &&
    token !== "unavailable" &&
    token !== "invalid"
  )
    return;
  try {
    sessionStorage.setItem(SLEEP_IMAGE_RESUME_KEY, token);
  } catch {
    /* URL remains the fallback. */
  }
}

export function rememberedSleepImage() {
  try {
    return sessionStorage.getItem(SLEEP_IMAGE_RESUME_KEY);
  } catch {
    return null;
  }
}

export function clearRememberedSleepImage() {
  try {
    sessionStorage.removeItem(SLEEP_IMAGE_RESUME_KEY);
  } catch {
    /* No stored resume token. */
  }
}

/** The read and delete share a transaction so two tabs cannot import one file twice. */
export async function takeSharedSleepImage(
  token: string,
): Promise<File | null> {
  if (!isSleepImageToken(token)) return null;
  if (typeof indexedDB === "undefined")
    throw new Error(
      "Local image storage is unavailable. Choose the image again.",
    );
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(SLEEP_IMAGE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SLEEP_IMAGE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      resolve(request.result);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };
    request.onerror = () =>
      fail("Local image storage is unavailable. Choose the image again.");
    request.onblocked = () =>
      fail("Close other app tabs and try choosing the image again.");
  });
  try {
    return await new Promise<File | null>((resolve, reject) => {
      const tx = database.transaction(SLEEP_IMAGE_STORE, "readwrite");
      const store = tx.objectStore(SLEEP_IMAGE_STORE);
      const request = store.get(token);
      let file: File | null = null;
      request.onsuccess = () => {
        const record = request.result;
        store.delete(token);
        if (
          record &&
          record.blob instanceof Blob &&
          Number.isFinite(record.receivedAt) &&
          record.receivedAt <= Date.now() &&
          Date.now() - record.receivedAt < SLEEP_IMAGE_TTL &&
          !sleepImageProblem(record.blob)
        ) {
          file = new File(
            [record.blob],
            typeof record.name === "string"
              ? record.name.slice(0, 200)
              : "sleep-report.png",
            { type: record.blob.type },
          );
        }
      };
      tx.oncomplete = () => resolve(file);
      tx.onerror = tx.onabort = () =>
        reject(new Error("Couldn’t open this shared image. Choose it again."));
    });
  } finally {
    database.close();
  }
}
