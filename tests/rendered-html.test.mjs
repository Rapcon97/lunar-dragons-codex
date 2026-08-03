import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build emits the required Sites server and binding metadata", async () => {
  await assert.doesNotReject(() => access("dist/server/index.js"));
  const hosting = JSON.parse(
    await readFile("dist/.openai/hosting.json", "utf8"),
  );

  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "CHAPTER_ASSETS");
  assert.match(hosting.project_id, /^appgprj_/);
});

test("build packages the reviewed additive structured-lore migration", async () => {
  const migration = await readFile(
    "dist/.openai/drizzle/0005_structured_lore.sql",
    "utf8",
  );
  const journal = await readFile(
    "dist/.openai/drizzle/meta/_journal.json",
    "utf8",
  );

  assert.equal(
    migration.trim(),
    "ALTER TABLE `chapter_archive` ADD `lore_entries` text DEFAULT '[]' NOT NULL;",
  );
  assert.match(journal, /0005_structured_lore/);
  assert.doesNotMatch(migration, /DROP|DELETE|CREATE TABLE/i);
});

test("the archive API withholds non-canon lore from non-admin viewers", async () => {
  const source = await readFile("app/api/archive/route.ts", "utf8");

  assert.match(source, /archiveForViewer\(data, viewer\.canAdmin\)/);
  assert.match(source, /entries: canonChronicleEntries\(data\)/);
  assert.match(
    source,
    /loreEntries: data\.loreEntries\.filter\(\(entry\) => entry\.status === "canon"\)/,
  );
  assert.match(source, /if \(!viewer\)/);
  assert.match(source, /status: 401/);
});

test("the lore development dashboard requires admin capability and active Admin Mode", async () => {
  const [dashboard, sectionPage] = await Promise.all([
    readFile("app/_components/LoreDevelopmentDashboard.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
  ]);

  assert.match(dashboard, /if \(!canAdmin \|\| !isAdminMode\) return null/);
  assert.match(sectionPage, /canAdmin=\{canAdmin\}/);
  assert.match(sectionPage, /isAdminMode=\{isAdminMode\}/);

  const dashboardVisible = (canAdmin, isAdminMode) =>
    canAdmin && isAdminMode;
  assert.equal(dashboardVisible(true, false), false, "admin with Admin Mode off");
  assert.equal(dashboardVisible(true, true), true, "admin with Admin Mode on");
  assert.equal(dashboardVisible(false, false), false, "guest/non-admin view mode");
  assert.equal(dashboardVisible(false, true), false, "non-admin cannot force Admin Mode");

  for (const status of ["draft", "review", "canon", "retconned"]) {
    assert.match(dashboard, new RegExp(`status: "${status}"`));
  }
  assert.match(dashboard, /<details className="lore-development-record"/);
  assert.match(dashboard, /entry\.id/);
  assert.match(dashboard, /entry\.createdAt/);
  assert.match(dashboard, /entry\.updatedAt/);
  assert.doesNotMatch(dashboard, /method:\s*["']DELETE|resetChapterArchive/);
});
