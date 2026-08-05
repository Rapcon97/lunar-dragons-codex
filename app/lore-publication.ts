import type { LoreEntry } from "./archive-data";
import type { ChapterLoreState } from "../storage/chapter-records";
import type { OptimisticProposal } from "../storage/optimistic-write";

export type LorePublicationReason = "not-found" | "not-review" | "stale";

function loreEntryToTimeline(entry: LoreEntry) {
  const date = entry.date.trim();
  const content = entry.content.trim();
  return date ? `${date} — ${content}` : content;
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
