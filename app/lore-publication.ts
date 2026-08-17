import type { LoreEntry, LoreStatus } from "./archive-data";
import type { ChapterLoreState } from "../storage/chapter-records";
import type { OptimisticProposal } from "../storage/optimistic-write";

export type LorePublicationReason = "not-found" | "not-review" | "stale";
export type LoreDraftReturnReason = "not-found" | "not-canon" | "stale";
export type LoreStatusTransitionReason = "not-found" | "unchanged" | "stale";

export function loreEntryToTimeline(entry: LoreEntry) {
  const date = entry.date.trim();
  const content = entry.content.trim();
  return date ? `${date} — ${content}` : content;
}

/**
 * Proposes one explicit administrator-directed lore status transition while
 * preserving record identity, optimistic-write protection, and the canon-only
 * compatibility timeline.
 */
export function proposeLoreStatusTransition(
  current: ChapterLoreState,
  id: string,
  targetStatus: LoreStatus,
  expectedUpdatedAt: number,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry },
  LoreStatusTransitionReason
> {
  const index = current.loreEntries.findIndex((entry) => entry.id === id);
  if (index === -1) return { ok: false, reason: "not-found" };

  const existing = current.loreEntries[index];
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }
  if (existing.status === targetStatus) {
    return { ok: false, reason: "unchanged" };
  }

  const entry: LoreEntry = {
    ...existing,
    status: targetStatus,
    updatedAt: Math.max(now, existing.updatedAt + 1),
  };
  const loreEntries = [...current.loreEntries];
  loreEntries[index] = entry;

  const timelineEntry = loreEntryToTimeline(existing);
  let entries = [...current.entries];
  if (targetStatus === "canon") {
    if (!entries.includes(timelineEntry)) entries.push(timelineEntry);
  } else if (existing.status === "canon") {
    const remainsCanonElsewhere = current.loreEntries.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.status === "canon" &&
        loreEntryToTimeline(candidate) === timelineEntry,
    );
    if (!remainsCanonElsewhere) {
      entries = entries.filter((candidate) => candidate !== timelineEntry);
    }
  }

  return {
    ok: true,
    state: { ...current, loreEntries, entries },
    value: { entry },
  };
}

export function proposeLorePublication(
  current: ChapterLoreState,
  id: string,
  expectedUpdatedAt: number,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry },
  LorePublicationReason
> {
  const index = current.loreEntries.findIndex((entry) => entry.id === id);
  if (index === -1) return { ok: false, reason: "not-found" };

  const existing = current.loreEntries[index];
  if (existing.status !== "review") {
    return { ok: false, reason: "not-review" };
  }
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }

  const entry: LoreEntry = {
    ...existing,
    status: "canon",
    updatedAt: Math.max(now, existing.updatedAt + 1),
  };
  const loreEntries = [...current.loreEntries];
  loreEntries[index] = entry;

  const timelineEntry = loreEntryToTimeline(entry);
  const entries = current.entries.includes(timelineEntry)
    ? [...current.entries]
    : [...current.entries, timelineEntry];

  return {
    ok: true,
    state: { ...current, loreEntries, entries },
    value: { entry },
  };
}

export function proposeLoreDraftReturn(
  current: ChapterLoreState,
  id: string,
  expectedUpdatedAt: number,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry },
  LoreDraftReturnReason
> {
  const index = current.loreEntries.findIndex((entry) => entry.id === id);
  if (index === -1) return { ok: false, reason: "not-found" };

  const existing = current.loreEntries[index];
  if (existing.status !== "canon") {
    return { ok: false, reason: "not-canon" };
  }
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }

  const entry: LoreEntry = {
    ...existing,
    status: "draft",
    updatedAt: Math.max(now, existing.updatedAt + 1),
  };
  const loreEntries = [...current.loreEntries];
  loreEntries[index] = entry;

  const timelineEntry = loreEntryToTimeline(existing);
  const remainsCanonElsewhere = current.loreEntries.some(
    (candidate, candidateIndex) =>
      candidateIndex !== index &&
      candidate.status === "canon" &&
      loreEntryToTimeline(candidate) === timelineEntry,
  );
  const entries = remainsCanonElsewhere
    ? [...current.entries]
    : current.entries.filter((candidate) => candidate !== timelineEntry);

  return {
    ok: true,
    state: { ...current, loreEntries, entries },
    value: { entry },
  };
}
