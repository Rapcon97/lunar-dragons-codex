import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCharacterDraft,
  createExtractedCharacterDraft,
  removeCharacterRecord,
} from "../app/character-records.ts";

const existing = {
  id: "character-stable-id",
  name: "Captain Selene",
  rank: "Captain",
  honorific: "",
  role: "Company command",
  companyNumber: "1st",
  status: "active",
  introducedAt: "056.M42",
  deathAt: "",
  biography: "Earlier archive text.",
  heroicDeeds: ["Held the western wall."],
  loreEntryIds: ["canon-old"],
  createdAt: 100,
  updatedAt: 200,
};

const extractedProposal = {
  name: "Captain Selene",
  rank: "Captain",
  honorific: "The Vigilant",
  role: "Company command",
  companyNumber: "1st",
  status: "active",
  introducedAt: "056.M42",
  deathAt: "",
  biography: "Revised from selected canon.",
  heroicDeeds: ["Held the western wall.", "Recovered the gate."],
};

test("lore extraction revisions preserve stable character identity and creation metadata", () => {
  const draft = createExtractedCharacterDraft({
    proposal: extractedProposal,
    loreEntryIds: ["canon-new"],
    existingCharacter: existing,
    newId: "must-not-be-used",
    now: 300,
  });

  assert.equal(draft.id, existing.id);
  assert.equal(draft.createdAt, existing.createdAt);
  assert.equal(draft.updatedAt, 300);
  assert.deepEqual(draft.loreEntryIds, ["canon-new"]);

  const applied = applyCharacterDraft([existing], draft, existing.id);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.characters.length, 1);
  assert.equal(applied.characters[0].id, existing.id);
  assert.equal(applied.characters[0].biography, "Revised from selected canon.");
});

test("new lore extractions still receive a new stable identity", () => {
  const draft = createExtractedCharacterDraft({
    proposal: extractedProposal,
    loreEntryIds: ["canon-new"],
    newId: "new-character-id",
    now: 300,
  });

  const applied = applyCharacterDraft([existing], draft, null);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.characters.length, 2);
  assert.equal(applied.characters[1].id, "new-character-id");
});

test("a missing revision target fails closed instead of creating a duplicate", () => {
  const draft = { ...existing, biography: "Revision", updatedAt: 300 };
  const applied = applyCharacterDraft([], draft, existing.id);

  assert.equal(applied.ok, false);
  if (applied.ok) return;
  assert.match(applied.error, /no longer exists/u);
});

test("character deletion removes only the exact stable record ID", () => {
  const duplicateName = { ...existing, id: "different-stable-id", createdAt: 101 };
  const removed = removeCharacterRecord([existing, duplicateName], duplicateName.id);

  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  assert.deepEqual(removed.characters.map((character) => character.id), [existing.id]);
});

test("character deletion fails closed for missing or ambiguous stable IDs", () => {
  const missing = removeCharacterRecord([existing], "missing-id");
  const ambiguous = removeCharacterRecord([existing, { ...existing }], existing.id);

  assert.equal(missing.ok, false);
  assert.equal(ambiguous.ok, false);
});
