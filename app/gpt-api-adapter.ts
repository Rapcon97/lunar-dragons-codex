import {
  createDefaultArchiveData,
  type LoreEntry,
} from "./archive-data";
import { loreCollectionFitsCapacity } from "./lore-limits";
import {
  boundedGPTContent,
  GPT_SEARCH_RESULT_LIMIT,
  paginateGPTLoreEntries,
  type GPTLoreEntryListOptions,
} from "./gpt-response-window";
import {
  mutateChapterLore,
  readChapterArchive,
} from "../storage/chapter-records";

export type GPTSearchResult = {
  category: string;
  title: string;
  content: string;
  contentLength?: number;
  contentTruncated?: boolean;
  recordType?: "lore";
  id?: string;
  subtitle?: string;
  date?: string;
  status?: LoreEntry["status"];
  createdAt?: number;
  updatedAt?: number;
};

async function loadArchive() {
  const persistedArchive = await readChapterArchive();
  const archive = persistedArchive ?? createDefaultArchiveData();

  return {
    archive,
    source: persistedArchive ? "database" : "default",
    persisted: Boolean(persistedArchive),
  } as const;
}

/** Convert a structured record into the legacy timeline string contract. */
export function loreEntryToTimeline(entry: LoreEntry) {
  const date = entry.date.trim();
  const content = entry.content.trim();
  return date ? `${date} — ${content}` : content;
}

