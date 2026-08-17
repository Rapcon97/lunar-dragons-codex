import {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_DATE_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
  MAX_LORE_TITLE_LENGTH,
} from "../../../../lore-limits.ts";
import {
  formatLoreChronology,
  parseLoreChronology,
  validateLoreChronology,
  type LoreChronology,
} from "../../../../lore-chronology.ts";

export const MAX_LORE_ENTRY_ID_LENGTH = 160;
export {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_DATE_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
  MAX_LORE_TITLE_LENGTH,
};

export const allowedLoreCategories = [
  "campaign",
  "event",
  "character",
  "relic",
  "world",
  "organization",
  "decree",
  "other",
] as const;

export const allowedLoreStatuses = [
  "draft",
  "review",
  "canon",
  "retconned",
] as const;

type LoreCategory = (typeof allowedLoreCategories)[number];
type LoreStatus = (typeof allowedLoreStatuses)[number];

export type ValidatedLoreCreate = {
  date?: string;
  chronology?: LoreChronology;
  title?: string;
  subtitle?: string;
  category?: LoreCategory;
  status: LoreStatus;
  content: string;
};

export type ValidatedLoreUpdate = {
  date?: string;
  chronology?: LoreChronology;
  title?: string;
  subtitle?: string;
  category?: LoreCategory;
  status?: LoreStatus;
  content?: string;
};

type ValidationResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; error: string };

const writeFields = new Set([
  "date",
  "chronology",
  "title",
  "subtitle",
  "category",
  "status",
  "content",
]);

function objectBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validateKnownFields(body: Record<string, unknown>) {
  return Object.keys(body).every((field) => writeFields.has(field));
}

function validateOptionalText(
  body: Record<string, unknown>,
  field: "date" | "title" | "subtitle",
  maxLength: number,
) {
  const value = body[field];
  if (value === undefined) return null;
  if (typeof value !== "string") {
    return `Lore entry ${field} must be a string.`;
  }
  if (value.length > maxLength) {
    return `Lore entry ${field} is too long.`;
  }
  if (field === "title" && !value.trim()) {
    return "Lore entry title cannot be empty.";
  }
  return null;
}

function validateCategory(value: unknown) {
  return (
    typeof value === "string" &&
    allowedLoreCategories.includes(value as LoreCategory)
  );
}

function validateStatus(value: unknown) {
  return (
    typeof value === "string" &&
    allowedLoreStatuses.includes(value as LoreStatus)
  );
}

function parsedChronologyFields(
  body: Record<string, unknown>,
): ValidationResult<{
  date?: string;
  chronology?: LoreChronology;
}> {
  const hasDate = Object.prototype.hasOwnProperty.call(body, "date");
  const hasChronology = Object.prototype.hasOwnProperty.call(
    body,
    "chronology",
  );
  const date = typeof body.date === "string" ? body.date.trim() : undefined;

  if (hasChronology) {
    const chronology = validateLoreChronology(body.chronology);
    if (!chronology.ok) return chronology;

    const canonicalDate = formatLoreChronology(chronology.value);
    if (hasDate && date) {
      const parsedDate = parseLoreChronology(date);
      if (
        !parsedDate ||
        formatLoreChronology(parsedDate) !== canonicalDate
      ) {
        return {
          ok: false,
          error: "Lore entry date does not match its structured chronology.",
        };
      }
    }

    return {
      ok: true,
      value: { date: canonicalDate, chronology: chronology.value },
    };
  }

  if (hasDate) {
    const parsedDate = date ? parseLoreChronology(date) : undefined;
    if (!parsedDate) {
      return {
        ok: false,
        error: "Lore entry date must use a supported Imperial chronology format.",
      };
    }
    return {
      ok: true,
      value: {
        date: formatLoreChronology(parsedDate),
        chronology: parsedDate,
      },
    };
  }

  return { ok: true, value: {} };
}

export function validateLoreEntryId(id: string) {
  const normalized = id.trim();
  if (!normalized) return "A lore entry ID is required.";
  if (normalized.length > MAX_LORE_ENTRY_ID_LENGTH) {
    return "The lore entry ID is too long.";
  }
  return null;
}

