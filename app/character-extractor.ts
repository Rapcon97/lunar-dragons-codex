import type {
  ChapterCharacterStatus,
  ChapterCompany,
  LoreEntry,
} from "./archive-data";
import { LORE_ASSISTANT_MODEL } from "./lore-assistant.ts";

export const MAX_CHARACTER_SOURCE_RECORDS = 12;
export const MAX_CHARACTER_EXTRACTION_INSTRUCTIONS = 1_500;
const MAX_CHARACTER_SOURCE_EXCERPT = 12_000;
const MAX_CHARACTER_SOURCE_CONTEXT = 60_000;

export type CharacterExtractionRequest = {
  loreEntryIds: string[];
  instructions: string;
};

export type CharacterExtractionProposal = {
  name: string;
  rank: string;
  honorific: string;
  role: string;
  companyNumber: string;
  status: ChapterCharacterStatus;
  introducedAt: string;
  deathAt: string;
  biography: string;
  heroicDeeds: string[];
};

export type CharacterExtractionAnswer = {
  proposal: CharacterExtractionProposal | null;
  summary: string;
  unresolved: string[];
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseCharacterExtractionRequest(
  value: unknown,
): ParseResult<CharacterExtractionRequest> {
  if (!isRecord(value) || hasUnknownKeys(value, ["loreEntryIds", "instructions"])) {
    return invalid("A valid archive-extraction request is required.");
  }
  if (
    !Array.isArray(value.loreEntryIds) ||
    value.loreEntryIds.length === 0 ||
    value.loreEntryIds.length > MAX_CHARACTER_SOURCE_RECORDS
  ) {
    return invalid(`Choose between 1 and ${MAX_CHARACTER_SOURCE_RECORDS} canon records.`);
  }
  const loreEntryIds = value.loreEntryIds
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  if (
    loreEntryIds.length !== value.loreEntryIds.length ||
    loreEntryIds.some((id) => id.length > 160) ||
    new Set(loreEntryIds).size !== loreEntryIds.length
  ) {
    return invalid("The selected archive record identifiers are invalid.");
  }
  const instructions = typeof value.instructions === "string" ? value.instructions.trim() : "";
  if (instructions.length > MAX_CHARACTER_EXTRACTION_INSTRUCTIONS) {
    return invalid("The extraction guidance is too long.");
  }
  return { ok: true, value: { loreEntryIds, instructions } };
}

export function selectCharacterCanonSources(
  loreEntries: readonly LoreEntry[],
  loreEntryIds: readonly string[],
): ParseResult<LoreEntry[]> {
  const byId = new Map(loreEntries.map((entry) => [entry.id, entry]));
  const selected: LoreEntry[] = [];
  for (const id of loreEntryIds) {
    const entry = byId.get(id);
    if (!entry || entry.status !== "canon") {
      return invalid("Every selected source must be an existing canon record.");
    }
    selected.push(entry);
  }
  return { ok: true, value: selected };
}

export function buildCharacterExtractionOpenAIRequest(
  request: CharacterExtractionRequest,
  sources: readonly LoreEntry[],
  companies: readonly ChapterCompany[],
  safetyIdentifier: string,
) {
  const records: string[] = [];
  let used = 0;
  for (const entry of sources) {
    const excerpt = entry.content.slice(0, MAX_CHARACTER_SOURCE_EXCERPT);
    const record = [
      `ID: ${entry.id}`,
      `TITLE: ${entry.title}`,
      `SUBTITLE: ${entry.subtitle || "NONE"}`,
      `DATE: ${entry.date || "UNRECORDED"}`,
      `CATEGORY: ${entry.category}`,
      "STATUS: CANON",
      "CONTENT:",
      excerpt,
      excerpt.length < entry.content.length ? "[CANON EXCERPT ENDS]" : "[CANON RECORD ENDS]",
    ].join("\n");
    if (used + record.length > MAX_CHARACTER_SOURCE_CONTEXT && records.length > 0) continue;
    records.push(record);
    used += record.length;
  }

  return {
    model: LORE_ASSISTANT_MODEL,
    store: false,
    safety_identifier: safetyIdentifier,
    reasoning: { effort: "low" },
    max_output_tokens: 4_000,
    instructions: characterExtractionInstructions,
    input: [{
      role: "user",
      content: [
        "ADMINISTRATOR GUIDANCE:",
        request.instructions || "Extract the single character most clearly established by these records.",
        "",
        "VALID COMPANY IDENTIFIERS:",
        companies.length
          ? companies.map((company) => `${company.number} | ${company.name}`).join("\n")
          : "[NO COMPANY IDENTIFIERS AVAILABLE]",
        "",
        "SELECTED CANON RECORDS:",
        records.join("\n\n---\n\n"),
      ].join("\n"),
    }],
    text: {
      verbosity: "low",
      format: characterExtractionResponseFormat,
    },
  };
}

export function parseCharacterExtractionAnswer(
  response: unknown,
  companies: readonly ChapterCompany[],
): CharacterExtractionAnswer | null {
  const outputText = extractOutputText(response);
  if (!outputText) return null;
  let value: unknown;
  try {
    value = JSON.parse(outputText);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.summary !== "string" || !Array.isArray(value.unresolved)) {
    return null;
  }
  const summary = within(value.summary, 2_000)?.trim();
  const unresolved = value.unresolved
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => candidate.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 20);
  if (!summary) return null;
  if (value.proposal === null) return { proposal: null, summary, unresolved };
  if (!isRecord(value.proposal)) return null;

  const status = value.proposal.status;
  if (!isCharacterStatus(status)) return null;
  const name = trimmedWithin(value.proposal.name, 200);
  const rank = trimmedWithin(value.proposal.rank, 160);
  const honorific = trimmedWithin(value.proposal.honorific, 240);
  const role = trimmedWithin(value.proposal.role, 240);
  const introducedAt = trimmedWithin(value.proposal.introducedAt, 80);
  const deathAt = trimmedWithin(value.proposal.deathAt, 80);
  const biography = trimmedWithin(value.proposal.biography, 12_000);
  const companyNumber = trimmedWithin(value.proposal.companyNumber, 20);
  if (
    !name || rank === null || honorific === null || role === null ||
    introducedAt === null || deathAt === null || biography === null || companyNumber === null ||
    !Array.isArray(value.proposal.heroicDeeds)
  ) return null;
  const heroicDeeds = value.proposal.heroicDeeds
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => candidate.trim().slice(0, 1_000))
    .filter(Boolean)
    .slice(0, 50);
  const validCompanyNumber = companies.some((company) => company.number === companyNumber)
    ? companyNumber
    : "";

  return {
    proposal: {
      name,
      rank,
      honorific,
      role,
      companyNumber: validCompanyNumber,
      status,
      introducedAt,
      deathAt,
      biography,
      heroicDeeds,
    },
    summary,
    unresolved,
  };
}

