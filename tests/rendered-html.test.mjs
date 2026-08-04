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

  assert.match(home, /<RelayDataStream[\s\S]*key=\{selectedRelayMessage\.id\}[\s\S]*source=\{selectedRelayMessage\}[\s\S]*streamKey=\{selectedRelayMessage\.id\}/);
  assert.match(sectionPage, /<RelayDataStream[\s\S]*key=\{selected\.id\}[\s\S]*source=\{selected\}[\s\S]*streamKey=\{selected\.id\}/);
  assert.doesNotMatch(home, /COMMAND-LINK|commandRelayLines|lines=\{commandRelayLines\}/);
  assert.doesNotMatch(sectionPage, /056\/\/329652|dataStreamLines|lines=\{dataStreamLines\}/);
  assert.match(home, /document\.body\.style\.overflow = "hidden"/);

  assert.match(renderer, /formatTransmissionTranscript\(source\)/);
  assert.match(renderer, /prepareTransmissionLine\(line, corruptionProfile, lineIndex\)/);
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
  assert.match(renderer, /formatCorruptionPercentage\(currentPercentage\)/);
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
  assert.match(helper, /const ORIGIN_CORRUPTION_RANGES/);
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
  assert.match(helper, /line\.section === "content"/);
  assert.match(helper, /section: "analysis"/);
  assert.match(helper, /section: "terminal-footer"/);
  assert.match(helper, /const CORRUPTION_GLYPHS = \["█", "▓", "▒", "░"/);
  assert.match(helper, /const MACHINE_CANT_FRAGMENTS = \["\+\+", "\/\/\/", "::", "0x", "\[NOOS\]"/);
  assert.match(helper, /const SEVERE_CANT_FRAGMENTS = \["\[SIG-LOSS\]", "\[DATA-NULL\]", "\[REDACTED\]"/);
  assert.match(helper, /hashTransmissionValue\(`\$\{profile\.seed\}:\$\{lineIndex\}:\$\{characterIndex\}`\)/);
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
  assert.match(styles, /\.relay-data-instant\s*\{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.relay-data-stream p, \.relay-data-cursor\s*\{[^}]*animation:\s*none !important/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.relay-dialog\s*\{[^}]*height:\s*calc\(100dvh - 16px\)/s);

  const relaySection = sectionPage.slice(
    sectionPage.indexOf("function AstropathicRelaySection"),
    sectionPage.indexOf("const identityFields"),
  );
  assert.match(sectionPage, /section === "relay" \? "relay-subpage"/);
  assert.match(sectionPage, /workspace \$\{section === "relay" \? "relay-workspace" : ""\}/);
  assert.match(sectionPage, /section !== "relay"/);
  assert.match(sectionPage, /section !== "relay" && \([\s\S]*?<footer><span>THE LUNAR DRAGONS/s);
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
  assert.match(styles, /\.relay-workspace \.relay-subpage\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*display:\s*flex/s);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?\.relay-inbox-grid\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0/s);
  assert.match(styles, /\.relay-terminal-rack-title strong\s*\{[^}]*font:\s*400 clamp\(1\.75rem,[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.relay-inbox-body > \.relay-data-stream\s*\{[^}]*max-width:\s*none[^}]*line-height:\s*1\.3/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.relay-terminal-rack-title strong\s*\{[^}]*white-space:\s*normal/s);
  assert.match(styles, /\.relay-inbox-body\s*\{[^}]*overflow-y:\s*auto[^}]*scrollbar-gutter:\s*stable/s);
  assert.match(styles, /\.relay-inbox-list,[\s\S]*?\.relay-inbox-body\s*\{[^}]*scrollbar-width:\s*thin[^}]*scrollbar-color:\s*#5d7556 #030604/s);
  assert.match(styles, /\.relay-inbox-list::\-webkit-scrollbar-thumb,[\s\S]*?\.relay-inbox-body::\-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*0[^}]*repeating-linear-gradient/s);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?::-webkit-scrollbar-track/s);
  assert.doesNotMatch(relaySection, /role="dialog"|relay-dialog-backdrop/);
});

test("the shared transmission renderer exposes a responsive Signal Auspex", async () => {
  const [stream, auspex, styles] = await Promise.all([
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("app/_components/TransmissionSignalAuspex.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(stream, /<TransmissionSignalAuspex analysis=\{analysis\} event=\{source\.event\} \/>/);
  assert.match(auspex, /SIGNAL AUSPEX \/\/ RELIQUARIUM/);
  assert.match(auspex, /PROBABLE ORIGIN/);
  assert.match(auspex, /TRIANGULATION/);
  assert.match(auspex, /CIPHER AUTHORITY/);
  assert.match(auspex, /RELAY PATH/);
  assert.match(auspex, /WARP EXPOSURE/);
  assert.match(auspex, /SIGNAL LINEAGE/);
  assert.match(auspex, /SIGNAL FIDELITY/);
  assert.match(auspex, /ANOMALY REGISTER/);
  assert.match(auspex, /transmissionEventLabels\(event\)/);
  assert.match(auspex, /transmissionSignalFidelity\(analysis\)/);
  assert.match(auspex, /<details className="transmission-signal-auspex">/);
  assert.doesNotMatch(auspex, /<details className="transmission-signal-auspex" open>/);
  assert.match(styles, /\.transmission-signal-grid\s*\{[^}]*grid-template-columns:\s*1\.35fr repeat\(2,/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.transmission-signal-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("Phase 3 origin actions share one controlled resolver and safe Intel focus", async () => {
  const [resolver, actions, renderer, home, sectionPage, styles] = await Promise.all([
    readFile("app/_components/transmission-origin.ts", "utf8"),
    readFile("app/_components/TransmissionOriginActions.tsx", "utf8"),
    readFile("app/_components/RelayDataStream.tsx", "utf8"),
    readFile("app/page.tsx", "utf8"),
    readFile("app/[section]/page.tsx", "utf8"),
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

  assert.match(styles, /\.transmission-origin-actions nav\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.transmission-origin-actions\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.sector-world\.transmission-origin-focus/);
  assert.match(styles, /\.sector-origin-fix/);
});
