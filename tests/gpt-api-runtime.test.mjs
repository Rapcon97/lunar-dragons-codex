import test from "node:test";
import assert from "node:assert/strict";

import { applyOptimisticMutation } from "../storage/optimistic-write.ts";
import {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
  parseLoreCreateBody,
  parseLoreUpdateBody,
} from "../app/api/gpt/v1/entries/validation.ts";
import { normalizeArchiveData } from "../app/archive-data.ts";
import {
  formatLoreChronology,
  parseLoreChronology,
  validateLoreChronology,
} from "../app/lore-chronology.ts";
import {
  MAX_LORE_COLLECTION_BYTES,
  loreCollectionFitsCapacity,
  loreCollectionSizeBytes,
} from "../app/lore-limits.ts";
import {
  GPT_CONTENT_PREVIEW_LENGTH,
  GPT_ENTRY_LIST_DEFAULT_LIMIT,
  GPT_ENTRY_LIST_MAX_LIMIT,
  GPT_SEARCH_RESULT_LIMIT,
  boundedGPTContent,
  paginateGPTLoreEntries,
} from "../app/gpt-response-window.ts";

function makeLoreEntry(index, content = `Archive record ${index}`) {
  return {
    id: `lore-${index}`,
    date: "056.M42",
    title: `Record ${index}`,
    category: "event",
    status: "draft",
    content,
    createdAt: 1_000 + index,
    updatedAt: 2_000 + index,
  };
}

test("GPT discovery responses use bounded deterministic previews", () => {
  const content = "x".repeat(GPT_CONTENT_PREVIEW_LENGTH + 50);
  const first = boundedGPTContent(content);
  const second = boundedGPTContent(content);

  assert.deepEqual(first, second);
  assert.equal(first.contentLength, content.length);
  assert.equal(first.contentTruncated, true);
  assert.match(first.content, /CONTENT TRUNCATED.*RETRIEVE RECORD BY ID/s);
  assert.ok(first.content.length < content.length);
  assert.equal(GPT_SEARCH_RESULT_LIMIT, 20);
});

test("GPT lore listing is bounded, paginated, and preserves stable IDs", () => {
  const entries = Array.from({ length: 57 }, (_, index) =>
    makeLoreEntry(index, "x".repeat(GPT_CONTENT_PREVIEW_LENGTH + index)),
  );
  const first = paginateGPTLoreEntries(entries);
  const second = paginateGPTLoreEntries(entries, {
    offset: first.nextOffset ?? 0,
    limit: GPT_ENTRY_LIST_MAX_LIMIT,
  });

  assert.equal(first.limit, GPT_ENTRY_LIST_DEFAULT_LIMIT);
  assert.equal(first.returned, GPT_ENTRY_LIST_DEFAULT_LIMIT);
  assert.equal(first.count, entries.length);
  assert.equal(first.hasMore, true);
  assert.equal(first.nextOffset, GPT_ENTRY_LIST_DEFAULT_LIMIT);
  assert.equal(first.contentMode, "preview");
  assert.equal(first.entries[0].id, entries[0].id);
  assert.equal(first.entries[0].contentTruncated, false);
  assert.equal(first.entries.at(-1).id, entries[19].id);
  assert.equal(second.entries[0].id, entries[20].id);
  assert.equal(second.entries.at(-1).id, entries.at(-1).id);
  assert.equal(second.hasMore, false);
  assert.equal(second.nextOffset, null);
});

test("full-content lore listing is conservatively limited to one record", () => {
  const entries = [
    makeLoreEntry(1, "a".repeat(30_000)),
    makeLoreEntry(2, "b".repeat(30_000)),
  ];
  const result = paginateGPTLoreEntries(entries, {
    offset: 0,
    limit: 50,
    includeContent: true,
  });

  assert.equal(result.limit, 1);
  assert.equal(result.returned, 1);
  assert.equal(result.contentMode, "full");
  assert.equal(result.entries[0].content, entries[0].content);
  assert.equal(result.entries[0].contentTruncated, false);
  assert.equal(result.hasMore, true);
});

