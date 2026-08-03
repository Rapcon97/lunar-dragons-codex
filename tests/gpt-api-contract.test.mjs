import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const paths = {
  auth: "app/gpt-api-auth.ts",
  adapter: "app/gpt-api-adapter.ts",
  storage: "storage/chapter-records.ts",

  legacyLore: "app/api/gpt/lore/route.ts",
  legacySearch: "app/api/gpt/search/route.ts",
  legacyChronicle: "app/api/gpt/chronicle/route.ts",

  lore: "app/api/gpt/v1/lore/route.ts",
  search: "app/api/gpt/v1/search/route.ts",
  chronicle: "app/api/gpt/v1/chronicle/route.ts",
  entries: "app/api/gpt/v1/entries/route.ts",
  entryUpdate: "app/api/gpt/v1/entries/[id]/route.ts",
  validation: "app/api/gpt/v1/entries/validation.ts",
  optimisticWrite: "storage/optimistic-write.ts",
  migration: "drizzle/0005_structured_lore.sql",
  vite: "vite.config.ts",
};

async function read(path) {
  return readFile(path, "utf8");
}

test("GPT API protected files exist", async () => {
  for (const path of Object.values(paths)) {
    await assert.doesNotReject(
      () => access(path),
      `Expected protected GPT API file to exist: ${path}`,
    );
  }
});

test("GPT API authentication requires Bearer token", async () => {
  const source = await read(paths.auth);

  assert.match(
    source,
    /authorization/i,
    "GPT authentication must inspect the Authorization header",
  );

  assert.match(
    source,
    /Bearer/,
    "GPT authentication must use the Bearer authentication scheme",
  );

  assert.match(
    source,
    /GPT_API_KEY/,
    "GPT authentication must use GPT_API_KEY",
  );

  assert.match(
    source,
    /status:\s*401/,
    "Invalid GPT authentication must return HTTP 401",
  );
});

test("lore endpoint remains authenticated", async () => {
  const source = await read(paths.lore);

  assert.match(
    source,
    /requireGPTApiKey/,
    "Lore endpoint must require GPT API authentication",
  );
});

test("lore endpoint preserves v1 response concepts", async () => {
  const source = await read(paths.lore);

  for (const field of ["chapter", "timeline", "relics", "sector"]) {
    assert.match(
      source,
      new RegExp(`\\b${field}\\s*:`),
      `Lore API must continue exposing '${field}'`,
    );
  }
});

test("search endpoint remains authenticated", async () => {
  const source = await read(paths.search);

  assert.match(
    source,
    /requireGPTApiKey/,
    "Search endpoint must require GPT API authentication",
  );
});

test("search endpoint preserves response contract", async () => {
  const source = await read(paths.search);

  for (const field of ["query", "count", "source", "results"]) {
    assert.match(
      source,
      new RegExp(`\\b${field}\\s*[,:]`),
      `Search API must continue exposing '${field}'`,
    );
  }
});

test("chronicle endpoint remains authenticated", async () => {
  const source = await read(paths.chronicle);

  assert.match(
    source,
    /requireGPTApiKey/,
    "Chronicle endpoint must require GPT API authentication",
  );
});

test("chronicle endpoint rejects duplicate entries", async () => {
  const source = await read(paths.chronicle);

  assert.match(
    source,
    /status:\s*409/,
    "Chronicle API must preserve duplicate protection with HTTP 409",
  );

  assert.match(
    source,
    /already exists/i,
    "Chronicle API must explicitly reject duplicate entries",
  );
});

test("structured entries endpoint remains authenticated", async () => {
  const source = await read(paths.entries);

  assert.match(
    source,
    /requireGPTApiKey/,
    "Structured entries endpoint must require GPT API authentication",
  );
});

test("structured entries endpoint uses GPT adapter", async () => {
  const source = await read(paths.entries);

  assert.match(
    source,
    /getGPTLoreEntries/,
    "Structured entries endpoint must read lore through getGPTLoreEntries",
  );
});

test("GPT adapter exposes structured lore entries", async () => {
  const source = await read(paths.adapter);

  assert.match(
    source,
    /getGPTLoreEntries/,
    "GPT adapter must expose getGPTLoreEntries",
  );

  assert.match(
    source,
    /archive\.loreEntries/,
    "Structured GPT lore must use archive.loreEntries",
  );

  for (const field of [
    "id",
    "date",
    "title",
    "category",
    "status",
    "content",
    "createdAt",
    "updatedAt",
  ]) {
    assert.match(
      source,
      new RegExp(`\\b${field}\\b`),
      `Structured lore model must preserve '${field}'`,
    );
  }
});

