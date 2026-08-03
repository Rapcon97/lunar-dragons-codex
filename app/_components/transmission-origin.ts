import type {
  AstropathicTransmissionMetadata,
  SectorIntel,
} from "../archive-data";

type TransmissionOriginAlias = {
  systemName: string;
  bodyName?: string;
};

const TRANSMISSION_ORIGIN_ALIASES: Readonly<Record<string, TransmissionOriginAlias>> = {
  "vigil-ix": { systemName: "Vigil IX" },
  orison: { systemName: "Orison" },
  "veil-anchor-7": { systemName: "The Vesper Rift", bodyName: "Veil Anchor 7" },
};

type ExactTransmissionOriginResolution = {
  kind: "exact";
  canonicalId: string;
  label: string;
  parentSystemLabel: string;
  parentSystemIndex: number;
  bodyIndex?: number;
  mapHref: string;
  recordHref: string;
};

type UnavailableTransmissionOriginResolution = {
  kind: "broad" | "unresolved";
  reason: string;
};

export type TransmissionOriginResolution =
  | ExactTransmissionOriginResolution
  | UnavailableTransmissionOriginResolution;

const EXACT_ORIGIN_STATES = new Set(["CONFIRMED", "VERIFIED"]);

export function normalizeTransmissionOriginId(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_\u2010-\u2015]+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeRecordName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function matchingIndexes<T>(records: readonly T[], name: string, readName: (record: T) => string) {
  const expected = normalizeRecordName(name);
  return records.flatMap((record, index) => (
    normalizeRecordName(readName(record)) === expected ? [index] : []
  ));
}

export function resolveTransmissionOrigin(
  intel: SectorIntel,
  transmission?: AstropathicTransmissionMetadata,
): TransmissionOriginResolution {
  const explicitId = transmission?.originLocationId?.trim();
  if (!explicitId) {
    return {
      kind: "broad",
      reason: transmission
        ? "EXACT CARTOGRAPHIC FIX UNAVAILABLE · THEATRE-LEVEL ORIGIN"
        : "EXACT CARTOGRAPHIC FIX UNAVAILABLE · PHASE 1 INFERENCE",
    };
  }

  const canonicalId = normalizeTransmissionOriginId(explicitId);
  const alias = TRANSMISSION_ORIGIN_ALIASES[canonicalId];
  if (!alias) {
    return { kind: "unresolved", reason: "EXACT CARTOGRAPHIC FIX UNAVAILABLE · LOCATION IDENTIFIER UNRESOLVED" };
  }

  const systemIndexes = matchingIndexes(intel.worlds, alias.systemName, (system) => system.name);
  if (systemIndexes.length !== 1) {
    return {
      kind: "unresolved",
      reason: systemIndexes.length
        ? "EXACT CARTOGRAPHIC FIX UNAVAILABLE · ARCHIVE RECORD AMBIGUOUS"
        : "EXACT CARTOGRAPHIC FIX UNAVAILABLE · ARCHIVE RECORD UNAVAILABLE",
    };
  }

  const parentSystemIndex = systemIndexes[0];
  const parentSystem = intel.worlds[parentSystemIndex];
  let bodyIndex: number | undefined;

  if (alias.bodyName) {
    const bodyIndexes = matchingIndexes(parentSystem.bodies, alias.bodyName, (body) => body.name);
    if (bodyIndexes.length !== 1) {
      return {
        kind: "unresolved",
        reason: bodyIndexes.length
          ? "EXACT CARTOGRAPHIC FIX UNAVAILABLE · ARCHIVE RECORD AMBIGUOUS"
          : "EXACT CARTOGRAPHIC FIX UNAVAILABLE · ARCHIVE RECORD UNAVAILABLE",
      };
    }
    bodyIndex = bodyIndexes[0];
  }

  const originState = transmission?.originState;
  if (!originState || !EXACT_ORIGIN_STATES.has(originState)) {
    return {
      kind: "broad",
      reason: `EXACT CARTOGRAPHIC FIX UNAVAILABLE · TRIANGULATION ${originState ?? "UNRESOLVED"}`,
    };
  }

  const systemRoute = `/intel/system/${parentSystemIndex + 1}`;
  return {
    kind: "exact",
    canonicalId,
    label: alias.bodyName ?? parentSystem.name,
    parentSystemLabel: parentSystem.name,
    parentSystemIndex,
    ...(bodyIndex === undefined ? {} : { bodyIndex }),
    mapHref: `/intel?origin=${encodeURIComponent(canonicalId)}`,
    recordHref: bodyIndex === undefined ? systemRoute : `${systemRoute}/planet/${bodyIndex + 1}`,
  };
}
