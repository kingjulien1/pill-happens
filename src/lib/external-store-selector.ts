/** Reuse a selected snapshot when unrelated fields change in an external store. */
export function createSnapshotSelector<Snapshot, Selection>(
  select: (snapshot: Snapshot) => Selection,
  equal: (left: Selection, right: Selection) => boolean = Object.is,
) {
  let initialized = false;
  let previousSnapshot: Snapshot;
  let selected: Selection;
  return (snapshot: Snapshot): Selection => {
    if (initialized && Object.is(previousSnapshot, snapshot)) return selected;
    const next = select(snapshot);
    previousSnapshot = snapshot;
    if (!initialized || !equal(selected, next)) selected = next;
    initialized = true;
    return selected;
  };
}

export function shallowEqual<T extends object>(left: T, right: T): boolean {
  if (Object.is(left, right)) return true;
  const keys = Object.keys(left) as (keyof T)[];
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]),
    )
  );
}
