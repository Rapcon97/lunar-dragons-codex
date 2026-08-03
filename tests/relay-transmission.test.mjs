import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyTransmissionSource,
  corruptTransmissionText,
  transmissionCorruptionProfile,
  transmissionRetrievalPause,
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

test("corruption percentages, glyph positions, and retrieval pauses are deterministic", () => {
  const profileA = transmissionCorruptionProfile(sources.anomalous);
  const profileB = transmissionCorruptionProfile({ ...sources.anomalous });
  assert.deepEqual(profileA, profileB);

  const content = "The signal persists beyond the Vesper Rift. ".repeat(18);
  const corruptedA = corruptTransmissionText(content, profileA, 11);
  const corruptedB = corruptTransmissionText(content, profileB, 11);
  assert.equal(corruptedA, corruptedB);
  assert.notEqual(corruptedA, content);
  assert.match(corruptedA, /[█▒?\\/]/);

  const pauseA = transmissionRetrievalPause(profileA.seed, 4);
  const pauseB = transmissionRetrievalPause(profileB.seed, 4);
  assert.equal(pauseA, pauseB);
  assert.ok(pauseA >= 400 && pauseA <= 900);
});

test("visual corruption never mutates the source text", () => {
  const sourceText = "Recovered astropathic content remains authoritative.";
  const original = `${sourceText}`;
  corruptTransmissionText(sourceText, transmissionCorruptionProfile(sources.long), 2);
  assert.equal(sourceText, original);
});
