import type { LoreEntry } from "./archive-data";

export const GPT_SEARCH_RESULT_LIMIT = 20;
export const GPT_ENTRY_LIST_DEFAULT_LIMIT = 20;
export const GPT_ENTRY_LIST_MAX_LIMIT = 50;
export const GPT_ENTRY_FULL_CONTENT_LIMIT = 1;
export const GPT_CONTENT_PREVIEW_LENGTH = 1_200;

export type GPTLoreEntryListOptions = {
  offset: number;
  limit: number;
  includeContent: boolean;
};

export type GPTLoreEntryListItem = LoreEntry & {
  contentLength: number;
  contentTruncated: boolean;
};

export function boundedGPTContent(content: string) {
  if (content.length <= GPT_CONTENT_PREVIEW_LENGTH) {
    return {
      content,
      contentLength: content.length,
      contentTruncated: false,
    };
  }

  return {
    content: `${content.slice(0, GPT_CONTENT_PREVIEW_LENGTH).trimEnd()}\n\n[CONTENT TRUNCATED — RETRIEVE RECORD BY ID]`,
    contentLength: content.length,
    contentTruncated: true,
  };
}

export function loreEntryForGPTList(
  entry: LoreEntry,
  includeContent: boolean,
): GPTLoreEntryListItem {
  const bounded = includeContent
    ? {
        content: entry.content,
        contentLength: entry.content.length,
        contentTruncated: false,
      }
    : boundedGPTContent(entry.content);

  return {
    ...entry,
    ...bounded,
  };
}

export function normalizeGPTEntryListOptions(
  options: Partial<GPTLoreEntryListOptions> = {},
): GPTLoreEntryListOptions {
  const includeContent = options.includeContent === true;
  const maximum = includeContent
    ? GPT_ENTRY_FULL_CONTENT_LIMIT
    : GPT_ENTRY_LIST_MAX_LIMIT;
  const requestedLimit = Number.isSafeInteger(options.limit)
    ? Number(options.limit)
    : GPT_ENTRY_LIST_DEFAULT_LIMIT;

  return {
    offset:
      Number.isSafeInteger(options.offset) && Number(options.offset) >= 0
        ? Number(options.offset)
        : 0,
    limit: Math.min(Math.max(requestedLimit, 1), maximum),
    includeContent,
  };
}

export function paginateGPTLoreEntries(
  entries: LoreEntry[],
  requestedOptions: Partial<GPTLoreEntryListOptions> = {},
) {
  const options = normalizeGPTEntryListOptions(requestedOptions);
  const selected = entries.slice(options.offset, options.offset + options.limit);
  const nextOffset = options.offset + selected.length;
  const hasMore = nextOffset < entries.length;

  return {
    count: entries.length,
    returned: selected.length,
    offset: options.offset,
    limit: options.limit,
    hasMore,
    nextOffset: hasMore ? nextOffset : null,
    contentMode: options.includeContent ? "full" : "preview",
    entries: selected.map((entry) =>
      loreEntryForGPTList(entry, options.includeContent),
    ),
  } as const;
}

