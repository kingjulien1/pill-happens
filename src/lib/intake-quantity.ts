export const MIN_INTAKE_QUANTITY = 0.000001;
export const MAX_INTAKE_QUANTITY = 10_000;
/** Editor precision is independent of a medication's quantity-step setting. */
export const INTAKE_QUANTITY_DECIMAL_PLACES = 2;
export const MIN_EDITABLE_INTAKE_QUANTITY = 0.01;

type Decimal = { coefficient: bigint; scale: number };

const decimal = (raw: string): Decimal | null => {
  // Match the saved draft limit and reject grouping, exponents and partial marks.
  if (typeof raw !== "string" || raw.length > 256) return null;
  const text = raw.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const [whole = "0", fraction = ""] = text.replace(",", ".").split(".");
  return {
    coefficient: BigInt(`${whole || "0"}${fraction}`),
    scale: fraction.length,
  };
};

/** Parse a decimal control without rewriting the user's unfinished draft. */
export function parseIntakeQuantity(raw: string): number | null {
  if (!decimal(raw)) return null;
  const value = Number(raw.trim().replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

const numericDecimal = (value: number): Decimal => {
  const [mantissa, exponent = "0"] = String(Math.abs(value)).split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const shift = Number(exponent) - fraction.length;
  return {
    coefficient:
      BigInt(`${whole}${fraction}`) * 10n ** BigInt(Math.max(0, shift)),
    scale: Math.max(0, -shift),
  };
};

/** Step exactly from the entered fraction; increments never restrict typed values. */
export function stepIntakeQuantity(raw: string, delta: number): string | null {
  const current = decimal(raw);
  if (!current || !Number.isFinite(delta)) return null;
  const change = numericDecimal(delta);
  const minimumDecimal = numericDecimal(MIN_INTAKE_QUANTITY);
  const maximumDecimal = numericDecimal(MAX_INTAKE_QUANTITY);
  const scale = Math.max(
    current.scale,
    change.scale,
    minimumDecimal.scale,
    maximumDecimal.scale,
  );
  const atScale = ({ coefficient, scale: from }: Decimal) =>
    coefficient * 10n ** BigInt(scale - from);
  const stepped = atScale(current) + (delta < 0 ? -1n : 1n) * atScale(change);
  const minimum = atScale(minimumDecimal);
  const maximum = atScale(maximumDecimal);
  const bounded =
    stepped < minimum ? minimum : stepped > maximum ? maximum : stepped;
  const digits = String(bounded).padStart(scale + 1, "0");
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * Accept decimal editing, including unfinished marks, without interpreting an
 * exponent, unit label or grouping separator as a different quantity. Extra
 * fractional keystrokes/pasted digits are limited, never carried into a dose.
 */
export function limitIntakeQuantityInput(raw: string): string | null {
  if (typeof raw !== "string" || raw.length > 256) return null;
  const text = raw.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d*)?$/.test(text)) return null;
  const mark = text.search(/[.,]/);
  return mark === -1
    ? text
    : text.slice(0, mark + 1 + INTAKE_QUANTITY_DECIMAL_PLACES);
}

const editorScale = 10n ** BigInt(INTAKE_QUANTITY_DECIMAL_PLACES);

/** Non-negative decimal rounding uses integer arithmetic, including half ties. */
const atEditorScale = ({ coefficient, scale }: Decimal): bigint => {
  const shift = scale - INTAKE_QUANTITY_DECIMAL_PLACES;
  if (shift <= 0) return coefficient * 10n ** BigInt(-shift);
  const divisor = 10n ** BigInt(shift);
  return (coefficient + divisor / 2n) / divisor;
};

const formatEditorScale = (coefficient: bigint, comma = false): string => {
  const whole = coefficient / editorScale;
  const fraction = String(coefficient % editorScale)
    .padStart(INTAKE_QUANTITY_DECIMAL_PLACES, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}${comma ? "," : "."}${fraction}` : String(whole);
};

/**
 * Display existing/default values with at most two decimal places. Already
 * editable strings keep their decimal mark, zeros and unfinished state. This
 * does not mutate a draft or record, clamp a tiny value upwards, or make a
 * rounded zero valid for saving.
 */
export function normalizeIntakeQuantityForEditor(raw: string): string | null {
  const limited = limitIntakeQuantityInput(raw);
  if (limited === null) return null;
  const current = decimal(raw);
  if (!current || current.scale <= INTAKE_QUANTITY_DECIMAL_PLACES)
    return limited;
  return formatEditorScale(atEditorScale(current), raw.includes(","));
}

/** Distinguish real precision loss from harmless zeros or decimal-mark changes. */
export function hasIntakeQuantityEditorPrecisionLoss(raw: string): boolean {
  const current = decimal(raw);
  const normalized = normalizeIntakeQuantityForEditor(raw);
  const visible = normalized === null ? null : decimal(normalized);
  if (!current || !visible) return false;
  const scale = Math.max(current.scale, visible.scale);
  return (
    current.coefficient * 10n ** BigInt(scale - current.scale) !==
    visible.coefficient * 10n ** BigInt(scale - visible.scale)
  );
}

/**
 * Keep the general legacy stepper above lossless. Only this editor variant
 * rounds its result to hundredths and uses the editor's representable bounds.
 */
export function stepEditableIntakeQuantity(
  raw: string,
  delta: number,
): string | null {
  const visible = normalizeIntakeQuantityForEditor(raw);
  const next = visible === null ? null : stepIntakeQuantity(visible, delta);
  if (next === null) return null;
  const stepped = decimal(next);
  if (!stepped) return null;
  const rounded = atEditorScale(stepped);
  const minimum = atEditorScale(numericDecimal(MIN_EDITABLE_INTAKE_QUANTITY));
  const maximum = atEditorScale(numericDecimal(MAX_INTAKE_QUANTITY));
  const bounded =
    rounded < minimum ? minimum : rounded > maximum ? maximum : rounded;
  return formatEditorScale(bounded);
}
