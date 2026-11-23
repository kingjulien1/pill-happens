import type { HTMLAttributes } from "react";
import { MedicationCard } from "@/components/medication-card";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { toLocalInput } from "@/lib/domain";
import type { NotificationPreviewRecord } from "@/lib/notification-change-preview";
import type { IntakeReceiptField } from "@/lib/intake-receipt-changes";
import { cn } from "@/lib/utils";
import styles from "./notification-change-preview.module.css";

export type IntakeDetailDecoration = HTMLAttributes<HTMLElement> & {
  "data-intake-change"?: IntakeReceiptField;
};

/** Exact shared card geometry, using only the confirmed saved snapshot. */
export function MedicationPreview({
  record,
  decorate,
}: {
  record: Extract<NotificationPreviewRecord, { kind: "intake" | "medication" }>;
  decorate?: (field: IntakeReceiptField) => IntakeDetailDecoration | undefined;
}) {
  const intake = record.kind === "intake";
  const medication = record.medication;
  const quantity = intake ? record.quantity : record.medication.defaultQuantity;
  const strength = intake ? record.strengthMg : record.medication.strengthMg;
  const form = intake ? record.form : record.medication.form;
  const name = intake ? record.name : record.medication.name;
  const time = intake
    ? toLocalInput(record.takenAt, record.timeZone).slice(11)
    : null;
  const timeDecoration = decorate?.("time");
  return (
    <MedicationCard
      readOnly
      medication={medication}
      name={name}
      form={form}
      ingredient={medication?.activeIngredient}
      quantity={quantity}
      intakeRoute={intake ? record.route : undefined}
      formPresentation={intake ? "icon" : "text"}
      className={styles.medication}
      detailDecoration={decorate}
      data-notification-record={record.kind}
      data-notification-snapshot-card
      data-intake-card={intake ? "" : undefined}
      data-medication-library-card={intake ? undefined : ""}
      data-medication-archived={
        !intake && record.medication.archived ? true : undefined
      }
      leading={
        intake ? (
          <time
            {...timeDecoration}
            className={cn("intake-card-time", timeDecoration?.className)}
            dateTime={record.takenAt}
            title={time + " · " + record.timeZone}
            data-intake-time
          >
            {time}
          </time>
        ) : undefined
      }
      trailing={
        <MedicationCardDose
          quantity={quantity}
          strengthMg={strength}
          form={form}
          source={intake ? "recorded" : "default"}
          decoration={decorate?.("amount")}
        />
      }
    />
  );
}
