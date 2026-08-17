"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatLoreChronology,
  validateLoreChronology,
  type LoreChronology,
  type LoreChronologyPoint,
  type LoreChronologyPrecision,
} from "../lore-chronology";

type BuilderMode =
  | "exact"
  | "circa"
  | "early"
  | "mid"
  | "late"
  | "unknown"
  | "range"
  | "ongoing";

type PointDraft = {
  millennium: string;
  precision: LoreChronologyPrecision;
  year: string;
};

type BuilderDraft = {
  mode: BuilderMode;
  start: PointDraft;
  end: PointDraft;
};

const pointPrecisionOptions: Array<{
  value: LoreChronologyPrecision;
  label: string;
}> = [
  { value: "exact", label: "Exact year" },
  { value: "circa", label: "Circa year" },
  { value: "early", label: "Early millennium" },
  { value: "mid", label: "Mid millennium" },
  { value: "late", label: "Late millennium" },
  { value: "unknown", label: "Unresolved year" },
];

const modeOptions: Array<{ value: BuilderMode; label: string }> = [
  { value: "exact", label: "Exact date" },
  { value: "circa", label: "Approximate date" },
  { value: "early", label: "Early millennium" },
  { value: "mid", label: "Mid millennium" },
  { value: "late", label: "Late millennium" },
  { value: "range", label: "Date range" },
  { value: "ongoing", label: "Ongoing from date" },
  { value: "unknown", label: "Unresolved date" },
];

function pointDraft(point?: LoreChronologyPoint): PointDraft {
  return {
    millennium: point ? String(point.millennium) : "42",
    precision: point?.precision ?? "exact",
    year: point?.year === undefined ? "" : String(point.year).padStart(3, "0"),
  };
}

function draftFromChronology(value: LoreChronology | null): BuilderDraft {
  if (!value) {
    return {
      mode: "exact",
      start: pointDraft(),
      end: pointDraft(),
    };
  }

  return {
    mode: value.end
      ? "range"
      : value.ongoing
        ? "ongoing"
        : value.start.precision,
    start: pointDraft(value.start),
    end: pointDraft(value.end ?? value.start),
  };
}

function digits(value: string, maximumLength: number) {
  return value.replace(/\D/g, "").slice(0, maximumLength);
}

function buildPoint(value: PointDraft): LoreChronologyPoint | null {
  const millennium = Number(value.millennium);
  if (
    !/^\d{1,2}$/.test(value.millennium) ||
    !Number.isSafeInteger(millennium) ||
    millennium < 1 ||
    millennium > 99
  ) {
    return null;
  }

  if (value.precision === "exact" || value.precision === "circa") {
    const year = Number(value.year);
    if (
      !/^\d{1,3}$/.test(value.year) ||
      !Number.isSafeInteger(year) ||
      year < 0 ||
      year > 999
    ) {
      return null;
    }
    return { millennium, precision: value.precision, year };
  }

  return { millennium, precision: value.precision };
}

function buildChronology(value: BuilderDraft): LoreChronology | null {
  const startPrecision =
    value.mode === "range" || value.mode === "ongoing"
      ? value.start.precision
      : value.mode;
  const start = buildPoint({ ...value.start, precision: startPrecision });
  if (!start) return null;

  const candidate: LoreChronology = value.mode === "range"
    ? { start, end: buildPoint(value.end) ?? undefined }
    : value.mode === "ongoing"
      ? { start, ongoing: true }
      : { start };

  if (value.mode === "range" && !candidate.end) return null;
  const validated = validateLoreChronology(candidate);
  return validated.ok ? validated.value : null;
}

