import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDailyAstropathicMessages,
  astropathicScheduleForDay,
  createDefaultArchiveData,
  normalizeArchiveData,
} from "../app/archive-data.ts";

function dateAt(dayOffset, hour = 12, minute = 0) {
  return new Date(Date.UTC(2026, 0, 1 + dayOffset, hour, minute));
}

function findSchedule(predicate, limit = 1_000) {
  for (let offset = 0; offset < limit; offset += 1) {
    const day = dateAt(offset);
    const schedule = astropathicScheduleForDay(day);
    if (predicate(schedule)) return { day, schedule, offset };
  }
  throw new Error("No deterministic Relay schedule matched the requested condition.");
}

function emptyArchive() {
  const archive = createDefaultArchiveData();
  archive.relayMessages = [];
  archive.relayLastGeneratedDate = "";
  return archive;
}

function relayRecord(overrides = {}) {
  return {
    id: "relay-normalization-fixture",
    agency: "Adeptus Terra",
    subject: "Archive normalization report",
    preview: "A structured transmission fixture.",
    body: "The structured message remains intact.",
    priority: "NOTICE",
    received: "0.588.056.M42",
    receivedAt: "2026-08-03T14:25:00.000Z",
    ...overrides,
  };
}

test("normal days schedule two to four messages with three-to-twelve-hour gaps", () => {
  const { schedule } = findSchedule((candidate) => !candidate.quiet && candidate.burstCount === 0);
  assert.ok(schedule.messages.length >= 2 && schedule.messages.length <= 4);

  const timestamps = schedule.messages.map((message) => Date.parse(message.receivedAt));
  for (let index = 1; index < timestamps.length; index += 1) {
    const gapMinutes = (timestamps[index] - timestamps[index - 1]) / 60_000;
    assert.ok(gapMinutes >= 180 && gapMinutes <= 720);
  }
});

test("quiet periods occur deterministically and contain at most one late arrival", () => {
  const schedules = Array.from({ length: 1_000 }, (_, offset) => astropathicScheduleForDay(dateAt(offset)));
  const quietSchedules = schedules.filter((schedule) => schedule.quiet);
  const quietRate = quietSchedules.length / schedules.length;
  assert.ok(quietRate >= 0.10 && quietRate <= 0.15);
  assert.ok(quietSchedules.some((schedule) => schedule.messages.length === 0));
  for (const schedule of quietSchedules) {
    assert.ok(schedule.messages.length <= 1);
    if (schedule.messages[0]) assert.ok(new Date(schedule.messages[0].receivedAt).getUTCHours() >= 18);
  }
});

test("traffic bursts add one or two messages five to twenty-five minutes apart", () => {
  const schedules = Array.from({ length: 1_000 }, (_, offset) => astropathicScheduleForDay(dateAt(offset)));
  const burstSchedules = schedules.filter((schedule) => schedule.burstCount > 0);
  const burstRate = burstSchedules.length / schedules.length;
  assert.ok(burstRate >= 0.07 && burstRate <= 0.12);

  for (const schedule of burstSchedules) {
    assert.ok(schedule.burstCount === 1 || schedule.burstCount === 2);
    const timestamps = schedule.messages.map((message) => Date.parse(message.receivedAt));
    const burstStart = timestamps.length - schedule.burstCount;
    for (let index = burstStart; index < timestamps.length; index += 1) {
      const gapMinutes = (timestamps[index] - timestamps[index - 1]) / 60_000;
      assert.ok(gapMinutes >= 5 && gapMinutes <= 25);
    }
  }
});

test("only due messages are revealed and later refreshes expose later arrivals", () => {
  const { day, schedule } = findSchedule((candidate) => !candidate.quiet && candidate.messages.length >= 2);
  const firstTime = Date.parse(schedule.messages[0].receivedAt);
  const secondTime = Date.parse(schedule.messages[1].receivedAt);
  const firstRefreshTime = new Date(firstTime + Math.floor((secondTime - firstTime) / 2));
  const firstRefresh = applyDailyAstropathicMessages(emptyArchive(), firstRefreshTime);
  assert.deepEqual(
    firstRefresh.archive.relayMessages.map((message) => message.id).sort(),
    schedule.messages.filter((message) => Date.parse(message.receivedAt) <= firstRefreshTime.getTime()).map((message) => message.id).sort(),
  );

  const endOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));
  const laterRefresh = applyDailyAstropathicMessages(firstRefresh.archive, endOfDay);
  assert.equal(laterRefresh.archive.relayMessages.length, schedule.messages.length);
});

test("timestamps and message identities are deterministic for a date", () => {
  const day = dateAt(41);
  assert.deepEqual(astropathicScheduleForDay(day), astropathicScheduleForDay(new Date(day)));
});

test("refreshes do not create duplicate Relay messages", () => {
  const { day, schedule } = findSchedule((candidate) => candidate.messages.length > 0);
  const endOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));
  const first = applyDailyAstropathicMessages(emptyArchive(), endOfDay);
  const second = applyDailyAstropathicMessages(first.archive, endOfDay);
  assert.equal(second.changed, false);
  assert.equal(second.archive.relayMessages.length, schedule.messages.length);
  assert.equal(new Set(second.archive.relayMessages.map((message) => message.id)).size, schedule.messages.length);
});

test("the deterministic daily cap never exceeds six messages", () => {
  const { schedule } = findSchedule((candidate) => candidate.messages.length === 6);
  assert.equal(schedule.messages.length, 6);
  for (let offset = 0; offset < 1_000; offset += 1) {
    assert.ok(astropathicScheduleForDay(dateAt(offset)).messages.length <= 6);
  }
});

