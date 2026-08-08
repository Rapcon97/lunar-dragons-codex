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
  uncertainty?: "semantic" | "empyric" | "redaction" | "cipher";
  gap?: boolean;
  closing?: boolean;
  blessing?: boolean;
};

export type TransmissionSignalBand =
  | "local"
  | "same-system"
  | "nearby-inter-system"
  | "long-range"
  | "warp-anomalous";

export type AstropathicDegradationSeverity =
  | "I — COHERENT"
  | "II — DEGRADED"
  | "III — FRACTURED"
  | "IV — COMPROMISED"
  | "V — INCOHERENT";

export type AstropathicDegradationPhenomenon =
  | "SEMANTIC LOSS"
  | "INTERPRETIVE AMBIGUITY"
  | "THOUGHT-ECHO"
  | "MNEMONIC BLEED"
  | "EMOTIVE SATURATION"
  | "CHRONOMETRIC DISJUNCTION"
  | "IDENTITY OVERLAP"
  | "EMPYRIC CONTAMINATION";

export type AstropathicDegradationProfile = {
  signalBand: TransmissionSignalBand;
  seed: number;
  severity: AstropathicDegradationSeverity;
  interpretationConcordance: number;
  reconstructionConfidence: number;
  semanticIntegrity: "STABLE" | "DEGRADED" | "FRACTURED" | "COMPROMISED" | "INCOHERENT";
  mnemonicLoss: "NEGLIGIBLE" | "MINOR" | "SIGNIFICANT" | "SEVERE" | "EXTREME";
  emotiveContamination: "NEGLIGIBLE" | "MINOR" | "MODERATE" | "SEVERE" | "EXTREMIS";
  archivalRedaction: "NONE" | "PRESENT // IMPERIAL AUTHORITY" | "PRESENT // ORDO XENOS";
  cipherStatus: "RESOLVED" | "PARTIAL RECOVERY" | "CRYPTEX UNRESOLVED";
  phenomena: AstropathicDegradationPhenomenon[];
  intrusiveThought?: string;
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
  degradation: AstropathicDegradationProfile;
  originBasis: "metadata" | "explicit" | "inferred" | "receiving-theatre-fallback";
};

export type FormattedTransmissionTranscript = {
  analysis: TransmissionAnalysis;
  lines: TransmissionTranscriptLine[];
};

export const RECEIVING_LOCUS = "LUNARIS";
export const OPERATIONAL_THEATRE = "NORTHERN NACHMUND APPROACHES";
export const TRANSMISSION_CONTENT_MARKER = ">> SANCTIONED INTERPRETATION // EXLOAD FOLLOWS";

export const TRANSMISSION_TIMING = {
  characterMs: 38,
  minorPunctuationAdditionalMs: 60,
  terminalPunctuationAdditionalMs: 125,
  metadataLabelMs: 10,
  metadataValuePauseMs: 200,
  lineBreakMs: 200,
  retrievalDotMs: 500,
  retrievalDotCount: 4,
} as const;

export const IMPERIAL_TRANSMISSION_CLOSING = "The Emperor protects.";
export const MECHANICUS_TRANSMISSION_CLOSING = "By the Omnissiah's will.";
export const TERMINAL_MACHINE_BLESSING = "+++ HAIL THE OMNISSIAH, PRAISE THE MACHINE GOD +++";

const ORIGIN_INTERFERENCE_RANGES: Record<TransmissionOriginBand, readonly [number, number]> = {
  "internal Lunaris": [0, 0.5],
  "same system": [0.1, 1.5],
  "nearby Argent Vigil": [0.5, 4],
  "northern Nachmund theatre": [2, 8],
  "distant Imperium Nihilus": [5, 14],
  "Imperium Sanctus via Nachmund": [7, 18],
  "unstable Rift crossing": [15, 35],
  "anomalous source": [12, 30],
};

