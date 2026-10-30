export const BRAND_REFRESH_THRESHOLD = 96;
export const BRAND_REFRESH_SLOP = 8;
export const BRAND_REFRESH_MARKER = "pill-happens:page-refresh";
export const BRAND_REFRESH_MARKER_TTL = 60_000;

/** Resist the pull so the handle stays within the header's existing gap. */
export function brandPullOffset(distance: number) {
  return 84 * (1 - Math.exp(-Math.max(0, distance) / 120));
}

export function isBrandRefreshPull(x: number, y: number) {
  return y >= BRAND_REFRESH_THRESHOLD && y > Math.abs(x) * 1.5;
}

/** The marker contains timing and route metadata only, never journal data. */
export function isRecentBrandRefresh(
  marker: string | null,
  path: string,
  now: number,
) {
  if (!marker) return false;
  try {
    const value: unknown = JSON.parse(marker);
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return (
      record.path === path &&
      typeof record.at === "number" &&
      Number.isFinite(record.at) &&
      record.at <= now &&
      now - record.at < BRAND_REFRESH_MARKER_TTL
    );
  } catch {
    return false;
  }
}
