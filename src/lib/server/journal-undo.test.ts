import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, type AppData, type Medication } from "@/lib/domain";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import type { JournalRepository } from "./journal-repository";
import {
  createPostgresJournalRepository,
  type Query,
} from "./journal-repository";
import { ApiError } from "./api-error";
import {
  mutateJournalStateWithUndo,
  undoJournalMutation,
  UNDO_TTL_MS,
  type UndoableAppData,
  type UndoTarget,
} from "./journal-undo";

const secret = "Synthetic undo tests only. Not an application secret.";
const now = Date.parse("2026-11-14T12:00:00Z");
const medication: Medication = {
  id: "med-a",
  name: "Synthetic Tablet",
  strengthMg: 10,
  form: "tablet",
  color: "rose",
  archived: false,
  createdAt: "2026-11-01T10:00:00Z",
};
const intake = {
  id: "intake-a",
  medicationId: medication.id,
  medicationName: medication.name,
  medicationForm: medication.form,
  strengthMg: medication.strengthMg,
  quantity: 1,
  takenAt: "2026-11-14T09:00:00Z",
  createdAt: "2026-11-14T09:01:00Z",
  note: "Synthetic intake note",
};
const goal = {
  id: "goal-a",
  medicationId: medication.id,
  dailyLimitMg: 20,
  startsOn: "2026-11-14",
  endsOn: null,
  note: "Synthetic goal",
  createdAt: "2026-11-14T08:00:00Z",
};
const checkIn: DailyCheckIn = {
  day: "2026-11-14",
  period: "morning",
  note: "Earlier synthetic writing",
  moods: ["okay"],
  energy: 3,
  stress: 2,
  sleepHours: 7,
  helped: "A walk",
  createdAt: "2026-11-14T08:00:00Z",
  updatedAt: "2026-11-14T08:00:00Z",
};

function fixture() {
  let state: AppData = {
    ...emptyData(),
    medications: [structuredClone(medication)],
    intakes: [structuredClone(intake)],
    goals: [structuredClone(goal)],
    dailyCheckIns: [structuredClone(checkIn)],
  };
  let contender: ((state: AppData) => void) | null = null;
  const repository: Pick<JournalRepository, "readState" | "mutateState"> = {
    readState: async () => structuredClone(state),
    mutateState: async (_journal, mutation) => {
      let candidate = structuredClone(state);
      mutation(candidate);
      if (contender) {
        const race = contender;
        contender = null;
        race(state);
        candidate = structuredClone(state);
        mutation(candidate);
      }
      state = candidate;
      return structuredClone(state);
    },
  };
  return {
    repository,
    state: () => structuredClone(state),
    concurrent: (change: (state: AppData) => void) => change(state),
    race: (change: (state: AppData) => void) => {
      contender = change;
    },
    save: (target: UndoTarget, change: (state: AppData) => void) =>
      mutateJournalStateWithUndo(
        repository,
        "journal-a",
        target,
        change,
        secret,
        now,
      ),
    undo: (saved: UndoableAppData, time = now + 1_000) =>
      undoJournalMutation(
        repository,
        "journal-a",
        receipt(saved),
        secret,
        time,
      ),
  };
}

function receipt(data: UndoableAppData) {
  assert.ok(
    data._undo?.token,
    "a meaningful successful change has an undo receipt",
  );
  return data._undo.token;
}
const status = (value: number) => (error: unknown) =>
  error instanceof ApiError && error.status === value;

test("undo removes an exactly matching added intake and preserves unrelated later records", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: "intake-new" }, (state) => {
    state.intakes.push({ ...intake, id: "intake-new", quantity: 0.5 });
  });
  assert.equal(saved._undo?.entityId, "intake-new");
  assert.equal(
    saved._undo?.expiresAt,
    new Date(now + UNDO_TTL_MS).toISOString(),
  );
  assert.equal(Object.hasOwn(f.state(), "_undo"), false);
  f.concurrent((state) => {
    state.intakes.push({ ...intake, id: "unrelated-intake" });
    state.dailyCheckIns![0].note = "Later independent writing";
  });
  const result = await f.undo(saved);
  assert.deepEqual(
    result.intakes.map((entry) => entry.id),
    ["intake-a", "unrelated-intake"],
  );
  assert.equal(result.dailyCheckIns![0].note, "Later independent writing");
  assert.equal(Object.hasOwn(result, "_undo"), false);
});

