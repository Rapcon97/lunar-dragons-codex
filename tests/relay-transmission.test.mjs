import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultArchiveData } from "../app/archive-data.ts";
import {
  normalizeTransmissionOriginId,
  resolveTransmissionOrigin,
} from "../app/_components/transmission-origin.ts";

import {
  analyzeTransmission,
  appendTransmissionRetrievalDots,
  classifyTransmissionOrigin,
  corruptTransmissionText,
  formatTransmissionTranscript,
  IMPERIAL_TRANSMISSION_CLOSING,
  MECHANICUS_TRANSMISSION_CLOSING,
  OPERATIONAL_THEATRE,
  prepareTransmissionLine,
  RECEIVING_LOCUS,
  splitTransmissionMetadata,
  TERMINAL_MACHINE_BLESSING,
  TRANSMISSION_CONTENT_MARKER,
  TRANSMISSION_TIMING,
  transmissionCharacterDelay,
  transmissionClosing,
} from "../app/_components/relay-transmission.ts";
import {
  transmissionEventAnalysisLines,
  transmissionEventLabels,
} from "../app/_components/transmission-event-presentation.ts";
import { transmissionBodyFragments } from "../app/transmission-fragments.ts";

const source = (overrides = {}) => ({
  id: "relay-analysis-fixture",
  agency: "Officio Prefectus",
  subject: "Nachmund convoy disposition",
  preview: "A theatre report awaits judgment.",
  body: "The convoy has reached the northern approaches. Chapter command is respectfully advised.",
  priority: "ACTION",
  received: "0.588.056.M42",
  receivedAt: "2026-08-03T14:25:00.000Z",
  ...overrides,
});

test("shared event presentation protects failed-node and delayed analysis fields", () => {
  const fixture = source({
    receivedAt: "2026-08-06T11:30:00.000Z",
    event: {
      version: 1,
      kinds: ["delayed-arrival", "out-of-order-arrival", "failed-relay-node"],
      rootTransmissionId: "relay-analysis-fixture",
      nominalReceivedAt: "2026-08-06T09:00:00.000Z",
    },
  });
  assert.deepEqual(transmissionEventLabels(fixture.event), ["DELAYED EXLOAD", "SEQUENCE ANOMALY", "RELAY FAILURE"]);
  const eventLines = transmissionEventAnalysisLines(fixture);
  assert.ok(eventLines.includes("> Delivery condition: DELAYED EXLOAD"));
  assert.ok(eventLines.includes("> Sequence integrity: OUT-OF-ORDER ARRIVAL"));
  assert.ok(eventLines.includes("> Relay-node condition: FAILED // NODE IDENT UNRECOVERED"));
  assert.equal(eventLines.some((line) => /Vigil|Orison|Vesper|station/i.test(line)), false);

  const formatted = formatTransmissionTranscript(fixture);
  for (const line of formatted.lines.filter((candidate) => eventLines.includes(candidate.text))) {
    assert.equal(line.section, "analysis");
    assert.equal(prepareTransmissionLine(line, formatted.analysis.corruption, formatted.lines.indexOf(line)), line.text);
  }
});

test("timestamp events remain protected metadata and force contradictory integrity", () => {
  for (const [kind, event] of [
    ["future-dated", {
      version: 1,
      kinds: ["future-dated"],
      rootTransmissionId: "relay-analysis-fixture",
      nominalReceivedAt: "2026-08-06T09:00:00.000Z",
      claimedAt: "2026-08-19T09:00:00.000Z",
    }],
    ["contradictory-timestamp", {
      version: 1,
      kinds: ["contradictory-timestamp"],
      rootTransmissionId: "relay-analysis-fixture",
      nominalReceivedAt: "2026-08-06T09:00:00.000Z",
      claimedAt: "2026-07-30T09:00:00.000Z",
      conflictingClaimedAt: "2026-08-19T09:00:00.000Z",
    }],
  ]) {
    const fixture = source({ event, transmission: { timestampState: "VERIFIED" } });
    const formatted = formatTransmissionTranscript(fixture);
    assert.equal(formatted.analysis.timestampIntegrityState, "CONTRADICTORY", kind);
    const protectedLines = formatted.lines.filter((line) => /Claimed data-stamp|Conflicting data-stamp/.test(line.text));
    assert.ok(protectedLines.length >= 1);
    assert.ok(protectedLines.every((line) => line.section === "analysis"));
  }
});