test("older date-only receivedAt records remain valid and prevent duplicates", () => {
  const { day, schedule } = findSchedule((candidate) => candidate.messages.length >= 2);
  const legacyMessage = { ...schedule.messages[0], receivedAt: schedule.key };
  const archive = emptyArchive();
  archive.relayMessages = [legacyMessage];
  archive.relayLastGeneratedDate = schedule.key;
  const endOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));
  const result = applyDailyAstropathicMessages(archive, endOfDay);

  assert.equal(result.archive.relayMessages.filter((message) => message.id === legacyMessage.id).length, 1);
  assert.equal(result.archive.relayMessages.find((message) => message.id === legacyMessage.id)?.receivedAt, schedule.key);
});

test("notable transmissions remain fourteen to twenty-eight days apart", () => {
  const notableDays = [];
  for (let offset = 0; offset < 500; offset += 1) {
    const schedule = astropathicScheduleForDay(dateAt(offset));
    if (schedule.messages.some((message) => message.id.endsWith("-notable"))) notableDays.push(offset);
  }
  assert.ok(notableDays.length >= 17);
  for (let index = 1; index < notableDays.length; index += 1) {
    const gap = notableDays[index] - notableDays[index - 1];
    assert.ok(gap >= 14 && gap <= 28);
  }
});

test("valid optional transmission metadata survives normalization and JSON round-tripping", () => {
  const archive = createDefaultArchiveData();
  archive.relayMessages = [relayRecord({
    transmission: {
      originLocationId: "  vigil-ix  ",
      originLabel: "  VIGIL IX // WESTERN BASTION  ",
      originRegion: "IMPERIUM NIHILUS",
      originBand: "nearby Argent Vigil",
      routeClass: "argent-vigil-relay",
      transmissionMethod: "encrypted-astropathic",
      warpExposure: "MINOR",
      identityState: "VERIFIED",
      originState: "CONFIRMED",
      timestampState: "PARTIAL",
    },
  })];

  const normalized = normalizeArchiveData(JSON.parse(JSON.stringify(archive)));
  assert.deepEqual(normalized.relayMessages[0].transmission, {
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
  });
  assert.deepEqual(
    normalizeArchiveData(JSON.parse(JSON.stringify(normalized))).relayMessages[0].transmission,
    normalized.relayMessages[0].transmission,
  );
});

test("invalid and empty transmission metadata is discarded without altering legacy messages", () => {
  const archive = createDefaultArchiveData();
  const legacy = relayRecord({ subject: "Kharon cipher inquiry" });
  archive.relayMessages = [
    legacy,
    relayRecord({
      id: "invalid-transmission",
      transmission: {
        originLocationId: "   ",
        originLabel: "   ",
        originRegion: "SEGMENTUM UNKNOWN",
        originBand: "Kharon echo",
        routeClass: "warp-superhighway",
        transmissionMethod: "carrier-pigeon",
        warpExposure: "CATASTROPHIC",
        identityState: "CERTAIN",
        originState: "CERTAIN",
        timestampState: "CERTAIN",
      },
    }),
  ];

  const normalized = normalizeArchiveData(archive);
  assert.equal("transmission" in normalized.relayMessages[0], false);
  assert.equal("transmission" in normalized.relayMessages[1], false);
  assert.deepEqual(normalized.relayMessages[0], legacy);
});

test("every finite generated template carries the approved explicit Phase 2 classification", () => {
  const expectedSubjects = new Set([
    "Compliance return overdue",
    "Convoy passage requested",
    "Veil Anchor 7 telemetry",
    "Vigil IX relief appeal",
    "Kharon cipher inquiry",
    "Pilgrim fleet benediction",
    "Founding rolls discrepancy",
    "Argent Psalm signal echo",
    "Discipline review requested",
    "Navigator warning: Vesper Drift",
    "Munitions allocation dispute",
    "Restricted witness transfer",
    "To those who hold the sundered road",
    "Counsel from the returned Lion",
    "Nihilus strategic notice",
    "A most reasonable request for impossible data",
    "Concerning the Argent Procession",
    "Eyes of Terra: restricted advisory",
  ]);
  const messagesBySubject = new Map();

  for (let offset = 0; offset < 3_000 && messagesBySubject.size < expectedSubjects.size; offset += 1) {
    for (const message of astropathicScheduleForDay(dateAt(offset)).messages) {
      if (expectedSubjects.has(message.subject)) messagesBySubject.set(message.subject, message);
    }
  }

  assert.equal(messagesBySubject.size, expectedSubjects.size);
  for (const message of messagesBySubject.values()) assert.ok(message.transmission);
  assert.equal(messagesBySubject.get("Compliance return overdue").transmission.originBand, "Imperium Sanctus via Nachmund");
  assert.equal(messagesBySubject.get("Vigil IX relief appeal").transmission.originBand, "nearby Argent Vigil");
  assert.equal(messagesBySubject.get("Munitions allocation dispute").transmission.originBand, "northern Nachmund theatre");
  assert.equal(messagesBySubject.get("Nihilus strategic notice").transmission.originBand, "distant Imperium Nihilus");
  assert.equal(messagesBySubject.get("Veil Anchor 7 telemetry").transmission.originBand, "unstable Rift crossing");
  assert.equal(messagesBySubject.get("Argent Psalm signal echo").transmission.originBand, "anomalous source");
  assert.equal(messagesBySubject.get("Kharon cipher inquiry").transmission.originBand, "nearby Argent Vigil");
  assert.equal(messagesBySubject.get("A most reasonable request for impossible data").transmission.originRegion, "UNRESOLVED");
  assert.equal("originBand" in messagesBySubject.get("A most reasonable request for impossible data").transmission, false);
});