test("undo restores actual intake fields, and repeating it is harmless", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    Object.assign(state.intakes[0], {
      quantity: 0.25,
      route: "oral",
      note: "Changed note",
    });
  });
  assert.deepEqual((await f.undo(saved)).intakes[0], intake);
  assert.deepEqual((await f.undo(saved)).intakes[0], intake);
});

test("undo rejects a newer edit without overwriting it", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes[0].quantity = 2;
  });
  f.concurrent((state) => {
    state.intakes[0].note = "A newer correction";
  });
  const before = f.state();
  await assert.rejects(f.undo(saved), status(409));
  assert.deepEqual(f.state(), before);
});

test("deleted intake undo restores the original ID, time, quantity, and current medication details", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes = [];
  });
  f.concurrent((state) => {
    state.medications[0].name = "Later medication name";
    state.medications[0].strengthMg = 12;
  });
  const result = await f.undo(saved);
  assert.equal(result.intakes[0].id, intake.id);
  assert.equal(result.intakes[0].takenAt, intake.takenAt);
  assert.equal(result.intakes[0].quantity, intake.quantity);
  assert.equal(result.intakes[0].medicationName, "Later medication name");
  assert.equal(result.intakes[0].strengthMg, 12);
});

test("deleted intake restoration refuses a missing medication", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes = [];
  });
  f.concurrent((state) => {
    state.medications = [];
  });
  await assert.rejects(f.undo(saved), status(409));
  assert.equal(f.state().intakes.length, 0);
});

test("medication edits and archive undo restore the medication and re-sync all current linked intakes", async () => {
  const f = fixture();
  const saved = await f.save(
    { kind: "medication", id: medication.id },
    (state) => {
      Object.assign(state.medications[0], {
        name: "Changed",
        strengthMg: 15,
        archived: true,
      });
    },
  );
  f.concurrent((state) => {
    state.intakes[0].quantity = 2;
    state.intakes.push({
      ...intake,
      id: "later-intake",
      strengthMg: 15,
      medicationName: "Changed",
    });
  });
  const result = await f.undo(saved);
  assert.deepEqual(result.medications[0], medication);
  assert.equal(result.intakes[0].quantity, 2);
  assert.equal(result.intakes[1].id, "later-intake");
  assert.ok(result.intakes.every((entry) => entry.strengthMg === 10));
});

test("unused medication creation can be undone; linked intakes or goals prevent removal", async () => {
  for (const link of [null, "intake", "goal"] as const) {
    const f = fixture();
    const saved = await f.save(
      { kind: "medication", id: "new-med" },
      (state) => {
        state.medications.push({ ...medication, id: "new-med" });
      },
    );
    if (link)
      f.concurrent((state) => {
        if (link === "intake")
          state.intakes.push({
            ...intake,
            id: "new-intake",
            medicationId: "new-med",
          });
        else
          state.goals.push({
            ...goal,
            id: "new-goal",
            medicationId: "new-med",
          });
      });
    if (link) {
      const before = f.state();
      await assert.rejects(f.undo(saved), status(409));
      assert.deepEqual(f.state(), before);
    } else assert.equal((await f.undo(saved)).medications.length, 1);
  }
});

test("goal add and delete undo preserve goal identity and other goals", async () => {
  const f = fixture();
  const added = await f.save({ kind: "goal", id: "new-goal" }, (state) => {
    state.goals.push({ ...goal, id: "new-goal" });
  });
  await f.undo(added);
  const removed = await f.save({ kind: "goal", id: goal.id }, (state) => {
    state.goals = [];
  });
  f.concurrent((state) => {
    state.goals.push({ ...goal, id: "unrelated-goal" });
  });
  const result = await f.undo(removed);
  assert.deepEqual(
    result.goals.find((entry) => entry.id === goal.id),
    goal,
  );
  assert.ok(result.goals.some((entry) => entry.id === "unrelated-goal"));
});

