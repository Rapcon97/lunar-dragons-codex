import type { LoreEntry } from "./archive-data";
import {
  formatLoreChronology,
  parseLoreChronology,
} from "./lore-chronology.ts";
import {
  loreCollectionFitsCapacity,
} from "./lore-limits.ts";
import type { ChapterLoreState } from "../storage/chapter-records";
import type { OptimisticProposal } from "../storage/optimistic-write";
import { loreEntryToTimeline } from "./lore-publication.ts";

export type LoreDraftInput = Pick<
  LoreEntry,
  "date" | "title" | "category" | "content"
> & { subtitle?: string; chronology?: LoreEntry["chronology"] };

export type LoreEditorReason =
  | "capacity"
  | "duplicate"
  | "not-found"
  | "stale";

function sameLoreRecord(left: LoreEntry, right: LoreEntry) {
  return (
    left.date.trim().toLowerCase() === right.date.trim().toLowerCase() &&
    left.content.trim().toLowerCase() === right.content.trim().toLowerCase()
  );
}

export function proposeLoreDraftCreation(
  current: ChapterLoreState,
  input: LoreDraftInput,
  id: string,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry; count: number },
  Extract<LoreEditorReason, "capacity" | "duplicate">
> {
  const chronology =
    input.chronology ?? parseLoreChronology(input.date.trim());
  const entry: LoreEntry = {
    id,
    date: chronology
      ? formatLoreChronology(chronology)
      : input.date.trim(),
    ...(chronology ? { chronology } : {}),
    title: input.title.trim(),
    ...(input.subtitle?.trim() ? { subtitle: input.subtitle.trim() } : {}),
    category: input.category,
    status: "draft",
    content: input.content.trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (current.loreEntries.some((candidate) => sameLoreRecord(candidate, entry))) {
    return { ok: false, reason: "duplicate" };
  }

  const loreEntries = [...current.loreEntries, entry];
  if (!loreCollectionFitsCapacity(loreEntries)) {
    return { ok: false, reason: "capacity" };
  }

  return {
    ok: true,
    state: { ...current, loreEntries },
    value: { entry, count: loreEntries.length },
  };
}

export function proposeLoreEditorUpdate(
  current: ChapterLoreState,
  id: string,
  input: LoreDraftInput,
  expectedUpdatedAt: number,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry },
  LoreEditorReason
> {
  const index = current.loreEntries.findIndex((entry) => entry.id === id);
  if (index === -1) return { ok: false, reason: "not-found" };

  const existing = current.loreEntries[index];
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }

  const chronology =
    input.chronology ?? parseLoreChronology(input.date.trim());
  const entry: LoreEntry = {
    ...existing,
    date: chronology
      ? formatLoreChronology(chronology)
      : input.date.trim(),
    chronology,
    title: input.title.trim(),
    subtitle:
      input.subtitle !== undefined
        ? input.subtitle.trim() || undefined
        : existing.subtitle,
    category: input.category,
    content: input.content.trim(),
    updatedAt: Math.max(now, existing.updatedAt + 1),
  };

  if (
    current.loreEntries.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index && sameLoreRecord(candidate, entry),
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const loreEntries = [...current.loreEntries];
  loreEntries[index] = entry;
  if (!loreCollectionFitsCapacity(loreEntries)) {
    return { ok: false, reason: "capacity" };
  }

  let entries = [...current.entries];
  if (existing.status === "canon") {
    const previousTimelineEntry = loreEntryToTimeline(existing);
    const revisedTimelineEntry = loreEntryToTimeline(entry);
    const previousTimelineRemainsCanon = current.loreEntries.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.status === "canon" &&
        loreEntryToTimeline(candidate) === previousTimelineEntry,
    );

    if (
      previousTimelineEntry !== revisedTimelineEntry &&
      !previousTimelineRemainsCanon
    ) {
      entries = entries.filter(
        (candidate) => candidate !== previousTimelineEntry,
      );
    }
    if (!entries.includes(revisedTimelineEntry)) {
      entries.push(revisedTimelineEntry);
    }
  }

  return {
    ok: true,
    state: { ...current, loreEntries, entries },
    value: { entry },
  };
}
