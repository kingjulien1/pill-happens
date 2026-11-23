import type { AppData, Intake } from "@/lib/domain";
import { ApiError } from "./api-error";
import type { UndoTarget } from "./journal-undo";

type IntakeEdit = Pick<
  Intake,
  "medicationId" | "quantity" | "route" | "takenAt" | "note"
>;

/** A different medication is a new intake; its removal and creation share one save. */
export function intakeEditMutation(
  id: string,
  input: IntakeEdit,
  replacement: { id: string; createdAt: string },
) {
  const current = (state: AppData) => {
    const intake = state.intakes.find((entry) => entry.id === id);
    if (!intake) throw new ApiError(404, "This intake was not found.");
    return intake;
  };
  return {
    target(state: AppData): UndoTarget {
      return current(state).medicationId === input.medicationId
        ? { kind: "intake", id }
        : { kind: "intake-replacement", id: replacement.id, previousId: id };
    },
    mutate(state: AppData) {
      const intake = current(state);
      const takenAt = new Date(input.takenAt).toISOString();
      if (intake.medicationId === input.medicationId) {
        Object.assign(intake, input, { takenAt });
        return;
      }
      const medication = state.medications.find(
        (entry) => entry.id === input.medicationId && !entry.archived,
      );
      if (!medication) throw new ApiError(400, "Choose an active medication.");
      if (state.intakes.some((entry) => entry.id === replacement.id))
        throw new ApiError(
          409,
          "This intake could not be replaced. Please try again.",
        );
      state.intakes.splice(state.intakes.indexOf(intake), 1, {
        ...input,
        ...replacement,
        takenAt,
        medicationName: medication.name,
        medicationForm: medication.form,
        strengthMg: medication.strengthMg,
      });
    },
  };
}
