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

test("build packages the additive character-registry migration", async () => {
  const migration = await readFile(
    "dist/.openai/drizzle/0006_character_registry.sql",
    "utf8",
  );
  const journal = await readFile(
    "dist/.openai/drizzle/meta/_journal.json",
    "utf8",
  );

  assert.equal(
    migration.trim(),
    "ALTER TABLE `chapter_archive` ADD `characters` text DEFAULT '[]' NOT NULL;",
  );
  assert.match(journal, /0006_character_registry/);
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

test("Phase 4 event presentation is shared and relay persistence rejects stale writes", async () => {
  const [home, sectionPage, stream, storage] = await Promise.all([
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("storage/chapter-records.ts", "utf8"),
  ]);
  assert.match(home, /<TransmissionEventFlags event=\{message\.event\} \/>/);
  assert.match(sectionPage, /<TransmissionEventFlags event=\{message\.event\} \/>/);
  assert.match(home, /<RelayDataStream[\s\S]*source=\{selectedRelayMessage\}/);
  assert.match(sectionPage, /<RelayDataStream[\s\S]*source=\{selected\}/);
  assert.match(stream, /formatTransmissionTranscript\(source\)/);
  assert.match(storage, /WHERE id = \? AND updated_at = \?/);
  assert.match(storage, /readChapterArchiveAttempt\(relayWriteAttempt \+ 1\)/);
  assert.match(storage, /MAX_RELAY_WRITE_ATTEMPTS = 3/);
});

test("the lore development dashboard requires admin capability and active Admin Mode", async () => {
  const [dashboard, statusControl, sectionPage, publicationRoute, draftRoute, statusRoute, publicationDomain] = await Promise.all([
    readFile("app/_components/LoreDevelopmentDashboard.tsx", "utf8"),
    readFile("app/_components/LoreStatusControl.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/api/admin/lore/[id]/publish/route.ts", "utf8"),
    readFile("app/api/admin/lore/[id]/draft/route.ts", "utf8"),
    readFile("app/api/admin/lore/[id]/status/route.ts", "utf8"),
    readFile("app/lore-publication.ts", "utf8"),
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
  assert.doesNotMatch(sectionPage, /RESET SHARED RECORDS|Reset shared archive|onReset=/);
  assert.match(dashboard, /<LoreStatusControl/);
  for (const status of ["draft", "review", "canon", "retconned"]) {
    assert.match(statusControl, new RegExp(`value: "${status}"`));
  }
  assert.match(statusControl, /APPLY STATUS/);
  assert.match(statusControl, /removed from the public Chronicles/);
  assert.match(statusControl, /window\.confirm/);
  assert.match(statusControl, /"x-lunar-admin-mode": "active"/);
  assert.match(statusControl, /expectedUpdatedAt: entry\.updatedAt/);
  assert.match(publicationRoute, /getArchiveAdmin\(\)/);
  assert.match(publicationRoute, /isSameOriginRequest\(request\)/);
  assert.match(publicationRoute, /x-lunar-admin-mode/);
  assert.match(publicationRoute, /publishReviewLoreEntry/);
  assert.doesNotMatch(publicationRoute, /DELETE|resetChapterArchive|GPT_API_KEY/);
  assert.match(draftRoute, /getArchiveAdmin\(\)/);
  assert.match(draftRoute, /isSameOriginRequest\(request\)/);
  assert.match(draftRoute, /x-lunar-admin-mode/);
  assert.match(draftRoute, /returnCanonLoreEntryToDraft/);
  assert.doesNotMatch(draftRoute, /DELETE|resetChapterArchive|GPT_API_KEY/);
  assert.match(statusRoute, /getArchiveAdmin\(\)/);
  assert.match(statusRoute, /isSameOriginRequest\(request\)/);
  assert.match(statusRoute, /x-lunar-admin-mode/);
  assert.match(statusRoute, /updateLoreEntryStatus/);
  assert.match(statusRoute, /validStatuses/);
  assert.doesNotMatch(statusRoute, /DELETE|resetChapterArchive|GPT_API_KEY/);
  assert.match(publicationDomain, /existing\.status !== "review"/);
  assert.match(publicationDomain, /existing\.updatedAt !== expectedUpdatedAt/);
  assert.match(publicationDomain, /status: "canon"/);
  assert.match(publicationDomain, /existing\.status !== "canon"/);
  assert.match(publicationDomain, /status: "draft"/);
  assert.match(publicationDomain, /\.\.\.existing/);
});

test("the Chronicle uses a full-workspace canon-only Exload Terminal with an admin development view", async () => {
  const [sectionPage, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /section === "chronicles" \? "chronicles-workspace"/);
  assert.match(sectionPage, /section === "chronicles" \? "chronicles-subpage"/);
  assert.match(sectionPage, /chronicleEntriesForViewer\(data\.loreEntries, canAdmin, isAdminMode\)/);
  assert.match(sectionPage, /onArchiveRefresh=\{load\}/);
  assert.match(sectionPage, /aria-label="Lore development status categories"/);
  assert.match(sectionPage, /\["draft", "DRAFT", statusCounts\.draft\]/);
  assert.match(sectionPage, /\["review", "REVIEW", statusCounts\.review\]/);
  assert.match(sectionPage, /\["canon", "CANON", statusCounts\.canon\]/);
  assert.match(sectionPage, /\["retconned", "RETCONNED", statusCounts\.retconned\]/);
  assert.match(sectionPage, /<LoreStatusControl/);
  assert.match(sectionPage, /setActiveStatus\(changedEntry\.status\)/);
  assert.match(sectionPage, /STATUS SEALED/);
  assert.match(styles, /\.chronicle-status-tabs\s*\{[^}]*grid-template-columns:\s*1\.35fr repeat\(4,/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-status-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(sectionPage, /LORE DEVELOPMENT INDEX/);
  assert.match(sectionPage, /DRAFT · UNSEALED/);
  assert.match(sectionPage, /REVIEW · AWAITING JUDGMENT/);
  assert.match(sectionPage, /RETCONNED · SUPERSEDED/);
  assert.doesNotMatch(sectionPage, /isAdminMode \? data\.entries : canonChronicleEntries/);
  assert.match(sectionPage, /CHRONICLE EXLOAD TERMINAL/);
  assert.match(sectionPage, /SEALED RECORD INDEX/);
  assert.match(sectionPage, /<DecreeRecord \/>/);
  assert.match(sectionPage, /selectedEntry\.content/);
  assert.match(sectionPage, /selectedEntry\.subtitle &&[\s\S]*chronicle-record-subtitle/);
  assert.doesNotMatch(
    sectionPage,
    /chronicle-index-copy[\s\S]{0,350}entry\.subtitle/,
    "The Chronicle index must remain title-only",
  );
  assert.match(sectionPage, /entry\.id\.startsWith\("legacy-"\)/);
  assert.match(sectionPage, /statusReadout\(selectedEntry\)/);
  assert.match(sectionPage, /<header className=\{selectedEntry \? "record-active" : undefined\}>[\s\S]*className="chronicle-reader-record-meta"[\s\S]*READ AUTHORITY · ARCHIVE VIEW[\s\S]*<\/header>/);
  assert.match(sectionPage, /chronicle-reader-record-meta[\s\S]*chronicle-record-path[\s\S]*chronicle-record-signifiers/);

  assert.match(styles, /\.archive-mode:has\(\.chronicles-workspace\)\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.workspace\.chronicles-workspace\s*\{[^}]*height:\s*calc\(100dvh - var\(--archive-terminal-height\)\)/s);
  assert.match(styles, /\.chronicle-exload-grid\s*\{[^}]*grid-template-columns:\s*minmax\(290px, 29%\) minmax\(0, 1fr\)/s);
  assert.match(styles, /\.chronicle-record-content\s*\{[^}]*max-width:\s*86ch;[^}]*font:[^;]*\/1\.85/s);
  assert.match(styles, /\.chronicle-record-subtitle\s*\{[^}]*font:[^;]*var\(--type-body\)\/1\.55/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-exload-grid\s*\{\s*display:\s*block;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-reader-scroll\s*\{\s*overflow:\s*visible;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-exload-status\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-exload-status span,[\s\S]*\.chronicle-exload-status strong\s*\{[^}]*white-space:\s*normal;/s);
  assert.match(styles, /\.chronicle-exload-reader > header\.record-active\s*\{[^}]*grid-template-columns:\s*minmax\(175px, \.65fr\) minmax\(0, 1\.35fr\) auto;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronicle-reader-record-meta \.chronicle-record-signifiers\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
});

test("principal archive sections share the Relay and Chronicle frame boundaries", async () => {
  const [home, sectionPage, companyPage, systemPage, planetPage, styles] = await Promise.all([
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/companies/[company]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/planet/[planet]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(home, /workspace archive-boundary-workspace command-boundary-workspace/);
  assert.match(home, /content-grid command-grid-redesign archive-boundary-content/);
  assert.match(sectionPage, /\["chapter", "flagship", "armoury", "companies", "characters", "intel"\]\.includes\(section\)/);
  assert.match(sectionPage, /usesArchiveBoundary \? "archive-boundary-workspace"/);
  assert.match(sectionPage, /usesArchiveBoundary \? "archive-boundary-subpage"/);
  assert.match(companyPage, /workspace archive-boundary-workspace/);
  assert.match(companyPage, /subpage archive-boundary-subpage company-detail-page/);
  assert.match(systemPage, /subpage archive-boundary-subpage system-intel-page/);
  assert.match(planetPage, /subpage archive-boundary-subpage planetary-intel-page/);

  assert.match(styles, /--archive-frame-gutter-inline:\s*clamp\(16px, 1\.4vw, 28px\)/);
  assert.match(styles, /--archive-frame-gutter-block:\s*clamp\(14px, 1\.25vw, 24px\)/);
  assert.match(styles, /\.archive-boundary-subpage,[\s\S]*\.content-grid\.archive-boundary-content\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*margin:\s*0;/s);
  assert.match(styles, /\.relay-workspace \.relay-subpage\s*\{[^}]*padding:\s*var\(--archive-frame-gutter-block\) var\(--archive-frame-gutter-inline\) 0;/s);
  assert.match(styles, /\.chronicles-workspace \.chronicles-subpage\s*\{[^}]*padding:\s*var\(--archive-frame-gutter-block\) var\(--archive-frame-gutter-inline\) 0;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.content-grid\.archive-boundary-content\s*\{\s*padding:\s*12px 10px 24px;/s);
});

test("Company Phase 1 presents authoritative loading, useful roster controls, and labelled calculations", async () => {
  const [sectionPage, companyPage, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/companies/[company]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /<CompaniesSection canEdit=\{isAdminMode\} error=\{error\} isLoading=\{isLoading\}/);
  assert.match(sectionPage, /if \(isLoading \|\| error\)[\s\S]*RETRIEVING ORDER OF BATTLE/);
  assert.match(sectionPage, /updateCompany\(index, "role", event\.target\.value\)/);
  assert.match(sectionPage, /RECORDED STRENGTH[\s\S]*ROSTER FILL[\s\S]*UNFILLED \/ UNRECORDED[\s\S]*COMPANIES REPORTING/);
  assert.match(sectionPage, /company-heraldry-placeholder[\s\S]*UNRECORDED/);
  assert.match(sectionPage, /aria-label=\{`\$\{company\.strength\} members recorded against a nominal comparison of 100`\}/);

  assert.match(companyPage, /if \(isLoading \|\| error\)[\s\S]*RETRIEVING COMPANY RECORD/);
  assert.match(companyPage, /if \(lineMembers === 0\) return \[\]/);
  assert.match(companyPage, /CALCULATED DISPOSITION/);
  assert.match(companyPage, /Calculated Company Headquarters/);
  assert.match(companyPage, /Calculated Squad Groups/);
  assert.doesNotMatch(companyPage, /Math\.max\(1, Math\.ceil/);

  assert.match(styles, /\.roster-summary\s*\{[^}]*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/s);
  assert.match(styles, /\.company-dossier-matrix\s*\{[^}]*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.roster-summary\s*\{\s*grid-template-columns:\s*1fr 1fr;/s);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.roster-summary, \.company-dossier-matrix\s*\{\s*grid-template-columns:\s*1fr;/s);
});

test("Character Phase 2 balances operational tooling with canon provenance", async () => {
  const [sectionPage, directory, profile, companyPage, archiveRoute, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/_components/CharacterDirectory.tsx", "utf8"),
    readFile("app/characters/[character]/page.tsx", "utf8"),
    readFile("app/companies/[company]/page.tsx", "utf8"),
    readFile("app/api/archive/route.ts", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /<CharacterDirectory[\s\S]*canEdit=\{canAdmin && isAdminMode\}[\s\S]*error=\{error\}[\s\S]*isLoading=\{isLoading\}[\s\S]*characters=\{data\.characters\}/);
  assert.match(directory, /if \(isLoading \|\| error\)[\s\S]*Retrieving character records/);
  assert.match(directory, /Adeptus Astartes · Personnel Reliquary/);
  assert.match(directory, /No names or deeds have been invented to fill it/);
  assert.match(directory, /Links establish provenance; operational profile fields do not become canon automatically/);
  assert.match(directory, /loreEntries\.filter\(\(entry\) => entry\.status === "canon"\)/);
  assert.match(directory, /heroicDeeds/);
  assert.match(directory, /introducedAt/);
  assert.match(directory, /deathAt/);
  assert.match(profile, /Established Archive References/);
  assert.match(profile, /entry\.status === "canon"/);
  assert.match(profile, /href=\{`\/companies\/\$\{data\.companies\.indexOf\(company\) \+ 1\}`\}/);
  assert.match(companyPage, /recordedCharacters/);
  assert.match(companyPage, /OPEN CHARACTER DIRECTORY/);
  assert.match(archiveRoute, /"characters"/);
  assert.match(styles, /\.character-directory-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.character-directory-tools\s*\{\s*grid-template-columns:\s*1fr;/s);
});

test("the Command nexus always renders the authenticated Lunar Dragons sigil", async () => {
  const home = await readFile("app/page.tsx", "utf8");

  assert.match(home, /src="\/lunar-dragons-sigil-depth\.png" alt="The Lunar Dragons chapter sigil"/);
  assert.doesNotMatch(home, /\/api\/chapter-badge/);
  assert.doesNotMatch(home, /UPLOAD SIGIL|REPLACE SIGIL/);
  assert.doesNotMatch(home, /type="file"/);
});

test("the Command Chronicle presents compact structured canon summaries", async () => {
  const [home, styles] = await Promise.all([
    readFile("app/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(home, /loreEntries\.filter\(\(entry\) => entry\.status === "canon"\)\.slice\(0, 3\)/);
  assert.match(home, /className="command-chronicle-records"/);
  assert.match(home, /<h3>\{entry\.title\}<\/h3>/);
  assert.match(home, /entry\.subtitle \? <p>\{entry\.subtitle\}<\/p>/);
  assert.match(home, /OPEN EXLOAD TERMINAL/);
  assert.doesNotMatch(home, /visibleChronicleEntries\.slice\(0, 3\)/);
  assert.match(styles, /\.command-chronicle-records\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(styles, /\.command-chronicle-records h3\s*\{[^}]*-webkit-line-clamp:\s*2;/s);
  assert.match(styles, /@media \(max-width: 1050px\)[\s\S]*\.command-chronicle-records\s*\{\s*grid-template-columns:\s*1fr;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.command-chronicle-actions\s*\{[^}]*flex-wrap:\s*wrap;/s);
});

test("retired presentation elements stay outside the live Site runtime", async () => {
  const [manifest, styles] = await Promise.all([
    readFile("archive/retired-site-elements/README.md", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(manifest, /ImperialVoxTicker\.tsx\.retired/);
  assert.match(manifest, /decree-of-reclamation-and-vigilance-v2\.png/);
  assert.doesNotMatch(styles, /\.vox-screen|\.hero-panel|\.crest-wrap|\.upload-button|\.doctrine-panel/);
});

test("the terminal footer unifies viewer controls and the live chronometer", async () => {
  const [footer, adminMode, chronometer, layout, styles] = await Promise.all([
    readFile("app/_components/ArchiveTerminalFooter.tsx", "utf8"),
    readFile("app/_components/AdminMode.tsx", "utf8"),
    readFile("app/_components/ImperialChronometer.tsx", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(adminMode, /<ArchiveTerminalFooter/);
  assert.doesNotMatch(adminMode, /admin-mode-dock/);
  assert.match(footer, /<ImperialChronometer \/>/);
  assert.match(footer, /USER/);
  assert.match(footer, /ACCESS/);
  assert.match(footer, /MODE/);
  assert.match(footer, /onClick=\{onToggleAdminMode\}/);
  assert.match(footer, /href=\{signOutHref\}/);
  assert.match(layout, /viewerKind=\{viewer\.kind\}/);
  assert.doesNotMatch(layout, /<ImperialChronometer \/>/);
  assert.match(chronometer, /window\.setInterval\(update, 1000\)/);
  assert.match(chronometer, /timeZone: "Europe\/Amsterdam"/);
  assert.match(chronometer, /const SHIP_TIME_LABEL = "LUNARIS SHIP-TIME"/);
  assert.match(chronometer, /chronometer-ship-time-full/);
  assert.match(chronometer, /chronometer-ship-time-short">SHIP-TIME/);
  assert.doesNotMatch(chronometer, /\bCEST\b|\bCET\b|terranZone/);
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /--actual-sidebar-width:\s*82px/);
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*left:\s*var\(--actual-sidebar-width\);[^}]*right:\s*0;[^}]*bottom:\s*0;/s);
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*width:\s*auto;[^}]*max-width:\s*none;[^}]*margin:\s*0;[^}]*box-sizing:\s*border-box;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*--actual-sidebar-width:\s*58px/);
  assert.match(styles, /\.chronometer-ship-time-short\s*\{\s*display:\s*none;/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.chronometer-ship-time-full\s*\{\s*display:\s*none;\s*\}[\s\S]*\.chronometer-ship-time-short\s*\{\s*display:\s*inline;/);
  assert.match(styles, /\.archive-mode\s*\{[^}]*padding-bottom:/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.archive-terminal-footer/);
});

test("shared interface typography uses one semantic readability scale", async () => {
  const styles = await readFile("app/globals.css", "utf8");

  const expectedRoles = {
    ornament: ".625rem",
    micro: ".6875rem",
    meta: ".75rem",
    label: ".8125rem",
    control: ".875rem",
    terminal: ".9375rem",
    "body-small": "1rem",
    body: "1.125rem",
    lead: "1.25rem",
    title: "1.5rem",
  };

  for (const [role, size] of Object.entries(expectedRoles)) {
    assert.match(styles, new RegExp(`--type-${role}:\\s*${size.replace(".", "\\.")}`));
  }

  const expectedAliases = {
    5: "ornament", 6: "micro", 7: "meta", 8: "label", 9: "control",
    10: "terminal", 11: "body-small", 12: "body-small", 13: "body",
    14: "body", 15: "body", 16: "lead", 17: "lead", 18: "title",
  };
  for (const [level, role] of Object.entries(expectedAliases)) {
    assert.match(styles, new RegExp(`--ui-text-${level}:\\s*var\\(--type-${role}\\)`));
  }

  assert.match(styles, /body\s*\{[^}]*font-size:\s*var\(--ui-text-15\)/s);
  assert.match(styles, /\.workspace\s*\{[^}]*font-size:\s*var\(--type-body\)/s);
  assert.match(styles, /\.workspace :is\(input, textarea, select\)\s*\{[^}]*font-size:\s*var\(--type-body-small\)/s);
  assert.match(styles, /\.relay-data-stream,[\s\S]*\.chronicle-record-content\s*\{[^}]*font-size:\s*var\(--type-body-small\)/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.workspace :is\(input, textarea, select\)\s*\{\s*font-size:\s*1rem;/s);

  assert.match(styles, /\.nav-icon\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px/s);
  assert.match(styles, /\.command-sigil-vault img\s*\{[^}]*width:\s*min\(215px, 82%\);[^}]*height:\s*215px/s);
  assert.match(styles, /\.system-register a > i\s*\{[^}]*font-size:\s*18px/s);
});

test("the sidebar uses one coordinated accessible SVG command-glyph system", async () => {
  const [sidebar, styles, ...surfaces] = await Promise.all([
    readFile("app/_components/SidebarNavigation.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/companies/[company]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/planet/[planet]/page.tsx", "utf8"),
  ]);

  const expectedItems = [
    ["Command", "/", "command"],
    ["Chapter", "/chapter", "chapter"],
    ["Lunaris", "/flagship", "lunaris"],
    ["Armoury", "/armoury", "armoury"],
    ["Companies", "/companies", "companies"],
    ["Characters", "/characters", "characters"],
    ["Sector Intel", "/intel", "intel"],
    ["Relay", "/relay", "relay"],
    ["Chronicles", "/chronicles", "chronicles"],
    ["Settings", "/settings", "settings"],
  ];

  let priorIndex = -1;
  for (const [label, href, icon] of expectedItems) {
    const declaration = `{ href: "${href}", icon: "${icon}", label: "${label}" }`;
    const itemIndex = sidebar.indexOf(declaration);
    assert.ok(itemIndex > priorIndex, `${label} remains in the approved navigation order`);
    priorIndex = itemIndex;
    assert.match(sidebar, new RegExp(`\\b${icon}: \\(`));
  }

  assert.match(sidebar, /const SIDEBAR_GLYPHS: Record<SidebarGlyphName, ReactNode>/);
  assert.match(sidebar, /function SidebarNavigationItem/);
  assert.match(sidebar, /viewBox="0 0 24 24"/);
  assert.match(sidebar, /fill="none"/);
  assert.match(sidebar, /stroke="currentColor"/);
  assert.match(sidebar, /strokeWidth="1\.5"/);
  assert.match(sidebar, /strokeLinecap="square"/);
  assert.match(sidebar, /strokeLinejoin="miter"/);
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
  assert.doesNotMatch(sidebar, /<img|from ["'][^"']*(lucide|heroicons|fontawesome)/i);

  for (const surface of surfaces) {
    assert.match(surface, /<SidebarNavigation activeHref=/);
    assert.doesNotMatch(surface, /const navItems|<aside className="sidebar"/);
  }

  assert.match(styles, /\.nav-icon-plate\s*\{[^}]*width:\s*40px;[^}]*height:\s*36px/s);
  assert.match(styles, /\.nav-item:hover \.nav-icon-plate/);
  assert.match(styles, /\.nav-item\.active \.nav-icon-plate/);
  assert.match(styles, /\.nav-item:focus-visible\s*\{[^}]*outline:/s);
  assert.match(styles, /\.nav-item small\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.nav-item small\s*\{\s*display:\s*none;/s);
});

test("homepage and Relay share the deterministic accessible transmission renderer", async () => {
  const [renderer, helper, home, sectionPage, styles] = await Promise.all([
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("app/_components/relay-transmission.ts", "utf8"),
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(home, /<RelayDataStream[\s\S]*key=\{selectedRelayMessage\.id\}[\s\S]*source=\{selectedRelayMessage\}[\s\S]*streamKey=\{selectedRelayMessage\.id\}/);
  assert.match(sectionPage, /<RelayDataStream[\s\S]*key=\{selected\.id\}[\s\S]*source=\{selected\}[\s\S]*streamKey=\{selected\.id\}/);
  assert.doesNotMatch(home, /COMMAND-LINK|commandRelayLines|lines=\{commandRelayLines\}/);
  assert.doesNotMatch(sectionPage, /056\/\/329652|dataStreamLines|lines=\{dataStreamLines\}/);
  assert.match(home, /document\.body\.style\.overflow = "hidden"/);

  assert.match(renderer, /formatTransmissionTranscript\(source\)/);
  assert.match(renderer, /prepareTransmissionLine\(line\)/);
  assert.doesNotMatch(renderer, /corruptTransmissionMetadataValue|transmissionMetadataValueCanCorrupt/);
  assert.match(renderer, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(renderer, /setRenderedLines\(completedLines\)/);
  assert.match(renderer, /typeSegment\(lineIndex, metadata\.label, metadata\.value, transmissionCharacterDelay\)/);
  assert.match(renderer, /TRANSMISSION_TIMING\.metadataLabelMs/);
  assert.match(renderer, /TRANSMISSION_TIMING\.metadataValuePauseMs/);
  assert.match(renderer, /TRANSMISSION_TIMING\.retrievalDotCount/);
  assert.match(renderer, /TRANSMISSION_TIMING\.retrievalDotMs/);
  assert.match(renderer, /appendTransmissionRetrievalDots\(text, dotCount\)/);
  assert.match(renderer, /window\.clearTimeout\(timer\)/);
  assert.match(renderer, /className="relay-data-accessible"/);
  assert.match(renderer, /className="relay-data-visual" aria-hidden="true"/);
  assert.match(renderer, /activeLineIndex === index/);
  assert.match(renderer, /setActiveLineIndex\(finalCursorIndex\)/);
  assert.doesNotMatch(renderer, /formatCorruptionPercentage|currentPercentage|corruptionProfile/);
  assert.match(renderer, /completedStreamKey === streamKey/);
  assert.match(renderer, /setCompletedStreamKey\(streamKey\)/);
  assert.match(renderer, /renderedLines\.slice\(0, presentedLines\.length\)/);
  assert.match(renderer, /if \(!line\) return null/);
  assert.match(renderer, />\s*COMPLETE EXLOAD\s*</);

  assert.match(helper, /export const TRANSMISSION_TIMING/);
  assert.match(helper, /characterMs:\s*38/);
  assert.match(helper, /metadataLabelMs:\s*10/);
  assert.match(helper, /metadataValuePauseMs:\s*200/);
  assert.match(helper, /retrievalDotMs:\s*500/);
  assert.match(helper, /retrievalDotCount:\s*4/);
  assert.match(helper, /const ORIGIN_INTERFERENCE_RANGES/);
  assert.match(helper, /"internal Lunaris": \[0, 0\.5\]/);
  assert.match(helper, /"unstable Rift crossing": \[15, 35\]/);
  assert.match(helper, /"anomalous source": \[12, 30\]/);
  assert.match(helper, /export function analyzeTransmission/);
  assert.match(helper, /export function formatTransmissionTranscript/);
  assert.match(helper, /export function prepareTransmissionLine/);
  assert.match(helper, /originBand: TransmissionOriginBand/);
  assert.doesNotMatch(helper, /Math\.random/);
  assert.match(helper, /RECEIVING_LOCUS = "LUNARIS"/);
  assert.match(helper, /OPERATIONAL_THEATRE = "NORTHERN NACHMUND APPROACHES"/);
  assert.doesNotMatch(helper, /Imperial clearance grade:/);
  assert.doesNotMatch(helper, /Encryption protocol:/);
  assert.match(helper, /Probable origin:/);
  assert.doesNotMatch(helper, /Positional triangulation:/);
  assert.doesNotMatch(helper, /> Relay path:/);
  assert.doesNotMatch(helper, /> Warp exposure:/);
  assert.doesNotMatch(helper, /\{ text: `> Data corruption query:/);
  assert.doesNotMatch(helper, /\{ text: `> Data corruption pattern:/);
  assert.doesNotMatch(helper, /> Origin band:/);
  assert.match(helper, /renderSanctionedInterpretation\(source, analysis\.degradation\)/);
  assert.match(helper, /section: "analysis"/);
  assert.match(helper, /section: "terminal-footer"/);
  assert.match(helper, /export function buildAstropathicDegradationProfile/);
  assert.match(helper, /export function renderSanctionedInterpretation/);
  assert.match(helper, /AstropathicDegradationSeverity/);
  assert.match(helper, /INTERPRETIVE AMBIGUITY/);
  assert.match(helper, /archivalRedaction/);
  assert.match(helper, /CRYPTEX UNRESOLVED/);
  assert.doesNotMatch(helper, /CORRUPTION_GLYPHS|MACHINE_CANT_FRAGMENTS|SEVERE_CANT_FRAGMENTS|corruptTransmissionText/);
  assert.match(helper, /IMPERIAL_TRANSMISSION_CLOSING = "The Emperor protects\."/);
  assert.match(helper, /MECHANICUS_TRANSMISSION_CLOSING = "By the Omnissiah's will\."/);
  assert.match(helper, /TERMINAL_MACHINE_BLESSING = "\+\+\+ HAIL THE OMNISSIAH, PRAISE THE MACHINE GOD \+\+\+"/);
  assert.match(helper, /splitTransmissionMetadata/);
  assert.doesNotMatch(helper, /corruptTransmissionMetadataValue|transmissionMetadataValueCanCorrupt/);

  assert.match(styles, /\.relay-dialog\s*\{[^}]*width:\s*min\(760px, calc\(100vw - 32px\)\);[^}]*height:\s*min\(620px, calc\(100vh - 32px\)\);/s);
  assert.match(styles, /\.relay-dialog\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.relay-dialog-body\s*\{[^}]*overflow:\s*auto/s);
  assert.match(styles, /\.relay-data-stream\s*\{[^}]*--relay-command-color:\s*#b0c2a7/s);
  assert.match(styles, /\.stream-command\s*\{[^}]*color:\s*var\(--relay-command-color\)/s);
  assert.match(styles, /\.relay-data-cursor\s*\{[^}]*background:\s*currentColor/s);
  assert.match(styles, /\.relay-data-cursor\.pause\s*\{[^}]*relay-stream-cursor \.6s/s);
  assert.match(styles, /\.relay-data-cursor\.complete\s*\{[^}]*relay-stream-cursor 1s/s);
  assert.match(styles, /\.relay-data-stream \.stream-blessing\s*\{[^}]*color:\s*#8f514d/s);
  assert.match(styles, /\.relay-data-stream \.stream-uncertainty-semantic\s*\{/);
  assert.match(styles, /\.relay-data-stream \.stream-uncertainty-empyric\s*\{/);
  assert.match(styles, /\.relay-data-stream \.stream-uncertainty-redaction\s*\{/);
  assert.match(styles, /\.relay-data-stream \.stream-uncertainty-cipher\s*\{/);
  assert.match(styles, /\.relay-data-instant\s*\{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.relay-data-stream p, \.relay-data-cursor\s*\{[^}]*animation:\s*none !important/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.relay-dialog\s*\{[^}]*height:\s*calc\(100dvh - 16px\)/s);

  const relaySection = sectionPage.slice(
    sectionPage.indexOf("function AstropathicRelaySection"),
    sectionPage.indexOf("const identityFields"),
  );
  assert.match(sectionPage, /section === "relay" \? "relay-subpage"/);
  assert.match(sectionPage, /section === "relay" \? "relay-workspace"/);
  assert.match(sectionPage, /section === "chronicles" \? "chronicles-workspace"/);
  assert.match(sectionPage, /section !== "relay"/);
  assert.match(sectionPage, /section !== "relay" && section !== "chronicles" && !usesArchiveBoundary && \([\s\S]*?<footer><span>THE LUNAR DRAGONS/s);
  assert.match(relaySection, /ASTROPATHIC EXLOAD TERMINAL/);
  assert.doesNotMatch(relaySection, /VOX-MISSIVE RECOVERY/);
  assert.match(relaySection, /className="relay-inbox-grid panel"/);
  assert.match(relaySection, /className="relay-terminal-rack"/);
  assert.doesNotMatch(relaySection, /LOCALITY: LUNARIS/);
  assert.match(relaySection, /aria-label="Active astropathic transmission"/);
  assert.match(relaySection, /tabIndex=\{0\}/);
  assert.match(styles, /\.relay-subpage\s*\{[^}]*padding:\s*clamp\([^}]*\) clamp\([^}]*\) 0/s);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?\.archive-mode:has\(\.relay-workspace\)\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden[^}]*padding-bottom:\s*0/s);
  assert.match(styles, /\.workspace\.relay-workspace\s*\{[^}]*height:\s*calc\(100dvh - var\(--archive-terminal-height\)\)[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.relay-workspace \.relay-subpage\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*display:\s*flex[^}]*margin:\s*0[^}]*padding:\s*var\(--archive-frame-gutter-block\) var\(--archive-frame-gutter-inline\) 0/s);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?\.relay-inbox-grid\s*\{[^}]*width:\s*100%[^}]*height:\s*100%[^}]*min-height:\s*0/s);
  assert.match(styles, /\.relay-inbox-grid\s*\{[^}]*border-bottom-color:\s*#42563e[^}]*box-shadow:\s*inset 0 -3px/s);
  assert.match(styles, /\.relay-terminal-rack-title strong\s*\{[^}]*font:\s*400 clamp\(1\.75rem,[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.relay-inbox-body > \.relay-data-stream\s*\{[^}]*max-width:\s*none[^}]*line-height:\s*1\.3/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.relay-terminal-rack-title strong\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /\.relay-inbox-body\s*\{[^}]*overflow-y:\s*auto[^}]*scrollbar-gutter:\s*stable/s);
  assert.match(styles, /\.relay-inbox-list,[\s\S]*?\.relay-inbox-body\s*\{[^}]*scrollbar-width:\s*thin[^}]*scrollbar-color:\s*#5d7556 #030604/s);
  assert.match(styles, /\.relay-inbox-list::\-webkit-scrollbar-thumb,[\s\S]*?\.relay-inbox-body::\-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*0[^}]*repeating-linear-gradient/s);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?::-webkit-scrollbar-track/s);
  assert.doesNotMatch(relaySection, /role="dialog"|relay-dialog-backdrop/);
});

test("the shared transmission renderer exposes a responsive Astropathic Auspex and dual interpretation layers", async () => {
  const [stream, auspex, record, styles] = await Promise.all([
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("app/_components/TransmissionSignalAuspex.tsx", "utf8"),
    readFile("app/_components/astropathic-record.ts", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(stream, /buildAstropathicRecordPresentation\(source, analysis\)/);
  assert.match(stream, /<TransmissionSignalAuspex analysis=\{analysis\} event=\{source\.event\} record=\{astropathicRecord\} \/>/);
  assert.match(stream, /REVEAL RAW IMPRESSION/);
  assert.match(stream, /SANCTIONED INTERPRETATION \/\/ ACTIVE ARCHIVE LAYER/);
  assert.match(stream, /UNSANCTIONED EMPYRIC IMPRESSION/);
  assert.match(stream, /NOT A LITERAL TRANSCRIPT/);
  assert.match(stream, /aria-expanded=\{showRawImpression\}/);
  assert.match(stream, /setShowRawImpression\(false\)/);
  assert.match(auspex, /ASTROPATHIC AUSPEX \/\/ RELIQUARIUM/);
  assert.match(auspex, /analysis\.degradation\.severity/);
  assert.match(auspex, /PROBABLE ORIGIN/);
  assert.match(auspex, /PROVENANCE CONCORDANCE/);
  assert.match(auspex, /THOUGHTMARK AUTHORITY/);
  assert.match(auspex, /IMPERIAL CLEARANCE/);
  assert.match(auspex, /ENCRYPTION PROTOCOL/);
  assert.match(auspex, /CHOIR \/ RELAY PATH/);
  assert.match(auspex, /WARP EXPOSURE/);
  assert.match(auspex, /CHOIR LINEAGE/);
  assert.match(auspex, /CHOIR SIGNATURE/);
  assert.match(auspex, /INTERPRETATION CONCORDANCE/);
  assert.match(auspex, /className="transmission-signal-fidelity-marker"/);
  assert.match(auspex, /left: `clamp\(4px, \$\{fidelity\}%, calc\(100% - 4px\)\)`/);
  assert.match(auspex, /SEMANTIC INTEGRITY/);
  assert.match(auspex, /MNEMONIC LOSS/);
  assert.match(auspex, /EMOTIVE CONTAMINATION/);
  assert.match(auspex, /ARCHIVAL REDACTION/);
  assert.match(auspex, /CIPHER STATUS/);
  assert.match(auspex, /RECONSTRUCTION CONFIDENCE/);
  assert.match(auspex, /ARCHIVE \/ COMMAND DISPOSITION/);
  assert.match(auspex, /ANOMALY REGISTER/);
  assert.match(auspex, /transmissionEventLabels\(event\)/);
  assert.match(styles, /\.transmission-signal-fidelity-marker\s*\{[^}]*position:\s*absolute;[^}]*height:\s*17px;/s);
  assert.match(auspex, /transmissionSignalFidelity\(analysis\)/);
  assert.match(auspex, /<details className="transmission-signal-auspex">/);
  assert.doesNotMatch(auspex, /<details className="transmission-signal-auspex" open>/);
  assert.match(record, /export function buildAstropathicRecordPresentation/);
  assert.match(record, /renderSanctionedInterpretation\(source, analysis\.degradation\)/);
  assert.match(record, /SUBJECT_IMPRESSIONS/);
  assert.doesNotMatch(record, /Math\.random/);
  assert.match(styles, /\.transmission-signal-grid\s*\{[^}]*grid-template-columns:\s*1\.35fr repeat\(2,/s);
  assert.match(styles, /\.astropathic-layer-control\s*\{/);
  assert.match(styles, /\.astropathic-raw-impression\s*\{/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.transmission-signal-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.astropathic-layer-control\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("Phase 3 origin actions share one controlled resolver and safe Intel focus", async () => {
  const [resolver, actions, renderer, home, sectionPage, systemPage, planetPage, styles] = await Promise.all([
    readFile("app/_components/transmission-origin.ts", "utf8"),
    readFile("app/_components/TransmissionOriginActions.tsx", "utf8"),
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/page.tsx", "utf8"),
    readFile("app/intel/system/[system]/planet/[planet]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(resolver, /"vigil-ix": \{ systemName: "Vigil IX" \}/);
  assert.match(resolver, /orison: \{ systemName: "Orison" \}/);
  assert.match(resolver, /"veil-anchor-7": \{ systemName: "The Vesper Rift", bodyName: "Veil Anchor 7" \}/);
  assert.match(resolver, /matchingIndexes\(intel\.worlds/);
  assert.match(resolver, /parentSystemIndex \+ 1/);
  assert.match(resolver, /bodyIndex \+ 1/);
  assert.match(resolver, /EXACT_ORIGIN_STATES\.has\(originState\)/);
  assert.doesNotMatch(resolver, /agency|subject|preview|bodyText|probableOrigin|phase 1.*system/i);
  assert.doesNotMatch(resolver, /\/intel\/system\/4|\/intel\/system\/5|\/intel\/system\/6/);

  assert.match(actions, /resolveTransmissionOrigin\(intel, source\.transmission\)/);
  assert.match(actions, />PLOT ORIGIN</);
  assert.match(actions, />OPEN ORIGIN RECORD</);
  assert.doesNotMatch(actions, /TRACE RELAY PATH/);
  assert.match(actions, /data-origin-resolution=\{resolution\.kind\}/);

  assert.match(renderer, /afterComplete\?: ReactNode/);
  assert.match(renderer, /phase === "complete" && afterComplete/);
  assert.match(home, /afterComplete=\{<TransmissionOriginActions intel=\{data\.sectorIntel\} source=\{selectedRelayMessage\} \/>\}/);
  assert.match(sectionPage, /afterComplete=\{<TransmissionOriginActions intel=\{intel\} source=\{selected\} \/>\}/);

  assert.match(sectionPage, /searchParams\.get\("origin"\)/);
  assert.match(sectionPage, /resolveTransmissionOrigin\(display, \{ originLocationId, originState: "CONFIRMED" \}\)/);
  assert.match(sectionPage, /plottedOrigin\?\.kind === "exact"/);
  assert.match(sectionPage, /plottedOrigin\.parentSystemIndex === index/);
  assert.match(sectionPage, /data-origin-focus=\{isOriginFocus \? plottedOrigin\.canonicalId : undefined\}/);
  assert.match(sectionPage, /aria-current=\{isOriginFocus \? "location" : undefined\}/);

  assert.match(systemPage, /SYSTEM RECORD UNAVAILABLE/);
  assert.match(planetPage, /ORBITAL RECORD UNAVAILABLE/);
  assert.doesNotMatch(systemPage, /\?\? data\.sectorIntel\.worlds\[0\]/);
  assert.doesNotMatch(planetPage, /\?\? data\.sectorIntel\.worlds\[0\]/);
  assert.doesNotMatch(planetPage, /\?\? system\.bodies\[0\]/);

  assert.match(styles, /\.transmission-origin-actions nav\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.transmission-origin-actions\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.sector-world\.transmission-origin-focus/);
  assert.match(styles, /\.sector-origin-fix/);
});

test("Sector Intel uses the green Imperial chart frame without fabricating map records", async () => {
  const [sectionPage, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /className="intel-chart-depth" aria-hidden="true"/);
  assert.match(sectionPage, /className="intel-chart-boundaries" aria-hidden="true"/);
  assert.match(sectionPage, /className="intel-chart-frame" aria-hidden="true"/);
  assert.match(sectionPage, /RELATIVE SPINWARD/);
  assert.match(sectionPage, /LOCAL TRAILING/);
  assert.match(styles, /\.sector-map-grid\s*\{[\s\S]*background-size:\s*2\.5% 2\.5%, 2\.5% 2\.5%, 10% 10%, 10% 10%;/s);
  assert.match(styles, /\.intel-chart-frame\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.intel-chart-frame > \.trailing\s*\{\s*display:\s*none;/s);
  assert.doesNotMatch(sectionPage, /intel-chart-(?:depth|boundaries|frame)[\s\S]{0,300}(?:Vigil IX|Orison|Veil Anchor 7)/);
});

test("the unidentified-system draft renders only provisional non-navigable auspex returns", async () => {
  const [sectionPage, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  for (const signal of ["AUGUR-PRIMUS", "RETURN-I", "RETURN-II", "RETURN-III", "RETURN-IV", "RETURN-IV-A"]) {
    assert.match(sectionPage, new RegExp(`id: "${signal}"`));
  }
  assert.match(sectionPage, /showPreliminarySurvey = display\.worlds\.length === 0/);
  assert.match(sectionPage, /DRAFT DEVELOPMENT RECORD/);
  assert.match(sectionPage, /Names, orbital solutions, allegiance, and navigable routes remain unverified/);
  assert.match(sectionPage, /className=\{`preliminary-survey-contact \$\{contact\.kind\}`\}/);
  assert.doesNotMatch(sectionPage, /preliminarySurveyContacts\.map[\s\S]{0,700}(?:CartographyTransitionLink|href=|onClick=)/);
  assert.match(styles, /\.preliminary-survey-contact\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.preliminary-contact-grid,\.preliminary-survey-briefs\s*\{\s*grid-template-columns:\s*1fr;/s);
});

test("Sector Intel exposes a non-persistent sector to system to planet cartography prototype", async () => {
  const [sectionPage, experience, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/_components/SectorCartographyExperience.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /const completedSectorSimulacrum: SectorIntel/);
  for (const system of ["SIMULACRUM ALPHA", "SIMULACRUM BETA", "SIMULACRUM GAMMA", "SIMULACRUM DELTA"]) {
    assert.match(sectionPage, new RegExp(system));
  }
  assert.match(sectionPage, /const usePrototype = isTestChartActive \|\| intel\.worlds\.length === 0/);
  assert.match(sectionPage, /<SectorCartographyExperience/);
  assert.match(experience, /COGITATING LOCAL SECTOR/);
  assert.match(experience, /setView\(\{ kind: "system", systemIndex \}\)/);
  assert.match(experience, /className="sector-warp-network"/);
  assert.match(experience, /className="system-primary-star"/);
  assert.match(experience, /className="system-orbit-ring"/);
  assert.match(experience, /className="planet-dossier-modal" role="dialog" aria-modal="true"/);
  assert.match(experience, /ORBITAL DISTANCES COMPRESSED · RELATIVE ORDER PRESERVED/);
  assert.match(experience, /SIMULACRUM · NON-CANON · NOT STORED/);
  assert.match(experience, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.doesNotMatch(sectionPage, /onSave\(completedSectorSimulacrum\)|setDraft\(completedSectorSimulacrum\)/);
  assert.match(styles, /\.sector-cogitation-boot\s*\{/);
  assert.match(styles, /\.system-orbit-ring\s*\{/);
  assert.match(styles, /\.planet-dossier-backdrop\s*\{[^}]*position:\s*fixed;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.planet-dossier-modal\s*\{[^}]*width:\s*calc\(100vw - 20px\);/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the Lunaris dossier uses the sealed canon profile and current visual archive", async () => {
  const [sectionPage, archiveData, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/archive-data.ts", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  for (const asset of [
    "/lunaris-flagship.png",
    "/lunaris-recognition-plate.png",
    "/lunaris-dimensions.png",
  ]) {
    assert.match(sectionPage, new RegExp(asset.replaceAll("/", "\\/")));
  }

  assert.match(sectionPage, /Eight torpedo tubes/);
  assert.match(sectionPage, /Thunderhawk gunships", "24–36"/);
  assert.match(sectionPage, /Standard Drop Pods", "~100–120"/);
  assert.match(sectionPage, /Armoured transports", "60–80"/);
  assert.match(sectionPage, /PERMANENT CADRE<\/dt><dd>~120–180 Astartes/);
  assert.match(sectionPage, /CURRENT ROLL<\/dt><dd>056\.M42/);
  assert.match(sectionPage, /Its physical form remains absent from the accessible canon/);
  assert.match(sectionPage, /Authenticated service record/);
  assert.doesNotMatch(sectionPage, /LAUNCHED<\/dt><dd>008\.M42/);
  assert.doesNotMatch(sectionPage, /Countless Worlds Saved|Enemies of Mankind Destroyed|Imperium Preserved/);
  assert.doesNotMatch(sectionPage, /fragment of Luna gifted by Roboute Guilliman|stone is encased in a sacred adamantine reliquary/);

  assert.match(archiveData, /Founding trust · physical form sealed/);
  assert.match(archiveData, /relic\.name !== "Ancient chassis unrecorded"/);
  assert.match(styles, /\.lunaris-recognition-plate\s*\{/);
  assert.match(sectionPage, /lunaris-hero-metrics/);
  assert.match(sectionPage, /setVisualPreview\("recognition"\)/);
  assert.match(sectionPage, /setVisualPreview\("blueprint"\)/);
  assert.match(sectionPage, /OPEN COMPLETE RECOGNITION PLATE/);
  assert.match(sectionPage, /OPEN COMPLETE SCHEMA/);
  assert.match(sectionPage, /useRef<HTMLDialogElement>\(null\)/);
  assert.match(sectionPage, /dialog\.showModal\(\)/);
  assert.match(sectionPage, /visualPreviewBody\.current\.scrollTop = 0/);
  assert.match(sectionPage, /focus\(\{ preventScroll: true \}\)/);
  assert.match(sectionPage, /className="lunaris-media-dialog"/);
  assert.match(styles, /\.lunaris-vessel-art img\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(styles, /\.lunaris-vessel-art img\s*\{[^}]*brightness\(\.86\)/s);
  assert.match(styles, /\.lunaris-recognition-layout\s*\{[^}]*grid-template-columns:/s);
  assert.match(styles, /\.lunaris-recognition-viewport img\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(styles, /\.lunaris-dimensions-plate img\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(styles, /\.lunaris-media-dialog\s*\{[^}]*position:\s*fixed;[^}]*100dvh/s);
  assert.match(styles, /\.lunaris-media-dialog\[open\]\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center/s);
  assert.match(styles, /\.lunaris-media-dialog::backdrop/);
  assert.match(styles, /\.lunaris-recognition-extract dt\s*\{[^}]*--type-control/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.lunaris-recognition-plate > header\s*\{[^}]*flex-direction:\s*column/s);
});

test("the on-site lore editor is an Admin Mode-only structured-lore workflow", async () => {
  const [sectionPage, editor, formattedContent, createRoute, updateRoute, domain, storage, styles] = await Promise.all([
    readFile("app/[section]/page.tsx", "utf8"),
    readFile("app/_components/LoreEntryEditor.tsx", "utf8"),
    readFile("app/_components/LoreFormattedContent.tsx", "utf8"),
    readFile("app/api/admin/lore/route.ts", "utf8"),
    readFile("app/api/admin/lore/[id]/route.ts", "utf8"),
    readFile("app/lore-editor.ts", "utf8"),
    readFile("storage/chapter-records.ts", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(sectionPage, /canEdit=\{canAdmin && isAdminMode\}/);
  assert.doesNotMatch(sectionPage, /CREATE LORE DRAFT|SEAL NEW RECORD/);
  assert.match(sectionPage, /<LoreEntryEditor/);
  assert.match(sectionPage, /EDIT RECORD/);
  assert.match(sectionPage, /useState\(\(\) => entries\[0\]\?\.id \?\? ""\)/);
  assert.match(sectionPage, /className="chronicle-reader-actions"[\s\S]*className="chronicle-reader-edit-button"/);
  assert.match(sectionPage, /className="chronicle-reader-scroll" key=\{selectedId\}/);
  assert.match(sectionPage, /selectedEntry\.status === "draft" \|\| selectedEntry\.status === "review"/);
  assert.doesNotMatch(sectionPage, /chronicle-record-editor-action/);
  assert.doesNotMatch(sectionPage, /CANON LOCK ACTIVE/);
  assert.match(sectionPage, /<LoreFormattedContent content=\{selectedEntry\.content\} \/>/);
  assert.doesNotMatch(sectionPage, /saveSection\("entries"/);

  assert.match(editor, /method: isCreating \? "POST" : "PATCH"/);
  assert.match(editor, /"x-lunar-admin-mode": "active"/);
  assert.match(editor, /status: "draft"/);
  assert.match(editor, /expectedUpdatedAt: entry\.updatedAt/);
  assert.match(editor, /MAX_LORE_CONTENT_LENGTH/);
  assert.match(editor, /document\.body\.style\.overflow = "hidden"/);
  assert.match(editor, /role="toolbar"/);
  assert.match(editor, /applyInlineFormat/);
  assert.match(editor, /applyLineFormat/);
  assert.match(editor, /RECORD TITLE/);
  assert.match(editor, /RECORD SUBTITLE/);
  assert.match(formattedContent, /function renderInlineFormatting/);
  assert.match(formattedContent, /<blockquote/);
  assert.match(formattedContent, /<ul/);
  assert.match(formattedContent, /<ol/);
  assert.doesNotMatch(formattedContent, /dangerouslySetInnerHTML/);

  for (const route of [createRoute, updateRoute]) {
    assert.match(route, /getArchiveAdmin\(\)/);
    assert.match(route, /isSameOriginRequest\(request\)/);
    assert.match(route, /x-lunar-admin-mode/);
  }
  assert.match(createRoute, /parsed\.value\.status !== "draft"/);
  assert.match(updateRoute, /expectedUpdatedAt/);
  assert.match(updateRoute, /canon-locked/);

  assert.match(domain, /status: "draft"/);
  assert.match(domain, /existing\.status === "canon"/);
  assert.match(domain, /existing\.updatedAt !== expectedUpdatedAt/);
  assert.match(domain, /id,/);
  assert.match(storage, /createAdminLoreDraft/);
  assert.match(storage, /updateAdminLoreEntry/);

  assert.match(styles, /\.lore-editor-backdrop\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /\.chronicle-reader-edit-button\s*\{[^}]*border:\s*1px solid #73896b/s);
  assert.doesNotMatch(styles, /\.chronicle-record-editor-action/);
  assert.match(styles, /\.lore-editor-dialog\s*\{[^}]*width:\s*min\(/s);
  assert.match(styles, /\.lore-editor-content-field textarea\s*\{[^}]*min-height:/s);
  assert.match(styles, /\.lore-format-toolbar\s*\{[^}]*display:\s*flex/s);
  assert.match(styles, /\.chronicle-record-content h2,/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.lore-editor-dialog\s*\{[^}]*width:\s*100%/s);
});
