import assert from "node:assert/strict";
import test from "node:test";

import {
  proposeLoreDraftReturn,
  proposeLorePublication,
} from "../app/lore-publication.ts";
import {
  proposeLoreDraftCreation,
  proposeLoreEditorUpdate,
} from "../app/lore-editor.ts";
import { chronicleEntriesForViewer } from "../app/chronicle-visibility.ts";

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

test("returning canon to draft preserves identity and removes its canon timeline mirror", () => {
  const current = reviewState();
  current.loreEntries[0] = { ...current.loreEntries[0], status: "canon" };
  current.entries = [
    "Pre-008.M42 — The oldest surviving provenance is submitted for judgement.",
  ];

  const proposal = proposeLoreDraftReturn(
    current,
    current.loreEntries[0].id,
    200,
    500,
  );
  assert.equal(proposal.ok, true);
  if (!proposal.ok) return;
  assert.equal(proposal.value.entry.status, "draft");
  assert.equal(proposal.value.entry.id, current.loreEntries[0].id);
  assert.equal(proposal.value.entry.createdAt, 100);
  assert.equal(proposal.value.entry.updatedAt, 500);
  assert.deepEqual(proposal.state.entries, []);
  assert.equal(current.loreEntries[0].status, "canon");
});

test("draft return rejects stale, missing, and non-canon records", () => {
  const current = reviewState();
  const canon = {
    ...current,
    loreEntries: [{ ...current.loreEntries[0], status: "canon" }],
  };
  assert.deepEqual(
    proposeLoreDraftReturn(canon, canon.loreEntries[0].id, 199, 500),
    { ok: false, reason: "stale" },
  );
  assert.deepEqual(
    proposeLoreDraftReturn(canon, "missing", 200, 500),
    { ok: false, reason: "not-found" },
  );
  assert.deepEqual(
    proposeLoreDraftReturn(current, current.loreEntries[0].id, 200, 500),
    { ok: false, reason: "not-canon" },
  );
});

test("draft return retains a shared timeline line while another canon record uses it", () => {
  const current = reviewState();
  const canon = { ...current.loreEntries[0], status: "canon" };
  current.loreEntries = [canon, { ...canon, id: "second-canon-record" }];
  current.entries = [
    "Pre-008.M42 — The oldest surviving provenance is submitted for judgement.",
  ];
  const proposal = proposeLoreDraftReturn(current, canon.id, 200, 500);
  assert.equal(proposal.ok, true);
  if (proposal.ok) assert.equal(proposal.state.entries.length, 1);
});

test("Chronicles exposes non-canon lore only to administrators in active Admin Mode", () => {
  const entries = [
    { id: "draft", status: "draft" },
    { id: "review", status: "review" },
    { id: "canon", status: "canon" },
    { id: "retconned", status: "retconned" },
  ];

  assert.deepEqual(
    chronicleEntriesForViewer(entries, true, false).map((entry) => entry.id),
    ["canon"],
  );
  assert.deepEqual(
    chronicleEntriesForViewer(entries, true, true).map((entry) => entry.id),
    ["draft", "review", "canon", "retconned"],
  );
  assert.deepEqual(
    chronicleEntriesForViewer(entries, false, true).map((entry) => entry.id),
    ["canon"],
  );
});

test("the on-site editor creates a structured draft without changing the canon timeline", () => {
  const current = reviewState();
  const proposal = proposeLoreDraftCreation(
    current,
    {
      date: " 056.M42 ",
      title: " The Unknown Anchorage ",
      category: "world",
      content: " A provisional survey awaiting the Chapter Master's judgement. ",
    },
    "new-draft-uuid",
    600,
  );

  assert.equal(proposal.ok, true);
  if (!proposal.ok) return;
  assert.deepEqual(proposal.value.entry, {
    id: "new-draft-uuid",
    date: "056.M42",
    title: "The Unknown Anchorage",
    category: "world",
    status: "draft",
    content: "A provisional survey awaiting the Chapter Master's judgement.",
    createdAt: 600,
    updatedAt: 600,
  });
  assert.deepEqual(proposal.state.entries, current.entries);
  assert.equal(current.loreEntries.length, 1);
});

test("the on-site editor preserves record identity, status, creation time, and the canon mirror", () => {
  const current = reviewState();
  current.entries = ["008.M42 - An established canon record."];
  const proposal = proposeLoreEditorUpdate(
    current,
    current.loreEntries[0].id,
    {
      date: "Pre-008.M42",
      title: "Revised provenance dossier",
      category: "relic",
      content: "Revised review material, still awaiting judgement.",
    },
    200,
    700,
  );

  assert.equal(proposal.ok, true);
  if (!proposal.ok) return;
  assert.equal(proposal.value.entry.id, current.loreEntries[0].id);
  assert.equal(proposal.value.entry.status, "review");
  assert.equal(proposal.value.entry.createdAt, 100);
  assert.equal(proposal.value.entry.updatedAt, 700);
  assert.equal(proposal.value.entry.title, "Revised provenance dossier");
  assert.deepEqual(proposal.state.entries, current.entries);
  assert.equal(current.loreEntries[0].title, "Provenance and Antiquity of the Lunaris");
});

test("the on-site editor rejects stale writes, duplicate lore, and direct canon editing", () => {
  const current = reviewState();
  const input = {
    date: current.loreEntries[0].date,
    title: current.loreEntries[0].title,
    category: current.loreEntries[0].category,
    content: current.loreEntries[0].content,
  };

  assert.deepEqual(
    proposeLoreEditorUpdate(current, current.loreEntries[0].id, input, 199, 700),
    { ok: false, reason: "stale" },
  );

  const canon = {
    ...current,
    loreEntries: [{ ...current.loreEntries[0], status: "canon" }],
  };
  assert.deepEqual(
    proposeLoreEditorUpdate(canon, canon.loreEntries[0].id, input, 200, 700),
    { ok: false, reason: "canon-locked" },
  );

  assert.deepEqual(
    proposeLoreDraftCreation(current, input, "duplicate", 700),
    { ok: false, reason: "duplicate" },
  );
});