test("settings undo restores only the matching settings, and refuses a newer timezone", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "settings" }, (state) => {
    state.settings.timezone = "Europe/London";
  });
  f.concurrent((state) => {
    state.intakes[0].note = "Independent edit";
  });
  assert.equal((await f.undo(saved)).settings.timezone, "Europe/Vienna");
  assert.equal(f.state().intakes[0].note, "Independent edit");
  f.concurrent((state) => {
    state.settings.timezone = "Asia/Tokyo";
  });
  await assert.rejects(f.undo(saved), status(409));
});

test("check-in undo is period-scoped and refuses newer writing or ratings", async () => {
  const f = fixture();
  const target = {
    kind: "check-in",
    day: checkIn.day,
    period: "morning",
  } as const;
  const saved = await f.save(target, (state) => {
    state.dailyCheckIns![0].note = "Saved new writing";
    state.dailyCheckIns![0].updatedAt = "2026-11-14T10:00:00Z";
  });
  f.concurrent((state) => {
    state.dailyCheckIns!.push({
      ...checkIn,
      period: "evening",
      note: "Independent evening",
    });
  });
  const restored = await f.undo(saved);
  assert.deepEqual(restored.dailyCheckIns![0], checkIn);
  assert.equal(restored.dailyCheckIns![1].note, "Independent evening");
  const next = await f.save(target, (state) => {
    state.dailyCheckIns![0].energy = 4;
  });
  f.concurrent((state) => {
    state.dailyCheckIns![0].note = "Newer autosaved words";
    state.dailyCheckIns![0].updatedAt = "2026-11-14T11:00:00Z";
  });
  await assert.rejects(f.undo(next), status(409));
  assert.equal(f.state().dailyCheckIns![0].note, "Newer autosaved words");
});

test("new check-in undo removes only the exact newly created period", async () => {
  const f = fixture();
  const saved = await f.save(
    { kind: "check-in", day: checkIn.day, period: "evening" },
    (state) => {
      state.dailyCheckIns!.push({ ...checkIn, period: "evening" });
    },
  );
  assert.deepEqual((await f.undo(saved)).dailyCheckIns, [checkIn]);
});

test("signature, journal scope, secret rotation, malformed input, and expiry are checked before mutation", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes[0].quantity = 2;
  });
  const token = receipt(saved);
  const before = f.state();
  await assert.rejects(
    undoJournalMutation(f.repository, "journal-b", token, secret, now + 1),
    status(403),
  );
  await assert.rejects(
    undoJournalMutation(
      f.repository,
      "journal-a",
      token,
      secret + "rotated",
      now + 1,
    ),
    status(400),
  );
  await assert.rejects(
    undoJournalMutation(
      f.repository,
      "journal-a",
      "not-a-receipt",
      secret,
      now + 1,
    ),
    status(400),
  );
  await assert.rejects(
    undoJournalMutation(
      f.repository,
      "journal-a",
      token,
      secret,
      now + UNDO_TTL_MS,
    ),
    status(410),
  );
  await assert.rejects(
    undoJournalMutation(f.repository, "journal-a", token, secret, now - 1),
    status(410),
  );
  const [encoded, mac] = token.split(".");
  const changed = JSON.parse(Buffer.from(encoded, "base64url").toString());
  changed.before.quantity = 99;
  const forged = `${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${mac}`;
  await assert.rejects(
    undoJournalMutation(f.repository, "journal-a", forged, secret, now + 1),
    status(400),
  );
  assert.deepEqual(f.state(), before);
});

