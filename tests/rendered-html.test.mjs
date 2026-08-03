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
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /--actual-sidebar-width:\s*82px/);
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*left:\s*var\(--actual-sidebar-width\);[^}]*right:\s*0;[^}]*bottom:\s*0;/s);
  assert.match(styles, /\.archive-terminal-footer\s*\{[^}]*width:\s*auto;[^}]*max-width:\s*none;[^}]*margin:\s*0;[^}]*box-sizing:\s*border-box;/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*--actual-sidebar-width:\s*58px/);
  assert.match(styles, /\.archive-mode\s*\{[^}]*padding-bottom:/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.archive-terminal-footer/);
});

test("shared interface typography uses the 125 percent readability scale", async () => {
  const styles = await readFile("app/globals.css", "utf8");

  const expectedScale = {
    5: "6.25px",
    6: "7.5px",
    7: "8.75px",
    8: "10px",
    9: "11.25px",
    10: "12.5px",
    11: "13.75px",
    12: "15px",
    13: "16.25px",
    14: "17.5px",
    15: "18.75px",
    16: "20px",
    17: "21.25px",
    18: "22.5px",
  };

  for (const [level, size] of Object.entries(expectedScale)) {
    assert.match(styles, new RegExp(`--ui-text-${level}:\\s*${size.replace(".", "\\.")}`));
  }

  assert.match(styles, /body\s*\{[^}]*font-size:\s*var\(--ui-text-15\)/s);
  assert.match(styles, /\.nav-item small\s*\{[^}]*font-size:\s*var\(--ui-text-9\)[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.archive-terminal-prompt > div\s*\{[^}]*font-size:\s*var\(--ui-text-10\)/s);
  assert.match(styles, /\.timeline p\s*\{[^}]*font-size:\s*var\(--ui-text-14\)/s);
  assert.match(styles, /\.guest-user-form input\s*\{[^}]*font:\s*var\(--ui-text-11\)/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.entry-form\s*\{[^}]*flex-direction:\s*column/s);

  assert.match(styles, /\.nav-icon\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px/s);
  assert.match(styles, /\.crest-shield b\s*\{[^}]*font-size:\s*13px/s);
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

  assert.match(home, /<RelayDataStream[\s\S]*source=\{selectedRelayMessage\}[\s\S]*streamKey=\{selectedRelayMessage\.id\}/);
  assert.match(sectionPage, /<RelayDataStream[^>]*source=\{selected\}[^>]*streamKey=\{selected\.id\}/);
  assert.match(home, /corruption:\s*true/);
  assert.match(sectionPage, /corruption:\s*true/);
  assert.match(home, /document\.body\.style\.overflow = "hidden"/);

  assert.match(renderer, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(renderer, /transmissionRetrievalPause\(corruptionProfile\.seed, lineIndex\)/);
  assert.match(renderer, /className="relay-data-accessible"/);
  assert.match(renderer, /className="relay-data-visual" aria-hidden="true"/);
  assert.match(renderer, /activeLineIndex === index/);
  assert.match(renderer, /phase !== "complete"/);
  assert.match(renderer, /formatCorruptionPercentage\(currentPercentage\)/);

  assert.match(helper, /const CORRUPTION_RANGES/);
  assert.match(helper, /"warp-anomalous": \[12, 30\]/);
  assert.match(helper, /const CORRUPTION_GLYPHS = \["█", "▒", "\?", "\/", "\\\\"\]/);
  assert.match(helper, /hashTransmissionValue\(`\$\{profile\.seed\}:\$\{lineIndex\}:\$\{characterIndex\}`\)/);

  assert.match(styles, /\.relay-dialog\s*\{[^}]*width:\s*min\(760px, calc\(100vw - 32px\)\);[^}]*height:\s*min\(620px, calc\(100vh - 32px\)\);/s);
  assert.match(styles, /\.relay-dialog\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.relay-dialog-body\s*\{[^}]*overflow:\s*auto/s);
  assert.match(styles, /\.relay-data-cursor\s*\{[^}]*background:\s*#9dff80/s);
  assert.match(styles, /\.relay-data-cursor\.pause\s*\{[^}]*relay-stream-cursor/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.relay-dialog\s*\{[^}]*height:\s*calc\(100dvh - 16px\)/s);

  const relaySection = sectionPage.slice(
    sectionPage.indexOf("function AstropathicRelaySection"),
    sectionPage.indexOf("const identityFields"),
  );
  assert.match(relaySection, /className="relay-inbox-grid panel"/);
  assert.doesNotMatch(relaySection, /role="dialog"|relay-dialog-backdrop/);
});