function PointControls({
  label,
  value,
  showPrecision,
  onChange,
}: {
  label: string;
  value: PointDraft;
  showPrecision: boolean;
  onChange: (value: PointDraft) => void;
}) {
  const requiresYear = value.precision === "exact" || value.precision === "circa";
  const precisionLabel = pointPrecisionOptions.find(
    (option) => option.value === value.precision,
  )?.label ?? value.precision;

  return (
    <fieldset className="imperial-date-point">
      <legend>{label}</legend>
      <label className="imperial-date-precision-control">
        PRECISION
        {showPrecision ? (
          <select
            value={value.precision}
            onChange={(event) =>
              onChange({
                ...value,
                precision: event.target.value as LoreChronologyPrecision,
              })
            }
          >
            {pointPrecisionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <span className="imperial-date-fixed-value">{precisionLabel}</span>
        )}
      </label>
      <label className="imperial-date-year-control" data-applicable={requiresYear ? "true" : "false"}>
        YEAR · 000–999
        {requiresYear ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{1,3}"
            value={value.year}
            onChange={(event) => onChange({ ...value, year: digits(event.target.value, 3) })}
            placeholder="056"
            aria-label={`${label} year`}
          />
        ) : (
          <span className="imperial-date-fixed-value" aria-hidden="true">NOT REQUIRED</span>
        )}
      </label>
      <label>
        MILLENNIUM · M01–M99
        <span className="imperial-date-millennium">
          <b aria-hidden="true">M</b>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{1,2}"
            value={value.millennium}
            onChange={(event) =>
              onChange({ ...value, millennium: digits(event.target.value, 2) })
            }
            placeholder="42"
            aria-label={`${label} millennium`}
          />
        </span>
      </label>
    </fieldset>
  );
}

export function ImperialDateBuilder({
  value,
  legacyValue,
  onChange,
}: {
  value: LoreChronology | null;
  legacyValue?: string;
  onChange: (value: LoreChronology | null) => void;
}) {
  const [draft, setDraft] = useState<BuilderDraft>(() => draftFromChronology(value));
  const lastEmittedSignature = useRef<string | null>(null);
  const externalSignature = value ? formatLoreChronology(value) : "";

  useEffect(() => {
    if (lastEmittedSignature.current === externalSignature) {
      lastEmittedSignature.current = null;
      return;
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- External editor or Cogitator replacements deliberately reset this isolated builder draft. */
    setDraft(draftFromChronology(value));
  }, [externalSignature, value]);

  const chronology = useMemo(() => buildChronology(draft), [draft]);
  const preview = chronology ? formatLoreChronology(chronology) : "INCOMPLETE DATE";

  function update(next: BuilderDraft) {
    const nextChronology = buildChronology(next);
    lastEmittedSignature.current = nextChronology
      ? formatLoreChronology(nextChronology)
      : "";
    setDraft(next);
    onChange(nextChronology);
  }

  const isCompound = draft.mode === "range" || draft.mode === "ongoing";

  return (
    <div
      className="imperial-date-builder"
      data-compound={draft.mode === "range" ? "true" : "false"}
      data-valid={chronology ? "true" : "false"}
    >
      <div className="imperial-date-builder-heading">
        <span>IMPERIAL DATE BUILDER</span>
        <strong>{preview}</strong>
      </div>
      {legacyValue && !value && (
        <p className="imperial-date-legacy" role="alert">
          LEGACY DATE REQUIRES CONVERSION · {legacyValue}
        </p>
      )}
      <div className="imperial-date-builder-grid">
        <label className="imperial-date-mode">
          DATE TYPE
          <select
            value={draft.mode}
            onChange={(event) => {
              const mode = event.target.value as BuilderMode;
              const next = {
                ...draft,
                mode,
                start: isCompound
                  ? draft.start
                  : { ...draft.start, precision: mode === "range" || mode === "ongoing" ? "exact" : mode },
              };
              update(next);
            }}
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <PointControls
          label={draft.mode === "range" ? "START DATE" : "DATE"}
          value={{
            ...draft.start,
            precision: isCompound
              ? draft.start.precision
              : draft.mode as LoreChronologyPrecision,
          }}
          showPrecision={isCompound}
          onChange={(start) => update({ ...draft, start })}
        />
        {draft.mode === "range" && (
          <PointControls
            label="END DATE"
            value={draft.end}
            showPrecision
            onChange={(end) => update({ ...draft, end })}
          />
        )}
        {draft.mode !== "range" && (
          <div className="imperial-date-point imperial-date-point-placeholder" aria-hidden="true" />
        )}
      </div>
      <p className="imperial-date-builder-status">
        {chronology
          ? "STRUCTURED CHRONOLOGY VALID · COMPATIBILITY DATE GENERATED"
          : "COMPLETE THE REQUIRED CHRONOLOGY FIELDS BEFORE SAVING"}
      </p>
    </div>
  );
}