export function parseLoreCreateBody(
  value: unknown,
): ValidationResult<ValidatedLoreCreate> {
  const body = objectBody(value);
  if (!body) return { ok: false, error: "A JSON object is required." };
  if (!validateKnownFields(body)) {
    return { ok: false, error: "Unknown lore entry fields are not permitted." };
  }

  if (typeof body.content !== "string" || !body.content.trim()) {
    return { ok: false, error: "Lore entry content is required." };
  }
  if (body.content.length > MAX_LORE_CONTENT_LENGTH) {
    return { ok: false, error: "Lore entry content is too long." };
  }

  const dateError = validateOptionalText(body, "date", MAX_LORE_DATE_LENGTH);
  if (dateError) return { ok: false, error: dateError };
  const titleError = validateOptionalText(body, "title", MAX_LORE_TITLE_LENGTH);
  if (titleError) return { ok: false, error: titleError };
  const subtitleError = validateOptionalText(
    body,
    "subtitle",
    MAX_LORE_SUBTITLE_LENGTH,
  );
  if (subtitleError) return { ok: false, error: subtitleError };

  if (body.category !== undefined && !validateCategory(body.category)) {
    return { ok: false, error: "Invalid lore entry category." };
  }

  // Omission is safe and intentional. Supplying any unknown status remains a
  // validation error and is never silently normalized.
  const status = body.status === undefined ? "draft" : body.status;
  if (!validateStatus(status)) {
    return { ok: false, error: "Invalid lore entry status." };
  }

  const chronology = parsedChronologyFields(body);
  if (!chronology.ok) return chronology;

  return {
    ok: true,
    value: {
      content: body.content.trim(),
      ...chronology.value,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      subtitle:
        typeof body.subtitle === "string" ? body.subtitle.trim() : undefined,
      category:
        typeof body.category === "string"
          ? (body.category as LoreCategory)
          : undefined,
      status: status as LoreStatus,
    },
  };
}

export function parseLoreUpdateBody(
  value: unknown,
): ValidationResult<ValidatedLoreUpdate> {
  const body = objectBody(value);
  if (!body) return { ok: false, error: "A JSON object is required." };
  if (!validateKnownFields(body)) {
    return { ok: false, error: "Unknown lore entry fields are not permitted." };
  }
  if (Object.keys(body).length === 0) {
    return {
      ok: false,
      error: "At least one lore entry field must be supplied.",
    };
  }

  const dateError = validateOptionalText(body, "date", MAX_LORE_DATE_LENGTH);
  if (dateError) return { ok: false, error: dateError };
  const titleError = validateOptionalText(body, "title", MAX_LORE_TITLE_LENGTH);
  if (titleError) return { ok: false, error: titleError };
  const subtitleError = validateOptionalText(
    body,
    "subtitle",
    MAX_LORE_SUBTITLE_LENGTH,
  );
  if (subtitleError) return { ok: false, error: subtitleError };

  if (
    body.content !== undefined &&
    (typeof body.content !== "string" || !body.content.trim())
  ) {
    return { ok: false, error: "Lore entry content cannot be empty." };
  }
  if (
    typeof body.content === "string" &&
    body.content.length > MAX_LORE_CONTENT_LENGTH
  ) {
    return { ok: false, error: "Lore entry content is too long." };
  }
  if (body.category !== undefined && !validateCategory(body.category)) {
    return { ok: false, error: "Invalid lore entry category." };
  }
  if (body.status !== undefined && !validateStatus(body.status)) {
    return { ok: false, error: "Invalid lore entry status." };
  }

  const chronology = parsedChronologyFields(body);
  if (!chronology.ok) return chronology;

  return {
    ok: true,
    value: {
      ...chronology.value,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      subtitle:
        typeof body.subtitle === "string" ? body.subtitle.trim() : undefined,
      category:
        typeof body.category === "string"
          ? (body.category as LoreCategory)
          : undefined,
      status:
        typeof body.status === "string"
          ? (body.status as LoreStatus)
          : undefined,
      content:
        typeof body.content === "string" ? body.content.trim() : undefined,
    },
  };
}
