import { MAX_LORE_CONTENT_LENGTH } from "../../../../lore-limits.ts";

export const MAX_LORE_DATE_LENGTH = 80;
export const MAX_LORE_TITLE_LENGTH = 240;
export const MAX_LORE_ENTRY_ID_LENGTH = 160;
export { MAX_LORE_CONTENT_LENGTH };

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
  title?: string;
  category?: LoreCategory;
  status: LoreStatus;
  content: string;
};

export type ValidatedLoreUpdate = {
  date?: string;
  title?: string;
  category?: LoreCategory;
  status?: LoreStatus;
  content?: string;
};

type ValidationResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; error: string };

const writeFields = new Set([
  "date",
  "title",
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
  field: "date" | "title",
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

  if (body.category !== undefined && !validateCategory(body.category)) {
    return { ok: false, error: "Invalid lore entry category." };
  }

  // Omission is safe and intentional. Supplying any unknown status remains a
  // validation error and is never silently normalized.
  const status = body.status === undefined ? "draft" : body.status;
  if (!validateStatus(status)) {
    return { ok: false, error: "Invalid lore entry status." };
  }

  return {
    ok: true,
    value: {
      content: body.content.trim(),
      date: typeof body.date === "string" ? body.date.trim() : undefined,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
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

  return {
    ok: true,
    value: {
      date: typeof body.date === "string" ? body.date.trim() : undefined,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
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
