type StackEntry = { id: string };

export type IntakeStackView = {
  /** The first entry is the only head; this field retains saved-view compatibility. */
  heads: readonly string[];
  /** The root ID is present when the complete group is expanded. */
  expanded: readonly string[];
};

export type IntakeStackStage = "idle" | "open" | "close";

export type IntakeStackFace = {
  id: string;
  order: number;
  headId: string;
  depth: number;
  head: boolean;
  expanded: boolean;
  hidden: boolean;
  y: number;
  scale: number;
  height: number;
  delay: number;
  layer: number;
};

export const INTAKE_STACK_MOVE_MS = 420;
export const INTAKE_STACK_PREVIEW_LIMIT = 6;
export const EMPTY_INTAKE_STACK_VIEW: IntakeStackView = {
  heads: [],
  expanded: [],
};

/** Retain one group disclosure while ignoring previously saved substack heads. */
export function normalizeIntakeStackView(
  entries: readonly StackEntry[],
  view: IntakeStackView,
): IntakeStackView {
  const first = entries[0];
  if (!first) return EMPTY_INTAKE_STACK_VIEW;
  return {
    heads: [first.id],
    expanded:
      entries.length > 1 && view.expanded.includes(first.id) ? [first.id] : [],
  };
}

export function showIntakeStackChildren(
  entries: readonly StackEntry[],
  view: IntakeStackView,
): IntakeStackView {
  const current = normalizeIntakeStackView(entries, view);
  return normalizeIntakeStackView(entries, {
    heads: current.heads,
    expanded: current.heads,
  });
}

/** Fold the complete group in one transition, with no promoted child stacks. */
export function foldIntakeStack(
  entries: readonly StackEntry[],
  view: IntakeStackView,
): IntakeStackView {
  const current = normalizeIntakeStackView(entries, view);
  return { heads: current.heads, expanded: [] };
}

function framesForView(
  entries: readonly StackEntry[],
  heights: Readonly<Record<string, number>>,
  view: IntakeStackView,
) {
  const current = normalizeIntakeStackView(entries, view);
  const headId = entries[0]?.id ?? "";
  const shown = current.expanded.length > 0;
  const frames: IntakeStackFace[] = [];
  let lowerEdge = 0;
  for (const [order, entry] of entries.entries()) {
    const measured = heights[entry.id];
    const height = Number.isFinite(measured) && measured > 0 ? measured : 80;
    const head = order === 0;
    const previewDepth = Math.min(order, INTAKE_STACK_PREVIEW_LIMIT);
    const scale = shown ? 1 : 1 - previewDepth * 0.008;
    const hidden = !shown && order > INTAKE_STACK_PREVIEW_LIMIT;
    let y = 0;
    if (head) lowerEdge = height;
    else if (shown) {
      y = lowerEdge + 8;
      lowerEdge = y + height;
    } else {
      if (!hidden) lowerEdge = Math.max(lowerEdge + 24, height * scale);
      y = Math.max(0, lowerEdge - height * scale);
    }
    frames.push({
      id: entry.id,
      order,
      headId,
      depth: order,
      head,
      expanded: shown,
      hidden,
      y,
      scale,
      height,
      delay: 0,
      layer: entries.length - order,
    });
  }
  return { frames, height: lowerEdge };
}

/** Full card faces stay mounted while their single group opens or closes. */
export function layoutIntakeStacks({
  entries,
  heights,
  view,
  from = view,
  stage = "idle",
}: {
  entries: readonly StackEntry[];
  heights: Readonly<Record<string, number>>;
  view: IntakeStackView;
  from?: IntakeStackView;
  stage?: IntakeStackStage;
}) {
  const result = framesForView(entries, heights, view);
  const previousLayout = framesForView(entries, heights, from);
  const previous = new Map(
    previousLayout.frames.map((face) => [face.id, face]),
  );
  const changed = result.frames.filter((face) => {
    const old = previous.get(face.id);
    return (
      old &&
      (!old.hidden || !face.hidden) &&
      (old.y !== face.y ||
        old.scale !== face.scale ||
        old.hidden !== face.hidden)
    );
  });
  const openStep = Math.min(55, 330 / Math.max(changed.length - 1, 1));
  const closeStep = Math.min(45, 270 / Math.max(changed.length - 1, 1));
  let maxDelay = 0;
  for (const [rank, face] of changed.entries()) {
    face.delay =
      stage === "idle"
        ? 0
        : stage === "open"
          ? Math.min(330, face.order * openStep)
          : (changed.length - rank - 1) * closeStep;
    maxDelay = Math.max(maxDelay, face.delay);
  }
  return {
    ...result,
    // Wait for the latest returning face before shrinking underneath it.
    // Expansion reserves the destination space before the stagger starts.
    heightDelay: result.height < previousLayout.height ? maxDelay : 0,
    heightDuration:
      changed.length && stage !== "idle" ? INTAKE_STACK_MOVE_MS : 0,
    duration:
      changed.length && stage !== "idle" ? INTAKE_STACK_MOVE_MS + maxDelay : 0,
  };
}
