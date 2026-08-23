import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  parseLoreCreateBody,
  parseLoreUpdateBody,
} from "../app/api/gpt/v1/entries/validation.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("GPT lore writes accept only known development topic IDs", () => {
  const valid = parseLoreCreateBody({
    content: "A developing record.",
    developmentTopicIds: [" Fleet ", "combat_doctrine", "fleet"],
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value.developmentTopicIds, ["fleet", "combat-doctrine"]);

  const invalid = parseLoreUpdateBody({ developmentTopicIds: ["not-real"] });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Unknown development topic ID/);
});

test("development routes remain Bearer-protected and bounded", async () => {
  for (const path of [
    "app/api/gpt/v1/development/topics/route.ts",
    "app/api/gpt/v1/development/topics/[id]/route.ts",
    "app/api/gpt/v1/development/unmapped/route.ts",
  ]) {
    const source = await read(path);
    assert.match(source, /requireGPTApiKey\(request\)/);
    assert.doesNotMatch(source, /export async function (DELETE|PUT)/);
  }
  const topics = await read("app/api/gpt/v1/development/topics/route.ts");
  assert.match(topics, /limit < 1 \|\| limit > 50/);
});

test("OpenAPI publishes the development actions and existing PATCH link surface", async () => {
  const schema = await read("openapi/lunar-dragons-gpt.yaml");
  for (const operation of [
    "listChapterDevelopmentTopics",
    "getChapterDevelopmentTopic",
    "listUnmappedDevelopmentLore",
  ]) assert.match(schema, new RegExp(`operationId: ${operation}`));
  assert.match(schema, /developmentTopicIds:/);
  assert.match(schema, /unknown IDs are rejected/i);
});

test("non-admin archive responses conceal development planning metadata", async () => {
  const source = await read("app/api/archive/route.ts");
  assert.match(source, /milestones: data\.milestones\.filter\(\(milestone\) => !milestone\.topicId\)/);
  assert.match(source, /developmentTopicIds: _developmentTopicIds/);
});
