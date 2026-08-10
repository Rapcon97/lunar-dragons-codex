import type { LoreCategory, LoreEntry } from "./archive-data";
import {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
} from "./lore-limits.ts";

export const LORE_ASSISTANT_MODEL = "gpt-5.5";
export const MAX_LORE_ASSISTANT_PROMPT_LENGTH = 4_000;
export const MAX_LORE_ASSISTANT_HISTORY_TURNS = 8;
export const MAX_LORE_ASSISTANT_HISTORY_LENGTH = 24_000;

const MAX_CANON_RECORD_EXCERPT = 10_000;
const MAX_CANON_CONTEXT_LENGTH = 56_000;
const loreCategories: LoreCategory[] = [
  "campaign",
  "event",
  "character",
  "relic",
  "world",
  "organization",
  "decree",
  "other",
];
const loreStatuses = ["draft", "review", "canon", "retconned"] as const;

export type LoreAssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

export type LoreAssistantDraft = {
  recordId: string | null;
  status: LoreEntry["status"];
  date: string;
  title: string;
  subtitle: string;
  category: LoreCategory;
  content: string;
};

export type LoreAssistantRequest = {
  message: string;
  history: LoreAssistantTurn[];
  draft: LoreAssistantDraft;
};

export type LoreAssistantSuggestion = Pick<
  LoreAssistantDraft,
  "date" | "title" | "subtitle" | "category" | "content"
>;

export type LoreAssistantAnswer = {
  reply: string;
  suggestion: LoreAssistantSuggestion | null;
  suggestionSummary: string | null;
  canonReferences: string[];
};

type ParseResult =
  | { ok: true; value: LoreAssistantRequest }
  | { ok: false; error: string };

export function parseLoreAssistantRequest(value: unknown): ParseResult {
  if (!isRecord(value)) return invalid("A JSON object is required.");
  if (hasUnknownKeys(value, ["message", "history", "draft"])) {
    return invalid("The lore consultation contains an unknown field.");
  }

  const message = stringWithin(value.message, MAX_LORE_ASSISTANT_PROMPT_LENGTH);
  if (!message?.trim()) {
    return invalid("Enter a lore question or revision instruction.");
  }

  if (!Array.isArray(value.history) || value.history.length > MAX_LORE_ASSISTANT_HISTORY_TURNS) {
    return invalid("The lore consultation history is invalid.");
  }
  const history: LoreAssistantTurn[] = [];
  let historyLength = 0;
  for (const candidate of value.history) {
    const role = isRecord(candidate) ? candidate.role : null;
    if (
      !isRecord(candidate) ||
      hasUnknownKeys(candidate, ["role", "content"]) ||
      (role !== "user" && role !== "assistant")
    ) {
      return invalid("The lore consultation history is invalid.");
    }
    const content = stringWithin(candidate.content, 6_000)?.trim();
    if (!content) return invalid("The lore consultation history is invalid.");
    historyLength += content.length;
    history.push({ role, content });
  }
  if (historyLength > MAX_LORE_ASSISTANT_HISTORY_LENGTH) {
    return invalid("The lore consultation history is too long.");
  }

  if (!isRecord(value.draft)) return invalid("The active lore draft is required.");
  if (
    hasUnknownKeys(value.draft, [
      "recordId",
      "status",
      "date",
      "title",
      "subtitle",
      "category",
      "content",
    ])
  ) {
    return invalid("The active lore draft contains an unknown field.");
  }
  const recordId = value.draft.recordId;
  if (recordId !== null && (typeof recordId !== "string" || recordId.length > 160)) {
    return invalid("The active lore record ID is invalid.");
  }
  if (!loreStatuses.includes(value.draft.status as LoreEntry["status"])) {
    return invalid("The active lore status is invalid.");
  }
  if (!loreCategories.includes(value.draft.category as LoreCategory)) {
    return invalid("The active lore category is invalid.");
  }
  const date = stringWithin(value.draft.date, 80);
  const title = stringWithin(value.draft.title, 240);
  const subtitle = stringWithin(value.draft.subtitle, MAX_LORE_SUBTITLE_LENGTH);
  const content = stringWithin(value.draft.content, MAX_LORE_CONTENT_LENGTH);
  if (date === null || title === null || subtitle === null || content === null) {
    return invalid("The active lore draft exceeds the archive limits.");
  }

  return {
    ok: true,
    value: {
      message: message.trim(),
      history,
      draft: {
        recordId: recordId === null ? null : recordId.trim(),
        status: value.draft.status as LoreEntry["status"],
        date,
        title,
        subtitle,
        category: value.draft.category as LoreCategory,
        content,
      },
    },
  };
}

