export const loreChronologyPrecisions = [
  "exact",
  "circa",
  "early",
  "mid",
  "late",
  "unknown",
] as const;

export type LoreChronologyPrecision =
  (typeof loreChronologyPrecisions)[number];

export type LoreChronologyPoint = {
  millennium: number;
  precision: LoreChronologyPrecision;
  year?: number;
};

export type LoreChronology = {
  start: LoreChronologyPoint;
  end?: LoreChronologyPoint;
  ongoing?: true;
};

type ValidationResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; error: string };

const chronologyFields = new Set(["start", "end", "ongoing"]);
const pointFields = new Set(["millennium", "precision", "year"]);

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validateChronologyPoint(
  value: unknown,
  label: "start" | "end",
): ValidationResult<LoreChronologyPoint> {
  const point = objectValue(value);
  if (!point) {
    return {
      ok: false,
      error: `Lore chronology ${label} must be an object.`,
    };
  }
  if (!Object.keys(point).every((field) => pointFields.has(field))) {
    return {
      ok: false,
      error: `Lore chronology ${label} contains an unknown field.`,
    };
  }

  if (
    !Number.isSafeInteger(point.millennium) ||
    Number(point.millennium) < 1 ||
    Number(point.millennium) > 99
  ) {
    return {
      ok: false,
      error: `Lore chronology ${label} millennium must be an integer from 1 to 99.`,
    };
  }
  if (
    typeof point.precision !== "string" ||
    !loreChronologyPrecisions.includes(
      point.precision as LoreChronologyPrecision,
    )
  ) {
    return {
      ok: false,
      error: `Lore chronology ${label} precision is invalid.`,
    };
  }

  const precision = point.precision as LoreChronologyPrecision;
  const requiresYear = precision === "exact" || precision === "circa";
  if (requiresYear) {
    if (
      !Number.isSafeInteger(point.year) ||
      Number(point.year) < 0 ||
      Number(point.year) > 999
    ) {
      return {
        ok: false,
        error: `Lore chronology ${label} year must be an integer from 0 to 999 for ${precision} dates.`,
      };
    }
  } else if (point.year !== undefined) {
    return {
      ok: false,
      error: `Lore chronology ${label} year is not permitted for ${precision} dates.`,
    };
  }

  return {
    ok: true,
    value: {
      millennium: Number(point.millennium),
      precision,
      ...(requiresYear ? { year: Number(point.year) } : {}),
    },
  };
}

export function validateLoreChronology(
  value: unknown,
): ValidationResult<LoreChronology> {
  const chronology = objectValue(value);
  if (!chronology) {
    return { ok: false, error: "Lore chronology must be an object." };
  }
  if (!Object.keys(chronology).every((field) => chronologyFields.has(field))) {
    return {
      ok: false,
      error: "Lore chronology contains an unknown field.",
    };
  }

  const start = validateChronologyPoint(chronology.start, "start");
  if (!start.ok) return start;

  const end =
    chronology.end === undefined
      ? undefined
      : validateChronologyPoint(chronology.end, "end");
  if (end && !end.ok) return end;

  if (chronology.ongoing !== undefined && chronology.ongoing !== true) {
    return {
      ok: false,
      error: "Lore chronology ongoing must be true when supplied.",
    };
  }
  if (end && chronology.ongoing === true) {
    return {
      ok: false,
      error: "Lore chronology cannot have both an end and ongoing=true.",
    };
  }

  if (end?.ok) {
    if (end.value.millennium < start.value.millennium) {
      return {
        ok: false,
        error: "Lore chronology end cannot precede its start.",
      };
    }
    if (
      end.value.millennium === start.value.millennium &&
      start.value.year !== undefined &&
      end.value.year !== undefined &&
      end.value.year < start.value.year
    ) {
      return {
        ok: false,
        error: "Lore chronology end cannot precede its start.",
      };
    }
  }

  return {
    ok: true,
    value: {
      start: start.value,
      ...(end?.ok ? { end: end.value } : {}),
      ...(chronology.ongoing === true ? { ongoing: true as const } : {}),
    },
  };
}

function formatPoint(point: LoreChronologyPoint) {
  if (point.precision === "unknown") return `???.M${point.millennium}`;
  if (
    point.precision === "early" ||
    point.precision === "mid" ||
    point.precision === "late"
  ) {
    return `${point.precision.toUpperCase()} M${point.millennium}`;
  }

  const year = String(point.year ?? 0).padStart(3, "0");
  const prefix = point.precision === "circa" ? "C." : "";
  return `${prefix}${year}.M${point.millennium}`;
}

export function formatLoreChronology(chronology: LoreChronology) {
  const start = formatPoint(chronology.start);
  if (chronology.ongoing) return `${start}–PRESENT`;
  if (chronology.end) return `${start}–${formatPoint(chronology.end)}`;
  return start;
}

function parsePoint(value: string): LoreChronologyPoint | undefined {
  const normalized = value.trim().toUpperCase();
  const coarse = normalized.match(/^(EARLY|MID|LATE)\s+M(\d{1,2})$/);
  if (coarse) {
    return {
      millennium: Number(coarse[2]),
      precision: coarse[1].toLowerCase() as "early" | "mid" | "late",
    };
  }

  const dated = normalized.match(/^(C\.)?(\d{1,3}|\?\?\?)\.M(\d{1,2})$/);
  if (!dated) return undefined;
  if (dated[2] === "???") {
    return {
      millennium: Number(dated[3]),
      precision: "unknown",
    };
  }

  return {
    millennium: Number(dated[3]),
    precision: dated[1] ? "circa" : "exact",
    year: Number(dated[2]),
  };
}

export function parseLoreChronology(value: string): LoreChronology | undefined {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;

  const ongoing = normalized.match(/^(.*?)\s*(?:—|–|-)\s*PRESENT$/i);
  if (ongoing) {
    const start = parsePoint(ongoing[1]);
    if (!start) return undefined;
    return { start, ongoing: true };
  }

  const range = normalized.match(/^(.*?)\s*(?:—|–|-)\s*(.*?)$/);
  if (range) {
    const start = parsePoint(range[1]);
    const end = parsePoint(range[2]);
    if (!start || !end) return undefined;
    const validated = validateLoreChronology({ start, end });
    return validated.ok ? validated.value : undefined;
  }

  const start = parsePoint(normalized);
  return start ? { start } : undefined;
}

export function normalizedChronologyForDate(
  date: string,
  storedChronology?: unknown,
) {
  if (storedChronology !== undefined) {
    const validated = validateLoreChronology(storedChronology);
    if (validated.ok) return validated.value;
  }
  return parseLoreChronology(date);
}