/** Parse the legacy chronicle input into the structured lore model. */
function chronicleInputToLoreEntry(value: string): LoreEntry {
  const raw = value.trim();
  const match = raw.match(/^(.{1,80}?)\s+(?:—|–|â€”|â€“|-)\s+(.+)$/);
  const date = match ? match[1].trim() : "";
  const content = match ? match[2].trim() : raw;
  const firstClause = content.split(/[.!?]/, 1)[0]?.trim() || content;
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    date,
    title: firstClause.slice(0, 180),
    category: "event",
    // Legacy GPT chronicle writes are AI-authored too, so they follow the same
    // safe default as structured writes until an explicit canon promotion.
    status: "draft",
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function sameLoreEntry(a: LoreEntry, b: LoreEntry) {
  return (
    a.date.trim().toLowerCase() === b.date.trim().toLowerCase() &&
    a.content.trim().toLowerCase() === b.content.trim().toLowerCase()
  );
}

export async function getGPTLore() {
  const { archive, source, persisted } = await loadArchive();

  return {
    source,
    persisted,
    chapter: archive.identity,
    // Keep the published v1 compatibility contract.
    timeline: archive.entries,
    relics: archive.relics,
    sector: archive.sectorIntel,
  };
}

export async function getGPTLoreEntries(
  options: Partial<GPTLoreEntryListOptions> = {},
) {
  const { archive, source, persisted } = await loadArchive();
  const page = paginateGPTLoreEntries(archive.loreEntries, options);

  return {
    source,
    persisted,
    ...page,
  };
}

export async function getGPTLoreEntryById(id: string) {
  const { archive, source, persisted } = await loadArchive();
  const entry = archive.loreEntries.find((candidate) => candidate.id === id);

  if (!entry) {
    return {
      success: false as const,
      reason: "not-found" as const,
      source,
      persisted,
    };
  }

  return {
    success: true as const,
    source,
    persisted,
    entry,
  };
}

export async function searchGPTLore(query: string) {
  const { archive, source } = await loadArchive();
  const normalizedQuery = query.trim().toLowerCase();
  const results: GPTSearchResult[] = [];

  for (const [field, value] of Object.entries(archive.identity)) {
    if (
      typeof value === "string" &&
      value.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({ category: "chapter", title: field, content: value });
    }
  }

  for (const entry of archive.loreEntries) {
    const searchable = [
      entry.date,
      entry.title,
      entry.subtitle ?? "",
      entry.category,
      entry.status,
      entry.content,
    ]
      .join(" ")
      .toLowerCase();

    if (searchable.includes(normalizedQuery)) {
      const bounded = boundedGPTContent(entry.content);
      results.push({
        category: entry.category,
        title: entry.title,
        content: bounded.content,
        contentLength: bounded.contentLength,
        contentTruncated: bounded.contentTruncated,
        recordType: "lore",
        id: entry.id,
        ...(entry.subtitle ? { subtitle: entry.subtitle } : {}),
        date: entry.date,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }
  }

  for (const relic of archive.relics) {
    const searchable = `${relic.name} ${relic.type} ${relic.status}`.toLowerCase();
    if (searchable.includes(normalizedQuery)) {
      results.push({
        category: "relic",
        title: relic.name,
        content: `${relic.type} — ${relic.status}`,
      });
    }
  }

  const sectorFields = [
    archive.sectorIntel.sectorName,
    archive.sectorIntel.subsectorName,
    archive.sectorIntel.currentTheater,
    archive.sectorIntel.deploymentStatus,
    archive.sectorIntel.summary,
  ];

  for (const value of sectorFields) {
    if (value.toLowerCase().includes(normalizedQuery)) {
      results.push({
        category: "sector",
        title: archive.sectorIntel.sectorName,
        content: value,
      });
    }
  }

  for (const world of archive.sectorIntel.worlds) {
    const searchable = `${world.name} ${world.classification} ${world.status}`.toLowerCase();
    if (searchable.includes(normalizedQuery)) {
      results.push({
        category: "world",
        title: world.name,
        content: `${world.classification} — ${world.status}`,
      });
    }

    for (const body of world.bodies) {
      const bodySearch = `${body.name} ${body.type} ${body.status} ${body.allegiance} ${body.resources} ${body.summary}`.toLowerCase();
      if (bodySearch.includes(normalizedQuery)) {
        results.push({
          category: "system-body",
          title: body.name,
          content: body.summary,
        });
      }
    }
  }

  for (const faction of archive.sectorIntel.factions) {
    const searchable = `${faction.name} ${faction.classification} ${faction.disposition}`.toLowerCase();
    if (searchable.includes(normalizedQuery)) {
      results.push({
        category: "faction",
        title: faction.name,
        content: faction.disposition,
      });
    }
  }

  for (const directive of archive.sectorIntel.directives) {
    if (directive.toLowerCase().includes(normalizedQuery)) {
      results.push({
        category: "directive",
        title: "Imperial Directive",
        content: directive,
      });
    }
  }

  const boundedResults = results.slice(0, GPT_SEARCH_RESULT_LIMIT);

  return {
    query: normalizedQuery,
    count: results.length,
    returned: boundedResults.length,
    hasMore: results.length > boundedResults.length,
    source,
    results: boundedResults,
  };
}

export async function appendGPTChronicleEntry(entry: string) {
  const normalizedEntry = entry.trim();
  const loreEntry = chronicleInputToLoreEntry(normalizedEntry);

  const outcome = await mutateChapterLore((archive) => {
    const duplicateLegacyEntry = archive.entries.some(
      (existing) =>
        existing.trim().toLowerCase() === normalizedEntry.toLowerCase(),
    );
    const duplicateStructuredEntry = archive.loreEntries.some((existing) =>
      sameLoreEntry(existing, loreEntry),
    );

    if (duplicateLegacyEntry || duplicateStructuredEntry) {
      return { ok: false as const, reason: "duplicate" as const };
    }

    const loreEntries = [...archive.loreEntries, loreEntry];
    if (!loreCollectionFitsCapacity(loreEntries)) {
      return { ok: false as const, reason: "capacity" as const };
    }

    const entries = [...archive.entries, normalizedEntry];
    return {
      ok: true as const,
      state: {
        ...archive,
        loreEntries,
        entries,
      },
      value: { timelineCount: entries.length },
    };
  });

  if (!outcome.success) {
    return { success: false as const, reason: outcome.reason };
  }

  return {
    success: true as const,
    timelineCount: outcome.value.timelineCount,
  };
}

export type GPTLoreEntryInput = {
  date?: string;
  title?: string;
  subtitle?: string;
  category?: LoreEntry["category"];
  status?: LoreEntry["status"];
  content: string;
};

export async function appendGPTLoreEntry(input: GPTLoreEntryInput) {
  const content = input.content.trim();
  const date = input.date?.trim() ?? "";
  const firstClause = content.split(/[.!?]/, 1)[0]?.trim() || content;
  const now = Date.now();
  const loreEntry: LoreEntry = {
    id: crypto.randomUUID(),
    date,
    title: input.title?.trim() || firstClause.slice(0, 180),
    ...(input.subtitle?.trim() ? { subtitle: input.subtitle.trim() } : {}),
    category: input.category ?? "event",
    status: input.status ?? "draft",
    content,
    createdAt: now,
    updatedAt: now,
  };

  const outcome = await mutateChapterLore((archive) => {
    if (archive.loreEntries.some((existing) => sameLoreEntry(existing, loreEntry))) {
      return { ok: false as const, reason: "duplicate" as const };
    }

    const loreEntries = [...archive.loreEntries, loreEntry];
    if (!loreCollectionFitsCapacity(loreEntries)) {
      return { ok: false as const, reason: "capacity" as const };
    }

    const entries = [...archive.entries, loreEntryToTimeline(loreEntry)];
    return {
      ok: true as const,
      state: { ...archive, loreEntries, entries },
      value: { entry: loreEntry, count: loreEntries.length },
    };
  });

  if (!outcome.success) {
    return { success: false as const, reason: outcome.reason };
  }

  return {
    success: true as const,
    entry: outcome.value.entry,
    count: outcome.value.count,
  };
}

export type GPTLoreEntryUpdate = {
  date?: string;
  title?: string;
  subtitle?: string;
  category?: LoreEntry["category"];
  status?: LoreEntry["status"];
  content?: string;
};

export async function updateGPTLoreEntry(
  id: string,
  input: GPTLoreEntryUpdate,
) {
  const outcome = await mutateChapterLore((archive) => {
    const index = archive.loreEntries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return { ok: false as const, reason: "not-found" as const };
    }

    const existing = archive.loreEntries[index];
    const updated: LoreEntry = {
      ...existing,
      date: input.date !== undefined ? input.date.trim() : existing.date,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      subtitle:
        input.subtitle !== undefined
          ? input.subtitle.trim() || undefined
          : existing.subtitle,
      category: input.category ?? existing.category,
      status: input.status ?? existing.status,
      content:
        input.content !== undefined ? input.content.trim() : existing.content,
      updatedAt: Date.now(),
    };

    const duplicate = archive.loreEntries.some(
      (entry, entryIndex) =>
        entryIndex !== index && sameLoreEntry(entry, updated),
    );
    if (duplicate) {
      return { ok: false as const, reason: "duplicate" as const };
    }

    const loreEntries = [...archive.loreEntries];
    loreEntries[index] = updated;
    if (!loreCollectionFitsCapacity(loreEntries)) {
      return { ok: false as const, reason: "capacity" as const };
    }

    const previousLegacyEntry = loreEntryToTimeline(existing);
    const updatedLegacyEntry = loreEntryToTimeline(updated);
    const legacyIndex = archive.entries.findIndex(
      (entry) => entry === previousLegacyEntry,
    );
    const entries = [...archive.entries];

    if (legacyIndex >= 0) {
      entries[legacyIndex] = updatedLegacyEntry;
    } else if (index < entries.length) {
      entries[index] = updatedLegacyEntry;
    } else {
      entries.push(updatedLegacyEntry);
    }

    return {
      ok: true as const,
      state: { ...archive, loreEntries, entries },
      value: { entry: updated },
    };
  });

  if (!outcome.success) {
    return { success: false as const, reason: outcome.reason };
  }

  return { success: true as const, entry: outcome.value.entry };
}
