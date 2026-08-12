import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultArchiveData, normalizeArchiveData } from "../app/archive-data.ts";

test("character registry starts empty and never invents personnel", () => {
  assert.deepEqual(createDefaultArchiveData().characters, []);
  assert.deepEqual(normalizeArchiveData({}).characters, []);
});

test("character records retain stable IDs, service history, deeds, and canon references", () => {
  const normalized = normalizeArchiveData({ characters: [{
    id: "character-stable-id",
    name: "  Test Character  ",
    rank: "Captain",
    honorific: "The Unyielding",
    role: "Company command",
    companyNumber: "1st",
    status: "deceased",
    introducedAt: "056.M42",
    deathAt: "057.M42",
    biography: "Operational biography.",
    heroicDeeds: [" First deed ", "Second deed"],
    loreEntryIds: ["canon-a", "canon-b"],
    createdAt: 100,
    updatedAt: 200,
  }] });

  assert.deepEqual(normalized.characters[0], {
    id: "character-stable-id",
    name: "Test Character",
    rank: "Captain",
    honorific: "The Unyielding",
    role: "Company command",
    companyNumber: "1st",
    status: "deceased",
    introducedAt: "056.M42",
    deathAt: "057.M42",
    biography: "Operational biography.",
    heroicDeeds: ["First deed", "Second deed"],
    loreEntryIds: ["canon-a", "canon-b"],
    createdAt: 100,
    updatedAt: 200,
  });
});

test("invalid character state and company references fail closed", () => {
  const normalized = normalizeArchiveData({ characters: [
    { id: "duplicate", name: "First", status: "primarch", companyNumber: "99th" },
    { id: "duplicate", name: "Second", status: "active", companyNumber: "1st" },
  ] });

  assert.equal(normalized.characters.length, 1);
  assert.equal(normalized.characters[0].status, "active");
  assert.equal(normalized.characters[0].companyNumber, "");
});