const characterExtractionInstructions = `You are an archival extraction engine for the Lunar Dragons Chapter personnel reliquary.

Use only facts explicitly supported by the SELECTED CANON RECORDS. Do not use general Warhammer knowledge to invent a name, rank, company, date, deed, death, epithet, or biography detail. Operational roster data not present in the supplied canon is not authority.

Extract exactly one character. If the records describe multiple plausible characters and the administrator guidance does not disambiguate them, return proposal as null and explain the ambiguity. If no named or uniquely identifiable character is established, return proposal as null.

For uncertain or absent fields, return an empty string or omit the unsupported item from heroicDeeds. companyNumber must be an exact VALID COMPANY IDENTIFIER or an empty string. Biography must be a restrained summary of supported facts, not new lore. Status must follow explicit evidence: deceased only for a confirmed death, missing only for a confirmed unresolved disappearance, interred only for explicit interment, otherwise active.

List important missing or contradictory facts in unresolved. Return only the required structured response.`;

const characterExtractionResponseFormat = {
  type: "json_schema",
  name: "lunar_dragons_character_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      proposal: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              rank: { type: "string" },
              honorific: { type: "string" },
              role: { type: "string" },
              companyNumber: { type: "string" },
              status: { type: "string", enum: ["active", "deceased", "missing", "interred"] },
              introducedAt: { type: "string" },
              deathAt: { type: "string" },
              biography: { type: "string" },
              heroicDeeds: { type: "array", items: { type: "string" } },
            },
            required: [
              "name", "rank", "honorific", "role", "companyNumber", "status",
              "introducedAt", "deathAt", "biography", "heroicDeeds",
            ],
          },
        ],
      },
      summary: { type: "string" },
      unresolved: { type: "array", items: { type: "string" } },
    },
    required: ["proposal", "summary", "unresolved"],
  },
} as const;

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

function isCharacterStatus(value: unknown): value is ChapterCharacterStatus {
  return value === "active" || value === "deceased" || value === "missing" || value === "interred";
}

function within(value: unknown, maximum: number) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function trimmedWithin(value: unknown, maximum: number) {
  const candidate = within(value, maximum);
  return candidate === null ? null : candidate.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasUnknownKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowlist = new Set(allowed);
  return Object.keys(value).some((key) => !allowlist.has(key));
}

function invalid<T>(error: string): ParseResult<T> {
  return { ok: false, error };
}
