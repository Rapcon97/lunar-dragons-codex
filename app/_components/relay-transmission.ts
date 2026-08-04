import type {
  AstropathicEventMetadata,
  AstropathicTransmissionMetadata,
  TransmissionConfidenceState,
  TransmissionMethod,
  TransmissionOriginBand as ArchiveTransmissionOriginBand,
  TransmissionOriginRegion,
  TransmissionRouteClass,
  TransmissionWarpExposure,
} from "../archive-data";
import { transmissionBodyFragment } from "../transmission-fragments.ts";
import { transmissionEventAnalysisLines } from "./transmission-event-presentation.ts";

export type TransmissionSourceMetadata = {
  id: string;
  agency: string;
  subject: string;
  preview?: string;
  body?: string;
  priority?: string;
  received?: string;
  receivedAt?: string;
  transmission?: AstropathicTransmissionMetadata;
  event?: AstropathicEventMetadata;
};

export type TransmissionOriginBand = ArchiveTransmissionOriginBand;

export type ImperialClearanceGrade = "CYAN" | "SCARLET" | "MAGENTA" | "OBSIDIAN" | "VERMILION";
export type EncryptionProtocol = "CRYPTOX" | "OMEGA" | "TELOS" | "ESCULIS" | "PANTHER";
export type AnalysisState = TransmissionConfidenceState;
export type WarpExposureState = TransmissionWarpExposure;
export type TransmissionTranscriptSection = "analysis" | "content" | "terminal-footer";

export type TransmissionTranscriptLine = {
  text: string;
  section: TransmissionTranscriptSection;
  command?: boolean;
  corruption?: boolean;
  gap?: boolean;
  closing?: boolean;
  blessing?: boolean;
};

export type TransmissionCorruptionBand =
  | "local"
  | "same-system"
  | "nearby-inter-system"
  | "long-range"
  | "warp-anomalous";

export type TransmissionCorruptionProfile = {
  band: TransmissionCorruptionBand;
  percentage: number;
  seed: number;
};

export type TransmissionAnalysis = {
  reliquariumNumber: string;
  originBand: TransmissionOriginBand;
  originRegion: TransmissionOriginRegion;
  originLocationId?: string;
  probableOriginLabel: string;
  transmissionMethod: TransmissionMethod;
  clearanceGrade: ImperialClearanceGrade;
  encryptionProtocol: EncryptionProtocol;
  identityState: AnalysisState;
  triangulationState: AnalysisState;
  relayPathLabel: string;
  timestampIntegrityState: AnalysisState;
  warpExposureState: WarpExposureState;
  communionAttempts: number;
  corruptionPercentage: number;
  corruptionPattern: "SPARSE GLYPH LOSS" | "DEGRADED BINHARIC" | "CANT FRAGMENTATION" | "REDACTION LOSS";
  corruption: TransmissionCorruptionProfile;
  originBasis: "metadata" | "explicit" | "inferred" | "receiving-theatre-fallback";
};

export type FormattedTransmissionTranscript = {
  analysis: TransmissionAnalysis;
  lines: TransmissionTranscriptLine[];
};

export const RECEIVING_LOCUS = "LUNARIS";
export const OPERATIONAL_THEATRE = "NORTHERN NACHMUND APPROACHES";
export const TRANSMISSION_CONTENT_MARKER = ">> VOX-MISSIVE CONTENT // EXLOAD FOLLOWS";

export const TRANSMISSION_TIMING = {
  characterMs: 38,
  minorPunctuationAdditionalMs: 60,
  terminalPunctuationAdditionalMs: 125,
  metadataLabelMs: 10,
  metadataValuePauseMs: 200,
  lineBreakMs: 200,
  retrievalDotMs: 500,
  retrievalDotCount: 4,
  corruptionStepMs: 40,
} as const;

export const IMPERIAL_TRANSMISSION_CLOSING = "The Emperor protects.";
export const MECHANICUS_TRANSMISSION_CLOSING = "By the Omnissiah's will.";
export const TERMINAL_MACHINE_BLESSING = "+++ HAIL THE OMNISSIAH, PRAISE THE MACHINE GOD +++";

