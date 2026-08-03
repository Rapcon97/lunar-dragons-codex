import assert from "node:assert/strict";
import test from "node:test";

import {
  appendTransmissionRetrievalDots,
  classifyTransmissionSource,
  corruptTransmissionMetadataValue,
  corruptTransmissionText,
  IMPERIAL_TRANSMISSION_CLOSING,
  MECHANICUS_TRANSMISSION_CLOSING,
  splitTransmissionMetadata,
  TERMINAL_MACHINE_BLESSING,
  TRANSMISSION_TIMING,
  transmissionCharacterDelay,
  transmissionClosing,
  transmissionCorruptionProfile,
  transmissionMetadataValueCanCorrupt,
} from "../app/_components/relay-transmission.ts";

const sources = {
  local: { id: "local-1", agency: "Lunaris Chapter Command", subject: "Internal watch rotation" },
  system: { id: "system-1", agency: "Astra Militarum", subject: "Vigil IX relief appeal" },
  nearby: { id: "nearby-1", agency: "Navis Imperialis", subject: "Nachmund convoy passage" },
  long: { id: "long-1", agency: "Adeptus Terra", subject: "Compliance return overdue" },
  anomalous: { id: "warp-1", agency: "Astropathica", subject: "Vesper Rift signal echo" },
};

test("transmission distance bands retain their approved corruption ranges", () => {
  const expectations = [
    [sources.local, "local", 0, 1],
    [sources.system, "same-system", 0, 3],
    [sources.nearby, "nearby-inter-system", 2, 8],
    [sources.long, "long-range", 5, 15],
    [sources.anomalous, "warp-anomalous", 12, 30],
  ];

  for (const [source, band, minimum, maximum] of expectations) {
    assert.equal(classifyTransmissionSource(source), band);
    const profile = transmissionCorruptionProfile(source);
    assert.equal(profile.band, band);
    assert.ok(profile.percentage >= minimum && profile.percentage <= maximum);
  }
});

test("corruption percentages, glyph positions, and machine-cant fragments are deterministic", () => {
  const profileA = transmissionCorruptionProfile(sources.anomalous);
  const profileB = transmissionCorruptionProfile({ ...sources.anomalous });
  assert.deepEqual(profileA, profileB);

  const content = "The signal persists beyond the Vesper Rift. ".repeat(18);
  const corruptedA = corruptTransmissionText(content, profileA, 11);
  const corruptedB = corruptTransmissionText(content, profileB, 11);
  assert.equal(corruptedA, corruptedB);
  assert.notEqual(corruptedA, content);
  assert.match(corruptedA, /[█▓▒░╳╱╲│║╬†‡ϟƵ҂⌁⌇⫷⫸]|\[(?:NOOS|CANT|VOX-ERR|SIG-LOSS|DATA-NULL|REDACTED)\]|\+\+|\/\/\/|0x/u);
  assert.match(corruptedA, /\[(?:SIG-LOSS|DATA-NULL|REDACTED)\]|\+\+::\+\+|\/\/\/0x\/\/\/|҂҂|ϟϟ/u);
});

test("shared typewriter timing, metadata retrieval, and four-dot cadence stay explicit", () => {
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
  assert.ok(TRANSMISSION_TIMING.metadataLabelMs < TRANSMISSION_TIMING.characterMs);
  assert.equal(appendTransmissionRetrievalDots(">> RETRIEVING ARCHIVE"), ">> RETRIEVING ARCHIVE....");
});

test("structured metadata reveals its fixed label faster and corrupts only the retrieved value", () => {
  const line = "> Local systems query: Officio Prefectus: Vigil IX";
  const metadata = splitTransmissionMetadata(line);
  assert.deepEqual(metadata, {
    label: "> Local systems query:",
    value: " Officio Prefectus: Vigil IX",
  });

  const profile = { band: "warp-anomalous", percentage: 30, seed: 919191 };
  const corrupted = corruptTransmissionMetadataValue(line, profile, 3);
  assert.ok(corrupted.startsWith(metadata.label));
  assert.equal(corrupted.slice(0, metadata.label.length), metadata.label);
  assert.notEqual(corrupted.slice(metadata.label.length), metadata.value);
  assert.equal(splitTransmissionMetadata(">> RETRIEVING ARCHIVE: DRACO"), null);
  assert.equal(transmissionMetadataValueCanCorrupt("> Originator identification:"), false);
  assert.equal(transmissionMetadataValueCanCorrupt("> Subject ident:"), false);
  assert.equal(transmissionMetadataValueCanCorrupt("> Local systems query:"), true);
});

test("sender closings respect Mechanicus origin and never duplicate an existing benediction", () => {
  assert.equal(
    transmissionClosing(sources.long, "The sealed report follows."),
    IMPERIAL_TRANSMISSION_CLOSING,
  );
  assert.equal(
    transmissionClosing({ agency: "Adeptus Mechanicus" }, "Telemetry follows."),
    MECHANICUS_TRANSMISSION_CLOSING,
  );
  assert.equal(
    transmissionClosing(sources.long, "The Emperor protects."),
    null,
  );
  assert.equal(
    transmissionClosing({ agency: "Belisarius Cawl · Archmagos Dominus" }, "By the Omnissiah's will."),
    null,
  );
  assert.equal(TERMINAL_MACHINE_BLESSING, "+++ HAIL THE OMNISSIAH, PRAISE THE MACHINE GOD +++");
});

test("visual corruption never mutates the source text", () => {
  const sourceText = "Recovered astropathic content remains authoritative.";
  const original = `${sourceText}`;
  corruptTransmissionText(sourceText, transmissionCorruptionProfile(sources.long), 2);
  assert.equal(sourceText, original);
});
