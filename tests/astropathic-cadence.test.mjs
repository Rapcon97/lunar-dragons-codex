import assert from "node:assert/strict";
import test from "node:test";

import {
  PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH,
  PHASE_4_EVENT_ACTIVATION_EPOCH,
  applyDailyAstropathicMessages,
  astropathicDerivedEventHash,
  astropathicScheduleForDay,
  createDefaultArchiveData,
  normalizeArchiveData,
} from "../app/archive-data.ts";
import { transmissionBodyFragments } from "../app/transmission-fragments.ts";

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

function findScheduleFrom(start, predicate, limit = 1_000) {
  for (let offset = 0; offset < limit; offset += 1) {
    const day = new Date(start.getTime() + (offset * 86_400_000));
    const schedule = astropathicScheduleForDay(day);
    if (predicate(schedule)) return { day, schedule, offset };
  }
  throw new Error("No deterministic Relay schedule matched the requested post-activation condition.");
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

  const timestamps = schedule.messages.map((message) => Date.parse(message.event?.nominalReceivedAt ?? message.receivedAt));
  for (let index = 1; index < timestamps.length; index += 1) {
    const gapMinutes = (timestamps[index] - timestamps[index - 1]) / 60_000;
    assert.ok(gapMinutes >= 180 && gapMinutes <= 720);
  }
});

