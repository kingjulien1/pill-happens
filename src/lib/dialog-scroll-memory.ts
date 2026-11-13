import { safeWorkspacePath } from "@/lib/journal-drafts";

export type DialogScrollPosition = { top: number; left: number };
export type PublicDialogScrollKey = "create-journal" | "install-app";
const storageKey = "pill-happens:public-dialog-scroll:v1";
const maxPosition = 10_000_000;
const publicKeys = new Set<PublicDialogScrollKey>([
  "create-journal",
  "install-app",
]);

export function clampDialogScroll(
  position: DialogScrollPosition,
  extent: { height: number; width: number },
): DialogScrollPosition {
  return {
    top: Math.max(0, Math.min(position.top, Math.max(0, extent.height))),
    left: Math.max(0, Math.min(position.left, Math.max(0, extent.width))),
  };
}
function validPosition(value: unknown): value is DialogScrollPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as DialogScrollPosition;
  return [position.top, position.left].every(
    (coordinate) =>
      typeof coordinate === "number" &&
      Number.isFinite(coordinate) &&
      coordinate >= 0 &&
      coordinate <= maxPosition,
  );
}
function safeKey(path: string, key: PublicDialogScrollKey) {
  return (path === "/login" || safeWorkspacePath(path)) && publicKeys.has(key)
    ? `${path}|${key}`
    : null;
}

type ScrollStorage = Pick<Storage, "getItem" | "setItem"> | null;
function readPublicPositions(storage: ScrollStorage) {
  const positions: Record<string, DialogScrollPosition> = {};
  try {
    const raw = storage?.getItem(storageKey);
    if (raw && raw.length <= 16_384) {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, position] of Object.entries(value)) {
          const [path, identity, extra] = key.split("|");
          if (
            !extra &&
            safeKey(path, identity as PublicDialogScrollKey) === key &&
            validPosition(position)
          )
            positions[key] = { top: position.top, left: position.left };
        }
      }
    }
  } catch {
    // Numeric memory still works for this mounted public dialog.
  }
  return Object.fromEntries(Object.entries(positions).slice(-64));
}

/** Public dialogs save numeric positions only, under explicit fixed identities. */
export function createPublicDialogScrollMemory(storage: ScrollStorage) {
  let positions = readPublicPositions(storage);
  return {
    get(path: string, key: PublicDialogScrollKey) {
      const identity = safeKey(path, key);
      return identity ? positions[identity] : undefined;
    },
    set(
      path: string,
      key: PublicDialogScrollKey,
      position: DialogScrollPosition,
    ) {
      const identity = safeKey(path, key);
      if (!identity || !validPosition(position)) return;
      // Login and install dialogs can coexist outside the journal provider.
      // Merge their latest numeric records instead of replacing another writer.
      positions = { ...positions, ...readPublicPositions(storage) };
      delete positions[identity];
      positions[identity] = { top: position.top, left: position.left };
      positions = Object.fromEntries(Object.entries(positions).slice(-64));
      try {
        storage?.setItem(storageKey, JSON.stringify(positions));
      } catch {
        // No credentials, field values or content enter this public namespace.
      }
    },
  };
}
