import type { LoreEntry } from "./archive-data";
import {
  loreCollectionFitsCapacity,
} from "./lore-limits.ts";
import type { ChapterLoreState } from "../storage/chapter-records";
import type { OptimisticProposal } from "../storage/optimistic-write";

export type LoreDraftInput = Pick<
  LoreEntry,
  "date" | "title" | "category" | "content"
> & { subtitle?: string };

export type LoreEditorReason =
  | "capacity"
  | "canon-locked"
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
  const entry: LoreEntry = {
    id,
    date: input.date.trim(),
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
  if (existing.status === "canon") {
    return { ok: false, reason: "canon-locked" };
  }
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }

  const entry: LoreEntry = {
    ...existing,
    date: input.date.trim(),
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

  return {
    ok: true,
    state: { ...current, loreEntries },
    value: { entry },
  };
}
