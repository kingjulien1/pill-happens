import { CARD_ENTRY_SPACING_MS } from "./card-entry-timing";

export type IntakeGroupEntranceState = "pending" | "running" | "done";

/** The 360ms control follows the frame by only 40ms. */
export const INTAKE_GROUP_ENTRANCE_MS = 400;

export type IntakeGroupEntranceFace = {
  exposed: boolean;
  state: string | undefined;
  startsAt?: number;
};

/**
 * The frame gets the next local beat after the last reserved face starts.
 * Offscreen, capped and not-yet-scheduled faces never invent future slots;
 * canceled/settled faces release their reservations immediately.
 */
export function intakeGroupEntranceStart(
  faces: readonly IntakeGroupEntranceFace[],
): number | null {
  const exposed = faces.filter((face) => face.exposed);
  const running = exposed.filter((face) => face.state === "running");
  if (running.some((face) => !Number.isFinite(face.startsAt))) return null;
  if (running.length)
    return (
      Math.max(...running.map((face) => face.startsAt!)) + CARD_ENTRY_SPACING_MS
    );
  return exposed.some((face) => face.state === "done") ? 0 : null;
}

/**
 * Frames follow the same start-to-start spacing as cards, rather than waiting
 * for their longer animations to finish. This phase stays off the main clock.
 */
export function nextIntakeGroupEntranceState({
  current,
  faces,
  ready,
  settle,
  now,
}: {
  current: IntakeGroupEntranceState;
  faces: readonly IntakeGroupEntranceFace[];
  ready: boolean;
  settle: boolean;
  now: number;
}): IntakeGroupEntranceState {
  if (current === "done" || settle) return "done";
  if (current === "running") return "running";
  if (!ready) return "pending";
  const startsAt = intakeGroupEntranceStart(faces);
  return startsAt !== null && now >= startsAt ? "running" : "pending";
}