const ORIGIN_CORRUPTION_RANGES: Record<TransmissionOriginBand, readonly [number, number]> = {
  "internal Lunaris": [0, 0.5],
  "same system": [0.1, 1.5],
  "nearby Argent Vigil": [0.5, 4],
  "northern Nachmund theatre": [2, 8],
  "distant Imperium Nihilus": [5, 14],
  "Imperium Sanctus via Nachmund": [7, 18],
  "unstable Rift crossing": [15, 35],
  "anomalous source": [12, 30],
};

const ORIGIN_TO_CORRUPTION_BAND: Record<TransmissionOriginBand, TransmissionCorruptionBand> = {
  "internal Lunaris": "local",
  "same system": "same-system",
  "nearby Argent Vigil": "nearby-inter-system",
  "northern Nachmund theatre": "nearby-inter-system",
  "distant Imperium Nihilus": "long-range",
  "Imperium Sanctus via Nachmund": "long-range",
  "unstable Rift crossing": "warp-anomalous",
  "anomalous source": "warp-anomalous",
};

const COMMUNION_ATTEMPT_RANGES: Record<TransmissionOriginBand, readonly [number, number]> = {
  "internal Lunaris": [1, 3],
  "same system": [2, 6],
  "nearby Argent Vigil": [4, 10],
  "northern Nachmund theatre": [7, 16],
  "distant Imperium Nihilus": [12, 24],
  "Imperium Sanctus via Nachmund": [18, 36],
  "unstable Rift crossing": [24, 48],
  "anomalous source": [30, 64],
};

const LOW_CORRUPTION_GLYPHS = ["░", "╱", "", "::"] as const;
const CORRUPTION_GLYPHS = ["█", "▓", "▒", "░", "╳", "╱", "╲", "│", "║", "╬", "†", "‡", "ϟ", "Ƶ", "҂", "⌁", "⌇", "⫷", "⫸"] as const;
const MACHINE_CANT_FRAGMENTS = ["++", "///", "::", "0x", "[NOOS]", "[CANT]", "[VOX-ERR]"] as const;
const SEVERE_CANT_FRAGMENTS = ["[SIG-LOSS]", "[DATA-NULL]", "[REDACTED]", "++::++", "///0x///", "҂҂", "ϟϟ"] as const;

export function hashTransmissionValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function analysisHash(
  source: Pick<TransmissionSourceMetadata, "id"> & Partial<Pick<TransmissionSourceMetadata, "event">>,
  salt: string,
) {
  const event = source.event;
  const analysisId = event?.kinds.includes("recovered-fragment")
    ? event.rootTransmissionId
    : source.id;
  return hashTransmissionValue(`relay-analysis:v1|${analysisId}|${salt}`);
}

