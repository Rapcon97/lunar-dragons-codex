import type { LoreEntry } from "./archive-data.ts";
import {
  isDevelopmentTopicId,
  normalizeDevelopmentTopicId,
} from "./chapter-development.ts";
import type { ChapterLoreState } from "../storage/chapter-records.ts";
import type { OptimisticProposal } from "../storage/optimistic-write.ts";

export const MAX_DEVELOPMENT_TOPIC_LINKS = 32;

export type DevelopmentLinkUpdateReason =
  | "invalid-topics"
  | "not-found"
  | "stale";

export function normalizeDevelopmentTopicIds(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_DEVELOPMENT_TOPIC_LINKS) {
    return null;
  }

  const normalized: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") return null;
    const topicId = normalizeDevelopmentTopicId(candidate);
    if (!isDevelopmentTopicId(topicId)) return null;
    if (!normalized.includes(topicId)) normalized.push(topicId);
  }
  return normalized;
}

export function proposeDevelopmentTopicLinkUpdate(
  current: ChapterLoreState,
  id: string,
  developmentTopicIds: readonly string[],
  expectedUpdatedAt: number,
  now: number,
): OptimisticProposal<
  ChapterLoreState,
  { entry: LoreEntry },
  DevelopmentLinkUpdateReason
> {
  const normalized = normalizeDevelopmentTopicIds(developmentTopicIds);
  if (!normalized) return { ok: false, reason: "invalid-topics" };

  const index = current.loreEntries.findIndex((entry) => entry.id === id);
  if (index < 0) return { ok: false, reason: "not-found" };

  const existing = current.loreEntries[index];
  if (existing.updatedAt !== expectedUpdatedAt) {
    return { ok: false, reason: "stale" };
  }

  const entry: LoreEntry = {
    ...existing,
    ...(normalized.length ? { developmentTopicIds: normalized } : {}),
    updatedAt: Math.max(now, existing.updatedAt + 1),
  };
  if (!normalized.length) delete entry.developmentTopicIds;

  const loreEntries = [...current.loreEntries];
  loreEntries[index] = entry;
  return {
    ok: true,
    state: { ...current, loreEntries },
    value: { entry },
  };
}
