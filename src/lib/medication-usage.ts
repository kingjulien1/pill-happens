import { intakeHistoryIndex } from "./intake-history-index";
import type { Intake, Medication } from "./domain";

const orders = new WeakMap<object, Map<string, number[]>>();

/** Most logged first; equal counts retain the saved library order. */
export function sortMedicationsByUsage(
  medications: readonly Medication[],
  intakes: readonly Pick<Intake, "medicationId">[],
  cachedUsage?: Readonly<Record<string, number>>,
): Medication[] {
  const usage = cachedUsage ?? intakeHistoryIndex(intakes).counts;
  let cachedOrders = orders.get(usage);
  if (!cachedOrders) orders.set(usage, (cachedOrders = new Map()));
  const signature = JSON.stringify(
    medications.map((medication) => medication.id),
  );
  let order = cachedOrders.get(signature);
  if (!order) {
    const countFor = (id: string) =>
      usage instanceof Map
        ? (usage.get(id) ?? 0)
        : Object.hasOwn(usage, id)
          ? usage[id]
          : 0;
    order = medications
      .map((medication, index) => ({ index, count: countFor(medication.id) }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .map(({ index }) => index);
    if (cachedOrders.size >= 64)
      cachedOrders.delete(cachedOrders.keys().next().value!);
    cachedOrders.set(signature, order);
  }
  // Read current entities: cached ordering must never freeze a name or strength edit.
  return order.map((index) => medications[index]);
}