test("quiet periods occur deterministically and contain at most one late arrival", () => {
  const schedules = Array.from({ length: 200 }, (_, offset) => astropathicScheduleForDay(dateAt(offset)));
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
  const schedules = Array.from({ length: 200 }, (_, offset) => astropathicScheduleForDay(dateAt(offset)));
  const burstSchedules = schedules.filter((schedule) => schedule.burstCount > 0);
  const burstRate = burstSchedules.length / schedules.length;
  assert.ok(burstRate >= 0.07 && burstRate <= 0.12);

  for (const schedule of burstSchedules) {
    assert.ok(schedule.burstCount === 1 || schedule.burstCount === 2);
    const timestamps = schedule.messages
      .map((message) => Date.parse(message.event?.nominalReceivedAt ?? message.receivedAt))
      .sort((left, right) => left - right);
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

test("Phase 4 activation epoch prevents retroactive historical events", () => {
  const epochTime = Date.parse(PHASE_4_EVENT_ACTIVATION_EPOCH);
  assert.equal(PHASE_4_EVENT_ACTIVATION_EPOCH, "2026-08-05T00:00:00.000Z");
  for (let offset = 0; offset < 216; offset += 1) {
    for (const message of astropathicScheduleForDay(dateAt(offset)).messages) {
      assert.ok(Date.parse(message.receivedAt) < epochTime);
      assert.equal(message.event, undefined);
    }
  }
});

test("Phase 4 event rarity is deterministic and remains within approved sparse bands", () => {
  const counts = new Map();
  let total = 0;
  let crossDay = 0;
  let observedDerivedDeferral = false;
  for (let offset = 0; offset < 4_000; offset += 1) {
    const day = new Date(Date.UTC(2026, 7, 5 + offset, 12));
    const first = astropathicScheduleForDay(day);
    assert.deepEqual(first, astropathicScheduleForDay(new Date(day)));
    for (const message of first.messages) {
      total += 1;
      for (const kind of message.event?.kinds ?? []) counts.set(kind, (counts.get(kind) ?? 0) + 1);
      if (
        message.event?.kinds.includes("delayed-arrival") &&
        message.event.nominalReceivedAt.slice(0, 10) !== message.receivedAt.slice(0, 10)
      ) crossDay += 1;
      if (message.event?.parentTransmissionId) {
        const nominal = Date.parse(message.event.nominalReceivedAt);
        const kind = message.event.kinds[0];
        const [salt, minimum, maximum] = kind === "recovered-fragment" && message.event.ordinal === 2
          ? ["fragment-02-arrival", 4 * 60, 18 * 60]
          : kind === "recovered-fragment"
            ? ["fragment-03-arrival", 20 * 60, 54 * 60]
            : ["echo-01-arrival", 45, 6 * 60];
        const proposed = nominal + ((minimum + (astropathicDerivedEventHash(message.event.rootTransmissionId, salt) % ((maximum - minimum) + 1))) * 60_000);
        if (Date.parse(message.receivedAt) > proposed) observedDerivedDeferral = true;
        assert.ok(Date.parse(message.receivedAt) <= nominal + (72 * 60 * 60 * 1000));
      }
    }
  }
  const rate = (kind) => (counts.get(kind) ?? 0) / total;
  assert.ok(rate("delayed-arrival") >= 0.04 && rate("delayed-arrival") <= 0.06);
  assert.ok(rate("failed-relay-node") >= 0.007 && rate("failed-relay-node") <= 0.013);
  assert.ok(rate("contradictory-timestamp") >= 0.001 && rate("contradictory-timestamp") <= 0.004);
  assert.ok(rate("future-dated") >= 0.0001 && rate("future-dated") <= 0.0015);
  assert.ok(rate("partial-transmission") >= 0.006 && rate("partial-transmission") <= 0.014);
  assert.ok(rate("duplicate-astropathic-echo") >= 0.001 && rate("duplicate-astropathic-echo") <= 0.004);
  assert.ok(crossDay / total >= 0.002 && crossDay / total <= 0.008);
  assert.equal(observedDerivedDeferral, true);
});

test("Phase 4 v1 probabilities remain isolated from new derived child kinds", () => {
  const allowed = new Set([
    "delayed-arrival",
    "out-of-order-arrival",
    "failed-relay-node",
    "contradictory-timestamp",
    "future-dated",
  ]);
  for (let offset = 0; offset < 1; offset += 1) {
    const day = new Date(Date.UTC(2026, 7, 5 + offset, 12));
    const schedule = astropathicScheduleForDay(day);
    assert.ok(schedule.messages.length <= 6);
    assert.equal(new Set(schedule.messages.map((message) => message.id)).size, schedule.messages.length);
    for (const message of schedule.messages) {
      if (!message.event) continue;
      assert.equal(message.event.rootTransmissionId, message.id);
      assert.equal(message.event.parentTransmissionId, undefined);
      assert.equal(message.event.fragment, undefined);
      assert.ok(message.event.kinds.every((kind) => allowed.has(kind)));
    }
  }
});

test("delayed transmissions remain in-day and due-only delivery uses actual receivedAt", () => {
  const isSameDayDelay = (message) => message.event?.kinds.includes("delayed-arrival") &&
    message.event.nominalReceivedAt.slice(0, 10) === message.receivedAt.slice(0, 10);
  const { day, schedule } = findSchedule((candidate) => candidate.messages.some(isSameDayDelay), 5_000);
  const delayed = schedule.messages.find(isSameDayDelay);
  const nominal = Date.parse(delayed.event.nominalReceivedAt);
  const actual = Date.parse(delayed.receivedAt);
  assert.ok(actual > nominal);
  assert.equal(new Date(actual).toISOString().slice(0, 10), new Date(nominal).toISOString().slice(0, 10));

  const beforeActual = applyDailyAstropathicMessages(emptyArchive(), new Date(actual - 1));
  assert.equal(beforeActual.archive.relayMessages.some((message) => message.id === delayed.id), false);
  const whenDue = applyDailyAstropathicMessages(beforeActual.archive, new Date(actual));
  assert.equal(whenDue.archive.relayMessages.some((message) => message.id === delayed.id), true);
  assert.equal(whenDue.archive.relayMessages.find((message) => message.id === delayed.id)?.event?.rootTransmissionId, delayed.id);
  assert.equal(day.toISOString().slice(0, 10), schedule.key);
});

test("out-of-order state is derived only from a same-day delayed transmission", () => {
  const isSameDaySequenceAnomaly = (message) => message.event?.kinds.includes("out-of-order-arrival") &&
    message.event.nominalReceivedAt.slice(0, 10) === message.receivedAt.slice(0, 10);
  const { schedule } = findSchedule((candidate) => candidate.messages.some(isSameDaySequenceAnomaly), 10_000);
  const sequenced = schedule.messages.find(isSameDaySequenceAnomaly);
  assert.ok(sequenced.event.kinds.includes("delayed-arrival"));
  assert.equal(new Date(sequenced.receivedAt).toISOString().slice(0, 10), sequenced.event.nominalReceivedAt.slice(0, 10));
  assert.ok(schedule.messages.some((candidate) =>
    candidate.id !== sequenced.id &&
    Date.parse(candidate.event?.nominalReceivedAt ?? candidate.receivedAt) > Date.parse(sequenced.event.nominalReceivedAt) &&
    Date.parse(candidate.receivedAt) < Date.parse(sequenced.receivedAt),
  ));
});

test("claimed timestamp anomalies never alter actual delivery eligibility", () => {
  for (const kind of ["contradictory-timestamp", "future-dated"]) {
    const { schedule } = findSchedule((candidate) => candidate.messages.some((message) => message.event?.kinds.includes(kind)), 15_000);
    const message = schedule.messages.find((candidate) => candidate.event?.kinds.includes(kind));
    const actual = Date.parse(message.receivedAt);
    assert.equal(applyDailyAstropathicMessages(emptyArchive(), new Date(actual - 1)).archive.relayMessages.some((candidate) => candidate.id === message.id), false);
    assert.equal(applyDailyAstropathicMessages(emptyArchive(), new Date(actual)).archive.relayMessages.some((candidate) => candidate.id === message.id), true);
    if (kind === "future-dated") assert.ok(Date.parse(message.event.claimedAt) > actual);
    if (kind === "contradictory-timestamp") assert.notEqual(message.event.claimedAt, message.event.conflictingClaimedAt);
  }
});

test("repeated refreshes preserve one deterministic event record", () => {
  const { day, schedule } = findSchedule((candidate) => candidate.messages.some((message) => message.event), 5_000);
  const endOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));
  const first = applyDailyAstropathicMessages(emptyArchive(), endOfDay);
  const second = applyDailyAstropathicMessages(first.archive, endOfDay);
  assert.equal(second.changed, false);
  assert.deepEqual(second.archive.relayMessages, first.archive.relayMessages);
  assert.equal(
    new Set(second.archive.relayMessages.map((message) => message.id)).size,
    second.archive.relayMessages.length,
  );
});

test("Phase 4 v2 activation and exact seed form are stable", () => {
  assert.equal(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH, "2026-08-06T00:00:00.000Z");
  const fnv = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  assert.equal(
    astropathicDerivedEventHash("relay-root", "fragment-02-arrival"),
    fnv("relay-event:v2|relay-root|fragment-02-arrival"),
  );
  const preActivation = astropathicScheduleForDay(new Date("2026-08-05T12:00:00.000Z"));
  assert.equal(preActivation.messages.some((message) => /~(?:fragment|echo)~/.test(message.id)), false);
  assert.equal(preActivation.messages.some((message) => message.event?.kinds.includes("partial-transmission")), false);
});

test("partial roots retain full storage while three stable word-aware fragments arrive in order", () => {
  const activation = new Date(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
  const { schedule } = findScheduleFrom(
    activation,
    (candidate) => candidate.messages.some((message) => message.event?.kinds.includes("partial-transmission")),
    2_000,
  );
  const root = schedule.messages.find((message) => message.event?.kinds.includes("partial-transmission"));
  const fragments = transmissionBodyFragments(root.body, root.id, 3);
  assert.equal(root.event.rootTransmissionId, root.id);
  assert.deepEqual(root.event.fragment, { index: 1, total: 3, algorithmVersion: 1 });
  assert.equal(root.preview, fragments[0]);
  assert.equal(fragments.join(" ").replace(/\s+/g, " "), root.body.trim().replace(/\s+/g, " "));

  const children = [];
  const rootDay = new Date(`${root.event.nominalReceivedAt.slice(0, 10)}T12:00:00.000Z`);
  for (let offset = 0; offset <= 3; offset += 1) {
    children.push(...astropathicScheduleForDay(new Date(rootDay.getTime() + (offset * 86_400_000))).messages
      .filter((message) => message.event?.rootTransmissionId === root.id && message.event?.kinds.includes("recovered-fragment")));
  }
  assert.deepEqual(children.map((message) => message.id), [`${root.id}~fragment~02`, `${root.id}~fragment~03`]);
  assert.deepEqual(children.map((message) => message.body), fragments.slice(1));
  assert.ok(Date.parse(children[0].receivedAt) > Date.parse(root.receivedAt));
  assert.ok(Date.parse(children[1].receivedAt) > Date.parse(children[0].receivedAt));
  assert.deepEqual(children.map((message) => message.transmission), [root.transmission, root.transmission]);
});

test("duplicate astropathic echoes use stable child identity and intentional repeated content", () => {
  const activation = new Date(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
  const { schedule } = findScheduleFrom(
    activation,
    (candidate) => candidate.messages.some((message) => message.event?.kinds.includes("duplicate-astropathic-echo")),
    4_000,
  );
  const echo = schedule.messages.find((message) => message.event?.kinds.includes("duplicate-astropathic-echo"));
  assert.equal(echo.id, `${echo.event.rootTransmissionId}~echo~01`);
  assert.equal(echo.event.parentTransmissionId, echo.event.rootTransmissionId);
  assert.equal(echo.event.ordinal, 1);
  const rootDay = new Date(`${echo.event.nominalReceivedAt.slice(0, 10)}T12:00:00.000Z`);
  const root = astropathicScheduleForDay(rootDay).messages.find((message) => message.id === echo.event.rootTransmissionId);
  assert.equal(echo.body, root.body);
  assert.equal(echo.subject, root.subject);
  assert.deepEqual(astropathicScheduleForDay(new Date(`${schedule.key}T12:00:00.000Z`)), schedule);
});

test("cross-day roots remain due-only, bounded to seventy-two hours, and replay despite a current cursor", () => {
  const activation = new Date(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
  const isCrossDay = (message) => message.event?.kinds.includes("delayed-arrival") &&
    message.event.nominalReceivedAt.slice(0, 10) !== message.receivedAt.slice(0, 10);
  const { schedule } = findScheduleFrom(activation, (candidate) => candidate.messages.some(isCrossDay), 4_000);
  const delayed = schedule.messages.find(isCrossDay);
  const nominal = Date.parse(delayed.event.nominalReceivedAt);
  const actual = Date.parse(delayed.receivedAt);
  assert.ok(actual > nominal);
  assert.ok(actual - nominal <= 72 * 60 * 60 * 1000);

  const archive = emptyArchive();
  archive.relayLastGeneratedDate = schedule.key;
  assert.equal(applyDailyAstropathicMessages(archive, new Date(actual - 1)).archive.relayMessages.some((message) => message.id === delayed.id), false);
  const due = applyDailyAstropathicMessages(archive, new Date(actual));
  assert.equal(due.archive.relayMessages.some((message) => message.id === delayed.id), true);
});

test("derived lineage deduplication and the one-hundred-twenty record history cap remain intact", () => {
  const activation = new Date(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
  const { schedule } = findScheduleFrom(
    activation,
    (candidate) => candidate.messages.some((message) => message.event?.kinds.includes("recovered-fragment")),
    2_000,
  );
  const child = schedule.messages.find((message) => message.event?.kinds.includes("recovered-fragment"));
  const archive = emptyArchive();
  archive.relayMessages = Array.from({ length: 119 }, (_, index) => relayRecord({
    id: `historical-${index}`,
    receivedAt: "2026-01-01T00:00:00.000Z",
  }));
  archive.relayMessages.push({ ...child, id: "legacy-lineage-alias" });
  archive.relayLastGeneratedDate = schedule.key;
  const applied = applyDailyAstropathicMessages(archive, new Date(Date.parse(child.receivedAt) + 1));
  assert.equal(applied.archive.relayMessages.some((message) => message.id === child.id), false);
  assert.equal(applied.archive.relayMessages.length, 120);
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

test("valid event metadata survives normalization and JSON round-tripping", () => {
  const archive = createDefaultArchiveData();
  archive.relayMessages = [relayRecord({
    event: {
      version: 1,
      kinds: ["delayed-arrival", "out-of-order-arrival", "delayed-arrival"],
      rootTransmissionId: " relay-normalization-fixture ",
      parentTransmissionId: " future-parent ",
      ordinal: 2,
      nominalReceivedAt: "2026-08-03T13:25:00.000Z",
      claimedAt: "2026-08-03T12:25:00.000Z",
      conflictingClaimedAt: "2026-08-03T16:25:00.000Z",
      fragment: { index: 2, total: 3, algorithmVersion: 1 },
    },
  })];
  const normalized = normalizeArchiveData(JSON.parse(JSON.stringify(archive)));
  assert.deepEqual(normalized.relayMessages[0].event, {
    version: 1,
    kinds: ["delayed-arrival", "out-of-order-arrival"],
    rootTransmissionId: "relay-normalization-fixture",
    parentTransmissionId: "future-parent",
    ordinal: 2,
    nominalReceivedAt: "2026-08-03T13:25:00.000Z",
    claimedAt: "2026-08-03T12:25:00.000Z",
    conflictingClaimedAt: "2026-08-03T16:25:00.000Z",
    fragment: { index: 2, total: 3, algorithmVersion: 1 },
  });
  assert.deepEqual(
    normalizeArchiveData(JSON.parse(JSON.stringify(normalized))).relayMessages[0].event,
    normalized.relayMessages[0].event,
  );
});

test("fragment and echo lineage metadata normalizes additively without touching message bodies", () => {
  const archive = createDefaultArchiveData();
  archive.relayMessages = [
    relayRecord({
      id: "root-partial",
      body: "The complete root body remains stored even while only fragment one is rendered.",
      event: {
        version: 1,
        kinds: ["partial-transmission"],
        rootTransmissionId: "root-partial",
        nominalReceivedAt: "2026-08-08T12:00:00.000Z",
        fragment: { index: 1, total: 3, algorithmVersion: 1 },
      },
    }),
    relayRecord({
      id: "root-partial~fragment~02",
      body: "Only fragment two is stored in this child.",
      event: {
        version: 1,
        kinds: ["recovered-fragment"],
        rootTransmissionId: "root-partial",
        parentTransmissionId: "root-partial",
        ordinal: 2,
        nominalReceivedAt: "2026-08-08T12:00:00.000Z",
        fragment: { index: 2, total: 3, algorithmVersion: 1 },
      },
    }),
    relayRecord({
      id: "echo-root~echo~01",
      event: {
        version: 1,
        kinds: ["duplicate-astropathic-echo"],
        rootTransmissionId: "echo-root",
        parentTransmissionId: "echo-root",
        ordinal: 1,
        nominalReceivedAt: "2026-08-08T12:00:00.000Z",
      },
    }),
  ];
  const normalized = normalizeArchiveData(JSON.parse(JSON.stringify(archive)));
  assert.equal(normalized.relayMessages[0].body, archive.relayMessages[0].body);
  assert.equal(normalized.relayMessages[1].body, archive.relayMessages[1].body);
  assert.deepEqual(normalized.relayMessages.map((message) => message.event), archive.relayMessages.map((message) => message.event));
});

test("invalid event metadata fails closed without invalidating its legacy message", () => {
  const archive = createDefaultArchiveData();
  const legacy = relayRecord({ subject: "Legacy relay record" });
  archive.relayMessages = [
    legacy,
    relayRecord({
      id: "invalid-event",
      event: {
        version: 9,
        kinds: ["teleport-arrival"],
        rootTransmissionId: "",
        nominalReceivedAt: "never",
      },
    }),
    relayRecord({
      id: "invalid-future-claim",
      event: {
        version: 1,
        kinds: ["future-dated"],
        rootTransmissionId: "invalid-future-claim",
        nominalReceivedAt: "2026-08-03T14:25:00.000Z",
        claimedAt: "not-a-timestamp",
      },
    }),
    relayRecord({
      id: "invalid-fragment-lineage",
      body: "The message body survives malformed fragment metadata.",
      event: {
        version: 1,
        kinds: ["recovered-fragment"],
        rootTransmissionId: "another-root",
        parentTransmissionId: "wrong-parent",
        ordinal: 2,
        nominalReceivedAt: "2026-08-03T14:25:00.000Z",
        fragment: { index: 2, total: 3, algorithmVersion: 1 },
      },
    }),
  ];
  const normalized = normalizeArchiveData(archive);
  assert.deepEqual(normalized.relayMessages[0], legacy);
  assert.equal(normalized.relayMessages[1].id, "invalid-event");
  assert.equal(normalized.relayMessages[1].event, undefined);
  assert.equal(normalized.relayMessages[2].event, undefined);
  assert.equal(normalized.relayMessages[3].event, undefined);
  assert.equal(normalized.relayMessages[3].body, "The message body survives malformed fragment metadata.");
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
