type StackEntry = { id: string };

export type IntakeStackView = {
  /** Additional full-height stack heads; the first entry is always a head. */
  heads: readonly string[];
  /** Heads whose own following rows are currently shown at full height. */
  expanded: readonly string[];
};

export type IntakeStackStage = "idle" | "open" | "fold-children" | "gather";
export type IntakeStackStep = {
  view: IntakeStackView;
  stage: IntakeStackStage;
};

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

/** Normalize presentation IDs against live records without changing intake order. */
export function normalizeIntakeStackView(
  entries: readonly StackEntry[],
  view: IntakeStackView,
): IntakeStackView {
  if (!entries.length) return EMPTY_INTAKE_STACK_VIEW;
  const requested = new Set(view.heads);
  const heads = entries
    .filter((entry, index) => index === 0 || requested.has(entry.id))
    .map((entry) => entry.id);
  const expanded = new Set(view.expanded);
  const indexes = new Map(entries.map((entry, index) => [entry.id, index]));
  return {
    heads,
    expanded: heads.filter((id, index) => {
      const start = indexes.get(id)!;
      const end = indexes.get(heads[index + 1]) ?? entries.length;
      return expanded.has(id) && end - start > 1;
    }),
  };
}

/** Split at the chosen record, keeping earlier/later promoted heads intact. */
export function promoteIntakeStack(
  entries: readonly StackEntry[],
  view: IntakeStackView,
  id: string,
): IntakeStackView {
  const current = normalizeIntakeStackView(entries, view);
  if (!entries.some((entry) => entry.id === id) || current.heads.includes(id))
    return current;
  return normalizeIntakeStackView(entries, {
    heads: [...current.heads, id],
    // A new head starts with its suffix folded, even inside a shown segment.
    expanded: current.expanded.filter((head) => head !== id),
  });
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

/** Close shown rows first, then gather the deepest promoted heads into ancestors. */
export function foldIntakeStackSteps(
  entries: readonly StackEntry[],
  view: IntakeStackView,
): IntakeStackStep[] {
  let current = normalizeIntakeStackView(entries, view);
  const steps: IntakeStackStep[] = [];
  if (current.expanded.length) {
    current = { heads: current.heads, expanded: [] };
    steps.push({ view: current, stage: "fold-children" });
  }
  // The same hierarchy can contain arbitrarily many heads. Compress very deep
  // views into at most six gather waves rather than queueing minutes of motion.
  const batchSize = Math.max(1, Math.ceil((current.heads.length - 1) / 6));
  while (current.heads.length > 1) {
    current = {
      heads: current.heads.slice(
        0,
        Math.max(1, current.heads.length - batchSize),
      ),
      expanded: [],
    };
    steps.push({ view: current, stage: "gather" });
  }
  return steps;
}

function framesForView(
  entries: readonly StackEntry[],
  heights: Readonly<Record<string, number>>,
  view: IntakeStackView,
) {
  const current = normalizeIntakeStackView(entries, view);
  const heads = new Set(current.heads);
  const expanded = new Set(current.expanded);
  const frames: IntakeStackFace[] = [];
  let headId = "";
  let depth = 0;
  let sectionY = 0;
  let sectionBottom = 0;
  for (const [order, entry] of entries.entries()) {
    const measured = heights[entry.id];
    const height = Number.isFinite(measured) && measured > 0 ? measured : 80;
    const head = heads.has(entry.id);
    if (head) {
      if (order > 0) sectionY += sectionBottom + 8;
      headId = entry.id;
      depth = 0;
      sectionBottom = height;
    } else depth += 1;
    const shown = expanded.has(headId);
    const previewDepth = Math.min(depth, INTAKE_STACK_PREVIEW_LIMIT);
    const scale = shown ? 1 : 1 - previewDepth * 0.008;
    const hidden = !shown && depth > INTAKE_STACK_PREVIEW_LIMIT;
    let y = sectionY;
    if (!head) {
      if (shown) {
        y = sectionY + sectionBottom + 8;
        sectionBottom += height + 8;
      } else if (!hidden) {
        sectionBottom = Math.max(sectionBottom + 24, height * scale);
        y = sectionY + Math.max(0, sectionBottom - height * scale);
      } else y = sectionY + Math.max(0, sectionBottom - height * scale);
    }
    frames.push({
      id: entry.id,
      order,
      headId,
      depth,
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
  return { frames, height: entries.length ? sectionY + sectionBottom : 0 };
}

/** Absolute faces stay mounted while their local stack changes around them. */
export function layoutIntakeStacks({
  entries,
  heights,
  view,
  from = view,
  stage = "idle",
  triggerId,
}: {
  entries: readonly StackEntry[];
  heights: Readonly<Record<string, number>>;
  view: IntakeStackView;
  from?: IntakeStackView;
  stage?: IntakeStackStage;
  triggerId?: string;
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
  const trigger = Math.max(
    0,
    entries.findIndex((entry) => entry.id === triggerId),
  );
  const openStep = Math.min(55, 330 / Math.max(changed.length - 1, 1));
  const closeStep = Math.min(45, 270 / Math.max(changed.length - 1, 1));
  let maxDelay = 0;
  for (const [rank, face] of changed.entries()) {
    face.delay =
      stage === "idle"
        ? 0
        : stage === "open"
          ? Math.min(330, Math.max(0, face.order - trigger) * openStep)
          : (changed.length - rank - 1) * closeStep;
    maxDelay = Math.max(maxDelay, face.delay);
  }
  return {
    ...result,
    // Shrinking before a late face starts would put the footer/next group over
    // that face. Follow the latest return; expansion reserves room immediately.
    heightDelay: result.height < previousLayout.height ? maxDelay : 0,
    heightDuration:
      changed.length && stage !== "idle" ? INTAKE_STACK_MOVE_MS : 0,
    duration:
      changed.length && stage !== "idle" ? INTAKE_STACK_MOVE_MS + maxDelay : 0,
  };
}
