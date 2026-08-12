import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCharacterExtractionOpenAIRequest,
  parseCharacterExtractionAnswer,
  parseCharacterExtractionRequest,
  selectCharacterCanonSources,
} from "../app/character-extractor.ts";

const companies = [{ number: "1st", name: "First", role: "Veterans", strength: 10 }];
const canon = {
  id: "canon-character-source",
  date: "056.M42",
  title: "The Captain's Vigil",
  category: "character",
  status: "canon",
  content: "Captain Selene held the western wall. Her company is not recorded.",
  createdAt: 1,
  updatedAt: 2,
};

test("character extraction requires unique selected source IDs", () => {
  assert.equal(parseCharacterExtractionRequest({ loreEntryIds: [], instructions: "" }).ok, false);
  assert.equal(parseCharacterExtractionRequest({ loreEntryIds: ["same", "same"], instructions: "" }).ok, false);
  assert.deepEqual(parseCharacterExtractionRequest({ loreEntryIds: [canon.id], instructions: "Extract Selene" }), {
    ok: true,
    value: { loreEntryIds: [canon.id], instructions: "Extract Selene" },
  });
});

test("character extraction accepts canon only and fails closed for other statuses", () => {
  assert.equal(selectCharacterCanonSources([canon], [canon.id]).ok, true);
  assert.equal(selectCharacterCanonSources([{ ...canon, status: "review" }], [canon.id]).ok, false);
  assert.equal(selectCharacterCanonSources([canon], ["missing"]).ok, false);
});

test("OpenAI request contains only selected canon and remains advisory", () => {
  const parsed = parseCharacterExtractionRequest({ loreEntryIds: [canon.id], instructions: "Extract Selene" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const request = buildCharacterExtractionOpenAIRequest(parsed.value, [canon], companies, "ld-safe");
  const serialized = JSON.stringify(request);
  assert.match(serialized, /Captain Selene held the western wall/u);
  assert.match(serialized, /Use only facts explicitly supported/u);
  assert.match(serialized, /return proposal as null/u);
  assert.equal(serialized.includes("OPENAI_API_KEY"), false);
  assert.equal(request.store, false);
});

test("character proposal preserves supported data and clears unknown company identifiers", () => {
  const answer = parseCharacterExtractionAnswer({ output_text: JSON.stringify({
    proposal: {
      name: "Captain Selene",
      rank: "Captain",
      honorific: "",
      role: "",
      companyNumber: "99th",
      status: "active",
      introducedAt: "056.M42",
      deathAt: "",
      biography: "Held the western wall.",
      heroicDeeds: ["Held the western wall."],
    },
    summary: "One character was explicitly established.",
    unresolved: ["Company assignment is not recorded."],
  }) }, companies);
  assert.equal(answer?.proposal?.name, "Captain Selene");
  assert.equal(answer?.proposal?.companyNumber, "");
  assert.deepEqual(answer?.unresolved, ["Company assignment is not recorded."]);
});

test("ambiguous extraction may return no proposal without inventing a character", () => {
  const answer = parseCharacterExtractionAnswer({ output_text: JSON.stringify({
    proposal: null,
    summary: "The selected records describe multiple unnamed officers.",
    unresolved: ["Select or identify one officer."],
  }) }, companies);
  assert.equal(answer?.proposal, null);
});
