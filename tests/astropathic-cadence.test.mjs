import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDailyAstropathicMessages,
  astropathicScheduleForDay,
  createDefaultArchiveData,
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