test("structured entries endpoint exposes authenticated POST", async () => {
  const source = await read(paths.entries);

  assert.match(
    source,
    /export\s+async\s+function\s+POST\b/,
    "Structured entries endpoint must expose POST",
  );

  assert.match(
    source,
    /requireGPTApiKey/,
    "Structured entries POST must require GPT API authentication",
  );

  assert.match(
    source,
    /appendGPTLoreEntry/,
    "Structured entries POST must write through the GPT adapter",
  );
});

test("structured entries endpoint validates input", async () => {
  const source = `${await read(paths.entries)}\n${await read(paths.validation)}`;

  assert.match(
    source,
    /content is required/i,
    "Structured lore writes must require content",
  );

  assert.match(
    source,
    /Invalid lore entry category/i,
    "Structured lore writes must validate category",
  );

  assert.match(
    source,
    /Invalid lore entry status/i,
    "Structured lore writes must validate status",
  );

  assert.match(
    source,
    /status:\s*400/,
    "Invalid structured lore input must return HTTP 400",
  );
});

test("structured entries endpoint rejects duplicate writes", async () => {
  const source = await read(paths.entries);

  assert.match(
    source,
    /already exists/i,
    "Structured entries endpoint must explicitly reject duplicates",
  );

  assert.match(
    source,
    /status:\s*409/,
    "Duplicate structured lore writes must return HTTP 409",
  );
});

test("GPT adapter maintains legacy timeline mirror for structured writes", async () => {
  const source = await read(paths.adapter);

  assert.match(
    source,
    /appendGPTLoreEntry/,
    "GPT adapter must expose structured lore writing",
  );

  assert.match(source, /mutateChapterLore/, "Writes must use the narrow lore mutation path");
  assert.match(source, /const loreEntries = \[\.\.\.archive\.loreEntries, loreEntry\]/,
    "Structured lore write must append to loreEntries");
  assert.match(source, /const entries = \[\.\.\.archive\.entries, loreEntryToTimeline\(loreEntry\)\]/,
    "Structured lore write must maintain the legacy timeline mirror");
});

test("structured lore entry endpoint exposes authenticated GET by ID", async () => {
  const source = await read(paths.entryUpdate);

  assert.match(
    source,
    /export\s+async\s+function\s+GET\b/,
    "Structured lore entry endpoint must expose GET",
  );

  assert.match(
    source,
    /requireGPTApiKey/,
    "Structured lore GET by ID must require GPT API authentication",
  );

  assert.match(
    source,
    /getGPTLoreEntryById/,
    "Structured lore GET by ID must read through the GPT adapter",
  );
});

test("structured lore GET by ID returns structured entry data", async () => {
  const source = await read(paths.entryUpdate);

  assert.match(
    source,
    /source:\s*result\.source/,
    "GET by ID must expose the archive source",
  );

  assert.match(
    source,
    /persisted:\s*result\.persisted/,
    "GET by ID must expose persistence status",
  );

  assert.match(
    source,
    /entry:\s*result\.entry/,
    "GET by ID must return the structured lore entry",
  );

  assert.match(
    source,
    /status:\s*404/,
    "GET by ID must return HTTP 404 when the entry does not exist",
  );
});

test("GPT adapter supports structured lore lookup by ID", async () => {
  const source = await read(paths.adapter);

  assert.match(
    source,
    /getGPTLoreEntryById/,
    "GPT adapter must expose structured lore lookup by ID",
  );

  assert.match(
    source,
    /archive\.loreEntries\.find/,
    "GPT adapter must locate entries from archive.loreEntries",
  );

  assert.match(
    source,
    /reason:\s*"not-found"/,
    "GPT adapter must explicitly report missing lore entries",
  );
});

test("structured lore update endpoint exposes authenticated PATCH", async () => {
  const source = await read(paths.entryUpdate);

  assert.match(
    source,
    /export\s+async\s+function\s+PATCH\b/,
    "Structured lore update endpoint must expose PATCH",
  );

  assert.match(
    source,
    /requireGPTApiKey/,
    "Structured lore PATCH must require GPT API authentication",
  );

  assert.match(
    source,
    /updateGPTLoreEntry/,
    "Structured lore PATCH must update through the GPT adapter",
  );
});

test("structured lore update endpoint validates updates", async () => {
  const source = `${await read(paths.entryUpdate)}\n${await read(paths.validation)}`;

  assert.match(
    source,
    /At least one lore entry field must be supplied/i,
    "PATCH must reject empty updates",
  );

  assert.match(
    source,
    /Invalid lore entry category/i,
    "PATCH must validate category",
  );

  assert.match(
    source,
    /Invalid lore entry status/i,
    "PATCH must validate status",
  );

  assert.match(
    source,
    /status:\s*400/,
    "Invalid lore updates must return HTTP 400",
  );
});

