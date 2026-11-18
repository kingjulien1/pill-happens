export type GuideOutlineEntry = {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  parentId: string | null;
};

/** Stable, readable guide fragments; independent of rendering order and React IDs. */
export function guideHeadingId(page: string, label: string) {
  const slug = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${page}-${slug || "section"}`;
}

/** A missing intermediate tier attaches to the nearest actual heading. */
export function guideOutlineEntries(
  headings: ReadonlyArray<{ id: string; label: string; level: number }>,
): GuideOutlineEntry[] {
  const result: GuideOutlineEntry[] = [];
  const parents: Array<{ entry: GuideOutlineEntry; sourceLevel: number }> = [];
  const seen = new Set<string>();
  for (const heading of headings) {
    const label = heading.label.replace(/\s+/g, " ").trim();
    if (!heading.id || !label || seen.has(heading.id)) continue;
    seen.add(heading.id);
    const requested = Number.isFinite(heading.level)
      ? Math.max(1, Math.min(3, Math.round(heading.level)))
      : 1;
    while (parents.length && parents.at(-1)!.sourceLevel >= requested)
      parents.pop();
    const parent = parents.at(-1)?.entry;
    const entry: GuideOutlineEntry = {
      id: heading.id,
      label,
      level: Math.min(3, (parent?.level ?? 0) + 1) as 1 | 2 | 3,
      parentId: parent?.id ?? null,
    };
    result.push(entry);
    parents.push({ entry, sourceLevel: requested });
  }
  return result;
}

/** Search heading paths while keeping the parents needed to understand a result. */
export function searchGuideOutline(
  entries: readonly GuideOutlineEntry[],
  query: string,
): GuideOutlineEntry[] {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...entries];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const retained = new Set<string>();
  for (const entry of entries) {
    const path: GuideOutlineEntry[] = [];
    const visited = new Set<string>();
    let current: GuideOutlineEntry | undefined = entry;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.push(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    const text = normalize(path.map((item) => item.label).join(" "));
    if (terms.every((term) => text.includes(term)))
      for (const item of path) retained.add(item.id);
  }
  return entries.filter((entry) => retained.has(entry.id));
}
