import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LORE_ASSISTANT_MODEL,
  buildLoreAssistantOpenAIRequest,
  loreAssistantSafetyIdentifier,
  parseLoreAssistantAnswer,
  parseLoreAssistantRequest,
  selectCanonLoreContext,
} from "../app/lore-assistant.ts";

function loreEntry(overrides = {}) {
  return {
    id: "canon-1",
    date: "008.M42",
    title: "Decree of Reclamation and Vigilance",
    category: "decree",
    status: "canon",
    content: "The Lunar Dragons prosecute the Argent Vigil under Imperial seal.",
    createdAt: 100,
    updatedAt: 200,
    ...overrides,
  };
}

function validRequest(overrides = {}) {
  return {
    message: "Audit this record against established canon.",
    history: [],
    draft: {
      recordId: "draft-1",
      status: "draft",
      date: "056.M42",
      title: "Provisional record",
      subtitle: "A development record",
      category: "event",
      content: "A development proposal awaiting judgement.",
    },
    ...overrides,
  };
}

test("lore assistant accepts a bounded consultation and rejects unsafe shapes", () => {
  const accepted = parseLoreAssistantRequest(validRequest());
  assert.equal(accepted.ok, true);

  assert.equal(
    parseLoreAssistantRequest({ ...validRequest(), unexpected: true }).ok,
    false,
  );
  assert.equal(
    parseLoreAssistantRequest({
      ...validRequest(),
      message: "x".repeat(4_001),
    }).ok,
    false,
  );
  assert.equal(
    parseLoreAssistantRequest({
      ...validRequest(),
      draft: { ...validRequest().draft, status: "established" },
    }).ok,
    false,
  );
});

test("lore assistant context contains canon only", () => {
  const request = parseLoreAssistantRequest(validRequest());
  assert.equal(request.ok, true);
  if (!request.ok) return;

  const context = selectCanonLoreContext(
    [
      loreEntry(),
      loreEntry({ id: "draft-2", status: "draft", content: "SECRET DRAFT MATERIAL" }),
      loreEntry({ id: "review-1", status: "review", content: "SECRET REVIEW MATERIAL" }),
      loreEntry({ id: "retconned-1", status: "retconned", content: "REJECTED HISTORY" }),
    ],
    request.value,
  );

  const rendered = `${context.index.join("\n")}\n${context.records.join("\n")}`;
  assert.equal(context.canonIds.has("canon-1"), true);
  assert.equal(context.canonIds.size, 1);
  assert.match(rendered, /Argent Vigil/u);
  assert.doesNotMatch(rendered, /SECRET DRAFT MATERIAL|SECRET REVIEW MATERIAL|REJECTED HISTORY/u);
});

test("canon selection and Responses request are deterministic and structured", () => {
  const request = parseLoreAssistantRequest(validRequest());
  assert.equal(request.ok, true);
  if (!request.ok) return;
  const entries = [
    loreEntry(),
    loreEntry({ id: "canon-2", title: "The Lunaris", category: "relic" }),
  ];

  assert.deepEqual(
    selectCanonLoreContext(entries, request.value),
    selectCanonLoreContext(entries, request.value),
  );

  const payload = buildLoreAssistantOpenAIRequest(request.value, entries, "ld-test-hash");
  assert.equal(payload.model, LORE_ASSISTANT_MODEL);
  assert.equal(payload.model, "gpt-5.5");
  assert.equal(payload.store, false);
  assert.equal(payload.safety_identifier, "ld-test-hash");
  assert.equal(payload.text.format.type, "json_schema");
  assert.equal(payload.text.format.strict, true);
  assert.equal(JSON.stringify(payload).includes("OPENAI_API_KEY"), false);
});

test("assistant response validation preserves a complete proposal and filters invented canon IDs", () => {
  const answer = parseLoreAssistantAnswer(
    {
      output_text: JSON.stringify({
        reply: "The record is compatible with the Decree but leaves its destination unresolved.",
        suggestion: {
          date: "056.M42",
          title: "A Revised Provisional Record",
          subtitle: "Submitted for archival judgement",
          category: "event",
          content: "The revised complete record.",
        },
        suggestionSummary: "Archival voice refined; unsupported certainty removed.",
        canonReferences: ["canon-1", "invented-id", "canon-1"],
      }),
    },
    new Set(["canon-1"]),
  );

  assert.ok(answer);
  assert.deepEqual(answer.canonReferences, ["canon-1"]);
  assert.equal(answer.suggestion?.title, "A Revised Provisional Record");
  assert.equal(answer.suggestion?.subtitle, "Submitted for archival judgement");
  assert.equal(answer.suggestion?.content, "The revised complete record.");
});

test("assistant response parser supports the Responses output message shape", () => {
  const answer = parseLoreAssistantAnswer(
    {
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                reply: "Canon audit complete.",
                suggestion: null,
                suggestionSummary: null,
                canonReferences: [],
              }),
            },
          ],
        },
      ],
    },
    new Set(),
  );
  assert.equal(answer?.reply, "Canon audit complete.");
  assert.equal(answer?.suggestion, null);
});

test("administrator identity is reduced to a stable privacy-preserving safety identifier", async () => {
  const first = await loreAssistantSafetyIdentifier("Guido@example.com");
  const second = await loreAssistantSafetyIdentifier(" guido@EXAMPLE.com ");
  assert.equal(first, second);
  assert.match(first, /^ld-[a-f0-9]{64}$/u);
  assert.equal(first.includes("guido"), false);
  assert.equal(first.includes("example"), false);
});

test("assistant route and editor preserve the admin-mode and no-direct-write boundary", () => {
  const route = readFileSync("app/api/admin/lore-assistant/route.ts", "utf8");
  const editor = readFileSync("app/_components/LoreEntryEditor.tsx", "utf8");
  const panel = readFileSync("app/_components/LoreCogitatorPanel.tsx", "utf8");

  assert.match(route, /getArchiveAdmin\(\)/u);
  assert.match(route, /isSameOriginRequest\(request\)/u);
  assert.match(route, /x-lunar-admin-mode/u);
  assert.match(route, /OPENAI_API_KEY/u);
  assert.match(route, /readChapterArchive\(\)/u);
  assert.doesNotMatch(route, /writeChapterArchive|resetChapterArchive|DELETE/u);
  assert.match(editor, /assistantOpen &&/u);
  assert.match(panel, /APPLY PROPOSAL TO EDITOR/u);
  assert.doesNotMatch(panel, /api\/admin\/lore(?:\/|"|`)/u);
});
