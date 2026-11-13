export type IntakeStackControllerSnapshot = {
  groupCount: number;
  openCount: number;
  allOpen: boolean;
  /** Live list IDs for the bulk control's aria-controls. */
  controls: string;
};

type GroupControl = {
  id: string;
  controls: string;
  open: boolean;
  changeOpen: (open: boolean) => void;
};

const EMPTY_SNAPSHOT: IntakeStackControllerSnapshot = {
  groupCount: 0,
  openCount: 0,
  allOpen: false,
  controls: "",
};

/** A live registry of disclosures, never a saved or inherited bulk override. */
export function createIntakeStackController() {
  const groups = new Map<string, GroupControl>();
  const listeners = new Set<() => void>();
  let snapshot = EMPTY_SNAPSHOT;
  let intent = 0;

  const publish = () => {
    const groupCount = groups.size;
    const openCount = [...groups.values()].filter((group) => group.open).length;
    const controls = [...groups.values()]
      .map((group) => group.controls)
      .join(" ");
    if (
      snapshot.groupCount === groupCount &&
      snapshot.openCount === openCount &&
      snapshot.controls === controls
    )
      return;
    snapshot = {
      groupCount,
      openCount,
      allOpen: groupCount > 0 && openCount === groupCount,
      controls,
    };
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    register(control: GroupControl) {
      const registration = { ...control };
      groups.set(control.id, registration);
      publish();
      return () => {
        if (groups.get(control.id) !== registration) return;
        groups.delete(control.id);
        publish();
      };
    },
    setOpen(id: string, open: boolean) {
      const group = groups.get(id);
      if (!group || group.open === open) return;
      intent += 1;
      group.open = open;
      publish();
    },
    toggleAll() {
      if (!groups.size) return;
      const showing = [...groups.values()].some((group) => !group.open);
      const changed = [...groups.values()].filter(
        (group) => group.open !== showing,
      );
      const serial = ++intent;
      // Publish the final intent before callbacks, allowing immediate reversals.
      for (const group of changed) group.open = showing;
      publish();
      for (const group of changed) {
        if (serial !== intent) return;
        if (groups.get(group.id) === group) group.changeOpen(showing);
      }
    },
  };
}

export type IntakeStackController = ReturnType<
  typeof createIntakeStackController
>;