test("structured lore update endpoint handles missing and duplicate entries", async () => {
  const source = await read(paths.entryUpdate);

  assert.match(
    source,
    /status:\s*404/,
    "Updating an unknown lore entry must return HTTP 404",
  );

  assert.match(
    source,
    /status:\s*409/,
    "Updating into a duplicate lore entry must return HTTP 409",
  );
});

test("fresh chapter databases are seeded automatically", async () => {
  const source = await read(paths.storage);

  assert.match(
    source,
    /if\s*\(!row\)/,
    "Chapter storage must detect when no archive row exists",
  );

  assert.match(
    source,
    /writeChapterArchive\(createDefaultArchiveData\(\)\)/,
    "A fresh database must seed and persist the default Chapter archive",
  );
});

test("GPT adapter preserves structured lore identity during updates", async () => {
  const source = await read(paths.adapter);

  assert.match(
    source,
    /updateGPTLoreEntry/,
    "GPT adapter must expose structured lore updating",
  );

  assert.match(
    source,
    /updatedAt:\s*Date\.now\(\)/,
    "Updating lore must refresh updatedAt",
  );

  assert.match(
    source,
    /loreEntries\[index\]\s*=\s*updated/,
    "Updated structured lore must replace the existing LoreEntry",
  );

  assert.match(
    source,
    /loreEntryToTimeline\(updated\)/,
    "Structured updates must regenerate the legacy timeline representation",
  );
});

test("GPT-created lore has a draft safety default", async () => {
  const adapter = await read(paths.adapter);
  const validation = await read(paths.validation);

  assert.match(adapter, /status:\s*input\.status \?\? "draft"/,
    "The adapter must default omitted status to draft");
  assert.match(validation, /body\.status === undefined \? "draft" : body\.status/,
    "The request validator must default omitted status to draft");
  assert.match(validation, /Invalid lore entry status/,
    "Explicit unknown statuses must remain validation errors");
});

test("GPT writes are restricted to the lore columns and revision timestamp", async () => {
  const storage = await read(paths.storage);
  const adapter = await read(paths.adapter);

  assert.match(adapter, /mutateChapterLore/,
    "GPT writes must enter through mutateChapterLore");
  assert.doesNotMatch(adapter, /writeChapterArchive\s*\(/,
    "GPT writes must not replace the complete archive");
  assert.match(
    storage,
    /SET entries = \?, lore_entries = \?, updated_at = \?[\s\S]*WHERE id = \? AND updated_at = \?/,
    "The GPT storage write must update only entries, lore_entries, and updated_at with a compare-and-swap guard",
  );
});

test("structured lore migration is additive only", async () => {
  const migration = (await read(paths.migration)).trim();
  assert.equal(
    migration,
    "ALTER TABLE `chapter_archive` ADD `lore_entries` text DEFAULT '[]' NOT NULL;",
  );
});

test("Sites build uses logical bindings rather than staging IDs", async () => {
  const source = await read(paths.vite);
  assert.match(source, /hostingConfig/,
    "The Site build must derive binding names from hosting metadata");
  assert.match(source, /SITE_CREATOR_PLACEHOLDER_DATABASE_ID/,
    "Local builds must use the non-production placeholder database ID");
  assert.doesNotMatch(source, /wrangler\.jsonc/,
    "The Site build must not load the staging Wrangler configuration");
});

test("GPT routes do not expose DELETE operations", async () => {
  for (const path of [
    paths.lore,
    paths.search,
    paths.chronicle,
    paths.entries,
    paths.entryUpdate,
    paths.legacyLore,
    paths.legacySearch,
    paths.legacyChronicle,
  ]) {
    const source = await read(path);

    assert.doesNotMatch(
      source,
      /export\s+(?:async\s+)?function\s+DELETE\b/,
      `${path} must not expose DELETE`,
    );
  }
});

test("GPT routes do not expose archive reset", async () => {
  for (const path of [
    paths.lore,
    paths.search,
    paths.chronicle,
    paths.entries,
    paths.entryUpdate,
    paths.legacyLore,
    paths.legacySearch,
    paths.legacyChronicle,
  ]) {
    const source = await read(path);

    assert.doesNotMatch(
      source,
      /resetChapterArchive/,
      `${path} must not expose resetChapterArchive`,
    );
  }
});

test("legacy lore endpoint delegates to v1", async () => {
  const source = await read(paths.legacyLore);

  assert.match(
    source,
    /v1\/lore\/route/,
    "Legacy lore endpoint must delegate to v1",
  );
});

test("legacy search endpoint delegates to v1", async () => {
  const source = await read(paths.legacySearch);

  assert.match(
    source,
    /v1\/search\/route/,
    "Legacy search endpoint must delegate to v1",
  );
});

test("legacy chronicle endpoint delegates to v1", async () => {
  const source = await read(paths.legacyChronicle);

  assert.match(
    source,
    /v1\/chronicle\/route/,
    "Legacy chronicle endpoint must delegate to v1",
  );
});