export function selectCanonLoreContext(
  loreEntries: readonly LoreEntry[],
  request: LoreAssistantRequest,
) {
  const canon = loreEntries.filter((entry) => entry.status === "canon");
  const terms = searchTerms(
    `${request.message} ${request.draft.title} ${request.draft.subtitle} ${request.draft.category}`,
  );
  const ranked = canon
    .map((entry, index) => ({
      entry,
      index,
      score: relevanceScore(entry, terms),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  let used = 0;
  const records: string[] = [];
  for (const { entry } of ranked) {
    const content = entry.content.slice(0, MAX_CANON_RECORD_EXCERPT);
    const rendered = [
      `ID: ${entry.id}`,
      `TITLE: ${entry.title}`,
      `SUBTITLE: ${entry.subtitle || "NONE"}`,
      `DATE: ${entry.date || "UNRECORDED"}`,
      `CATEGORY: ${entry.category}`,
      "STATUS: CANON",
      "CONTENT:",
      content,
      content.length < entry.content.length ? "[CANON RECORD EXCERPT ENDS]" : "[CANON RECORD ENDS]",
    ].join("\n");
    if (used + rendered.length > MAX_CANON_CONTEXT_LENGTH && records.length > 0) continue;
    records.push(rendered);
    used += rendered.length;
  }

  return {
    canonIds: new Set(canon.map((entry) => entry.id)),
    index: canon.map(
      (entry) => `${entry.id} | ${entry.date || "UNRECORDED"} | ${entry.category} | ${entry.title}`,
    ),
    records,
  };
}

export function buildLoreAssistantOpenAIRequest(
  request: LoreAssistantRequest,
  loreEntries: readonly LoreEntry[],
  safetyIdentifier: string,
) {
  const canon = selectCanonLoreContext(loreEntries, request);
  return {
    model: LORE_ASSISTANT_MODEL,
    store: false,
    safety_identifier: safetyIdentifier,
    reasoning: { effort: "medium" },
    max_output_tokens: 20_000,
    instructions: loreAssistantInstructions,
    input: [
      ...request.history.map((turn) => ({ role: turn.role, content: turn.content })),
      {
        role: "user",
        content: buildConsultationInput(request, canon.index, canon.records),
      },
    ],
    text: {
      verbosity: "medium",
      format: loreAssistantResponseFormat,
    },
  };
}

export function parseLoreAssistantAnswer(
  response: unknown,
  canonIds: ReadonlySet<string>,
): LoreAssistantAnswer | null {
  const outputText = extractOutputText(response);
  if (!outputText) return null;

  let value: unknown;
  try {
    value = JSON.parse(outputText);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const reply = stringWithin(value.reply, 12_000)?.trim();
  if (!reply) return null;
  const summary = value.suggestionSummary;
  const parsedSummary = summary === null ? null : stringWithin(summary, 2_000);
  if (parsedSummary === null && summary !== null) return null;
  if (!Array.isArray(value.canonReferences)) return null;
  const canonReferences = value.canonReferences
    .filter((candidate): candidate is string => typeof candidate === "string")
    .filter((candidate, index, values) => canonIds.has(candidate) && values.indexOf(candidate) === index)
    .slice(0, 12);

  let suggestion: LoreAssistantSuggestion | null = null;
  if (value.suggestion !== null) {
    if (!isRecord(value.suggestion)) return null;
    const date = stringWithin(value.suggestion.date, 80);
    const title = stringWithin(value.suggestion.title, 240);
    const subtitle = stringWithin(
      value.suggestion.subtitle,
      MAX_LORE_SUBTITLE_LENGTH,
    );
    const content = stringWithin(value.suggestion.content, MAX_LORE_CONTENT_LENGTH);
    const category = value.suggestion.category;
    if (
      date === null ||
      title === null ||
      subtitle === null ||
      content === null ||
      !loreCategories.includes(category as LoreCategory)
    ) {
      return null;
    }
    suggestion = {
      date,
      title,
      subtitle,
      category: category as LoreCategory,
      content,
    };
  }

  return {
    reply,
    suggestion,
    suggestionSummary: parsedSummary?.trim() ?? null,
    canonReferences,
  };
}

export async function loreAssistantSafetyIdentifier(email: string) {
  const bytes = new TextEncoder().encode(`lunar-dragons:${email.trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return `ld-${hash.slice(0, 61)}`;
}

const loreAssistantInstructions = `You are the Lunar Dragons Lore Cogitator, an archival development assistant for the Chapter Master.

AUTHORITY AND CANON
- The CANON INDEX and CANON RECORDS supplied by the application are the primary authority for Lunar Dragons facts.
- The ACTIVE DEVELOPMENT RECORD and the administrator's instructions are proposals unless that record is explicitly labelled CANON.
- General Warhammer 40,000 knowledge may help with tone and institutional context, but it must never silently override, extend, or contradict supplied Lunar Dragons canon.
- If the canon does not establish a requested fact, identify it as unresolved and offer a clearly labelled development option instead of presenting it as fact.
- Never describe draft, review, retconned, generated relay traffic, operational roster data, or Sector Intel placeholders as established canon.

WORKFLOW
- Advise, critique, outline, or rewrite according to the administrator's request.
- If a concrete editable revision is requested, return the COMPLETE proposed record in suggestion, preserving unaffected material unless asked to restructure it.
- If no concrete revision is requested, return suggestion as null.
- Do not claim to save, publish, demote, delete, or otherwise modify an archive record. The administrator alone applies and saves proposals.
- Keep archival prose in-universe. Avoid game-design notes, production commentary, conversational placeholders, or invented certainty.
- Preserve stable facts, proper names, dates, titles, and approved heraldry unless the administrator explicitly requests a change that does not conflict with canon.
- Cite the IDs of canon records materially relied upon in canonReferences. Do not invent IDs.

Return only the structured response required by the response schema.`;

const loreAssistantResponseFormat = {
  type: "json_schema",
  name: "lunar_dragons_lore_consultation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      suggestion: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            properties: {
              date: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              category: { type: "string", enum: loreCategories },
              content: { type: "string" },
            },
            required: ["date", "title", "subtitle", "category", "content"],
          },
        ],
      },
      suggestionSummary: { anyOf: [{ type: "string" }, { type: "null" }] },
      canonReferences: { type: "array", items: { type: "string" } },
    },
    required: ["reply", "suggestion", "suggestionSummary", "canonReferences"],
  },
} as const;

function buildConsultationInput(
  request: LoreAssistantRequest,
  canonIndex: readonly string[],
  canonRecords: readonly string[],
) {
  return [
    "ADMINISTRATOR REQUEST:",
    request.message,
    "",
    "ACTIVE DEVELOPMENT RECORD:",
    `ID: ${request.draft.recordId ?? "UNASSIGNED NEW DRAFT"}`,
    `STATUS: ${request.draft.status.toUpperCase()}`,
    `TITLE: ${request.draft.title || "UNTITLED"}`,
    `SUBTITLE: ${request.draft.subtitle || "NONE"}`,
    `DATE: ${request.draft.date || "UNRECORDED"}`,
    `CATEGORY: ${request.draft.category}`,
    "CONTENT:",
    request.draft.content || "[EMPTY DRAFT]",
    "",
    "CANON INDEX:",
    canonIndex.length ? canonIndex.join("\n") : "[NO CANON RECORDS AVAILABLE]",
    "",
    "RELEVANT CANON RECORDS:",
    canonRecords.length ? canonRecords.join("\n\n---\n\n") : "[NO CANON RECORDS AVAILABLE]",
  ].join("\n");
}

function extractOutputText(response: unknown) {
  if (!isRecord(response)) return null;
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;
  const fragments: string[] = [];
  for (const item of response.output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
        fragments.push(part.text);
      }
    }
  }
  return fragments.join("");
}

function relevanceScore(entry: LoreEntry, terms: readonly string[]) {
  const title = entry.title.toLowerCase();
  const subtitle = (entry.subtitle ?? "").toLowerCase();
  const category = entry.category.toLowerCase();
  const content = entry.content.toLowerCase();
  return terms.reduce(
    (score, term) =>
      score +
      (title.includes(term) ? 8 : 0) +
      (subtitle.includes(term) ? 5 : 0) +
      (category.includes(term) ? 4 : 0) +
      (content.includes(term) ? 1 : 0),
    0,
  );
}

function searchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 4),
    ),
  ).slice(0, 32);
}

function stringWithin(value: unknown, maximum: number) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasUnknownKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowlist = new Set(allowed);
  return Object.keys(value).some((key) => !allowlist.has(key));
}

function invalid(error: string): ParseResult {
  return { ok: false, error };
}
