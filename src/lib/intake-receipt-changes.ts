import { formatDose } from "./domain";
import {
  intakeUpdatePreview,
  type IntakeSnapshot,
} from "./intake-update-preview";

export type IntakeReceiptField = "time" | "name" | "route" | "form" | "amount";
export type IntakeReceiptChange = {
  field: IntakeReceiptField;
  label: string;
  before: string;
  after: string;
  context: string;
};

const context = {
  time: "When it was taken",
  name: "Saved medication name",
  route: "How it was taken",
  form: "Physical medication type",
};
const calculation = (record: IntakeSnapshot) =>
  `${formatDose(record.quantity)} × ${formatDose(record.strengthMg)} mg = ${formatDose(record.quantity * record.strengthMg)} mg`;

/** The entire dose composition is one change, even when its total stays equal. */
export function intakeReceiptChanges(
  before: IntakeSnapshot,
  after: IntakeSnapshot,
  medicationChanged?: boolean,
): IntakeReceiptChange[] {
  const update = intakeUpdatePreview(before, after, medicationChanged);
  if (update.switched) return [];
  const rows: IntakeReceiptChange[] = update.rows.flatMap((row) =>
    row.field === "quantity" || row.field === "strength"
      ? []
      : [
          {
            field: row.field,
            label: row.label,
            before: row.before,
            after: row.after,
            context: context[row.field],
          },
        ],
  );
  if (
    before.quantity !== after.quantity ||
    before.strengthMg !== after.strengthMg
  )
    rows.push({
      field: "amount",
      label: "Amount",
      before: calculation(before),
      after: calculation(after),
      context: "Quantity × strength = total dose",
    });
  const order: IntakeReceiptField[] = [
    "time",
    "name",
    "route",
    "form",
    "amount",
  ];
  return rows.sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
}
