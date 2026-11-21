import assert from "node:assert/strict";
import test from "node:test";
import {
  createSnapshotSelector,
  shallowEqual,
} from "./external-store-selector";

test("unrelated external-store changes retain the selected reference", () => {
  const draft = { note: "Only this form" };
  const select = createSnapshotSelector(
    (snapshot: { draft: typeof draft; unrelated: number; status: string }) => ({
      draft: snapshot.draft,
      status: snapshot.status,
    }),
    shallowEqual,
  );
  const initial = { draft, unrelated: 0, status: "saved" };
  const first = select(initial);
  assert.equal(select(initial), first);
  assert.equal(select({ ...initial, unrelated: 1 }), first);
  const changed = select({ ...initial, draft: { note: "Changed here" } });
  assert.notEqual(changed, first);
  assert.equal(changed.draft.note, "Changed here");
  assert.notEqual(select({ ...initial, status: "error" }), first);
});

test("primitive selection ignores other drafts but observes removal", () => {
  const select = createSnapshotSelector(
    (snapshot: { drafts: Record<string, string> }) => snapshot.drafts.current,
  );
  assert.equal(select({ drafts: { current: "kept", other: "first" } }), "kept");
  assert.equal(
    select({ drafts: { current: "kept", other: "second" } }),
    "kept",
  );
  assert.equal(select({ drafts: { other: "second" } }), undefined);
});