test("CAS retries capture the final committed before-state instead of the abandoned attempt", async () => {
  const f = fixture();
  f.race((state) => {
    state.intakes[0].quantity = 1.5;
  });
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes[0].quantity = 2;
  });
  assert.equal((await f.undo(saved)).intakes[0].quantity, 1.5);
});

test("a conflicting edit during undo CAS is rechecked and preserved", async () => {
  const f = fixture();
  const saved = await f.save({ kind: "intake", id: intake.id }, (state) => {
    state.intakes[0].quantity = 2;
  });
  f.race((state) => {
    state.intakes[0].note = "Won the concurrent save";
  });
  await assert.rejects(f.undo(saved), status(409));
  assert.equal(f.state().intakes[0].quantity, 2);
  assert.equal(f.state().intakes[0].note, "Won the concurrent save");
});

test("no-op mutations and unconfigured development do not offer fake undo", async () => {
  const f = fixture();
  const unchanged = await f.save({ kind: "intake", id: intake.id }, () => {});
  assert.equal(unchanged._undo, undefined);
  const dev = await mutateJournalStateWithUndo(
    f.repository,
    "journal-a",
    { kind: "settings" },
    (state) => {
      state.settings.timezone = "Europe/London";
    },
    "",
    now,
  );
  assert.equal(dev._undo, undefined);
  assert.equal(dev.settings.timezone, "Europe/London");
});

test("large Unicode check-in writing remains reversible through response-body receipts", async () => {
  const f = fixture();
  const previous = "語".repeat(100_000);
  const next = "字".repeat(100_000);
  f.concurrent((state) => {
    state.dailyCheckIns![0].note = previous;
  });
  const saved = await f.save(
    { kind: "check-in", day: checkIn.day, period: "morning" },
    (state) => {
      state.dailyCheckIns![0].note = next;
    },
  );
  assert.ok(receipt(saved).length < 1_500_000);
  assert.equal((await f.undo(saved)).dailyCheckIns![0].note, previous);
});

test("oversized legacy snapshots omit optional undo without reporting a committed save as failed", async () => {
  const f = fixture();
  f.concurrent((state) => {
    state.dailyCheckIns![0].note = "x".repeat(1_200_000);
  });
  const saved = await f.save(
    { kind: "check-in", day: checkIn.day, period: "morning" },
    (state) => {
      state.dailyCheckIns![0].note = "Corrected legacy writing";
    },
  );
  assert.equal(saved._undo, undefined);
  assert.equal(f.state().dailyCheckIns![0].note, "Corrected legacy writing");
});

test("real Postgres CAS receipts capture the winning attempt and never enter stored JSON", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  let competingSave: (() => Promise<void>) | null = null;
  const query: Query = async (sql, params = []) => {
    if (sql.startsWith("UPDATE pill_happens_state SET data") && competingSave) {
      const save = competingSave;
      competingSave = null;
      await save();
    }
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  };
  const repository = createPostgresJournalRepository(query);
  await repository.mutateState("personal", (state) => {
    state.medications = [structuredClone(medication)];
    state.intakes = [structuredClone(intake)];
  });
  competingSave = () =>
    repository
      .mutateState("personal", (state) => {
        state.intakes[0].quantity = 1.5;
      })
      .then(() => {});
  const saved = await mutateJournalStateWithUndo(
    repository,
    "personal",
    { kind: "intake", id: intake.id },
    (state) => {
      state.intakes[0].quantity = 2;
    },
    secret,
    now,
  );
  assert.equal((await repository.readState("personal")).intakes[0].quantity, 2);
  assert.equal(
    Object.hasOwn(await repository.readState("personal"), "_undo"),
    false,
  );
  const undone = await undoJournalMutation(
    repository,
    "personal",
    receipt(saved),
    secret,
    now + 1,
  );
  assert.equal(undone.intakes[0].quantity, 1.5);
  assert.equal(
    (await repository.readState("personal")).intakes[0].quantity,
    1.5,
  );
  assert.equal(
    Object.hasOwn(await repository.readState("personal"), "_undo"),
    false,
  );
});