test("partial and recovered transcripts expose only their assigned fragment with protected lineage", () => {
  const body = "Choir alpha recovered the first sealed phrase. Choir beta restored the central warning. Choir gamma verified the final benediction.";
  const fragments = transmissionBodyFragments(body, "fragment-root", 3);
  const partial = source({
    id: "fragment-root",
    body,
    preview: fragments[0],
    event: {
      version: 1,
      kinds: ["partial-transmission"],
      rootTransmissionId: "fragment-root",
      nominalReceivedAt: "2026-08-08T12:00:00.000Z",
      fragment: { index: 1, total: 3, algorithmVersion: 1 },
    },
  });
  const partialTranscript = formatTransmissionTranscript(partial);
  const partialText = partialTranscript.lines.map((line) => line.text).join("\n");
  const partialBody = partialTranscript.lines
    .filter((line) => line.section === "content" && !line.closing)
    .map((line) => line.text.replace(/^>\s?/, ""))
    .join(" ");
  assert.deepEqual(transmissionEventLabels(partial.event), ["PARTIAL TRANSMISSION", "FRAGMENT I/III"]);
  assert.match(partialText, /Exload integrity: PARTIAL TRANSMISSION/);
  assert.equal(partialBody, fragments[0]);
  assert.doesNotMatch(partialText, new RegExp(fragments[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(partialText, new RegExp(fragments[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const recovered = source({
    id: "fragment-root~fragment~02",
    body: fragments[1],
    preview: fragments[1],
    event: {
      version: 1,
      kinds: ["recovered-fragment"],
      rootTransmissionId: "fragment-root",
      parentTransmissionId: "fragment-root",
      ordinal: 2,
      nominalReceivedAt: "2026-08-08T12:00:00.000Z",
      fragment: { index: 2, total: 3, algorithmVersion: 1 },
    },
  });
  const recoveredTranscript = formatTransmissionTranscript(recovered);
  const recoveredText = recoveredTranscript.lines.map((line) => line.text).join("\n");
  const recoveredBody = recoveredTranscript.lines
    .filter((line) => line.section === "content" && !line.closing)
    .map((line) => line.text.replace(/^>\s?/, ""))
    .join(" ");
  assert.deepEqual(transmissionEventLabels(recovered.event), ["RECOVERED FRAGMENT II/III"]);
  assert.match(recoveredText, /Exload integrity: RECOVERED FRAGMENT II\/III/);
  assert.match(recoveredText, /> ROOT TRANSMISSION: 056\/\/[0-9]{6}/);
  assert.equal(recoveredBody, fragments[1]);
  assert.doesNotMatch(recoveredText, new RegExp(fragments[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("echo presentation identifies intentional repeated content without corrupting lineage fields", () => {
  const echo = source({
    id: "echo-root~echo~01",
    event: {
      version: 1,
      kinds: ["duplicate-astropathic-echo"],
      rootTransmissionId: "echo-root",
      parentTransmissionId: "echo-root",
      ordinal: 1,
      nominalReceivedAt: "2026-08-08T12:00:00.000Z",
    },
  });
  assert.deepEqual(transmissionEventLabels(echo.event), ["ASTROPATHIC ECHO"]);
  const formatted = formatTransmissionTranscript(echo);
  const protectedLines = formatted.lines.filter((line) => /ASTROPATHIC ECHO|ROOT TRANSMISSION/.test(line.text));
  assert.equal(protectedLines.length, 2);
  assert.ok(protectedLines.every((line) => line.section === "analysis"));
  for (const line of protectedLines) {
    const index = formatted.lines.indexOf(line);
    assert.equal(prepareTransmissionLine(line, { ...formatted.analysis.corruption, percentage: 35 }, index), line.text);
  }
});

const originFixtures = [
  [source({ id: "origin-internal", agency: "Lunaris Chapter Command", subject: "Internal archive watch" }), "internal Lunaris", 0, 0.5],
  [source({ id: "origin-system", agency: "Astropathica", subject: "In-system local orbit report" }), "same system", 0.1, 1.5],
  [source({ id: "origin-vigil", agency: "Astra Militarum", subject: "Argent Vigil relief appeal" }), "nearby Argent Vigil", 0.5, 4],
  [source({ id: "origin-nachmund", agency: "Navis Imperialis", subject: "Nachmund convoy passage" }), "northern Nachmund theatre", 2, 8],
  [source({ id: "origin-nihilus", agency: "Commander Dante", subject: "Imperium Nihilus disposition" }), "distant Imperium Nihilus", 5, 14],
  [source({ id: "origin-sanctus", agency: "Adeptus Terra", subject: "Indomitus compliance return" }), "Imperium Sanctus via Nachmund", 7, 18],
  [source({ id: "origin-rift", agency: "Navis Nobilite", subject: "Great Rift crossing instability" }), "unstable Rift crossing", 15, 35],
  [source({ id: "origin-anomaly", agency: "Astropathica", subject: "Impossible chronology signal echo" }), "anomalous source", 12, 30],
];

test("Phase 1B analysis is deterministic across all approved origin classifications", () => {
  for (const [fixture, expectedBand, minimum, maximum] of originFixtures) {
    assert.equal(classifyTransmissionOrigin(fixture), expectedBand);
    const first = analyzeTransmission(fixture);
    const second = analyzeTransmission({ ...fixture });
    assert.deepEqual(first, second);
    assert.equal(first.originBand, expectedBand);
    assert.match(first.reliquariumNumber, /^056\/\/[0-9]{6}$/);
    assert.ok(first.corruptionPercentage >= minimum && first.corruptionPercentage <= maximum);
    assert.ok(first.corruptionPercentage >= 0 && first.corruptionPercentage <= 35);
  }
});

test("explicit metadata overrides misleading prose and maps only to approved analysis labels", () => {
  const misleading = source({
    id: "explicit-origin-override",
    agency: "Astropathica",
    subject: "Impossible chronology signal echo from Kharon",
    preview: "The Vesper Rift is discussed in the recovered report.",
    transmission: {
      originLocationId: "vigil-ix",
      originLabel: "VIGIL IX // WESTERN BASTION",
      originRegion: "IMPERIUM NIHILUS",
      originBand: "nearby Argent Vigil",
      routeClass: "argent-vigil-relay",
      transmissionMethod: "encrypted-astropathic",
      warpExposure: "MINOR",
      identityState: "VERIFIED",
      originState: "CONFIRMED",
      timestampState: "PARTIAL",
    },
  });
  const analysis = analyzeTransmission(misleading);

  assert.equal(analysis.originBasis, "metadata");
  assert.equal(analysis.originBand, "nearby Argent Vigil");
  assert.equal(analysis.originRegion, "IMPERIUM NIHILUS");
  assert.equal(analysis.originLocationId, "vigil-ix");
  assert.equal(analysis.probableOriginLabel, "VIGIL IX // WESTERN BASTION");
  assert.equal(analysis.relayPathLabel, "ARGENT VIGIL RELAY");
  assert.equal(analysis.transmissionMethod, "encrypted-astropathic");
  assert.equal(analysis.identityState, "VERIFIED");
  assert.equal(analysis.triangulationState, "CONFIRMED");
  assert.equal(analysis.timestampIntegrityState, "PARTIAL");
  assert.equal(analysis.warpExposureState, "MINOR");
  assert.ok(analysis.corruptionPercentage >= 0.5 && analysis.corruptionPercentage <= 4);
});

test("partial metadata overrides only supplied fields", () => {
  const fixture = source({
    id: "partial-metadata-override",
    agency: "Adeptus Terra",
    subject: "Indomitus compliance return",
    priority: "PRIMUS",
  });
  const inferred = analyzeTransmission(fixture);
  const partial = analyzeTransmission({
    ...fixture,
    transmission: { originLabel: "SEALED CENTRAL ARCHIVE" },
  });

  assert.equal(partial.probableOriginLabel, "SEALED CENTRAL ARCHIVE");
  assert.equal(partial.originBand, inferred.originBand);
  assert.equal(partial.originRegion, inferred.originRegion);
  assert.equal(partial.relayPathLabel, inferred.relayPathLabel);
  assert.equal(partial.transmissionMethod, inferred.transmissionMethod);
  assert.equal(partial.identityState, inferred.identityState);
  assert.equal(partial.triangulationState, inferred.triangulationState);
  assert.equal(partial.timestampIntegrityState, inferred.timestampIntegrityState);
  assert.equal(partial.warpExposureState, inferred.warpExposureState);
  assert.equal(partial.corruptionPercentage, inferred.corruptionPercentage);
});

test("an authenticated Kharon inquiry is distinct from a true anomalous Kharon echo", () => {
  const inquiry = analyzeTransmission(source({
    id: "kharon-inquiry",
    agency: "Ordo Xenos",
    subject: "Kharon cipher inquiry",
    preview: "The recovered pre-founding signal is discussed under seal.",
    transmission: {
      originLabel: "ORDO XENOS // SELENE CONCLAVE",
      originRegion: "IMPERIUM NIHILUS",
      originBand: "nearby Argent Vigil",
      routeClass: "contested-relay",
      transmissionMethod: "encrypted-astropathic",
      identityState: "VERIFIED",
      originState: "PROBABLE",
      timestampState: "VERIFIED",
      warpExposure: "MINOR",
    },
  }));
  const echo = analyzeTransmission(source({
    id: "kharon-echo",
    agency: "Originator unknown",
    subject: "Kharon pre-founding distress signal echo",
    preview: "Impossible chronology detected.",
  }));

  assert.equal(inquiry.originBand, "nearby Argent Vigil");
  assert.equal(inquiry.identityState, "VERIFIED");
  assert.equal(inquiry.relayPathLabel, "CONTESTED RELAY PATH");
  assert.equal(echo.originBand, "anomalous source");
  assert.notEqual(echo.probableOriginLabel, inquiry.probableOriginLabel);
});

test("explicit location analysis leaves reliquarium, clearance, and encryption derivation unchanged", () => {
  const fixture = source({
    id: "institutional-stability",
    agency: "Adeptus Mechanicus",
    subject: "Noospheric telemetry",
    priority: "SEALED",
  });
  const inferred = analyzeTransmission(fixture);
  const explicit = analyzeTransmission({
    ...fixture,
    transmission: {
      originBand: "unstable Rift crossing",
      routeClass: "rift-crossing",
      originState: "CONFIRMED",
    },
  });

  assert.equal(explicit.reliquariumNumber, inferred.reliquariumNumber);
  assert.equal(explicit.clearanceGrade, inferred.clearanceGrade);
  assert.equal(explicit.encryptionProtocol, inferred.encryptionProtocol);
  assert.equal(explicit.originBand, "unstable Rift crossing");
  assert.equal(explicit.relayPathLabel, "RIFT-CROSSING RELAY");
});

test("the shared formatter produces identical Command and Relay transcripts", () => {
  const commandTranscript = formatTransmissionTranscript(source());
  const relayTranscript = formatTransmissionTranscript({ ...source() });
  assert.deepEqual(commandTranscript, relayTranscript);
  assert.equal(commandTranscript.lines[0].text, `>> ACCESSING DATA RELIQUARIUM ${commandTranscript.analysis.reliquariumNumber}`);
  assert.ok(commandTranscript.lines.some((line) => line.text === TRANSMISSION_CONTENT_MARKER));
});

test("terminal analysis uses categorical states and immersive labels", () => {
  const { analysis, lines } = formatTransmissionTranscript(source());
  const text = lines.map((line) => line.text).join("\n");
  const categoricalStates = ["VERIFIED", "CONFIRMED", "PROBABLE", "PARTIAL", "INCONCLUSIVE", "CONTRADICTORY", "UNRECOVERED"];
  const exposureStates = ["NEGLIGIBLE", "MINOR", "MODERATE", "ELEVATED", "SEVERE", "EXTREMIS"];
  const relayPaths = [
    "DIRECT NOOSPHERIC LINK", "LOCAL ASTROPATHIC CHOIR", "ARGENT VIGIL RELAY",
    "NACHMUND RELAY CORRIDOR", "SANCTIONED CHOIR CHAIN", "CONTESTED RELAY PATH",
    "RIFT-CROSSING RELAY", "ASTROPATHIC ECHO", "UNRESOLVED TRANSMISSION PATH",
  ];

  assert.ok(categoricalStates.includes(analysis.identityState));
  assert.ok(categoricalStates.includes(analysis.triangulationState));
  assert.ok(categoricalStates.includes(analysis.timestampIntegrityState));
  assert.ok(exposureStates.includes(analysis.warpExposureState));
  assert.ok(relayPaths.includes(analysis.relayPathLabel));
  assert.doesNotMatch(text, /Origin band|identity confidence|triangulation confidence/i);
  assert.match(text, /> Probable origin:/);
  assert.match(text, new RegExp(`> Receiving locus: ${RECEIVING_LOCUS}`));
  assert.match(text, new RegExp(`> Operational theatre: ${OPERATIONAL_THEATRE}`));
});

test("clearance and encryption remain separate institutional determinations", () => {
  const inquisitorial = analyzeTransmission(source({ agency: "Inquisitor Kyria Draxus", subject: "Ordo seal demand", priority: "SEALED" }));
  const mechanicus = analyzeTransmission(source({ agency: "Adeptus Mechanicus", subject: "Noospheric telemetry", priority: "NOTICE" }));
  const military = analyzeTransmission(source({ agency: "Astra Militarum", subject: "Nachmund task group report", priority: "URGENT" }));

  assert.equal(inquisitorial.clearanceGrade, "OBSIDIAN");
  assert.equal(inquisitorial.encryptionProtocol, "OMEGA");
  assert.equal(mechanicus.clearanceGrade, "MAGENTA");
  assert.equal(mechanicus.encryptionProtocol, "TELOS");
  assert.equal(military.clearanceGrade, "SCARLET");
  assert.equal(military.encryptionProtocol, "CRYPTOX");
});

test("strong authority and encryption can improve integrity without escaping the origin bounds", () => {
  const routine = analyzeTransmission(source({
    id: "authority-correction",
    agency: "Adeptus Terra",
    subject: "Indomitus compliance return",
    priority: "NOTICE",
  }));
  const highAuthority = analyzeTransmission(source({
    id: "authority-correction",
    agency: "Roboute Guilliman, Lord Commander",
    subject: "Indomitus compliance return",
    priority: "PRIMUS",
  }));

  assert.equal(routine.originBand, "Imperium Sanctus via Nachmund");
  assert.equal(highAuthority.originBand, routine.originBand);
  assert.ok(highAuthority.corruptionPercentage <= routine.corruptionPercentage);
  assert.ok(highAuthority.corruptionPercentage >= 7 && highAuthority.corruptionPercentage <= 18);
});

test("unknown origins fall back to a broad theatre-level fix without inventing a system", () => {
  const unknown = analyzeTransmission(source({
    agency: "Imperial agency unverified",
    subject: "Transmission subject obscured",
    preview: "",
  }));
  const transcript = formatTransmissionTranscript(source({
    agency: "Imperial agency unverified",
    subject: "Transmission subject obscured",
    preview: "",
  })).lines.map((line) => line.text).join("\n");

  assert.equal(unknown.originBasis, "receiving-theatre-fallback");
  assert.equal(unknown.probableOriginLabel, "SOURCE UNRESOLVED // THEATRE-LEVEL FIX");
  assert.equal(unknown.identityState, "UNRECOVERED");
  assert.equal(unknown.triangulationState, "INCONCLUSIVE");
  assert.equal(unknown.relayPathLabel, "UNRESOLVED TRANSMISSION PATH");
  assert.doesNotMatch(transcript, /exact system|system designation:|coordinates|relay station/i);
});

test("explicit metadata never invents the unnamed receiving system or unsupported relay terminology", () => {
  const transcript = formatTransmissionTranscript(source({
    id: "no-invented-system",
    agency: "Belisarius Cawl · Archmagos Dominus",
    subject: "A most reasonable request for impossible data",
    transmission: {
      originLabel: "ORIGIN UNRESOLVED // ARCHMAGOS DOMINUS",
      originRegion: "UNRESOLVED",
      routeClass: "unresolved",
      transmissionMethod: "mechanicus-burst",
      identityState: "VERIFIED",
      originState: "UNRECOVERED",
      timestampState: "VERIFIED",
    },
  }));
  const text = transcript.lines.map((line) => line.text).join("\n");

  assert.equal(transcript.analysis.originBasis, "receiving-theatre-fallback");
  assert.equal(transcript.analysis.probableOriginLabel, "ORIGIN UNRESOLVED // ARCHMAGOS DOMINUS");
  assert.equal(transcript.analysis.relayPathLabel, "UNRESOLVED TRANSMISSION PATH");
  assert.equal(transcript.analysis.triangulationState, "UNRECOVERED");
  assert.doesNotMatch(text, /system designation|exact system|coordinates|Draconis Gate relay|Selene relay/i);
});

test("legacy date-only timestamps remain valid but categorically partial", () => {
  const legacy = analyzeTransmission(source({ receivedAt: "2026-08-03" }));
  const missing = analyzeTransmission(source({ received: "", receivedAt: "" }));
  assert.equal(legacy.timestampIntegrityState, "PARTIAL");
  assert.equal(missing.timestampIntegrityState, "UNRECOVERED");
});

test("corruption is confined to body sections and trusted analysis remains exact", () => {
  const formatted = formatTransmissionTranscript(source({ body: "Recovered astropathic content remains authoritative. ".repeat(16) }));
  const severeProfile = { ...formatted.analysis.corruption, percentage: 35 };
  const prepared = formatted.lines.map((line, index) => prepareTransmissionLine(line, severeProfile, index));

  formatted.lines.forEach((line, index) => {
    if (line.corruption) {
      assert.equal(prepared[index], "> Data corruption query: 35.00%");
    } else if (line.section !== "content" || line.closing) {
      assert.equal(prepared[index], line.gap ? "\u00a0" : line.text);
    }
  });
  const bodyIndexes = formatted.lines
    .map((line, index) => line.section === "content" && !line.closing ? index : -1)
    .filter((index) => index >= 0);
  assert.ok(bodyIndexes.some((index) => prepared[index] !== formatted.lines[index].text));

  const futureAnalysisField = { text: "> Estimated transit interval: 07H 42M", section: "analysis" };
  assert.equal(prepareTransmissionLine(futureAnalysisField, severeProfile, 999), futureAnalysisField.text);
  const blessingIndex = formatted.lines.findIndex((line) => line.blessing);
  assert.equal(prepared[blessingIndex], TERMINAL_MACHINE_BLESSING);
});

test("corrupted positions remain deterministic and source text is never mutated", () => {
  const fixture = originFixtures.at(-1)[0];
  const profile = analyzeTransmission(fixture).corruption;
  const body = "The signal persists beyond the northern approaches. ".repeat(18);
  const original = `${body}`;
  const first = corruptTransmissionText(body, profile, 21);
  const second = corruptTransmissionText(body, { ...profile }, 21);
  assert.equal(first, second);
  assert.notEqual(first, body);
  assert.equal(body, original);
});

test("typewriter timing, metadata retrieval, and four-dot cadence remain unchanged", () => {
  assert.deepEqual(TRANSMISSION_TIMING, {
    characterMs: 38,
    minorPunctuationAdditionalMs: 60,
    terminalPunctuationAdditionalMs: 125,
    metadataLabelMs: 10,
    metadataValuePauseMs: 200,
    lineBreakMs: 200,
    retrievalDotMs: 500,
    retrievalDotCount: 4,
    corruptionStepMs: 40,
  });
  assert.equal(transmissionCharacterDelay("A"), 38);
  assert.equal(transmissionCharacterDelay(","), 98);
  assert.equal(transmissionCharacterDelay("!"), 163);
  assert.equal(transmissionCharacterDelay("\n"), 238);
  assert.deepEqual(splitTransmissionMetadata("> Relay path: ARGENT VIGIL RELAY"), {
    label: "> Relay path:",
    value: " ARGENT VIGIL RELAY",
  });
  assert.equal(appendTransmissionRetrievalDots(">> RETRIEVING ARCHIVE"), ">> RETRIEVING ARCHIVE....");
});

test("sender closings and the final machine blessing remain unchanged", () => {
  assert.equal(transmissionClosing(source(), "The sealed report follows."), IMPERIAL_TRANSMISSION_CLOSING);
  assert.equal(transmissionClosing({ agency: "Adeptus Mechanicus" }, "Telemetry follows."), MECHANICUS_TRANSMISSION_CLOSING);
  assert.equal(transmissionClosing(source(), "The Emperor protects."), null);
  assert.equal(transmissionClosing({ agency: "Belisarius Cawl" }, "By the Omnissiah's will."), null);
  assert.equal(TERMINAL_MACHINE_BLESSING, "+++ HAIL THE OMNISSIAH, PRAISE THE MACHINE GOD +++");
});

test("the controlled origin aliases resolve all three supported records", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const vigil = resolveTransmissionOrigin(intel, { originLocationId: "vigil-ix", originState: "CONFIRMED" });
  const orison = resolveTransmissionOrigin(intel, { originLocationId: "orison", originState: "VERIFIED" });
  const anchor = resolveTransmissionOrigin(intel, { originLocationId: "veil-anchor-7", originState: "CONFIRMED" });

  assert.deepEqual(vigil, {
    kind: "exact",
    canonicalId: "vigil-ix",
    label: "Vigil IX",
    parentSystemLabel: "Vigil IX",
    parentSystemIndex: 3,
    mapHref: "/intel?origin=vigil-ix",
    recordHref: "/intel/system/4",
  });
  assert.deepEqual(orison, {
    kind: "exact",
    canonicalId: "orison",
    label: "Orison",
    parentSystemLabel: "Orison",
    parentSystemIndex: 4,
    mapHref: "/intel?origin=orison",
    recordHref: "/intel/system/5",
  });
  assert.deepEqual(anchor, {
    kind: "exact",
    canonicalId: "veil-anchor-7",
    label: "Veil Anchor 7",
    parentSystemLabel: "The Vesper Rift",
    parentSystemIndex: 5,
    bodyIndex: 0,
    mapHref: "/intel?origin=veil-anchor-7",
    recordHref: "/intel/system/6/planet/1",
  });
});

test("explicit origin IDs normalize case, whitespace, underscores, and Imperial dash forms", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const variants = ["  VIGIL IX  ", "vigil_ix", "Vigil‑IX", "vigil---ix"];
  for (const value of variants) {
    assert.equal(normalizeTransmissionOriginId(value), "vigil-ix");
    assert.equal(
      resolveTransmissionOrigin(intel, { originLocationId: value, originState: "CONFIRMED" }).kind,
      "exact",
    );
  }
});

test("origin routes are calculated from the current runtime array order", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const reordered = { ...intel, worlds: [...intel.worlds].reverse() };
  const vigil = resolveTransmissionOrigin(reordered, { originLocationId: "vigil-ix", originState: "CONFIRMED" });
  const anchor = resolveTransmissionOrigin(reordered, { originLocationId: "veil-anchor-7", originState: "CONFIRMED" });

  assert.equal(vigil.kind, "exact");
  assert.equal(vigil.parentSystemIndex, 2);
  assert.equal(vigil.recordHref, "/intel/system/3");
  assert.equal(anchor.kind, "exact");
  assert.equal(anchor.parentSystemIndex, 0);
  assert.equal(anchor.recordHref, "/intel/system/1/planet/1");
});

test("missing, renamed, duplicated, and ambiguous archive records never resolve", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const withoutVigil = { ...intel, worlds: intel.worlds.filter((world) => world.name !== "Vigil IX") };
  const renamedVigil = {
    ...intel,
    worlds: intel.worlds.map((world) => world.name === "Vigil IX" ? { ...world, name: "Western Bastion" } : world),
  };
  const vigil = intel.worlds.find((world) => world.name === "Vigil IX");
  const duplicateVigil = { ...intel, worlds: [...intel.worlds, { ...vigil }] };
  const rift = intel.worlds.find((world) => world.name === "The Vesper Rift");
  const duplicateAnchor = {
    ...intel,
    worlds: intel.worlds.map((world) => world.name === "The Vesper Rift"
      ? { ...world, bodies: [...world.bodies, { ...rift.bodies[0] }] }
      : world),
  };

  for (const candidate of [withoutVigil, renamedVigil, duplicateVigil]) {
    const resolution = resolveTransmissionOrigin(candidate, { originLocationId: "vigil-ix", originState: "CONFIRMED" });
    assert.equal(resolution.kind, "unresolved");
    assert.equal("recordHref" in resolution, false);
  }
  const anchor = resolveTransmissionOrigin(duplicateAnchor, { originLocationId: "veil-anchor-7", originState: "CONFIRMED" });
  assert.equal(anchor.kind, "unresolved");
  assert.equal("recordHref" in anchor, false);
});

test("low-confidence, legacy, inferred, and prose-only origins receive no active links", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const partial = resolveTransmissionOrigin(intel, { originLocationId: "orison", originState: "PARTIAL" });
  const legacy = resolveTransmissionOrigin(intel);
  const proseOnly = resolveTransmissionOrigin(intel, {
    originLabel: "KHARON // SELENE CONCLAVE",
    originBand: "nearby Argent Vigil",
    originState: "CONFIRMED",
  });
  const inferredKharon = resolveTransmissionOrigin(intel, { originLocationId: "kharon", originState: "CONFIRMED" });
  const falseReceivingSystem = resolveTransmissionOrigin(intel, { originLocationId: "lunaris", originState: "CONFIRMED" });

  assert.equal(partial.kind, "broad");
  assert.match(partial.reason, /TRIANGULATION PARTIAL/);
  assert.equal(legacy.kind, "broad");
  assert.match(legacy.reason, /PHASE 1 INFERENCE/);
  assert.equal(proseOnly.kind, "broad");
  assert.equal(inferredKharon.kind, "unresolved");
  assert.equal(falseReceivingSystem.kind, "unresolved");
  for (const resolution of [partial, legacy, proseOnly, inferredKharon, falseReceivingSystem]) {
    assert.equal("recordHref" in resolution, false);
    assert.doesNotMatch(JSON.stringify(resolution), /\/intel\/system\/1/);
  }
});

test("the shared resolver gives Command and Relay identical origin destinations", () => {
  const intel = createDefaultArchiveData().sectorIntel;
  const metadata = { originLocationId: "veil-anchor-7", originState: "VERIFIED" };
  const command = resolveTransmissionOrigin(intel, metadata);
  const relay = resolveTransmissionOrigin(intel, { ...metadata });
  assert.deepEqual(command, relay);
});
