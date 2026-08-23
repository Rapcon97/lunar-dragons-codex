import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  DEVELOPMENT_TOPICS,
  deriveDevelopmentTopicStatus,
  developmentTopicSummaries,
  getDevelopmentTopic,
  unmappedDevelopmentLore,
} from "../app/chapter-development.ts";

function lore(id, status, topicIds = []) {
  return {
    id,
    date: "056.M42",
    title: id,
    category: "event",
    status,
    content: `${id} content`,
    developmentTopicIds: topicIds,
    createdAt: 1,
    updatedAt: 2,
  };
}

test("development taxonomy is stable and normalizes controlled IDs", () => {
  assert.equal(DEVELOPMENT_TOPICS.length, 26);
  assert.equal(getDevelopmentTopic("  HERALDRY_colours ")?.id, "heraldry-colours");
  assert.equal(getDevelopmentTopic("invented-topic"), undefined);
});

test("topic status is derived from the strongest linked lore state", () => {
  const entries = [
    lore("draft", "draft", ["fleet"]),
    lore("review", "review", ["fleet"]),
    lore("canon", "canon", ["fleet"]),
  ];
  assert.equal(deriveDevelopmentTopicStatus("fleet", entries), "established");
  assert.equal(deriveDevelopmentTopicStatus("recruitment", entries), "undeveloped");
});

test("manual unresolved and operational states override derived progress", () => {
  const entries = [lore("canon", "canon", ["homeworld-domain"])];
  assert.equal(
    deriveDevelopmentTopicStatus("homeworld-domain", entries, [{
      label: "Homeworld",
      done: false,
      topicId: "homeworld-domain",
      manualStatus: "intentionally-unresolved",
    }]),
    "intentionally-unresolved",
  );
});

test("summaries expose stable IDs without copying full lore and unmapped inbox remains deterministic", () => {
  const entries = [
    lore("linked", "review", ["combat-doctrine"]),
    lore("unmapped", "draft"),
  ];
  const topic = developmentTopicSummaries(entries).find((item) => item.id === "combat-doctrine");
  assert.equal(topic.linkedCount, 1);
  assert.equal(topic.linkedEntries[0].id, "linked");
  assert.equal("content" in topic.linkedEntries[0], false);
  assert.deepEqual(unmappedDevelopmentLore(entries).map((entry) => entry.id), ["unmapped"]);
});

test("development ledger renders only for ChatGPT administrators in active Admin Mode", async () => {
  const source = await readFile(
    new URL("../app/_components/ChapterDevelopmentLedger.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /if \(!canAdmin \|\| !isAdminMode\) return null/);
  assert.match(source, /Chapter Development Ledger/);
});
