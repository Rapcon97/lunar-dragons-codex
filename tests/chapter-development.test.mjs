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
import {
  buildDevelopmentAssistantOpenAIRequest,
  parseDevelopmentAssistantAnswer,
  parseDevelopmentAssistantRequest,
} from "../app/development-assistant.ts";
import {
  normalizeDevelopmentTopicIds,
  proposeDevelopmentTopicLinkUpdate,
} from "../app/development-links.ts";

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

test("development links update one stable record without changing lore or status", () => {
  const entry = lore("stable-record", "review", ["fleet"]);
  const current = {
    entries: ["compatibility mirror"],
    loreEntries: [entry],
    updatedAt: 100,
  };
  const result = proposeDevelopmentTopicLinkUpdate(
    current,
    entry.id,
    [" Fleet ", "combat_doctrine", "fleet"],
    entry.updatedAt,
    50,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.entry.id, entry.id);
  assert.equal(result.value.entry.status, "review");
  assert.equal(result.value.entry.content, entry.content);
  assert.equal(result.value.entry.createdAt, entry.createdAt);
  assert.equal(result.value.entry.updatedAt, 50);
  assert.deepEqual(result.value.entry.developmentTopicIds, ["fleet", "combat-doctrine"]);
  assert.deepEqual(result.state.entries, current.entries);

  assert.deepEqual(
    proposeDevelopmentTopicLinkUpdate(current, entry.id, ["fleet"], 999, 50),
    { ok: false, reason: "stale" },
  );
  assert.equal(normalizeDevelopmentTopicIds(["invented-topic"]), null);
});

test("development cogitator produces a controlled advisory proposal without a write", () => {
  assert.deepEqual(parseDevelopmentAssistantRequest({ entryId: "stable-record", expectedUpdatedAt: 2 }), {
    ok: true,
    value: { entryId: "stable-record", expectedUpdatedAt: 2 },
  });
  assert.equal(parseDevelopmentAssistantRequest({ entryId: "stable-record", expectedUpdatedAt: 2, status: "canon" }).ok, false);

  const request = buildDevelopmentAssistantOpenAIRequest(lore("stable-record", "draft"), "ld-test");
  assert.equal(request.store, false);
  assert.match(request.instructions, /administrator will review/i);
  assert.match(request.input[0].content, /fleet \| Fleet and void assets/);

  assert.deepEqual(parseDevelopmentAssistantAnswer({ output_text: JSON.stringify({
    topicIds: ["fleet", "combat-doctrine"],
    summary: "The record materially covers fleet doctrine.",
  }) }), {
    topicIds: ["fleet", "combat-doctrine"],
    summary: "The record materially covers fleet doctrine.",
  });
  assert.equal(parseDevelopmentAssistantAnswer({ output_text: JSON.stringify({
    topicIds: ["invented-topic"],
    summary: "Invalid.",
  }) }), null);
});

test("development ledger renders only for ChatGPT administrators in active Admin Mode", async () => {
  const [ledger, sectionPage, sidebar, linkRoute, assistantRoute] = await Promise.all([
    readFile(new URL("../app/_components/ChapterDevelopmentLedger.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/_components/SidebarNavigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/development/links/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/development/analyse/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(ledger, /if \(!canAdmin \|\| !isAdminMode\) return null/);
  assert.match(ledger, /Chapter Development Ledger/);
  assert.match(sectionPage, /section === "development" && canAdmin && isAdminMode/);
  assert.match(sectionPage, /section === "development" && \(!canAdmin \|\| !isAdminMode\)/);
  assert.match(sidebar, /item\.icon !== "development" \|\| \(canAdmin && isAdminMode\)/);
  assert.match(ledger, /Record Link Console/);
  assert.match(ledger, /COGITATE LINK PROPOSAL/);
  assert.match(ledger, /SEAL RECORD LINKS/);
  assert.match(ledger, /PROPOSAL LOADED \/\/ REVIEW BEFORE SEALING/);
  assert.match(linkRoute, /getArchiveAdmin/);
  assert.match(linkRoute, /isSameOriginRequest/);
  assert.match(linkRoute, /x-lunar-admin-mode/);
  assert.match(linkRoute, /updateAdminLoreDevelopmentTopics/);
  assert.match(assistantRoute, /OPENAI_API_KEY/);
  assert.match(assistantRoute, /x-lunar-admin-mode/);
  assert.doesNotMatch(assistantRoute, /updateAdminLoreDevelopmentTopics/);

  const settingsStart = sectionPage.indexOf("function SettingsSection(");
  const settingsEnd = sectionPage.indexOf("type GuestUser", settingsStart);
  assert.ok(settingsStart > -1 && settingsEnd > settingsStart);
  assert.doesNotMatch(sectionPage.slice(settingsStart, settingsEnd), /ChapterDevelopmentLedger/);
});
