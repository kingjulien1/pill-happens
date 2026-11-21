/** Extract only actual image files; never fetch clipboard URLs or pasted HTML. */
export function pastedSleepImage(
  transfer: Pick<DataTransfer, "items" | "files"> | null,
): File | null {
  if (!transfer) return null;
  for (const item of Array.from(transfer.items)) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return (
    Array.from(transfer.files).find((file) => file.type.startsWith("image/")) ??
    null
  );
}

/** Keep normal text/Markdown pasting in editable fields completely native. */
export function isSleepImagePasteTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'input, textarea, [contenteditable]:not([contenteditable="false"])',
      ),
    )
  );
}

export async function readSleepImageClipboard(
  read: () => Promise<readonly Pick<ClipboardItem, "types" | "getType">[]>,
): Promise<File | null> {
  // Invoke read immediately inside the user's click. Safari requires activation;
  // do not await permissions queries or another dynamic import beforehand.
  const items = await read();
  for (const item of items) {
    const type = item.types.includes("image/png")
      ? "image/png"
      : item.types.find((candidate) => candidate.startsWith("image/"));
    if (!type) continue;
    const blob = await item.getType(type);
    return new File([blob], "sleep-report", { type: blob.type || type });
  }
  return null;
}
