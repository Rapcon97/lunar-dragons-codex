import assert from "node:assert/strict";
import test from "node:test";

import { proposeLorePublication } from "../app/lore-publication.ts";

function reviewState() {
  return {
    entries: [],
    loreEntries: [
      {
        id: "9f1a28fc-44a3-4a4f-960d-da4a8fd91bbc",
        date: "Pre-008.M42",
        title: "Provenance and Antiquity of the Lunaris",
        category: "relic",
        status: "review",
        content: "The oldest surviving provenance is submitted for judgement.",
        createdAt: 100,
        updatedAt: 200,
      },
    ],
    updatedAt: 300,
  };
}

test("publishing seals one review record as canon without changing its identity", () => {
  const current = reviewState();
  const proposal = proposeLorePublication(
    current,
    current.loreEntries[0].id,
    200,
    500,
  );

  assert.equal(proposal.ok, true);
  if (!proposal.ok) return;
  const published = proposal.value.entry;
  assert.equal(published.status, "canon");
  assert.equal(published.id, current.loreEntries[0].id);
  assert.equal(published.createdAt, 100);
  assert.equal(published.updatedAt, 500);
  assert.equal(proposal.state.loreEntries.length, 1);
  assert.deepEqual(proposal.state.entries, [
    "Pre-008.M42 — The oldest surviving provenance is submitted for judgement.",
  ]);
  assert.equal(current.loreEntries[0].status, "review");
});

test("publication rejects stale, missing, and non-review records", () => {
  const current = reviewState();
  assert.deepEqual(
    proposeLorePublication(current, current.loreEntries[0].id, 199, 500),
    { ok: false, reason: "stale" },
  );
  assert.deepEqual(
    proposeLorePublication(current, "missing", 200, 500),
    { ok: false, reason: "not-found" },
  );

  const canon = {
    ...current,
    loreEntries: [{ ...current.loreEntries[0], status: "canon" }],
  };
  assert.deepEqual(
    proposeLorePublication(canon, canon.loreEntries[0].id, 200, 500),
    { ok: false, reason: "not-review" },
  );
});

test("publication does not duplicate an existing compatibility timeline line", () => {
  const current = reviewState();
  current.entries = [
    "Pre-008.M42 — The oldest surviving provenance is submitted for judgement.",
  ];
  const proposal = proposeLorePublication(
    current,
    current.loreEntries[0].id,
    200,
    500,
  );
  assert.equal(proposal.ok, true);
  if (proposal.ok) assert.equal(proposal.state.entries.length, 1);
});
