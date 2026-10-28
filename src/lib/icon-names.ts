/** Normalize search text without altering stored IDs, labels, or emoji. */
export function normalizeIconQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** A component-style alias for a slug or readable label, including numeric parts. */
export function toIconComponentName(value: string): string {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/** Only tablet artwork slugs use dose suffixes; ordinary icon numbers stay names. */
export function tabletIconLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) =>
      /^\d+(?:\.\d+)?$/.test(word)
        ? `${word}mg`
        : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * Index readable and component forms separately. Compact identities allow a
 * pasted PascalCase name or a dose label without spaces to match the same icon.
 * Keywords keep word boundaries rather than concatenating unrelated aliases.
 */
export function iconSearchText(
  identities: readonly string[],
  keywords: readonly string[] = [],
): string {
  return [
    ...identities.flatMap((identity) => {
      const normalized = normalizeIconQuery(identity);
      return [normalized, normalized.replaceAll(" ", "")];
    }),
    ...keywords.map(normalizeIconQuery),
  ].join(" ");
}
