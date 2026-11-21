/** History is immutable after each server response; one scan serves every selector. */
export type IntakeHistorySource = readonly {
  medicationId: string;
  quantity?: number;
  route?: string;
  takenAt?: string;
}[];
export type HistoryUsage = { count: number; latest: number };
type HistoryIndex = {
  counts: Map<string, number>;
  routes: Map<string, Map<string, HistoryUsage>>;
  allRoutes: Map<string, HistoryUsage>;
  quantities: Map<string, Map<number, HistoryUsage>>;
};
const indexes = new WeakMap<IntakeHistorySource, HistoryIndex>();
function increment<K>(map: Map<K, HistoryUsage>, key: K, latest: number) {
  const previous = map.get(key);
  map.set(key, {
    count: (previous?.count ?? 0) + 1,
    latest: Math.max(previous?.latest ?? -Infinity, latest),
  });
}
export function intakeHistoryIndex(entries: IntakeHistorySource): HistoryIndex {
  const cached = indexes.get(entries);
  if (cached) return cached;
  const result: HistoryIndex = {
    counts: new Map(),
    routes: new Map(),
    allRoutes: new Map(),
    quantities: new Map(),
  };
  for (const entry of entries) {
    result.counts.set(
      entry.medicationId,
      (result.counts.get(entry.medicationId) ?? 0) + 1,
    );
    const parsed = entry.takenAt ? Date.parse(entry.takenAt) : NaN;
    const latest = Number.isFinite(parsed) ? parsed : -Infinity;
    if (entry.route) {
      let routes = result.routes.get(entry.medicationId);
      if (!routes) result.routes.set(entry.medicationId, (routes = new Map()));
      increment(routes, entry.route, latest);
      increment(result.allRoutes, entry.route, latest);
    }
    if (typeof entry.quantity === "number" && Number.isFinite(entry.quantity)) {
      let quantities = result.quantities.get(entry.medicationId);
      if (!quantities)
        result.quantities.set(entry.medicationId, (quantities = new Map()));
      increment(
        quantities,
        entry.quantity,
        Math.max(0, Number.isFinite(parsed) ? parsed : 0),
      );
    }
  }
  indexes.set(entries, result);
  return result;
}