const ORIGIN_TO_SIGNAL_BAND: Record<TransmissionOriginBand, TransmissionSignalBand> = {
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

function derivedInterferenceScore(
  source: TransmissionSourceMetadata,
  originBand: TransmissionOriginBand,
  grade: ImperialClearanceGrade,
  protocol: EncryptionProtocol,
) {
  const [minimum, maximum] = ORIGIN_INTERFERENCE_RANGES[originBand];
  const fraction = (analysisHash(source, "semantic-interference") % 10001) / 10000;
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

const WARP_INTERPRETATION_PENALTY: Record<WarpExposureState, number> = {
  NEGLIGIBLE: 0,
  MINOR: 2,
  MODERATE: 5,
  ELEVATED: 9,
  SEVERE: 15,
  EXTREMIS: 22,
};

export function astropathicSeverityForConcordance(concordance: number): AstropathicDegradationSeverity {
  if (concordance >= 90) return "I — COHERENT";
  if (concordance >= 75) return "II — DEGRADED";
  if (concordance >= 55) return "III — FRACTURED";
  if (concordance >= 30) return "IV — COMPROMISED";
  return "V — INCOHERENT";
}

function severityIndex(severity: AstropathicDegradationSeverity) {
  return (["I — COHERENT", "II — DEGRADED", "III — FRACTURED", "IV — COMPROMISED", "V — INCOHERENT"] as const)
    .indexOf(severity);
}

function degradationPhenomena(
  source: TransmissionSourceMetadata,
  severity: AstropathicDegradationSeverity,
) {
  const level = severityIndex(severity);
  if (level <= 0) return [];

  const pools: readonly AstropathicDegradationPhenomenon[][] = [
    [],
    ["INTERPRETIVE AMBIGUITY", "SEMANTIC LOSS", "EMOTIVE SATURATION"],
    ["SEMANTIC LOSS", "INTERPRETIVE AMBIGUITY", "THOUGHT-ECHO", "MNEMONIC BLEED", "EMOTIVE SATURATION", "CHRONOMETRIC DISJUNCTION"],
    ["SEMANTIC LOSS", "INTERPRETIVE AMBIGUITY", "THOUGHT-ECHO", "MNEMONIC BLEED", "EMOTIVE SATURATION", "CHRONOMETRIC DISJUNCTION", "IDENTITY OVERLAP"],
    ["SEMANTIC LOSS", "INTERPRETIVE AMBIGUITY", "THOUGHT-ECHO", "MNEMONIC BLEED", "EMOTIVE SATURATION", "CHRONOMETRIC DISJUNCTION", "IDENTITY OVERLAP"],
  ];
  const count = [0, 1, 3, 5, 7][level];
  const pool = pools[level];
  const start = analysisHash(source, "degradation-phenomena") % pool.length;
  const phenomena = Array.from({ length: count }, (_, index) => pool[(start + index) % pool.length]);
  const uniquePhenomena = [...new Set(phenomena)];
  const explicitIntrusion = /secondary thought-presence|intrusive thought-form|unattributed voice/i.test(metadataText(source));
  const rareIntrusion = level >= 3 && analysisHash(source, "empyric-intrusion") % 257 === 0;
  if ((explicitIntrusion || rareIntrusion) && !uniquePhenomena.includes("EMPYRIC CONTAMINATION")) {
    uniquePhenomena.push("EMPYRIC CONTAMINATION");
  }
  return uniquePhenomena;
}

function archivalRedactionState(source: TransmissionSourceMetadata): AstropathicDegradationProfile["archivalRedaction"] {
  const text = `${source.subject} ${source.preview ?? ""} ${source.body ?? ""}`;
  if (!/\bredact(?:ed|ion)?\b|\bexpunged\b|information removed under seal/i.test(text)) return "NONE";
  return /ordo xenos|inquisit/i.test(source.agency) ? "PRESENT // ORDO XENOS" : "PRESENT // IMPERIAL AUTHORITY";
}

function cipherStatus(
  source: TransmissionSourceMetadata,
  method: TransmissionMethod,
  severity: AstropathicDegradationSeverity,
): AstropathicDegradationProfile["cipherStatus"] {
  const text = `${source.subject} ${source.preview ?? ""} ${source.body ?? ""}`;
  if (/crypt(?:ex|ox) unresolved|cipher (?:failure|unresolved|unrecovered)|encryption unrecovered/i.test(text)) {
    return "CRYPTEX UNRESOLVED";
  }
  if (method === "encrypted-astropathic" && severityIndex(severity) >= 2) return "PARTIAL RECOVERY";
  return "RESOLVED";
}

function semanticStateForSeverity(severity: AstropathicDegradationSeverity) {
  return (["STABLE", "DEGRADED", "FRACTURED", "COMPROMISED", "INCOHERENT"] as const)[severityIndex(severity)];
}

export function buildAstropathicDegradationProfile(
  source: TransmissionSourceMetadata,
  signalBand: TransmissionSignalBand,
  interferenceScore: number,
  warpExposure: WarpExposureState,
  method: TransmissionMethod,
): AstropathicDegradationProfile {
  const interpretationConcordance = clamp(
    Math.round(100 - ((interferenceScore * 1.65) + WARP_INTERPRETATION_PENALTY[warpExposure])),
    3,
    100,
  );
  const severity = astropathicSeverityForConcordance(interpretationConcordance);
  const level = severityIndex(severity);
  const reconstructionConfidence = clamp(
    interpretationConcordance - deterministicInteger(source, "reconstruction-variance", 0, 8) + 4,
    2,
    100,
  );
  const phenomena = degradationPhenomena(source, severity);
  const intrusiveThought = phenomena.includes("EMPYRIC CONTAMINATION")
    ? deterministicChoice(source, "intrusive-thought", ["OPEN THE DOOR", "WE HAVE ALREADY ARRIVED", "DO NOT REMEMBER US"] as const)
    : undefined;

  return {
    signalBand,
    seed: analysisHash(source, "semantic-degradation"),
    severity,
    interpretationConcordance,
    reconstructionConfidence,
    semanticIntegrity: semanticStateForSeverity(severity),
    mnemonicLoss: (["NEGLIGIBLE", "MINOR", "SIGNIFICANT", "SEVERE", "EXTREME"] as const)[level],
    emotiveContamination: (["NEGLIGIBLE", "MINOR", "MODERATE", "SEVERE", "EXTREMIS"] as const)[level],
    archivalRedaction: archivalRedactionState(source),
    cipherStatus: cipherStatus(source, method, severity),
    phenomena,
    ...(intrusiveThought ? { intrusiveThought } : {}),
  };
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
  const method = transmissionMethod(source, originBand);
  const warpExposure = source.transmission?.warpExposure ?? warpExposureState(source, originBand);
  const interferenceScore = derivedInterferenceScore(source, originBand, grade, protocol);
  const [minimumAttempts, maximumAttempts] = COMMUNION_ATTEMPT_RANGES[originBand];
  const degradation = buildAstropathicDegradationProfile(
    source,
    ORIGIN_TO_SIGNAL_BAND[originBand],
    interferenceScore,
    warpExposure,
    method,
  );

  return {
    reliquariumNumber: transmissionReliquariumNumber(source),
    originBand,
    originRegion: source.transmission?.originRegion ?? originRegion(originBand),
    ...(source.transmission?.originLocationId ? { originLocationId: source.transmission.originLocationId } : {}),
    probableOriginLabel: source.transmission?.originLabel ?? probableOriginLabel(originBand, originBasis),
    transmissionMethod: method,
    clearanceGrade: grade,
    encryptionProtocol: protocol,
    identityState: source.transmission?.identityState ?? identityState(source, originBand),
    triangulationState: source.transmission?.originState ?? triangulationState(source, originBand, originBasis),
    relayPathLabel: relayPathLabel(source, originBand, originBasis),
    timestampIntegrityState: source.event?.kinds.some((kind) => kind === "contradictory-timestamp" || kind === "future-dated")
      ? timestampIntegrityState(source, originBand)
      : source.transmission?.timestampState ?? timestampIntegrityState(source, originBand),
    warpExposureState: warpExposure,
    communionAttempts: deterministicInteger(source, "communion-attempts", minimumAttempts, maximumAttempts),
    degradation,
    originBasis,
  };
}

export function classifyTransmissionSource(source: TransmissionSourceMetadata): TransmissionSignalBand {
  return ORIGIN_TO_SIGNAL_BAND[classifyTransmissionOrigin(source)];
}

export function transmissionDegradationProfile(source: TransmissionSourceMetadata): AstropathicDegradationProfile {
  return analyzeTransmission(source).degradation;
}

export function formatConfidencePercentage(value: number) {
  return `${Math.round(value)}%`;
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

export function resolveTransmissionBody(source: TransmissionSourceMetadata) {
  const storedBody = source.body?.trim() || source.preview?.trim() || "TRANSMISSION BODY UNRECOVERED.";
  if (!source.event?.kinds.includes("partial-transmission") || !source.event.fragment) return storedBody;
  return transmissionBodyFragment(
    storedBody,
    source.event.rootTransmissionId,
    source.event.fragment.index,
    source.event.fragment.total,
  ) || "TRANSMISSION FRAGMENT UNRECOVERED.";
}

function semanticCluster(source: TransmissionSourceMetadata, readableBody: string) {
  const text = `${source.subject} ${readableBody}`.toLowerCase();
  if (/echo|return|remember|home|argent psalm/.test(text)) return ["RETURN", "REMEMBER", "HOME"];
  if (/convoy|passage|escort|route|translation/.test(text)) return ["PASSAGE", "ESCORT", "DELAY"];
  if (/shell|munition|ammunition|battery|armament/.test(text)) return ["RESERVE", "DENIAL", "PRIORITY"];
  if (/relief|fortress|bastion|defender|siege/.test(text)) return ["RELIEF", "HOLD", "WITHDRAW"];
  if (/archive|relic|founding|record|vault/.test(text)) return ["RECORD", "WITNESS", "SEAL"];
  return ["REQUEST", "WARNING", "REPORT"];
}

function phenomenonNotes(
  source: TransmissionSourceMetadata,
  readableBody: string,
  profile: AstropathicDegradationProfile,
) {
  const cluster = semanticCluster(source, readableBody);
  const notes: string[] = [];
  for (const phenomenon of profile.phenomena) {
    if (phenomenon === "SEMANTIC LOSS") notes.push("[SEMANTIC LOSS — SECONDARY DETAIL UNRECOVERED]");
    if (phenomenon === "INTERPRETIVE AMBIGUITY") {
      notes.push(`The following concept achieved partial concordance: [${cluster.join(" / ")}]. No single interpretation achieved sanction.`);
    }
    if (phenomenon === "THOUGHT-ECHO") notes.push(`[ECHO: ${cluster[0]} — ${cluster[0]} — ${cluster[0]}]`);
    if (phenomenon === "MNEMONIC BLEED") notes.push("[MNEMONIC INTRUSION — ORIGIN UNCONFIRMED]");
    if (phenomenon === "EMOTIVE SATURATION") notes.push("[GRIEF RESPONSE OBSCURES SECONDARY CONTENT]");
    if (phenomenon === "CHRONOMETRIC DISJUNCTION") notes.push("[TEMPORAL ORDER INDETERMINATE]");
    if (phenomenon === "IDENTITY OVERLAP") notes.push("[ORIGINATOR / RELAY CONFLATION]");
    if (phenomenon === "EMPYRIC CONTAMINATION") {
      notes.push("[SECONDARY THOUGHT-PRESENCE DETECTED]");
      notes.push(`All receiving Astropaths independently perceived [INTRUSIVE THOUGHT-FORM: ${profile.intrusiveThought}]. No compatible mnemonic structure was found within the originating impression.`);
    }
  }
  return notes;
}

const ARGENT_PSALM_SANCTIONED_INTERPRETATION = [
  "Choir Primus reports detection of a partial Soul-Bound signature provisionally associated with the missing vessel Argent Psalm.",
  "The impression manifested beyond the Vesper Rift. Provenance remains unresolved.",
  "The originating thought-form repeatedly conveyed [RETURN / REMEMBER / HOME]. No single interpretation achieved sufficient concordance for sanction.",
  "A secondary impression indicates the vessel was [DAMAGED / ABANDONED / DEAD], though the choir could not establish whether this concept referred to the Argent Psalm, its crew, or another presence associated with the transmission.",
  "A significant portion of the received impression remains unrecoverable due to severe empyric interference.",
  "Immediately before termination, all receiving Astropaths independently perceived the concept:",
  "THE MOON REMEMBERS.",
  "This mnemonic does not conform to the preceding thought-pattern and its origin remains disputed.",
].join("\n\n");

export function renderSanctionedInterpretation(
  source: TransmissionSourceMetadata,
  profile: AstropathicDegradationProfile,
) {
  const readableBody = resolveTransmissionBody(source);
  const isPartialRecord = source.event?.kinds.includes("partial-transmission");
  if (!isPartialRecord && source.subject.trim().toLowerCase() === "argent psalm signal echo") {
    return ARGENT_PSALM_SANCTIONED_INTERPRETATION;
  }

  const level = severityIndex(profile.severity);
  const notes = phenomenonNotes(source, readableBody, profile);
  let sanctioned: string[];
  if (level === 0) {
    sanctioned = [readableBody];
  } else if (level === 1) {
    sanctioned = [readableBody, ...notes.slice(0, 1)];
  } else if (level === 2) {
    sanctioned = [readableBody, "[PROVISIONAL INTERPRETATION] Reconstruction remains actionable, but choir consensus is incomplete.", ...notes.slice(0, 3)];
  } else if (level === 3) {
    sanctioned = [`[RECONSTRUCTED] ${readableBody}`, "Subject attribution and sequence remain provisional.", ...notes.slice(0, 5)];
  } else if (isPartialRecord) {
    sanctioned = [
      `[RECONSTRUCTED FRAGMENT] ${readableBody}`,
      "No interpretation beyond the recovered fragment has been sanctioned.",
      ...notes.slice(0, 4),
    ];
  } else {
    const anchors = semanticCluster(source, readableBody);
    sanctioned = [
      "Only three semantic concepts achieved sufficient concordance for archival sanction:",
      ...anchors.map((anchor) => `[${anchor}]`),
      "Subject association unresolved. Temporal relationship unresolved. Originator identity unresolved.",
      "No further command-readable reconstruction is possible.",
      ...notes.slice(0, 4),
    ];
  }

  if (profile.archivalRedaction !== "NONE" && !/\[REDACTED/i.test(sanctioned.join(" "))) {
    sanctioned.push(`[REDACTED // ${profile.archivalRedaction.includes("ORDO XENOS") ? "ORDO XENOS" : "IMPERIAL AUTHORITY"}]`);
  }
  if (profile.cipherStatus === "CRYPTEX UNRESOLVED" && !/\[CRYPTEX UNRESOLVED\]/i.test(sanctioned.join(" "))) {
    sanctioned.push("[CRYPTEX UNRESOLVED] Conventional encrypted payload could not be recovered; this failure is separate from the astropathic interpretation.");
  }
  return sanctioned.join("\n\n");
}

function uncertaintyForSanctionedLine(text: string): TransmissionTranscriptLine["uncertainty"] {
  if (/\[REDACTED/i.test(text)) return "redaction";
  if (/\[CRYPTEX UNRESOLVED\]/i.test(text)) return "cipher";
  if (/SECONDARY THOUGHT-PRESENCE|INTRUSIVE THOUGHT-FORM|UNATTRIBUTED VOICE/i.test(text)) return "empyric";
  if (/\[[^\]]+\]|provisional|unresolved|concordance|could not|indeterminate|reconstruction/i.test(text)) return "semantic";
  return undefined;
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
  const sanctionedInterpretation = renderSanctionedInterpretation(source, analysis.degradation);
  const bodyLines = sanctionedInterpretation
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph])
    .map((line) => line.trim())
    .filter(Boolean);
  const closing = transmissionClosing(source, sanctionedInterpretation);
  const rootReliquariumNumber = source.event?.parentTransmissionId
    ? transmissionReliquariumNumber({
        ...source,
        id: source.event.rootTransmissionId,
        event: undefined,
      })
    : undefined;
  const eventLines = transmissionEventAnalysisLines(source, rootReliquariumNumber);
  const lines: TransmissionTranscriptLine[] = [
    { text: `> Receiving locus: ${RECEIVING_LOCUS}`, section: "analysis" },
    { text: `> Operational theatre: ${OPERATIONAL_THEATRE}`, section: "analysis" },
    { text: "> Intended recipient: CHAPTER MASTER // LUNAR DRAGONS", section: "analysis" },
    { text: `> Originator identification: ${source.agency.toUpperCase()} // ${analysis.identityState}`, section: "analysis" },
    { text: `> Probable origin: ${analysis.probableOriginLabel}`, section: "analysis" },
    { text: `> Interpretation state: ${analysis.degradation.severity}`, section: "analysis" },
    { text: `> Interpretation concordance: ${formatConfidencePercentage(analysis.degradation.interpretationConcordance)}`, section: "analysis" },
    ...eventLines.map((text): TransmissionTranscriptLine => ({ text, section: "analysis" })),
    ...(source.received ? [{ text: `> Data-stamp: ${source.received}`, section: "analysis" as const }] : []),
    { text: `> Timestamp integrity: ${analysis.timestampIntegrityState}`, section: "analysis" },
    { text: `> Choir reception attempts: ${romanNumeral(analysis.communionAttempts)}`, section: "analysis" },
    { text: "", section: "analysis", gap: true },
    { text: TRANSMISSION_CONTENT_MARKER, section: "analysis", command: true },
    { text: `> Record subject: ${source.subject}`, section: "analysis" },
    ...bodyLines.map((line): TransmissionTranscriptLine => ({
      text: `> ${line}`,
      section: "content",
      ...(uncertaintyForSanctionedLine(line) ? { uncertainty: uncertaintyForSanctionedLine(line) } : {}),
    })),
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
) {
  if (line.gap) return "\u00a0";
  return line.text;
}