function metadataText(source: TransmissionSourceMetadata) {
  return `${source.agency} ${source.subject} ${source.preview ?? ""}`.toLowerCase();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deterministicInteger(source: Pick<TransmissionSourceMetadata, "id">, salt: string, minimum: number, maximum: number) {
  return minimum + (analysisHash(source, salt) % ((maximum - minimum) + 1));
}

function deterministicChoice<T>(source: Pick<TransmissionSourceMetadata, "id">, salt: string, values: readonly T[]) {
  return values[analysisHash(source, salt) % values.length];
}

function classifyTransmissionOriginDetail(source: TransmissionSourceMetadata): Pick<TransmissionAnalysis, "originBand" | "originBasis"> {
  if (source.transmission?.originBand) {
    return { originBand: source.transmission.originBand, originBasis: "metadata" };
  }
  if (source.transmission?.originRegion === "UNRESOLVED") {
    return { originBand: "northern Nachmund theatre", originBasis: "receiving-theatre-fallback" };
  }
  const metadata = metadataText(source);

  if (/impossible chronology|temporal inversion|soul-binding|signal echo|astropathic echo|provenance contradiction|unknown soul|source anomal|kharon|pre-founding|distress transmission/.test(metadata)) {
    return { originBand: "anomalous source", originBasis: "explicit" };
  }
  if (/great rift|vesper rift|vesper drift|rift[- ]crossing|gellar|phase loss|translation failure|warp breach|rift transit/.test(metadata)) {
    return { originBand: "unstable Rift crossing", originBasis: "explicit" };
  }
  if (/lunaris chapter command|chapter command|lunaris internal|shipboard command|internal archive|data reliquarium|archive command/.test(metadata)) {
    return { originBand: "internal Lunaris", originBasis: "explicit" };
  }
  if (/same[- ]system|in[- ]system|local orbit|orbital anchorage|local astropathic choir/.test(metadata)) {
    return { originBand: "same system", originBasis: "explicit" };
  }
  if (/adeptus terra|segmentum solar|holy terra|eyes of terra|lord commander|roboute guilliman|senatorum|indomitus high command|captain-general|trajann valoris|adeptus custodes/.test(metadata)) {
    return { originBand: "Imperium Sanctus via Nachmund", originBasis: "inferred" };
  }
  if (/imperium nihilus|commander dante|lord regent of nihilus|\bbaal\b|lion el['’]?jonson|\bthe rock\b/.test(metadata)) {
    return { originBand: "distant Imperium Nihilus", originBasis: "inferred" };
  }
  if (/argent vigil|selene|vigil ix|veil anchor|orison|draconis gate|local crusade/.test(metadata)) {
    return { originBand: "nearby Argent Vigil", originBasis: "explicit" };
  }
  if (/nachmund|gauntlet|moonward|convoy|task group|passage|reclamation corridor/.test(metadata)) {
    return { originBand: "northern Nachmund theatre", originBasis: "explicit" };
  }
  return { originBand: "northern Nachmund theatre", originBasis: "receiving-theatre-fallback" };
}

export function classifyTransmissionOrigin(source: TransmissionSourceMetadata): TransmissionOriginBand {
  return classifyTransmissionOriginDetail(source).originBand;
}

function probableOriginLabel(originBand: TransmissionOriginBand, originBasis: TransmissionAnalysis["originBasis"]) {
  if (originBasis === "receiving-theatre-fallback") return "SOURCE UNRESOLVED // THEATRE-LEVEL FIX";
  const labels: Record<TransmissionOriginBand, string> = {
    "internal Lunaris": "LUNARIS // INTERNAL",
    "same system": "LOCAL SYSTEM // DESIGNATION UNRECORDED",
    "nearby Argent Vigil": "ARGENT VIGIL OPERATIONAL REACH",
    "northern Nachmund theatre": OPERATIONAL_THEATRE,
    "distant Imperium Nihilus": "DISTANT IMPERIUM NIHILUS",
    "Imperium Sanctus via Nachmund": "IMPERIUM SANCTUS // VIA NACHMUND",
    "unstable Rift crossing": "GREAT RIFT TRANSIT // FIX UNSTABLE",
    "anomalous source": "SOURCE UNRESOLVED // ASTROPATHIC ECHO",
  };
  return labels[originBand];
}

const RELAY_PATH_LABELS: Record<TransmissionRouteClass, string> = {
  "direct-noospheric": "DIRECT NOOSPHERIC LINK",
  "local-system-relay": "LOCAL ASTROPATHIC CHOIR",
  "argent-vigil-relay": "ARGENT VIGIL RELAY",
  "nachmund-corridor": "NACHMUND RELAY CORRIDOR",
  "sanctioned-choir-chain": "SANCTIONED CHOIR CHAIN",
  "contested-relay": "CONTESTED RELAY PATH",
  "rift-crossing": "RIFT-CROSSING RELAY",
  "astropathic-echo": "ASTROPATHIC ECHO",
  unresolved: "UNRESOLVED TRANSMISSION PATH",
};

function originRegion(originBand: TransmissionOriginBand): TransmissionOriginRegion {
  if (originBand === "Imperium Sanctus via Nachmund") return "IMPERIUM SANCTUS";
  if (originBand === "unstable Rift crossing") return "GREAT RIFT";
  if (originBand === "anomalous source") return "UNRESOLVED";
  return "IMPERIUM NIHILUS";
}

function transmissionMethod(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand): TransmissionMethod {
  if (source.transmission?.transmissionMethod) return source.transmission.transmissionMethod;
  const metadata = metadataText(source);
  if (originBand === "anomalous source") return "warp-echo";
  if (/mechanicus|magos|cawl|noospher|omnissiah/.test(metadata)) return "mechanicus-burst";
  if (/navis nobilite|navigator/.test(metadata)) return "navigational-choir";
  if (originBand === "internal Lunaris") return "noospheric";
  if (/astropathica|astropath|choir|soul-binding|psychic/.test(metadata)) return "astropathic";
  if (source.priority === "SEALED" || source.priority === "PRIMUS") return "encrypted-astropathic";
  return "astropathic";
}

function clearanceGrade(source: TransmissionSourceMetadata): ImperialClearanceGrade {
  const metadata = metadataText(source);
  const priority = source.priority?.toUpperCase() ?? "";
  if (/inquisition|inquisitor|ordo |custodes|black channel/.test(metadata)) return "OBSIDIAN";
  if (/primarch|lord commander|roboute guilliman|commander dante|lion el['’]?jonson/.test(metadata)) return "VERMILION";
  if (/mechanicus|magos|astropathica|choir|relic|gene[- ]seed|psychic|soul-binding/.test(metadata) || priority === "SEALED") return "MAGENTA";
  if (/militarum|navis imperialis|munitorum|battlefleet|task group/.test(metadata) || /PRIMUS|URGENT|ACTION/.test(priority)) return "SCARLET";
  return "CYAN";
}

function encryptionProtocol(source: TransmissionSourceMetadata): EncryptionProtocol {
  const metadata = metadataText(source);
  if (/inquisition|inquisitor|ordo |custodes|black channel/.test(metadata)) return "OMEGA";
  if (/mechanicus|magos|cawl|noospher|omnissiah/.test(metadata)) return "TELOS";
  if (/astropathica|astropath|choir|soul-binding|psychic/.test(metadata)) return "ESCULIS";
  if (/navis nobilite|navigator|warp transit|rift|gellar/.test(metadata)) return "PANTHER";
  return "CRYPTOX";
}

function identityState(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand): AnalysisState {
  const metadata = metadataText(source);
  if (/imperial agency unverified|transmission subject obscured|originator unknown/.test(metadata)) return "UNRECOVERED";
  if (/contradict|impossible chronology|false ident|spoof/.test(metadata)) return "CONTRADICTORY";
  if (originBand === "anomalous source" || originBand === "unstable Rift crossing") {
    return deterministicChoice(source, "identity-state", ["PARTIAL", "INCONCLUSIVE"] as const);
  }
  if (/roboute guilliman|commander dante|lion el['’]?jonson|belisarius cawl|chapter command|adeptus terra|mechanicus|astropathica|militarum|munitorum|navis imperialis|navis nobilite|administratum|ministorum|officio prefectus|inquisition|inquisitor|ordo |custodes/.test(metadata)) {
    return deterministicChoice(source, "identity-state", ["CONFIRMED", "CONFIRMED", "PROBABLE"] as const);
  }
  return deterministicChoice(source, "identity-state", ["PROBABLE", "PARTIAL"] as const);
}

function triangulationState(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand, originBasis: TransmissionAnalysis["originBasis"]): AnalysisState {
  if (originBasis === "receiving-theatre-fallback") return "INCONCLUSIVE";
  const choices: Record<TransmissionOriginBand, readonly AnalysisState[]> = {
    "internal Lunaris": ["CONFIRMED"],
    "same system": ["CONFIRMED", "PROBABLE"],
    "nearby Argent Vigil": ["PROBABLE", "PROBABLE", "PARTIAL"],
    "northern Nachmund theatre": ["PROBABLE", "PARTIAL"],
    "distant Imperium Nihilus": ["PARTIAL", "INCONCLUSIVE"],
    "Imperium Sanctus via Nachmund": ["PARTIAL", "INCONCLUSIVE"],
    "unstable Rift crossing": ["INCONCLUSIVE", "CONTRADICTORY"],
    "anomalous source": ["UNRECOVERED", "CONTRADICTORY", "INCONCLUSIVE"],
  };
  return deterministicChoice(source, "triangulation-state", choices[originBand]);
}

function relayPathLabel(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand, originBasis: TransmissionAnalysis["originBasis"]) {
  if (source.transmission?.routeClass) return RELAY_PATH_LABELS[source.transmission.routeClass];
  if (originBasis === "receiving-theatre-fallback") return "UNRESOLVED TRANSMISSION PATH";
  const paths: Record<TransmissionOriginBand, readonly string[]> = {
    "internal Lunaris": ["DIRECT NOOSPHERIC LINK"],
    "same system": ["LOCAL ASTROPATHIC CHOIR"],
    "nearby Argent Vigil": ["ARGENT VIGIL RELAY"],
    "northern Nachmund theatre": ["NACHMUND RELAY CORRIDOR", "ARGENT VIGIL RELAY"],
    "distant Imperium Nihilus": ["SANCTIONED CHOIR CHAIN"],
    "Imperium Sanctus via Nachmund": ["CONTESTED RELAY PATH", "SANCTIONED CHOIR CHAIN"],
    "unstable Rift crossing": ["RIFT-CROSSING RELAY", "CONTESTED RELAY PATH"],
    "anomalous source": ["ASTROPATHIC ECHO", "UNRESOLVED TRANSMISSION PATH"],
  };
  return deterministicChoice(source, "relay-path", paths[originBand]);
}

function timestampIntegrityState(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand): AnalysisState {
  if (source.event?.kinds.some((kind) => kind === "contradictory-timestamp" || kind === "future-dated")) {
    return "CONTRADICTORY";
  }
  const receivedAt = source.receivedAt?.trim() ?? "";
  if (!receivedAt) return source.received ? "PARTIAL" : "UNRECOVERED";
  if (/^\d{4}-\d{2}-\d{2}$/.test(receivedAt)) return "PARTIAL";
  if (!Number.isFinite(Date.parse(receivedAt))) return "CONTRADICTORY";
  if (originBand === "unstable Rift crossing" || originBand === "anomalous source") {
    return deterministicChoice(source, "timestamp-state", ["PARTIAL", "CONTRADICTORY"] as const);
  }
  return "VERIFIED";
}

function warpExposureState(source: TransmissionSourceMetadata, originBand: TransmissionOriginBand): WarpExposureState {
  const choices: Record<TransmissionOriginBand, readonly WarpExposureState[]> = {
    "internal Lunaris": ["NEGLIGIBLE"],
    "same system": ["NEGLIGIBLE", "MINOR"],
    "nearby Argent Vigil": ["MINOR"],
    "northern Nachmund theatre": ["MINOR", "MODERATE"],
    "distant Imperium Nihilus": ["MODERATE", "ELEVATED"],
    "Imperium Sanctus via Nachmund": ["ELEVATED"],
    "unstable Rift crossing": ["SEVERE", "EXTREMIS"],
    "anomalous source": ["SEVERE", "EXTREMIS"],
  };
  return deterministicChoice(source, "warp-exposure", choices[originBand]);
}

function corruptionPattern(percentage: number): TransmissionAnalysis["corruptionPattern"] {
  if (percentage <= 0.5) return "SPARSE GLYPH LOSS";
  if (percentage <= 4) return "DEGRADED BINHARIC";
  if (percentage <= 14) return "CANT FRAGMENTATION";
  return "REDACTION LOSS";
}

function derivedCorruptionPercentage(
  source: TransmissionSourceMetadata,
  originBand: TransmissionOriginBand,
  grade: ImperialClearanceGrade,
  protocol: EncryptionProtocol,
) {
  const [minimum, maximum] = ORIGIN_CORRUPTION_RANGES[originBand];
  const fraction = (analysisHash(source, "corruption-percentage") % 10001) / 10000;
  const base = minimum + ((maximum - minimum) * fraction);
  const routeModifier = ((analysisHash(source, "route-channel-modifier") % 101) - 50) / 100;
  const clearanceModifier: Record<ImperialClearanceGrade, number> = {
    CYAN: 0,
    SCARLET: -0.2,
    MAGENTA: -0.55,
    OBSIDIAN: -1.35,
    VERMILION: -1.1,
  };
  const encryptionModifier: Record<EncryptionProtocol, number> = {
    CRYPTOX: 0,
    OMEGA: -0.85,
    TELOS: -0.55,
    ESCULIS: -0.4,
    PANTHER: -0.25,
  };
  return Number(clamp(
    base + routeModifier + clearanceModifier[grade] + encryptionModifier[protocol],
    Math.max(0, minimum),
    Math.min(35, maximum),
  ).toFixed(2));
}

export function transmissionReliquariumNumber(source: TransmissionSourceMetadata) {
  const receivedYear = source.received?.match(/\.([0-9]{3})\.M4[12]/i)?.[1] ?? "056";
  const reliquariumSuffix = String(analysisHash(source, "reliquarium-number") % 1_000_000).padStart(6, "0");
  return `${receivedYear}//${reliquariumSuffix}`;
}

export function analyzeTransmission(source: TransmissionSourceMetadata): TransmissionAnalysis {
  const { originBand, originBasis } = classifyTransmissionOriginDetail(source);
  const grade = clearanceGrade(source);
  const protocol = encryptionProtocol(source);
  const corruptionPercentage = derivedCorruptionPercentage(source, originBand, grade, protocol);
  const [minimumAttempts, maximumAttempts] = COMMUNION_ATTEMPT_RANGES[originBand];
  const corruption: TransmissionCorruptionProfile = {
    band: ORIGIN_TO_CORRUPTION_BAND[originBand],
    percentage: corruptionPercentage,
    seed: analysisHash(source, "corruption-pattern"),
  };

  return {
    reliquariumNumber: transmissionReliquariumNumber(source),
    originBand,
    originRegion: source.transmission?.originRegion ?? originRegion(originBand),
    ...(source.transmission?.originLocationId ? { originLocationId: source.transmission.originLocationId } : {}),
    probableOriginLabel: source.transmission?.originLabel ?? probableOriginLabel(originBand, originBasis),
    transmissionMethod: transmissionMethod(source, originBand),
    clearanceGrade: grade,
    encryptionProtocol: protocol,
    identityState: source.transmission?.identityState ?? identityState(source, originBand),
    triangulationState: source.transmission?.originState ?? triangulationState(source, originBand, originBasis),
    relayPathLabel: relayPathLabel(source, originBand, originBasis),
    timestampIntegrityState: source.event?.kinds.some((kind) => kind === "contradictory-timestamp" || kind === "future-dated")
      ? timestampIntegrityState(source, originBand)
      : source.transmission?.timestampState ?? timestampIntegrityState(source, originBand),
    warpExposureState: source.transmission?.warpExposure ?? warpExposureState(source, originBand),
    communionAttempts: deterministicInteger(source, "communion-attempts", minimumAttempts, maximumAttempts),
    corruptionPercentage,
    corruptionPattern: corruptionPattern(corruptionPercentage),
    corruption,
    originBasis,
  };
}

export function classifyTransmissionSource(source: TransmissionSourceMetadata): TransmissionCorruptionBand {
  return ORIGIN_TO_CORRUPTION_BAND[classifyTransmissionOrigin(source)];
}

export function transmissionCorruptionProfile(source: TransmissionSourceMetadata): TransmissionCorruptionProfile {
  return analyzeTransmission(source).corruption;
}

export function formatCorruptionPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

export function transmissionCharacterDelay(character: string) {
  let delay = TRANSMISSION_TIMING.characterMs;
  if (/[,;:]/u.test(character)) delay += TRANSMISSION_TIMING.minorPunctuationAdditionalMs;
  if (/[.!?]/u.test(character)) delay += TRANSMISSION_TIMING.terminalPunctuationAdditionalMs;
  if (character === "\n") delay += TRANSMISSION_TIMING.lineBreakMs;
  return delay;
}

export function appendTransmissionRetrievalDots(text: string, count = TRANSMISSION_TIMING.retrievalDotCount) {
  return `${text}${".".repeat(count)}`;
}

export function splitTransmissionMetadata(text: string) {
  if (!text.startsWith(">") || text.startsWith(">>")) return null;
  const colonIndex = text.indexOf(":");
  if (colonIndex < 1 || colonIndex === text.length - 1) return null;
  return {
    label: text.slice(0, colonIndex + 1),
    value: text.slice(colonIndex + 1),
  };
}

export function isMechanicusTransmission(source: Pick<TransmissionSourceMetadata, "agency">) {
  return /mechanicus|magos|cawl|omnissiah/i.test(source.agency);
}

export function transmissionClosing(
  source: Pick<TransmissionSourceMetadata, "agency">,
  messageText: string,
) {
  if (/the emperor protects\.|by the omnissiah(?:'|’)?s will\./i.test(messageText)) return null;
  return isMechanicusTransmission(source)
    ? MECHANICUS_TRANSMISSION_CLOSING
    : IMPERIAL_TRANSMISSION_CLOSING;
}

function romanNumeral(value: number) {
  const numerals = [
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ] as const;
  let remainder = Math.max(1, Math.floor(value));
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remainder >= amount) {
      result += numeral;
      remainder -= amount;
    }
  }
  return result;
}

export function formatTransmissionTranscript(source: TransmissionSourceMetadata): FormattedTransmissionTranscript {
  const analysis = analyzeTransmission(source);
  const storedBody = source.body?.trim() || source.preview?.trim() || "TRANSMISSION BODY UNRECOVERED.";
  const body = source.event?.kinds.includes("partial-transmission") && source.event.fragment
    ? transmissionBodyFragment(
        storedBody,
        source.event.rootTransmissionId,
        source.event.fragment.index,
        source.event.fragment.total,
      ) || "TRANSMISSION FRAGMENT UNRECOVERED."
    : storedBody;
  const bodyLines = body.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((line) => line.trim()).filter(Boolean) ?? [body];
  const closing = transmissionClosing(source, body);
  const rootReliquariumNumber = source.event?.parentTransmissionId
    ? transmissionReliquariumNumber({
        ...source,
        id: source.event.rootTransmissionId,
        event: undefined,
      })
    : undefined;
  const eventLines = transmissionEventAnalysisLines(source, rootReliquariumNumber);
  const lines: TransmissionTranscriptLine[] = [
    { text: `>> ACCESSING DATA RELIQUARIUM ${analysis.reliquariumNumber}`, section: "analysis", command: true },
    { text: `> Receiving locus: ${RECEIVING_LOCUS}`, section: "analysis" },
    { text: `> Operational theatre: ${OPERATIONAL_THEATRE}`, section: "analysis" },
    { text: "> Intended recipient: CHAPTER MASTER // LUNAR DRAGONS", section: "analysis" },
    { text: `> Imperial clearance grade: ${analysis.clearanceGrade}`, section: "analysis" },
    { text: `> Encryption protocol: ${analysis.encryptionProtocol}`, section: "analysis" },
    { text: `> Originator identification: ${source.agency.toUpperCase()} // ${analysis.identityState}`, section: "analysis" },
    { text: `> Positional triangulation: ${analysis.triangulationState}`, section: "analysis" },
    { text: `> Probable origin: ${analysis.probableOriginLabel}`, section: "analysis" },
    { text: `> Relay path: ${analysis.relayPathLabel}`, section: "analysis" },
    ...eventLines.map((text): TransmissionTranscriptLine => ({ text, section: "analysis" })),
    ...(source.received ? [{ text: `> Data-stamp: ${source.received}`, section: "analysis" as const }] : []),
    { text: `> Timestamp integrity: ${analysis.timestampIntegrityState}`, section: "analysis" },
    { text: `> Warp exposure: ${analysis.warpExposureState}`, section: "analysis" },
    { text: `> Exload-communion attempts: ${romanNumeral(analysis.communionAttempts)}`, section: "analysis" },
    { text: `> Data corruption query: ${formatCorruptionPercentage(analysis.corruptionPercentage)}`, section: "analysis", corruption: true },
    { text: `> Data corruption pattern: ${analysis.corruptionPattern}`, section: "analysis" },
    { text: "", section: "analysis", gap: true },
    { text: TRANSMISSION_CONTENT_MARKER, section: "analysis", command: true },
    { text: `> Subject ident: ${source.subject}`, section: "analysis" },
    ...bodyLines.map((line): TransmissionTranscriptLine => ({ text: `> ${line}`, section: "content" })),
    ...(closing ? [{ text: `> ${closing}`, section: "content" as const, closing: true }] : []),
    { text: "", section: "terminal-footer", gap: true },
    { text: "> Cogitating ... complete", section: "terminal-footer" },
    { text: "> Archive replication authorised", section: "terminal-footer" },
    { text: ">> EXLOAD CONCLUDES // MACHINE-SPIRIT SATISFIED", section: "terminal-footer", command: true },
    { text: "", section: "terminal-footer", gap: true },
    { text: TERMINAL_MACHINE_BLESSING, section: "terminal-footer", blessing: true },
  ];

  return { analysis, lines };
}

export function prepareTransmissionLine(
  line: TransmissionTranscriptLine,
  profile: TransmissionCorruptionProfile,
  lineIndex: number,
) {
  if (line.corruption) return `> Data corruption query: ${formatCorruptionPercentage(profile.percentage)}`;
  if (line.gap) return "\u00a0";
  if (line.closing || line.blessing) return line.text;
  return line.section === "content"
    ? corruptTransmissionText(line.text, profile, lineIndex)
    : line.text;
}

function corruptionTier(percentage: number) {
  if (percentage <= 3) return "low";
  if (percentage <= 12) return "medium";
  return "high";
}

export function corruptTransmissionText(text: string, profile: TransmissionCorruptionProfile, lineIndex: number) {
  if (profile.percentage <= 0) return text;

  const threshold = Math.round(profile.percentage * 100);
  const tier = corruptionTier(profile.percentage);
  const characters = Array.from(text);
  const output: string[] = [];

  for (let characterIndex = 0; characterIndex < characters.length; characterIndex += 1) {
    const character = characters[characterIndex];
    if (!/[A-Za-z0-9]/.test(character)) {
      output.push(character);
      continue;
    }

    const positionHash = hashTransmissionValue(`${profile.seed}:${lineIndex}:${characterIndex}`);
    if (positionHash % 10000 >= threshold) {
      output.push(character);
      continue;
    }

    const glyphHash = hashTransmissionValue(`${profile.seed}:${lineIndex}:${characterIndex}:glyph`);
    if (tier === "low") {
      const mark = LOW_CORRUPTION_GLYPHS[glyphHash % LOW_CORRUPTION_GLYPHS.length];
      output.push(mark === "::" ? `${character}::` : mark);
      continue;
    }

    if (tier === "high" && glyphHash % 4 === 0) {
      output.push(SEVERE_CANT_FRAGMENTS[glyphHash % SEVERE_CANT_FRAGMENTS.length]);
      const obscuredCharacters = 3 + (glyphHash % 6);
      for (let skipped = 0; skipped < obscuredCharacters && characterIndex + 1 < characters.length; skipped += 1) {
        if (!/[A-Za-z0-9]/.test(characters[characterIndex + 1])) break;
        characterIndex += 1;
      }
      continue;
    }

    if (glyphHash % 9 === 0) {
      output.push(MACHINE_CANT_FRAGMENTS[glyphHash % MACHINE_CANT_FRAGMENTS.length]);
      continue;
    }

    const glyph = CORRUPTION_GLYPHS[glyphHash % CORRUPTION_GLYPHS.length];
    output.push(tier === "high" && glyphHash % 7 === 0 ? `${glyph}${glyph}` : glyph);
  }

  return output.join("");
}
