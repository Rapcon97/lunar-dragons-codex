import test from "node:test";
import assert from "node:assert/strict";

import { applyOptimisticMutation } from "../storage/optimistic-write.ts";
import {
  MAX_LORE_CONTENT_LENGTH,
  parseLoreCreateBody,
  parseLoreUpdateBody,
} from "../app/api/gpt/v1/entries/validation.ts";
import { normalizeArchiveData } from "../app/archive-data.ts";
import {
  MAX_LORE_COLLECTION_BYTES,
  loreCollectionFitsCapacity,
  loreCollectionSizeBytes,
} from "../app/lore-limits.ts";

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

test("archive normalization preserves lore content beyond the former limit", () => {
  const content = "x".repeat(12_001);
  const normalized = normalizeArchiveData({
    entries: [],
    loreEntries: [
      {
        id: "long-lore-record",
        date: "008.M42",
        title: "Long-form record",
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
