import type { LoreEntry } from "./archive-data.ts";
import { DEVELOPMENT_TOPICS } from "./chapter-development.ts";
import { normalizeDevelopmentTopicIds } from "./development-links.ts";
import { LORE_ASSISTANT_MODEL } from "./lore-assistant.ts";

export type DevelopmentAssistantRequest = {
  entryId: string;
  expectedUpdatedAt: number;
};

export type DevelopmentAssistantAnswer = {
  topicIds: string[];
  summary: string;
};

type ParseResult =
  | { ok: true; value: DevelopmentAssistantRequest }
  | { ok: false; error: string };

export function parseDevelopmentAssistantRequest(value: unknown): ParseResult {
  if (!isRecord(value)) return invalid("A JSON object is required.");
  if (Object.keys(value).some((key) => !["entryId", "expectedUpdatedAt"].includes(key))) {
    return invalid("The development consultation contains an unknown field.");
  }
  if (typeof value.entryId !== "string" || !value.entryId.trim() || value.entryId.length > 160) {
    return invalid("The lore record ID is invalid.");
  }
  if (
    typeof value.expectedUpdatedAt !== "number" ||
    !Number.isSafeInteger(value.expectedUpdatedAt) ||
    value.expectedUpdatedAt < 0
  ) {
    return invalid("The lore revision is invalid.");
  }
  return {
    ok: true,
    value: {
      entryId: value.entryId.trim(),
      expectedUpdatedAt: value.expectedUpdatedAt,
    },
  };
}

export function buildDevelopmentAssistantOpenAIRequest(
  entry: LoreEntry,
  safetyIdentifier: string,
) {
  return {
    model: LORE_ASSISTANT_MODEL,
    store: false,
    safety_identifier: safetyIdentifier,
    reasoning: { effort: "low" },
    max_output_tokens: 1_500,
    instructions: `You classify one Lunar Dragons archive record against a controlled Chapter-development taxonomy.

Select only topics materially supported or substantially developed by the supplied record. Do not treat a suggested link as canon promotion. Do not infer unsupported facts. Return no more than eight topic IDs. The administrator will review the proposal before saving it.`,
    input: [{
      role: "user",
      content: [
        "CONTROLLED DEVELOPMENT TOPICS:",
        ...DEVELOPMENT_TOPICS.map((topic) => `${topic.id} | ${topic.label} | ${topic.prompt}`),
        "",
        "ARCHIVE RECORD:",
        `ID: ${entry.id}`,
        `STATUS: ${entry.status.toUpperCase()}`,
        `TITLE: ${entry.title}`,
        `SUBTITLE: ${entry.subtitle || "NONE"}`,
        `DATE: ${entry.date || "UNRECORDED"}`,
        `CATEGORY: ${entry.category}`,
        "CONTENT:",
        entry.content,
      ].join("\n"),
    }],
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "lunar_dragons_development_links",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            topicIds: {
              type: "array",
              maxItems: 8,
              items: { type: "string", enum: DEVELOPMENT_TOPICS.map((topic) => topic.id) },
            },
            summary: { type: "string" },
          },
          required: ["topicIds", "summary"],
        },
      },
    },
  } as const;
}

export function parseDevelopmentAssistantAnswer(response: unknown): DevelopmentAssistantAnswer | null {
  const outputText = extractOutputText(response);
  if (!outputText) return null;
  let value: unknown;
  try {
    value = JSON.parse(outputText);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.summary !== "string" || value.summary.length > 2_000) {
    return null;
  }
  const topicIds = normalizeDevelopmentTopicIds(value.topicIds);
  if (!topicIds || topicIds.length > 8) return null;
  return { topicIds, summary: value.summary.trim() };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function invalid(error: string): ParseResult {
  return { ok: false, error };
}