test("omitted structured lore status defaults to draft", () => {
  const result = parseLoreCreateBody({ content: "A newly recovered account." });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.status, "draft");
});

test("explicit valid structured lore status is preserved", () => {
  const result = parseLoreCreateBody({
    content: "An approved decree.",
    status: "canon",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.status, "canon");
});

test("explicit unknown structured lore status is rejected", () => {
  const result = parseLoreCreateBody({
    content: "Unclassified material.",
    status: "probably-canon",
  });
  assert.deepEqual(result, {
    ok: false,
    error: "Invalid lore entry status.",
  });
});

test("structured lore validation enforces content bounds", () => {
  assert.equal(MAX_LORE_CONTENT_LENGTH, 64_000);
  assert.equal(
    parseLoreCreateBody({
      content: "x".repeat(MAX_LORE_CONTENT_LENGTH),
    }).ok,
    true,
  );
  assert.equal(
    parseLoreUpdateBody({
      content: "x".repeat(MAX_LORE_CONTENT_LENGTH),
    }).ok,
    true,
  );

  const result = parseLoreCreateBody({
    content: "x".repeat(MAX_LORE_CONTENT_LENGTH + 1),
  });
  assert.deepEqual(result, {
    ok: false,
    error: "Lore entry content is too long.",
  });
});

test("structured lore accepts an optional bounded subtitle and allows clearing it", () => {
  assert.equal(MAX_LORE_SUBTITLE_LENGTH, 360);
  const created = parseLoreCreateBody({
    title: "Lunaris",
    subtitle: "Bearer of the First Stone",
    content: "The Chapter flagship remains under seal.",
  });
  assert.equal(created.ok, true);
  if (created.ok) assert.equal(created.value.subtitle, "Bearer of the First Stone");

  const cleared = parseLoreUpdateBody({ subtitle: "" });
  assert.equal(cleared.ok, true);
  if (cleared.ok) assert.equal(cleared.value.subtitle, "");

  assert.deepEqual(
    parseLoreCreateBody({
      subtitle: "x".repeat(MAX_LORE_SUBTITLE_LENGTH + 1),
      content: "A record with an excessive secondary title.",
    }),
    { ok: false, error: "Lore entry subtitle is too long." },
  );
});

test("Imperial chronology parses and formats canonical exact, ranged, coarse, and ongoing dates", () => {
  const examples = [
    ["012.M42", "012.M42"],
    ["C.001.M42–012.M42", "C.001.M42–012.M42"],
    ["LATE M30–PRESENT", "LATE M30–PRESENT"],
    ["008.M42–PRESENT", "008.M42–PRESENT"],
    ["???.M42", "???.M42"],
    ["Late M30–056.M42", "LATE M30–056.M42"],
    ["012.M42–present", "012.M42–PRESENT"],
  ];

  for (const [input, canonical] of examples) {
    const chronology = parseLoreChronology(input);
    assert.ok(chronology, `Expected ${input} to parse`);
    assert.equal(formatLoreChronology(chronology), canonical);
  }
});

test("structured GPT chronology generates the compatibility date display", () => {
  const chronology = {
    start: { millennium: 30, precision: "late" },
    ongoing: true,
  };
  const result = parseLoreCreateBody({
    chronology,
    content: "The vessel remains in active Chapter service.",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.date, "LATE M30–PRESENT");
  assert.deepEqual(result.value.chronology, chronology);
});

test("parseable legacy date input is canonicalized and receives typed chronology", () => {
  const result = parseLoreUpdateBody({ date: "8.m42 - present" });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.date, "008.M42–PRESENT");
  assert.deepEqual(result.value.chronology, {
    start: { millennium: 42, precision: "exact", year: 8 },
    ongoing: true,
  });
});

test("structured chronology rejects invalid values and conflicting date mirrors", () => {
  assert.deepEqual(
    validateLoreChronology({
      start: { millennium: 42, precision: "exact", year: 1000 },
    }),
    {
      ok: false,
      error:
        "Lore chronology start year must be an integer from 0 to 999 for exact dates.",
    },
  );

  assert.deepEqual(
    parseLoreCreateBody({
      date: "008.M42",
      chronology: {
        start: { millennium: 42, precision: "exact", year: 12 },
      },
      content: "A contradictory chronology record.",
    }),
    {
      ok: false,
      error: "Lore entry date does not match its structured chronology.",
    },
  );
});

test("unstructured chronology is rejected by GPT writes instead of becoming an untyped date", () => {
  const result = parseLoreCreateBody({
    date: "Before the opening of the Great Rift",
    content: "A legacy record whose exact chronology remains unresolved.",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Lore entry date must use a supported Imperial chronology format.",
  });
});

test("empty explicit chronology dates are rejected while omitted dates remain compatible", () => {
  assert.deepEqual(parseLoreUpdateBody({ date: "" }), {
    ok: false,
    error: "Lore entry date must use a supported Imperial chronology format.",
  });
  const omitted = parseLoreCreateBody({ content: "A deliberately undated draft." });
  assert.equal(omitted.ok, true);
  if (omitted.ok) {
    assert.equal(omitted.value.date, undefined);
    assert.equal(omitted.value.chronology, undefined);
  }
});

test("archive normalization preserves typed chronology and canonicalizes its date mirror", () => {
  const normalized = normalizeArchiveData({
    entries: [],
    loreEntries: [
      {
        id: "gift-of-luna-chronology",
        date: "8.m42 - present",
        title: "Gift of Luna",
        category: "relic",
        status: "canon",
        content: "The founding trust remains in Chapter keeping.",
        createdAt: 10,
        updatedAt: 20,
      },
    ],
  });

  assert.equal(normalized.loreEntries[0]?.date, "008.M42–PRESENT");
  assert.deepEqual(normalized.loreEntries[0]?.chronology, {
    start: { millennium: 42, precision: "exact", year: 8 },
    ongoing: true,
  });
});

test("archive normalization preserves lore content beyond the former limit", () => {
  const content = "x".repeat(12_001);
  const normalized = normalizeArchiveData({
    entries: [],
    loreEntries: [
      {
        id: "long-lore-record",
        date: "008.M42",
        title: "Long-form record",
        subtitle: "A preserved secondary designation",
        category: "relic",
        status: "review",
        content,
        createdAt: 10,
        updatedAt: 20,
      },
    ],
  });

  assert.equal(normalized.loreEntries[0]?.id, "long-lore-record");
  assert.equal(normalized.loreEntries[0]?.content, content);
  assert.equal(
    normalized.loreEntries[0]?.subtitle,
    "A preserved secondary designation",
  );
});

test("archive normalization keeps legacy lore without inventing a subtitle", () => {
  const normalized = normalizeArchiveData({
    entries: [],
    loreEntries: [
      {
        id: "legacy-compatible-record",
        date: "008.M42",
        title: "Existing title",
        category: "event",
        status: "canon",
        content: "Existing content.",
        createdAt: 10,
        updatedAt: 20,
      },
    ],
  });

  assert.equal(normalized.loreEntries[0]?.subtitle, undefined);
});

test("archive normalization removes the placeholder relic and seals the Gift's physical form", () => {
  const normalized = normalizeArchiveData({
    relics: [
      { name: "The Gift of Luna", type: "Fragment of Luna · Founding stone", status: "Awaiting record" },
      { name: "Lunaris", type: "Chapter Flagship · Battle Barge", status: "Bearer of the First Stone · The Argent Spear" },
      { name: "Ancient chassis unrecorded", type: "Dreadnought", status: "Awaiting record" },
      { name: "The Argent Key", type: "Chapter relic", status: "Sealed" },
    ],
  });

  assert.deepEqual(normalized.relics.map((relic) => relic.name), [
    "The Gift of Luna",
    "Lunaris",
    "The Argent Key",
  ]);
  assert.equal(normalized.relics[0]?.type, "Founding trust · physical form sealed");
  assert.equal(normalized.relics[0]?.status, "In Chapter keeping · future foundation unfulfilled");
});

test("structured lore collection uses a 512 KB UTF-8 capacity budget", () => {
  const exact = ["x".repeat(MAX_LORE_COLLECTION_BYTES - 4)];
  assert.equal(loreCollectionSizeBytes(exact), MAX_LORE_COLLECTION_BYTES);
  assert.equal(loreCollectionFitsCapacity(exact), true);
  assert.equal(
    loreCollectionFitsCapacity(["x".repeat(MAX_LORE_COLLECTION_BYTES - 3)]),
    false,
  );
  assert.equal(
    loreCollectionSizeBytes(["é"]),
    new TextEncoder().encode('["é"]').byteLength,
  );
});

test("partial updates reject an explicit unknown status", () => {
  const result = parseLoreUpdateBody({ status: "approved-ish" });
  assert.deepEqual(result, {
    ok: false,
    error: "Invalid lore entry status.",
  });
});

test("optimistic mutation commits without retry when revision is current", async () => {
  let state = { revision: 7, entries: ["existing"] };
  const result = await applyOptimisticMutation({
    load: async () => structuredClone(state),
    propose: (current) => ({
      ok: true,
      state: { ...current, entries: [...current.entries, "new"] },
      value: current.entries.length + 1,
    }),
    commit: async (current, next) => {
      if (state.revision !== current.revision) return false;
      state = { ...next, revision: current.revision + 1 };
      return true;
    },
  });

  assert.deepEqual(result, { success: true, value: 2, attempts: 1 });
  assert.deepEqual(state.entries, ["existing", "new"]);
});

test("optimistic mutation reloads and preserves a concurrent write", async () => {
  let state = { revision: 3, entries: ["existing"] };
  let firstCommit = true;
  const result = await applyOptimisticMutation({
    load: async () => structuredClone(state),
    propose: (current) => ({
      ok: true,
      state: { ...current, entries: [...current.entries, "gpt"] },
      value: current.entries.length + 1,
    }),
    commit: async (current, next) => {
      if (firstCommit) {
        firstCommit = false;
        state = {
          revision: state.revision + 1,
          entries: [...state.entries, "admin"],
        };
        return false;
      }
      if (state.revision !== current.revision) return false;
      state = { ...next, revision: current.revision + 1 };
      return true;
    },
    maxAttempts: 3,
  });

  assert.deepEqual(result, { success: true, value: 3, attempts: 2 });
  assert.deepEqual(state.entries, ["existing", "admin", "gpt"]);
});

test("optimistic mutation returns conflict after the bounded retry limit", async () => {
  let commits = 0;
  const result = await applyOptimisticMutation({
    load: async () => ({ revision: commits }),
    propose: (current) => ({ ok: true, state: current, value: "unused" }),
    commit: async () => {
      commits += 1;
      return false;
    },
    maxAttempts: 3,
  });

  assert.deepEqual(result, {
    success: false,
    reason: "conflict",
    attempts: 3,
  });
  assert.equal(commits, 3);
});

test("domain validation failure does not attempt a commit", async () => {
  let commits = 0;
  const result = await applyOptimisticMutation({
    load: async () => ({ entries: ["duplicate"] }),
    propose: () => ({ ok: false, reason: "duplicate" }),
    commit: async () => {
      commits += 1;
      return true;
    },
  });

  assert.deepEqual(result, {
    success: false,
    reason: "duplicate",
    attempts: 1,
  });
  assert.equal(commits, 0);
});
