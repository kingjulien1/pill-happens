import {
  INTAKE_QUANTITY_DECIMAL_PLACES,
  MAX_INTAKE_QUANTITY,
  MIN_EDITABLE_INTAKE_QUANTITY,
} from "./intake-quantity";

const scale = 10 ** INTAKE_QUANTITY_DECIMAL_PLACES;
const pageSize = 5;
const pageShift = 3;

/** Extend the five personal shortcuts lazily, without allocating a dosage range. */
export function intakeAmountPage(
  shortcuts: readonly number[],
  increment: number,
  requestedStart = 0,
) {
  const seed = [...new Set(shortcuts)]
    .filter(
      (amount) =>
        Number.isFinite(amount) &&
        amount >= MIN_EDITABLE_INTAKE_QUANTITY &&
        amount <= MAX_INTAKE_QUANTITY &&
        Math.round(amount * scale) / scale === amount,
    )
    .sort((a, b) => a - b)
    .slice(0, pageSize)
    .map((amount) => Math.round(amount * scale));
  if (!seed.length)
    return { amounts: [], start: 0, previousStart: null, nextStart: null };

  const step =
    Number.isFinite(increment) && increment > 0
      ? Math.max(1, Math.round(increment * scale))
      : scale / 4;
  const first = seed[0];
  const last = seed[seed.length - 1];
  const minimumIndex = Math.ceil(
    (MIN_EDITABLE_INTAKE_QUANTITY * scale - first) / step,
  );
  const maximumIndex =
    seed.length - 1 + Math.floor((MAX_INTAKE_QUANTITY * scale - last) / step);
  const maximumStart = Math.max(minimumIndex, maximumIndex - pageSize + 1);
  const start = Math.max(
    minimumIndex,
    Math.min(
      maximumStart,
      Number.isFinite(requestedStart) ? Math.trunc(requestedStart) : 0,
    ),
  );
  const amountAt = (index: number) =>
    (index < 0
      ? first + index * step
      : index < seed.length
        ? seed[index]
        : last + (index - seed.length + 1) * step) / scale;

  return {
    amounts: Array.from(
      { length: Math.min(pageSize, maximumIndex - start + 1) },
      (_, index) => amountAt(start + index),
    ),
    start,
    previousStart:
      start > minimumIndex ? Math.max(minimumIndex, start - pageShift) : null,
    nextStart:
      start < maximumStart ? Math.min(maximumStart, start + pageShift) : null,
  };
}
