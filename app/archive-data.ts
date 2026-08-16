import {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_DATE_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
  MAX_LORE_TITLE_LENGTH,
} from "./lore-limits.ts";
import { transmissionBodyFragments } from "./transmission-fragments.ts";

export type ChapterIdentity = {
  founding: string;
  lineage: string;
  domain: string;
  fortress: string;
  master: string;
  flaw: string;
  foundingPrompt: string;
};

export type ChapterMilestone = {
  label: string;
  done: boolean;
};

export type ChapterRelic = {
  name: string;
  type: string;
  status: string;
};

export type ChapterCompany = {
  number: string;
  name: string;
  role: string;
  strength: number;
};

export type ChapterCharacterStatus =
  | "active"
  | "deceased"
  | "missing"
  | "interred";

export type ChapterCharacter = {
  id: string;
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
  loreEntryIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type LoreStatus =
  | "draft"
  | "review"
  | "canon"
  | "retconned";

export type LoreCategory =
  | "campaign"
  | "event"
  | "character"
  | "relic"
  | "world"
  | "organization"
  | "decree"
  | "other";

export type LoreEntry = {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  category: LoreCategory;
  status: LoreStatus;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type TransmissionOriginBand =
  | "internal Lunaris"
  | "same system"
  | "nearby Argent Vigil"
  | "northern Nachmund theatre"
  | "distant Imperium Nihilus"
  | "Imperium Sanctus via Nachmund"
  | "unstable Rift crossing"
  | "anomalous source";

export type TransmissionRouteClass =
  | "direct-noospheric"
  | "local-system-relay"
  | "argent-vigil-relay"
  | "nachmund-corridor"
  | "sanctioned-choir-chain"
  | "contested-relay"
  | "rift-crossing"
  | "astropathic-echo"
  | "unresolved";

export type TransmissionMethod =
  | "noospheric"
  | "vox"
  | "astropathic"
  | "encrypted-astropathic"
  | "navigational-choir"
  | "mechanicus-burst"
  | "warp-echo"
  | "unknown";

export type TransmissionOriginRegion =
  | "IMPERIUM NIHILUS"
  | "IMPERIUM SANCTUS"
  | "GREAT RIFT"
  | "UNRESOLVED";

export type TransmissionConfidenceState =
  | "VERIFIED"
  | "CONFIRMED"
  | "PROBABLE"
  | "PARTIAL"
  | "INCONCLUSIVE"
  | "CONTRADICTORY"
  | "UNRECOVERED";

export type TransmissionWarpExposure =
  | "NEGLIGIBLE"
  | "MINOR"
  | "MODERATE"
  | "ELEVATED"
  | "SEVERE"
  | "EXTREMIS";

export type AstropathicTransmissionMetadata = {
  originLocationId?: string;
  originLabel?: string;
  originRegion?: TransmissionOriginRegion;
  originBand?: TransmissionOriginBand;
  routeClass?: TransmissionRouteClass;
  transmissionMethod?: TransmissionMethod;
  warpExposure?: TransmissionWarpExposure;
  identityState?: TransmissionConfidenceState;
  originState?: TransmissionConfidenceState;
  timestampState?: TransmissionConfidenceState;
};

export type AstropathicEventKind =
  | "delayed-arrival"
  | "out-of-order-arrival"
  | "partial-transmission"
  | "recovered-fragment"
  | "failed-relay-node"
  | "duplicate-astropathic-echo"
  | "contradictory-timestamp"
  | "future-dated";

export type AstropathicEventMetadata = {
  version: 1;
  kinds: AstropathicEventKind[];
  rootTransmissionId: string;
  parentTransmissionId?: string;
  ordinal?: number;
  nominalReceivedAt: string;
  claimedAt?: string;
  conflictingClaimedAt?: string;
  fragment?: {
    index: number;
    total: number;
    algorithmVersion: 1;
  };
};

// Rollback note: releases predating Phase 4 ignore these optional fields and
// may discard them on a later Relay write, while the underlying message record,
// body, ID, cadence slot, and explicit Phase 2 metadata remain compatible.

export type AstropathicMessage = {
  id: string;
  agency: string;
  subject: string;
  preview: string;
  body: string;
  priority: "PRIMUS" | "ACTION" | "URGENT" | "SEALED" | "PETITION" | "NOTICE";
  received: string;
  receivedAt: string;
  transmission?: AstropathicTransmissionMetadata;
  event?: AstropathicEventMetadata;
};

export type BadgeMode = "badge" | "banner";

export type SectorWorld = {
  name: string;
  classification: string;
  status: string;
  x: number;
  y: number;
  bodies: SystemBody[];
};

export type SystemBody = {
  name: string;
  type: string;
  classificationId?: string;
  status: string;
  orbit: number;
  population: string;
  climate: string;
  allegiance: string;
  resources: string;
  summary: string;
};

export type SectorFaction = {
  name: string;
  alignment: "ally" | "enemy" | "uncertain";
  classification: string;
  threat: number;
  disposition: string;
};

export type WarpLane = {
  name: string;
  from: number;
  to: number;
  status: "stable" | "unstable" | "blockaded" | "unknown";
};

export type SectorSurveyState = {
  authority: "draft" | "review" | "ratified";
  receivingLocus: string;
  systemDesignation: string;
  probableRegion: string;
  transitRoute: string;
  cartographicConfidence: string;
  communications: string;
  supportForceStatus: string;
  vesselCondition: string;
  isolationStatus: string;
};

export type SectorIntel = {
  sectorName: string;
  subsectorName: string;
  currentTheater: string;
  deploymentStatus: string;
  astropathicDate: string;
  summary: string;
  worlds: SectorWorld[];
  factions: SectorFaction[];
  directives: string[];
  warpLanes: WarpLane[];
  survey: SectorSurveyState;
};

export type ChapterArchiveData = {
  identity: ChapterIdentity;
  milestones: ChapterMilestone[];
  relics: ChapterRelic[];
  companies: ChapterCompany[];
  characters: ChapterCharacter[];
  entries: string[];
  loreEntries: LoreEntry[];
  voxQuotes: string[];
  badgeMode: BadgeMode;
  relayMessages: AstropathicMessage[];
  relayLastGeneratedDate: string;
  sectorIntel: SectorIntel;
  
};

export type ArchiveSection = keyof ChapterArchiveData;

export const CURRENT_LORE_REVISION = 3;

export const defaultVoxQuotes = [
  "Duty is the armour no blade can pierce.",
  "A steady hand serves longer than a loud oath.",
  "Courage begins where certainty ends.",
  "Let discipline speak when fear demands silence.",
  "The watchful endure; the careless become warnings.",
  "One faithful deed outweighs a thousand promises.",
  "Hold the line, and history will remember your name.",
  "The Emperor asks no comfort—only resolve.",
  "Through ordered purpose, even darkness yields.",
  "A warrior’s first victory is mastery of the self.",
  "Stand as the shield. Strike as the verdict.",
  "No night is endless while duty still burns.",
  "Obedience gives strength; sacrifice gives meaning.",
  "The unbroken will is the Imperium’s sharpest weapon.",
  "Faith is proven in the hour when hope is absent.",
  "Advance with purpose, endure without complaint.",
  "Thou shalt offer no mercy to the heretic. Thou shalt destroy their graven images and obliterate their mortal forms with the Emperor's holy fire.",
];

const defaultArchive: ChapterArchiveData = {
  identity: {
    founding: "Ultima Founding · Indomitus Crusade",
    lineage: "Ultima Founding gene-line · sealed by Adeptus Terra",
    domain: "Nachmund Gauntlet · Argent Vigil contested reaches",
    fortress: "Fleet-based aboard Lunaris · permanent bastion not yet claimed",
    master: "Chapter Master unrecorded",
    flaw: "Gene-seed flaw unrecorded",
    foundingPrompt: "Reclaim what has been lost. Guard the passage. Where the light of the Imperium has failed, carry it with you.",
  },
  milestones: [
    { label: "Confirm chapter designation", done: true },
    { label: "Define founding & lineage", done: true },
    { label: "Design heraldry and colours", done: false },
    { label: "Write a defining campaign", done: false },
    { label: "Name the Chapter Master", done: false },
  ],
  relics: [
    { name: "The Gift of Luna", type: "Founding trust · physical form sealed", status: "In Chapter keeping · future foundation unfulfilled" },
    { name: "Lunaris", type: "Chapter Flagship · Battle Barge", status: "Bearer of the First Stone · The Argent Spear" },
  ],
  companies: [
    { number: "1st", name: "1st Company", role: "Veterans", strength: 94 },
    { number: "2nd", name: "2nd Company", role: "Battleline", strength: 88 },
    { number: "3rd", name: "3rd Company", role: "Battleline", strength: 100 },
    { number: "4th", name: "4th Company", role: "Battleline", strength: 76 },
    { number: "5th", name: "5th Company", role: "Battleline", strength: 91 },
    { number: "6th", name: "6th Company", role: "Reserve", strength: 62 },
    { number: "7th", name: "7th Company", role: "Reserve", strength: 84 },
    { number: "8th", name: "8th Company", role: "Close Support", strength: 55 },
    { number: "9th", name: "9th Company", role: "Fire Support", strength: 47 },
    { number: "10th", name: "10th Company", role: "Scouts & Neophytes", strength: 45 },
    { number: "11th", name: "The Veiled Claw", role: "Classified Operations", strength: 100 },
  ],
  characters: [],
  entries: [
    "008.M42 — In the eighth year of the Indomitus Crusade, Roboute Guilliman seals the Decree of Reclamation and Vigilance, recognising the Lunar Dragons’ sacrifice and distinguished service.",
    "008.M42 — The Chapter is commissioned to prosecute the Nachmund Reclamation, operationally designated the Argent Vigil.",
    "008.M42 — The Right of Permanent Bastion is granted; the Lunar Dragons remain fleet-based until a worthy sentinel world is lawfully confirmed.",
    "008.M42 — The Gift of Luna enters Chapter keeping, to be set into the foundations of their future fortress-monastery.",
    "056.M42 — The Chapter flagship is entered into the rolls as Lunaris, Bearer of the First Stone and the Argent Spear.",
    "M42.017 — The first oath of the Lunar Dragons is entered into the archive.",
    "M42.004 — The chapter’s earliest surviving campaign record remains sealed.",
  ],
  loreEntries: [],
  voxQuotes: [...defaultVoxQuotes],
  badgeMode: "badge",
  relayMessages: [],
  relayLastGeneratedDate: "",
  sectorIntel: {
    sectorName: "Northeastern Nachmund Approaches",
    subsectorName: "Unresolved System Survey",
    currentTheater: "The Argent Vigil · Stranding Phase",
    deploymentStatus: "CRUSADE FORCE SCATTERED · LUNARIS BARELY OPERATIONAL",
    astropathicDate: "056.M42 · CHRONOMETRIC FIX DEGRADED",
    summary:
      "At the opening of the Argent Vigil, a catastrophic empyric event scattered the crusade force during its passage from Imperium Sanctus through the Nachmund Gauntlet. Lunaris emerged within an unidentified system on the northeastern, Imperium Nihilus-facing approaches. Roughly seventy percent of the supporting vessels and forces are destroyed, scattered, or missing. The flagship is heavily damaged and barely operational, though its surviving batteries can still answer an attack.",
    worlds: [],
    factions: [],
    directives: [
      "Seek systems isolated by the Great Rift and determine the fate of worlds from which the Emperor’s light has been obscured.",
      "Relieve those who hold faith with Terra, restore lawful Imperial authority, and reclaim what may be reclaimed.",
      "Destroy what has fallen beyond redemption through corruption, treason, xenos dominion, or the touch of the Archenemy.",
      "Secure anchorages, supply routes, passages, and systems through the contested reaches.",
      "Stand vigil against every power that would close the Nachmund passage and deepen the sundering of the Imperium.",
    ],
    warpLanes: [],
    survey: {
      authority: "draft",
      receivingLocus: "LUNARIS",
      systemDesignation: "UNIDENTIFIED SYSTEM",
      probableRegion: "NORTHEASTERN NACHMUND APPROACHES · NIHILUS-FACING",
      transitRoute: "IMPERIUM SANCTUS → NACHMUND GAUNTLET → IMPERIUM NIHILUS",
      cartographicConfidence: "EXTREMELY LOW · EMPYRIC INTERFERENCE",
      communications: "NO RELIABLE EXTERNAL CONTACT",
      supportForceStatus: "APPROX. 70% DESTROYED · SCATTERED · MISSING",
      vesselCondition: "HEAVILY DAMAGED · BARELY OPERATIONAL · DEFENSIVE CAPABILITY PRESENT",
      isolationStatus: "LOCAL ISOLATION PREDATES THE GREAT RIFT · DURATION UNVERIFIED",
    },
  },
};

const transmissionMetadataBySubject = {
  "Compliance return overdue": {
    originLabel: "ADEPTUS TERRA // STRATEGIC COMMAND ARCHIVE",
    originRegion: "IMPERIUM SANCTUS",
    originBand: "Imperium Sanctus via Nachmund",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Convoy passage requested": {
    originLabel: "TASK GROUP HELIOS // NACHMUND TRANSIT",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Veil Anchor 7 telemetry": {
    originLocationId: "veil-anchor-7",
    originLabel: "VEIL ANCHOR 7 // VESPER RIFT",
    originRegion: "GREAT RIFT",
    originBand: "unstable Rift crossing",
    routeClass: "rift-crossing",
    transmissionMethod: "mechanicus-burst",
    warpExposure: "SEVERE",
    identityState: "CONFIRMED",
    originState: "CONFIRMED",
    timestampState: "VERIFIED",
  },
  "Vigil IX relief appeal": {
    originLocationId: "vigil-ix",
    originLabel: "VIGIL IX // WESTERN BASTION",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "CONFIRMED",
    originState: "CONFIRMED",
    timestampState: "VERIFIED",
  },
  "Kharon cipher inquiry": {
    originLabel: "ORDO XENOS // SELENE CONCLAVE",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Pilgrim fleet benediction": {
    originLocationId: "orison",
    originLabel: "ORISON // CARDINALATE",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "astropathic",
    warpExposure: "MINOR",
    identityState: "CONFIRMED",
    originState: "CONFIRMED",
    timestampState: "VERIFIED",
  },
  "Founding rolls discrepancy": {
    originLabel: "ADMINISTRATUM // ULTIMA FOUNDING REGISTRY",
    originRegion: "IMPERIUM SANCTUS",
    originBand: "Imperium Sanctus via Nachmund",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Argent Psalm signal echo": {
    originLabel: "SOURCE UNRESOLVED // BEYOND VESPER RIFT",
    originRegion: "UNRESOLVED",
    originBand: "anomalous source",
    routeClass: "astropathic-echo",
    transmissionMethod: "warp-echo",
    warpExposure: "EXTREMIS",
    identityState: "PARTIAL",
    originState: "UNRECOVERED",
    timestampState: "PARTIAL",
  },
  "Discipline review requested": {
    originLabel: "OFFICIO PREFECTUS // ARGENT VIGIL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Navigator warning: Vesper Drift": {
    originLabel: "HOUSE CAELORN // VESPER DRIFT",
    originRegion: "GREAT RIFT",
    originBand: "unstable Rift crossing",
    routeClass: "rift-crossing",
    transmissionMethod: "navigational-choir",
    warpExposure: "SEVERE",
    identityState: "CONFIRMED",
    originState: "PARTIAL",
    timestampState: "PARTIAL",
  },
  "Munitions allocation dispute": {
    originLabel: "DEPARTMENTO MUNITORUM // NACHMUND COMMAND",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "INCONCLUSIVE",
    timestampState: "VERIFIED",
  },
  "Restricted witness transfer": {
    originLabel: "ORDO HERETICUS // SEALED CHANNEL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Translation beacon silence": {
    originLabel: "NAVIS IMPERIALIS // NORTHERN APPROACHES",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "INCONCLUSIVE",
    timestampState: "VERIFIED",
  },
  "Evacuation corridor petition": {
    originLabel: "ASTRA MILITARUM // ARGENT VIGIL FIELD COMMAND",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Promethium reserve shortfall": {
    originLabel: "DEPARTMENTO MUNITORUM // FORWARD LOGISTICS",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Tithe remission petition": {
    originLabel: "ADMINISTRATUM // NIHILUS TITHES OFFICE",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "PARTIAL",
  },
  "Noospheric quarantine advisory": {
    originLabel: "ADEPTUS MECHANICUS // QUARANTINE CANT",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "mechanicus-burst",
    warpExposure: "MINOR",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Reactor relic provenance dispute": {
    originLabel: "ADEPTUS MECHANICUS // RECLAMATION CONCLAVE",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "mechanicus-burst",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "INCONCLUSIVE",
    timestampState: "VERIFIED",
  },
  "Choir casualty return": {
    originLabel: "ADEPTUS ASTRA TELEPATHICA // CHOIR MUSTER",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Null-silence interval": {
    originLabel: "ASTROPATHICA // RELAY PATH UNRESOLVED",
    originRegion: "UNRESOLVED",
    originBand: "anomalous source",
    routeClass: "unresolved",
    transmissionMethod: "warp-echo",
    warpExposure: "SEVERE",
    identityState: "PARTIAL",
    originState: "UNRECOVERED",
    timestampState: "CONTRADICTORY",
  },
  "Chart discrepancy under seal": {
    originLabel: "NAVIS NOBILITE // BONDED CHART ARCHIVE",
    originRegion: "GREAT RIFT",
    originBand: "unstable Rift crossing",
    routeClass: "rift-crossing",
    transmissionMethod: "navigational-choir",
    warpExposure: "SEVERE",
    identityState: "CONFIRMED",
    originState: "PARTIAL",
    timestampState: "PARTIAL",
  },
  "Gellar breach testimony demanded": {
    originLabel: "ORDO MALLEUS // SANCTIFIED BLACK CHANNEL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "INCONCLUSIVE",
    timestampState: "VERIFIED",
  },
  "Uncatalogued biosignature seizure": {
    originLabel: "ORDO XENOS // FIELD CONCLAVE",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Convent distress petition": {
    originLabel: "ADEPTA SORORITAS // CONVENT SIGNAL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "contested-relay",
    transmissionMethod: "astropathic",
    warpExposure: "ELEVATED",
    identityState: "CONFIRMED",
    originState: "INCONCLUSIVE",
    timestampState: "PARTIAL",
  },
  "Extradition writ submitted": {
    originLabel: "ADEPTUS ARBITES // JUDGES' CIRCUIT",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Regimental honour dispute": {
    originLabel: "OFFICIO PREFECTUS // COMMISSARIAT REVIEW",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Derelict salvage adjudication": {
    originLabel: "NAVIS IMPERIALIS // SALVAGE COURT",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "nearby Argent Vigil",
    routeClass: "argent-vigil-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MINOR",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Medical stores diversion request": {
    originLabel: "DEPARTMENTO MUNITORUM // MEDICAE ALLOTMENT",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "northern Nachmund theatre",
    routeClass: "nachmund-corridor",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "MODERATE",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Sanctified remains passage": {
    originLabel: "ADEPTUS MINISTORUM // MORTUARY PROCESSION",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "contested-relay",
    transmissionMethod: "astropathic",
    warpExposure: "ELEVATED",
    identityState: "CONFIRMED",
    originState: "PROBABLE",
    timestampState: "PARTIAL",
  },
  "Warranted passage exchange": {
    originLabel: "ROGUE TRADER DYNASTY // WARRANTED CHANNEL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "CONFIRMED",
    originState: "INCONCLUSIVE",
    timestampState: "PARTIAL",
  },
  "To those who hold the sundered road": {
    originLabel: "ADEPTUS TERRA // LORD COMMANDER'S STRATEGIUM",
    originRegion: "IMPERIUM SANCTUS",
    originBand: "Imperium Sanctus via Nachmund",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Counsel from the returned Lion": {
    originLabel: "LION EL'JONSON // SECURED COMMAND CHANNEL",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "contested-relay",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "PARTIAL",
    timestampState: "VERIFIED",
  },
  "Nihilus strategic notice": {
    originLabel: "IMPERIUM NIHILUS // LORD REGENT'S STRATEGIUM",
    originRegion: "IMPERIUM NIHILUS",
    originBand: "distant Imperium Nihilus",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "A most reasonable request for impossible data": {
    originLabel: "ORIGIN UNRESOLVED // ARCHMAGOS DOMINUS",
    originRegion: "UNRESOLVED",
    routeClass: "unresolved",
    transmissionMethod: "mechanicus-burst",
    identityState: "VERIFIED",
    originState: "UNRECOVERED",
    timestampState: "VERIFIED",
  },
  "Concerning the Argent Procession": {
    originLabel: "ADEPTA SORORITAS // ABBESS SANCTORUM",
    originRegion: "IMPERIUM SANCTUS",
    originBand: "Imperium Sanctus via Nachmund",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "PROBABLE",
    timestampState: "VERIFIED",
  },
  "Eyes of Terra: restricted advisory": {
    originLabel: "ADEPTUS CUSTODES // EYES OF TERRA",
    originRegion: "IMPERIUM SANCTUS",
    originBand: "Imperium Sanctus via Nachmund",
    routeClass: "sanctioned-choir-chain",
    transmissionMethod: "encrypted-astropathic",
    warpExposure: "ELEVATED",
    identityState: "VERIFIED",
    originState: "CONFIRMED",
    timestampState: "VERIFIED",
  },
} as const satisfies Record<string, AstropathicTransmissionMetadata>;

const legacyAstropathicMessageTemplates = ([
  { agency: "Adeptus Terra", subject: "Compliance return overdue", preview: "The strategic command archive respectfully requests the present disposition of the Argent Vigil and its restored systems.", body: "Chapter Master, the strategic command archive has not received the current compliance return entered under warrant 008.M42/DR-017. Adeptus Terra respectfully requests the disposition of the Lunar Dragons, the status of every system restored under the Nachmund Charge, and the location of the Gift of Luna. Any omission will be entered as a failure of record, not of service.", priority: "PRIMUS" },
  { agency: "Navis Imperialis", subject: "Convoy passage requested", preview: "Task Group Helios petitions for Astartes overwatch through the Moonward Passage during its next translation window.", body: "Task Group Helios will attempt translation through the Moonward Passage within the next sanctioned window. Three troop transports, two munition hulks and the hospital ship Mercy of Juno require Astartes overwatch. Naval command requests a Lunar Dragons escort from Draconis Gate to the Selene anchorage and confirmation of any hostile contacts along the route.", priority: "ACTION" },
  { agency: "Adeptus Mechanicus", subject: "Veil Anchor 7 telemetry", preview: "The station's machine-spirit reports a widening variance. Escort is requested for a Magos reclamation cohort.", body: "Veil Anchor 7 reports a widening variance in the Vesper Rift containment lattice. The station's machine-spirit has repeated the same warning cant for nineteen cycles and now refuses nonessential commands. A Magos reclamation cohort is prepared to translate, but requires Chapter escort and permission to draw upon the fleet's Gellar specialists.", priority: "URGENT" },
  { agency: "Astra Militarum", subject: "Vigil IX relief appeal", preview: "General Vannic requests confirmation of the Chapter's intended response to the western bastion's ammunition deficit.", body: "Vigil IX has expended seventy-three percent of its sanctioned macro-shell reserve. General Vannic reports the western curtain can withstand one further void assault before rationing begins. He requests confirmation of the Chapter's relief timetable, authority to divert the Orison levy fleet, and immediate augur intelligence on Pale Synod movements.", priority: "ACTION" },
  { agency: "Ordo Xenos", subject: "Kharon cipher inquiry", preview: "By inquisitorial seal: disclose all recovered fragments relating to the pre-founding Lunar Dragons distress transmission.", body: "By seal of the Ordo Xenos, disclose all fragments recovered from the Kharon distress transmission, including those judged irrelevant by Chapter savants. The cipher predates the recorded founding of the Lunar Dragons. No copy is to be made outside the receiving inquisitor's presence. Acknowledge this demand through the black channel only.", priority: "SEALED" },
  { agency: "Adeptus Ministorum", subject: "Pilgrim fleet benediction", preview: "The Cardinal of Orison requests the Chapter Master's presence at the departure rite of the Argent Procession.", body: "The Cardinal of Orison humbly petitions the Chapter Master's presence at the departure rite of the Argent Procession. Forty-seven pilgrim vessels will carry relics and refugees toward Selene Prime. Your appearance is requested as a sign that the road remains guarded and that the faithful have not been abandoned to the dark.", priority: "PETITION" },
  { agency: "Administratum", subject: "Founding rolls discrepancy", preview: "Three gene-seed tithe entries remain unverified against the Ultima Founding registry. Clarification is respectfully requested.", body: "A discrepancy has been identified between the Ultima Founding registry and three gene-seed tithe entries attributed to the Lunar Dragons. The seals are authentic but the vessel names do not correspond with surviving fleet rolls. The Administratum respectfully requests the Apothecarion's countersign, chain of custody and present disposition of the disputed vaults for correction of the sealed record.", priority: "NOTICE" },
  { agency: "Astropathica", subject: "Argent Psalm signal echo", preview: "A partial soul-binding signature matching the missing vessel was detected beyond the Vesper Rift.", body: "Choir Primus Selentha detected a partial soul-binding signature matching the missing astropathic vessel Argent Psalm. The echo originated beyond the Vesper Rift and repeated the words 'the moon remembers' before collapsing into static. Navigational certainty is poor. Immediate Chapter review is advised before a recovery vessel is committed.", priority: "URGENT" },
  { agency: "Officio Prefectus", subject: "Discipline review requested", preview: "A commissarial delegation seeks the Chapter Master's assessment of command failures among the Vigil IX relief regiments.", body: "A commissarial delegation requests the Chapter Master's assessment of command failures among the Vigil IX relief regiments. Conflicting testimony concerns the abandonment of Battery Saint Drusus during the last assault. Your judgment will inform whether the matter is recorded as tactical necessity, cowardice, or dereliction under fire.", priority: "NOTICE" },
  { agency: "Navis Nobilite", subject: "Navigator warning: Vesper Drift", preview: "House Caelorn's bonded Navigator reports an impossible lunar reflection within the active warp channel.", body: "The bonded Navigator of House Caelorn reports an impossible lunar reflection within the active channel of the Vesper Drift. The image persists with eyes closed and does not correspond to any charted body. Three junior Navigators have refused the passage. House Caelorn requests Chapter augur records and a sealed audience.", priority: "SEALED" },
  { agency: "Departmento Munitorum", subject: "Munitions allocation dispute", preview: "Two crusade battlegroups claim priority over the same macro-shell allotment. A command ruling is requested.", body: "Battlegroups Castor and Maccabeus both claim priority over the macro-shell allotment aboard the bulk carrier Unquestioned Duty. Their warrants are of equal grade and mutually incompatible. Munitorum command requests the Chapter Master's ruling based on the current strategic needs of the Argent Vigil.", priority: "ACTION" },
  { agency: "Ordo Hereticus", subject: "Restricted witness transfer", preview: "Under inquisitorial seal, a protected witness recovered from Selene Prime is submitted for conveyance under absolute silence.", body: "Chapter Master, under formal seal of the Ordo Hereticus, a protected witness recovered beneath Hive Enoch is to be transferred to the Lunar Dragons fleet under absolute silence. The subject bears knowledge of a cult network extending beyond Selene Prime. No local authority is to be informed. The Inquisition requires your designation of a secure rendezvous and a squad whose loyalty is beyond question.", priority: "PRIMUS" },
] as const).map((template) => ({
  ...template,
  transmission: transmissionMetadataBySubject[template.subject],
})) satisfies ReadonlyArray<Omit<AstropathicMessage, "id" | "received" | "receivedAt">>;

const expandedAstropathicMessageTemplates = ([
  { agency: "Navis Imperialis", subject: "Translation beacon silence", preview: "A sanctioned translation beacon has fallen silent; the Navy requests comparison against the Lunaris passive augur record.", body: "Chapter Master, a sanctioned beacon on the northern approaches has ceased all challenge-response cant. No distress flare was observed and the last authenticated burst reported nominal operation. Naval command respectfully requests comparison against the Lunaris passive augur record before a recovery cutter is committed to the dark.", priority: "NOTICE" },
  { agency: "Astra Militarum", subject: "Evacuation corridor petition", preview: "A field command petitions the Chapter to judge whether its refugee convoy may attempt the contested passage.", body: "Chapter Master, a field command has assembled six damaged transports and the surviving population of three forward bastions. The corridor ahead remains contested and the regiment cannot protect the convoy without abandoning its guns. We petition the Lunar Dragons to advise whether passage should be attempted, delayed, or placed beneath Astartes overwatch.", priority: "URGENT" },
  { agency: "Departmento Munitorum", subject: "Promethium reserve shortfall", preview: "Forward logistics reports that three dependent formations will exhaust motive-fuel before their next sanctioned allotment.", body: "The forward reserve has fallen below the quantity required to sustain three dependent formations through the next operational cycle. Munitorum command submits two remedies for the Chapter Master's judgment: divert the nearest fleet allotment, or suspend offensive movement until a replacement convoy is secured. Either decision will be entered against the Argent Vigil ledger.", priority: "ACTION" },
  { agency: "Administratum", subject: "Tithe remission petition", preview: "An isolated Imperial holding petitions for temporary remission after its population and harvest records became mutually impossible.", body: "An isolated holding has submitted population, harvest and casualty returns that cannot all be true at once. Its prefect petitions for temporary tithe remission while surviving registrars reconstruct the rolls. The Administratum respectfully requests the Chapter Master's testimony concerning the world's present service and whether its failure should be recorded as incapacity, dereliction or consequence of war.", priority: "PETITION" },
  { agency: "Adeptus Mechanicus", subject: "Noospheric quarantine advisory", preview: "A recovered cogitator stack is broadcasting an unauthorized devotional recursion across every compatible receiver.", body: "Recovered logic-stacks now repeat an unauthorized devotional recursion across every compatible noospheric receiver. The pattern is neither scrapcode nor any approved Martian cant. Quarantine is advised. The Mechanicus requests sealed transfer of the primary stack and permission to silence all secondary instances aboard vessels under Chapter protection.", priority: "SEALED" },
  { agency: "Adeptus Mechanicus", subject: "Reactor relic provenance dispute", preview: "Two forge delegations claim the same ancient reactor component under incompatible chains of custody.", body: "Two forge delegations assert lawful custody over an ancient plasma-regulator recovered from a void wreck. Both chains of provenance bear valid seals, yet their chronologies overlap by eleven centuries. Neither delegation accepts arbitration by the other. The Reclamation Conclave requests the Chapter Master's witness concerning the circumstances of recovery before a binding machine-judgment is rendered.", priority: "NOTICE" },
  { agency: "Adeptus Astra Telepathica", subject: "Choir casualty return", preview: "A relay choir submits its dead, blinded and exhausted after forcing one final message through the storm.", body: "Chapter Master, the relay choir submits its casualty return following the last forced communion: nine dead, seventeen blinded, and thirty-one judged unfit for further contact. The surviving astropaths can maintain emergency reception or attempt one outbound transmission, but not both. The Choir Mistress requests your disposition before the next watch begins.", priority: "ACTION" },
  { agency: "Astropathica", subject: "Null-silence interval", preview: "For seven minutes every soul-bound receiver heard nothing—not static, distance, or the familiar pressure of the warp.", body: "For seven minutes and thirteen seconds every soul-bound receiver within the choir experienced absolute null-silence. No static, distance-pressure or hostile presence was perceived. The silence ended simultaneously when an unidentified voice spoke the words 'not yet found'. The origin, speaker and direction remain unrecovered. The choir advises observation without reply.", priority: "URGENT" },
  { agency: "Navis Nobilite", subject: "Chart discrepancy under seal", preview: "Three bonded Navigators independently remember a passage that does not exist in any sanctioned chart.", body: "Three bonded Navigators independently describe the same passage through the storm, including identical turns and stellar impressions, yet no sanctioned chart records such a route. None recalls learning it. The Navis Nobilite submits the discrepancy under seal and requests comparison against the Lunaris translation logs before the memory is tested in the warp.", priority: "SEALED" },
  { agency: "Ordo Malleus", subject: "Gellar breach testimony demanded", preview: "An inquisitorial seal requires the unabridged testimony of survivors from a vessel whose Gellar field failed and returned.", body: "By formal demand of the Ordo Malleus, preserve and surrender the unabridged testimony of all survivors recovered from the vessel whose Gellar field failed in translation. No confession, dream account, medical sample or devotional object is to be destroyed before examination. The Chapter will designate the place of transfer and ensure that no unexamined survivor departs it.", priority: "SEALED" },
  { agency: "Ordo Xenos", subject: "Uncatalogued biosignature seizure", preview: "A field conclave orders the isolation of an organism recovered alive from an apparently lifeless wreck.", body: "By seal of the Ordo Xenos, isolate the uncatalogued organism recovered from the derelict and preserve every sensor record preceding its discovery. The specimen imitated a human vital pattern only after entering custody. No vivisection, gene comparison or psychic contact is authorised without the receiving inquisitor present. Confirm containment through the black channel.", priority: "SEALED" },
  { agency: "Adepta Sororitas", subject: "Convent distress petition", preview: "A distant convent reports that its outer walls hold, but its water, ammunition and choir are failing.", body: "Chapter Master, the Sisters of a distant convent report that their outer walls remain unbroken while water, ammunition and choir strength approach exhaustion. They do not request rescue from their vows. They petition only that the Chapter judge whether their position still serves the wider war, or whether the surviving faithful should be withdrawn before the final gate is closed.", priority: "URGENT" },
  { agency: "Adeptus Arbites", subject: "Extradition writ submitted", preview: "The Judges' Circuit submits a sealed writ for a voidmaster sheltering beneath a disputed naval commission.", body: "The Judges' Circuit submits an extradition writ for a voidmaster accused of murdering an Imperial tithe assessor and seizing the victim's seal. The accused now shelters aboard a vessel claiming naval protection. The Arbites request the Chapter Master's recognition of the writ and safe conduct for the arrest cadre. Jurisdictional annexes follow under seal.", priority: "PRIMUS" },
  { agency: "Officio Prefectus", subject: "Regimental honour dispute", preview: "Two surviving regiments claim the same battle honour and accuse the other of abandoning the field.", body: "Two surviving regiments claim sole right to the honour of the Broken Gate. Each accuses the other of withdrawing before the breach was secured, and both cite fallen officers who cannot testify. The Officio Prefectus requests the Chapter Master's assessment of the action so the honour may be granted, shared, or struck from both standards.", priority: "NOTICE" },
  { agency: "Navis Imperialis", subject: "Derelict salvage adjudication", preview: "Three Imperial claimants dispute custody of a weapons-bearing derelict recovered inside the Vigil's operational reach.", body: "A weapons-bearing derelict has been secured by three Imperial parties whose salvage warrants overlap. The Navy claims its guns, the Mechanicus its machine-spirit, and a chartered captain the hull by right of first grapple. Naval command requests the Chapter Master's provisional adjudication before the dispute becomes armed. No claimant is to board the command decks meanwhile.", priority: "ACTION" },
  { agency: "Departmento Munitorum", subject: "Medical stores diversion request", preview: "A medicae allotment bound for the front may be diverted to a plague-stricken refugee flotilla by Chapter order.", body: "A medicae allotment sufficient for one campaign month is presently held aboard a delayed transport. Forward hospitals possess nine days of reserve. A nearby refugee flotilla reports a spreading fever and requests the same stores. Munitorum command submits the diversion to the Chapter Master's judgment and requires the order under seal before any cargo is moved.", priority: "ACTION" },
  { agency: "Adeptus Ministorum", subject: "Sanctified remains passage", preview: "A mortuary procession petitions safe passage for the recovered dead of an isolated Imperial world.", body: "The Ministorum petitions safe passage for a mortuary procession carrying the identified remains of soldiers, confessors and voidsmen recovered after long isolation. The dead are not relics and no claim of sainthood is advanced. Their names have been restored to the record; the priests ask only that they be returned to consecrated ground beneath Imperial guard.", priority: "PETITION" },
  { agency: "Rogue Trader Dynasty", subject: "Warranted passage exchange", preview: "A warranted captain offers recent charts and fuel in exchange for escort through a route the dynasty refuses to name openly.", body: "Chapter Master, a warranted captain offers recent translation charts, refined promethium and the disposition of two hostile raider groups in exchange for limited escort through a passage withheld from this transmission. The dynasty will submit its warrant, cargo and route under seal before agreement. It requests only that the Chapter state whether such negotiation will be heard.", priority: "PETITION" },
] as const).map((template) => ({
  ...template,
  transmission: transmissionMetadataBySubject[template.subject],
})) satisfies ReadonlyArray<Omit<AstropathicMessage, "id" | "received" | "receivedAt">>;

const astropathicMessageTemplates = [
  ...legacyAstropathicMessageTemplates,
  ...expandedAstropathicMessageTemplates,
] satisfies ReadonlyArray<Omit<AstropathicMessage, "id" | "received" | "receivedAt">>;

const notableAstropathicMessageTemplates = ([
  { agency: "Roboute Guilliman · Lord Commander", subject: "To those who hold the sundered road", preview: "A general crusade address carries a brief, authenticated acknowledgement of the Argent Vigil.", body: "Lunar Dragons, your vigil lies far from the triumphal routes and the eyes of Terra, but it is not unseen. The passage between the divided Imperium is preserved as often by endurance as by conquest. Hold what you have reclaimed. Record what has been lost. Spend lives only where their sacrifice purchases a future for those who remain. Your duty is not yet concluded. — Roboute Guilliman, Lord Commander of the Imperium", priority: "PRIMUS" },
  { agency: "Lion El’Jonson · Primarch of the First", subject: "Counsel from the returned Lion", preview: "A tightly ciphered strategic advisory warns against mistaking silence beyond the Rift for peace.", body: "To the master of the Lunar Dragons: do not mistake an enemy's silence for ignorance, nor a quiet frontier for an empty one. Beyond the Great Rift, strength is measured by what can still answer when called. Keep your companies close enough to become a fist, and your watchers distant enough to see the blade before it falls. No reply is required. — Lion El’Jonson, Primarch of the First Legion", priority: "SEALED" },
  { agency: "Lord Regent Dante · Imperium Nihilus", subject: "Nihilus strategic notice", preview: "The Lord Regent requests current passage conditions and offers reciprocal fleet intelligence.", body: "Chapter Master, every stable road through Imperium Nihilus is now a fortress without walls. Forward the latest condition of the Nachmund approaches and any confirmed hostile translation patterns. In return, my strategium will release the Blood Angels' current corsair and xenos contact reports for your operational reach. We cannot defend every world, but we can ensure no world stands unwarned. — Commander Dante, Lord Regent of Imperium Nihilus", priority: "ACTION" },
  { agency: "Belisarius Cawl · Archmagos Dominus", subject: "A most reasonable request for impossible data", preview: "The Archmagos requests anomalous readings from the Vesper Rift and insists the request is entirely routine.", body: "Esteemed inheritors of my perfectly serviceable handiwork: your reports concerning the Vesper Rift contain three readings that are impossible, two that are merely improbable, and one that has caused an attached sub-mind to petition for memory excision. Transmit the unabridged telemetry before anyone attempts to sanctify, simplify, or shoot it. This is a routine request. The number of sealed Mechanicus annexes attached should not be interpreted otherwise. — Archmagos Dominus Belisarius Cawl", priority: "SEALED" },
  { agency: "Morvenn Vahl · Abbess Sanctorum", subject: "Concerning the Argent Procession", preview: "The Abbess Sanctorum commends the protected pilgrim route and warns that faith must not outrun supply.", body: "The protection granted to the Argent Procession has been entered with honour. Yet devotion does not fill a transport's holds or seal a failing Gellar field. Ensure those who travel beneath the Aquila are guarded by discipline as well as prayer. Should the road fail, preserve the faithful before the relics; the Emperor's servants are not lesser vessels than the bones they carry. — Morvenn Vahl, Abbess Sanctorum of the Adepta Sororitas", priority: "PRIMUS" },
  { agency: "Trajann Valoris · Captain-General", subject: "Eyes of Terra: restricted advisory", preview: "A rare Custodian cipher confirms that the Chapter’s restored corridor remains under distant observation.", body: "By authority of the Captain-General: the strategic value of the corridor held under the Nachmund Charge is recognised. Continue your vigil without expectation of reinforcement or acclaim. Report any evidence that the enemies gathering beyond the Rift possess knowledge of the Gift of Luna. This advisory is to be committed to the Chapter Master's sealed archive and nowhere else. — Trajann Valoris, Captain-General of the Adeptus Custodes", priority: "SEALED" },
] as const).map((template) => ({
  ...template,
  transmission: transmissionMetadataBySubject[template.subject],
})) satisfies ReadonlyArray<Omit<AstropathicMessage, "id" | "received" | "receivedAt">>;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayFromKey(key: string) {
  const parsed = new Date(`${key}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Phase 4 events begin with transmissions scheduled on or after this instant.
 * Keeping the epoch after the release-115 baseline prevents persisted history
 * from acquiring anomalies retroactively when a newer release reads it.
 */
export const PHASE_4_EVENT_ACTIVATION_EPOCH = "2026-08-05T00:00:00.000Z";
export const PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH = "2026-08-06T00:00:00.000Z";
export const ASTROPATHIC_LIBRARY_EXPANSION_EPOCH = "2026-08-09T00:00:00.000Z";

const PHASE_4_EVENT_ACTIVATION_TIME = Date.parse(PHASE_4_EVENT_ACTIVATION_EPOCH);
const PHASE_4_DERIVED_EVENT_ACTIVATION_TIME = Date.parse(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
const ASTROPATHIC_LIBRARY_EXPANSION_TIME = Date.parse(ASTROPATHIC_LIBRARY_EXPANSION_EPOCH);
const PHASE_4_EVENT_SEED_VERSION = "relay-event:v1";
const PHASE_4_DERIVED_EVENT_SEED_VERSION = "relay-event:v2";

function astropathicEventHash(messageId: string, salt: string) {
  return hashText(`${PHASE_4_EVENT_SEED_VERSION}|${messageId}|${salt}`);
}

/** Stable Phase 4 derived-event seed. Do not change this serialized form. */
export function astropathicDerivedEventHash(rootMessageId: string, eventSalt: string) {
  return hashText(`${PHASE_4_DERIVED_EVENT_SEED_VERSION}|${rootMessageId}|${eventSalt}`);
}

function eventTimestamp(messageId: string, salt: string, baseTime: number, minimumMinutes: number, maximumMinutes: number) {
  const span = Math.max(0, maximumMinutes - minimumMinutes);
  const minutes = minimumMinutes + (astropathicEventHash(messageId, salt) % (span + 1));
  return new Date(baseTime + (minutes * RELAY_MINUTE_MS)).toISOString();
}

function planPrimaryAstropathicEvent(message: AstropathicMessage): AstropathicMessage {
  const nominalTime = Date.parse(message.receivedAt);
  if (!Number.isFinite(nominalTime) || nominalTime < PHASE_4_EVENT_ACTIVATION_TIME) return message;

  // One deterministic roll assigns at most one primary event. Thresholds are
  // intentionally sparse: future .05%, contradictory .2%, failure 1%, delay 5%.
  const roll = astropathicEventHash(message.id, "primary-anomaly") % 100_000;
  let kind: AstropathicEventKind | null = null;
  if (roll < 50) kind = "future-dated";
  else if (roll < 250) kind = "contradictory-timestamp";
  else if (roll < 1_250) kind = "failed-relay-node";
  else if (roll < 6_250) kind = "delayed-arrival";
  if (!kind) return message;

  const event: AstropathicEventMetadata = {
    version: 1,
    kinds: [kind],
    rootTransmissionId: message.id,
    nominalReceivedAt: message.receivedAt,
  };

  if (kind === "future-dated") {
    event.claimedAt = eventTimestamp(message.id, "future-claim", nominalTime, 24 * 60, 30 * 24 * 60);
  } else if (kind === "contradictory-timestamp") {
    event.claimedAt = eventTimestamp(message.id, "contradictory-early", nominalTime, -(30 * 24 * 60), -60);
    event.conflictingClaimedAt = eventTimestamp(message.id, "contradictory-late", nominalTime, 60, 30 * 24 * 60);
  } else if (kind === "delayed-arrival") {
    const endOfDay = Date.UTC(
      new Date(nominalTime).getUTCFullYear(),
      new Date(nominalTime).getUTCMonth(),
      new Date(nominalTime).getUTCDate(),
      23,
      59,
    );
    const availableMinutes = Math.floor((endOfDay - nominalTime) / RELAY_MINUTE_MS);
    if (availableMinutes <= 0) return message;
    const minimumDelay = Math.min(30, availableMinutes);
    const maximumDelay = Math.min(360, availableMinutes);
    return {
      ...message,
      receivedAt: eventTimestamp(message.id, "same-day-delay", nominalTime, minimumDelay, maximumDelay),
      event,
    };
  }

  return { ...message, event };
}

/** Pure Phase 4B planner. It never creates records and never crosses a day. */
export function planAstropathicTransmissionEvents(
  messages: readonly AstropathicMessage[],
): AstropathicMessage[] {
  const planned = messages.map(planPrimaryAstropathicEvent);
  const nominalTimes = new Map(planned.map((message) => [
    message.id,
    Date.parse(message.event?.nominalReceivedAt ?? message.receivedAt),
  ]));
  const actualTimes = new Map(planned.map((message) => [message.id, Date.parse(message.receivedAt)]));

  const sequenced = planned.map((message) => {
    if (!message.event?.kinds.includes("delayed-arrival")) return message;
    const nominalTime = nominalTimes.get(message.id) ?? Number.NaN;
    const actualTime = actualTimes.get(message.id) ?? Number.NaN;
    const overtaken = planned.some((candidate) => {
      if (candidate.id === message.id) return false;
      const candidateNominal = nominalTimes.get(candidate.id) ?? Number.NaN;
      const candidateActual = actualTimes.get(candidate.id) ?? Number.NaN;
      return candidateNominal > nominalTime && candidateActual < actualTime;
    });
    if (!overtaken) return message;
    return {
      ...message,
      event: {
        ...message.event,
        kinds: [...message.event.kinds, "out-of-order-arrival"] as AstropathicEventKind[],
      },
    };
  });

  return sequenced.sort((left, right) => {
    const timeDifference = Date.parse(left.receivedAt) - Date.parse(right.receivedAt);
    return timeDifference || left.id.localeCompare(right.id);
  });
}

type DerivedEventPriority = "delayed-base" | "recovered-fragment" | "duplicate-echo";

type DerivedEventCandidate = {
  message: AstropathicMessage;
  fallbackRoot?: AstropathicMessage;
  rootTransmissionId: string;
  earliestAt: number;
  deadlineAt: number;
  priority: DerivedEventPriority;
};

type NominalRelayPlan = {
  key: string;
  quiet: boolean;
  burstCount: number;
  roots: AstropathicMessage[];
  candidates: DerivedEventCandidate[];
};

function derivedEventTimestamp(
  rootTransmissionId: string,
  salt: string,
  baseTime: number,
  minimumMinutes: number,
  maximumMinutes: number,
) {
  const span = Math.max(0, maximumMinutes - minimumMinutes);
  const minutes = minimumMinutes + (astropathicDerivedEventHash(rootTransmissionId, salt) % (span + 1));
  return baseTime + (minutes * RELAY_MINUTE_MS);
}

function fragmentPreview(fragment: string) {
  return fragment.length <= 260 ? fragment : `${fragment.slice(0, 257).trimEnd()}...`;
}

function recoveredFragmentMessage(
  root: AstropathicMessage,
  fragmentBody: string,
  index: number,
  receivedAt: number,
): AstropathicMessage {
  return {
    ...root,
    id: `${root.id}~fragment~${String(index).padStart(2, "0")}`,
    preview: fragmentPreview(fragmentBody),
    body: fragmentBody,
    received: imperialRelayDate(new Date(receivedAt)),
    receivedAt: new Date(receivedAt).toISOString(),
    event: {
      version: 1,
      kinds: ["recovered-fragment"],
      rootTransmissionId: root.id,
      parentTransmissionId: root.id,
      ordinal: index,
      nominalReceivedAt: root.receivedAt,
      fragment: { index, total: 3, algorithmVersion: 1 },
    },
  };
}

function planDerivedEventsForRoot(root: AstropathicMessage) {
  const nominalTime = Date.parse(root.receivedAt);
  const roots: AstropathicMessage[] = [root];
  const candidates: DerivedEventCandidate[] = [];
  if (
    root.event ||
    root.id.endsWith("-notable") ||
    !Number.isFinite(nominalTime) ||
    nominalTime < PHASE_4_DERIVED_EVENT_ACTIVATION_TIME
  ) return { roots, candidates };

  // A single roll gives a root at most one new primary anomaly. Existing v1
  // event probabilities are evaluated first and remain completely unchanged.
  const roll = astropathicDerivedEventHash(root.id, "primary-anomaly") % 100_000;
  if (roll < 1_000) {
    const fragments = transmissionBodyFragments(root.body, root.id, 3);
    if (fragments.length !== 3 || fragments.some((fragment) => !fragment)) return { roots, candidates };

    const partialRoot: AstropathicMessage = {
      ...root,
      preview: fragmentPreview(fragments[0]),
      event: {
        version: 1,
        kinds: ["partial-transmission"],
        rootTransmissionId: root.id,
        nominalReceivedAt: root.receivedAt,
        fragment: { index: 1, total: 3, algorithmVersion: 1 },
      },
    };
    roots[0] = partialRoot;

    const secondAt = derivedEventTimestamp(root.id, "fragment-02-arrival", nominalTime, 4 * 60, 18 * 60);
    const thirdAt = derivedEventTimestamp(root.id, "fragment-03-arrival", nominalTime, 20 * 60, 54 * 60);
    candidates.push(
      {
        message: recoveredFragmentMessage(root, fragments[1], 2, secondAt),
        fallbackRoot: root,
        rootTransmissionId: root.id,
        earliestAt: secondAt,
        deadlineAt: nominalTime + (72 * 60 * RELAY_MINUTE_MS),
        priority: "recovered-fragment",
      },
      {
        message: recoveredFragmentMessage(root, fragments[2], 3, thirdAt),
        fallbackRoot: root,
        rootTransmissionId: root.id,
        earliestAt: Math.max(thirdAt, secondAt + RELAY_MINUTE_MS),
        deadlineAt: nominalTime + (72 * 60 * RELAY_MINUTE_MS),
        priority: "recovered-fragment",
      },
    );
  } else if (roll < 1_200) {
    const echoAt = derivedEventTimestamp(root.id, "echo-01-arrival", nominalTime, 45, 6 * 60);
    candidates.push({
      message: {
        ...root,
        id: `${root.id}~echo~01`,
        received: imperialRelayDate(new Date(echoAt)),
        receivedAt: new Date(echoAt).toISOString(),
        event: {
          version: 1,
          kinds: ["duplicate-astropathic-echo"],
          rootTransmissionId: root.id,
          parentTransmissionId: root.id,
          ordinal: 1,
          nominalReceivedAt: root.receivedAt,
        },
      },
      rootTransmissionId: root.id,
      earliestAt: echoAt,
      deadlineAt: nominalTime + (72 * 60 * RELAY_MINUTE_MS),
      priority: "duplicate-echo",
    });
  } else if (roll < 1_700) {
    const nominalDate = new Date(nominalTime);
    const nextDay = Date.UTC(
      nominalDate.getUTCFullYear(),
      nominalDate.getUTCMonth(),
      nominalDate.getUTCDate() + 1,
    );
    const minimumMinutes = Math.max(1, Math.ceil((nextDay - nominalTime) / RELAY_MINUTE_MS) + 30);
    const crossDayAt = derivedEventTimestamp(root.id, "cross-day-arrival", nominalTime, minimumMinutes, 72 * 60);
    candidates.push({
      message: {
        ...root,
        received: imperialRelayDate(new Date(crossDayAt)),
        receivedAt: new Date(crossDayAt).toISOString(),
        event: {
          version: 1,
          kinds: ["delayed-arrival"],
          rootTransmissionId: root.id,
          nominalReceivedAt: root.receivedAt,
        },
      },
      fallbackRoot: root,
      rootTransmissionId: root.id,
      earliestAt: crossDayAt,
      deadlineAt: nominalTime + (72 * 60 * RELAY_MINUTE_MS),
      priority: "delayed-base",
    });
  }

  return { roots, candidates };
}

function relayDayStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function assignCandidateTime(
  candidate: DerivedEventCandidate,
  occupancy: Map<string, number>,
  capacityLimits: Map<string, number>,
) {
  const firstDay = relayDayStart(candidate.earliestAt);
  const lastDay = relayDayStart(candidate.deadlineAt);
  for (let day = firstDay; day <= lastDay; day += RELAY_DAY_MS) {
    const key = dateKey(new Date(day));
    if ((occupancy.get(key) ?? 0) >= (capacityLimits.get(key) ?? 6)) continue;
    const proposedTime = day === firstDay
      ? candidate.earliestAt
      : day + (seededInteger(
          `${PHASE_4_DERIVED_EVENT_SEED_VERSION}|${candidate.rootTransmissionId}|deferred-${candidate.priority}-${key}`,
          15,
          (24 * 60) - 15,
        ) * RELAY_MINUTE_MS);
    if (proposedTime > candidate.deadlineAt) continue;
    occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
    return proposedTime;
  }
  return null;
}

function applyAssignedTime(message: AstropathicMessage, assignedTime: number) {
  return {
    ...message,
    received: imperialRelayDate(new Date(assignedTime)),
    receivedAt: new Date(assignedTime).toISOString(),
  };
}

function lineageKey(message: AstropathicMessage) {
  const event = message.event;
  if (!event?.parentTransmissionId || event.ordinal === undefined) return null;
  const kind = event.kinds.includes("recovered-fragment")
    ? "recovered-fragment"
    : event.kinds.includes("duplicate-astropathic-echo")
      ? "duplicate-astropathic-echo"
      : null;
  return kind ? `${event.rootTransmissionId}|${kind}|${event.ordinal}` : null;
}

function legacyLoreEntryParts(entry: string) {
  const separators = [" â€” ", " — ", " - "];

  for (const separator of separators) {
    const separatorIndex = entry.indexOf(separator);

    if (separatorIndex > 0) {
      return {
        date: entry.slice(0, separatorIndex).trim(),
        content: entry.slice(separatorIndex + separator.length).trim(),
      };
    }
  }

  return {
    date: "",
    content: entry.trim(),
  };
}

function legacyLoreEntryTitle(content: string, index: number) {
  const firstClause = content.split(/[.;]/)[0]?.trim();

  if (!firstClause) {
    return `Chronicle Entry ${index + 1}`;
  }

  return firstClause.length <= 160
    ? firstClause
    : `${firstClause.slice(0, 157)}...`;
}

export function migrateLegacyEntriesToLoreEntries(
  entries: string[],
): LoreEntry[] {
  return entries.map((entry, index) => {
    const { date, content } = legacyLoreEntryParts(entry);

    return {
      id: `legacy-${hashText(entry).toString(16).padStart(8, "0")}-${index + 1}`,
      date,
      title: legacyLoreEntryTitle(content, index),
      category: "event",
      status: entry.startsWith("TEST.") ? "draft" : "canon",
      content,
      createdAt: 0,
      updatedAt: 0,
    };
  });
}

function loreIdentityKey(date: string, content: string) {
  return `${date.trim().toLowerCase()}\u0000${content.trim().toLowerCase()}`;
}

/**
 * Preserve structured IDs and statuses while incorporating Chronicle lines
 * written by the website's administrator. New website-authored lines are
 * established records and therefore enter as canon; existing GPT drafts keep
 * their status even though `entries` also mirrors them for v1 compatibility.
 */
export function reconcileChronicleEntries(
  entries: string[],
  loreEntries: LoreEntry[],
) {
  const byIdentity = new Map<string, LoreEntry[]>();
  for (const entry of loreEntries) {
    const key = loreIdentityKey(entry.date, entry.content);
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), entry]);
  }

  const usedIds = new Set<string>();
  const reconciled = entries.map((entry, index) => {
    const parts = legacyLoreEntryParts(entry);
    const key = loreIdentityKey(parts.date, parts.content);
    const existing = byIdentity.get(key)?.find(
      (candidate) => !usedIds.has(candidate.id),
    );
    if (existing) {
      usedIds.add(existing.id);
      return existing;
    }

    const created = migrateLegacyEntriesToLoreEntries([entry])[0];
    return {
      ...created,
      id: `legacy-${hashText(entry).toString(16).padStart(8, "0")}-${index + 1}`,
      status: "canon" as const,
    };
  });

  return [
    ...reconciled,
    ...loreEntries.filter((entry) => !usedIds.has(entry.id)),
  ];
}

/** Chronicle lines safe for the normal read-only archive experience. */
export function canonChronicleEntries(value: ChapterArchiveData) {
  return value.loreEntries
    .filter((entry) => entry.status === "canon")
    .map((entry) => {
      const date = entry.date.trim();
      const content = entry.content.trim();
      return date ? `${date} — ${content}` : content;
    });
}

function imperialRelayDate(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const end = Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  const fraction = Math.max(1, Math.min(999, Math.floor(((date.getTime() - start) / (end - start)) * 1000) + 1));
  return `0.${String(fraction).padStart(3, "0")}.056.M42`;
}

const RELAY_DAY_MS = 86_400_000;
const RELAY_MINUTE_MS = 60_000;
const NOTABLE_RELAY_EPOCH = Date.UTC(2020, 0, 1, 12);

export type AstropathicDailySchedule = {
  key: string;
  quiet: boolean;
  burstCount: number;
  messages: AstropathicMessage[];
};

function seededInteger(seed: string, minimum: number, maximum: number) {
  if (maximum <= minimum) return minimum;
  return minimum + (hashText(seed) % ((maximum - minimum) + 1));
}

function isNotableRelayDay(day: Date) {
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12);
  if (target < NOTABLE_RELAY_EPOCH) return false;

  let notableDay = NOTABLE_RELAY_EPOCH;
  while (notableDay < target) {
    const notableKey = dateKey(new Date(notableDay));
    notableDay += seededInteger(`${notableKey}:notable-interval`, 14, 28) * RELAY_DAY_MS;
  }
  return notableDay === target;
}

function nominalAstropathicPlanForDay(day: Date): NominalRelayPlan {
  const normalizedDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12));
  const key = dateKey(normalizedDay);
  const quiet = hashText(`${key}:quiet-period`) % 1000 < 125;
  const notable = isNotableRelayDay(normalizedDay);
  const baseCount = quiet
    ? (notable ? 1 : hashText(`${key}:quiet-count`) % 2)
    : 2 + (hashText(`${key}:normal-count`) % 3);
  const burst = !quiet && hashText(`${key}:traffic-burst`) % 100 < 10;
  const burstCount = burst ? 1 + (hashText(`${key}:burst-count`) % 2) : 0;
  const count = Math.min(6, baseCount + burstCount);
  const scheduledMinutes: number[] = [];

  if (count > 0 && quiet) {
    scheduledMinutes.push(seededInteger(`${key}:quiet-arrival`, 18 * 60, (24 * 60) - 1));
  } else if (count > 0) {
    const burstReserve = burstCount * 25;
    const lastBaseMinute = ((24 * 60) - 1) - burstReserve;
    scheduledMinutes.push(seededInteger(`${key}:first-arrival`, 30, 6 * 60));

    for (let index = 1; index < baseCount; index += 1) {
      const previous = scheduledMinutes[index - 1];
      const remainingBaseMessages = baseCount - index - 1;
      const maximumGap = Math.min(12 * 60, lastBaseMinute - previous - (remainingBaseMessages * 3 * 60));
      scheduledMinutes.push(previous + seededInteger(`${key}:normal-gap:${index}`, 3 * 60, maximumGap));
    }

    for (let index = 0; index < burstCount; index += 1) {
      const previous = scheduledMinutes[scheduledMinutes.length - 1];
      scheduledMinutes.push(previous + seededInteger(`${key}:burst-gap:${index}`, 5, 25));
    }
  }

  const templatePool = normalizedDay.getTime() < ASTROPATHIC_LIBRARY_EXPANSION_TIME
    ? legacyAstropathicMessageTemplates
    : astropathicMessageTemplates;
  const templateOrder = templatePool
    .map((_, index) => ({ index, rank: hashText(`${key}:template:${index}`) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ index }) => index);
  let normalTemplateIndex = 0;

  const baseMessages = scheduledMinutes.slice(0, count).map((minute, index): AstropathicMessage => {
    const isNotableTransmission = notable && index === 0;
    const template = isNotableTransmission
      ? notableAstropathicMessageTemplates[hashText(`${key}:notable-template`) % notableAstropathicMessageTemplates.length]
      : templatePool[templateOrder[normalTemplateIndex++ % templateOrder.length]];
    const scheduledAt = new Date(Date.UTC(
      normalizedDay.getUTCFullYear(),
      normalizedDay.getUTCMonth(),
      normalizedDay.getUTCDate(),
      0,
      minute,
    ));
    return {
      ...template,
      id: `relay-${key}-${isNotableTransmission ? "notable" : index + 1}`,
      received: imperialRelayDate(scheduledAt),
      receivedAt: scheduledAt.toISOString(),
    };
  });
  const v1Roots = planAstropathicTransmissionEvents(baseMessages);
  const roots: AstropathicMessage[] = [];
  const candidates: DerivedEventCandidate[] = [];
  for (const root of v1Roots) {
    const planned = planDerivedEventsForRoot(root);
    roots.push(...planned.roots);
    candidates.push(...planned.candidates);
  }

  return { key, quiet, burstCount, roots, candidates };
}

function markOutOfOrderDeliveries(messages: AstropathicMessage[]): AstropathicMessage[] {
  const roots = messages.filter((message) => !message.event?.parentTransmissionId);
  return messages.map((message) => {
    if (!message.event?.kinds.includes("delayed-arrival") || message.event.kinds.includes("out-of-order-arrival")) {
      return message;
    }
    const nominal = Date.parse(message.event.nominalReceivedAt);
    const actual = Date.parse(message.receivedAt);
    const overtaken = roots.some((candidate) => {
      if (candidate.id === message.id) return false;
      const candidateNominal = Date.parse(candidate.event?.nominalReceivedAt ?? candidate.receivedAt);
      const candidateActual = Date.parse(candidate.receivedAt);
      return candidateNominal > nominal && candidateActual < actual;
    });
    if (!overtaken) return message;
    return {
      ...message,
      event: {
        ...message.event,
        kinds: [...message.event.kinds, "out-of-order-arrival"] as AstropathicEventKind[],
      },
    };
  });
}

/**
 * Resolves the bounded seven-day Phase 4 window around one delivery day. The
 * normal cadence always occupies capacity first; delayed roots, fragments,
 * and echoes are then admitted in that order and deterministically deferred.
 */
export function astropathicScheduleForDay(day: Date): AstropathicDailySchedule {
  const target = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12));
  const targetKey = dateKey(target);
  const plans = Array.from({ length: 7 }, (_, index) => (
    nominalAstropathicPlanForDay(new Date(target.getTime() + ((index - 3) * RELAY_DAY_MS)))
  ));
  const targetPlan = plans[3];
  const rootsById = new Map<string, AstropathicMessage>();
  const occupancy = new Map<string, number>();
  const capacityLimits = new Map(plans.map((plan) => [plan.key, plan.quiet ? 1 : 6]));

  for (const plan of plans) {
    for (const root of plan.roots) {
      rootsById.set(root.id, root);
      const key = dateKey(new Date(Date.parse(root.event?.nominalReceivedAt ?? root.receivedAt)));
      occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
    }
  }

  // Future roots reserve capacity, but future anomalies cannot affect an
  // earlier day's published schedule before their nominal transmission exists.
  const candidates = plans.slice(0, 4).flatMap((plan) => plan.candidates);
  const delayedCandidates = candidates
    .filter((candidate) => candidate.priority === "delayed-base")
    .sort((left, right) => left.earliestAt - right.earliestAt || left.rootTransmissionId.localeCompare(right.rootTransmissionId));
  const fragmentGroups = new Map<string, DerivedEventCandidate[]>();
  const echoCandidates: DerivedEventCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.priority === "recovered-fragment") {
      fragmentGroups.set(candidate.rootTransmissionId, [
        ...(fragmentGroups.get(candidate.rootTransmissionId) ?? []),
        candidate,
      ]);
    } else if (candidate.priority === "duplicate-echo") {
      echoCandidates.push(candidate);
    }
  }
  const derivedMessages: AstropathicMessage[] = [];

  for (const candidate of delayedCandidates) {
    const fallback = candidate.fallbackRoot!;
    const nominalKey = dateKey(new Date(Date.parse(fallback.receivedAt)));
    occupancy.set(nominalKey, Math.max(0, (occupancy.get(nominalKey) ?? 1) - 1));
    const assigned = assignCandidateTime(candidate, occupancy, capacityLimits);
    if (assigned === null) {
      occupancy.set(nominalKey, (occupancy.get(nominalKey) ?? 0) + 1);
      rootsById.set(fallback.id, fallback);
    } else {
      rootsById.set(fallback.id, applyAssignedTime(candidate.message, assigned));
    }
  }

  const orderedFragmentGroups = [...fragmentGroups.entries()].sort(([left], [right]) => left.localeCompare(right));
  for (const [rootTransmissionId, group] of orderedFragmentGroups) {
    const snapshot = new Map(occupancy);
    const assignedFragments: AstropathicMessage[] = [];
    let previousAssigned = Number.NEGATIVE_INFINITY;
    for (const candidate of group.sort((left, right) => (
      (left.message.event?.ordinal ?? 0) - (right.message.event?.ordinal ?? 0)
    ))) {
      const constrained = { ...candidate, earliestAt: Math.max(candidate.earliestAt, previousAssigned + RELAY_MINUTE_MS) };
      const assigned = assignCandidateTime(constrained, occupancy, capacityLimits);
      if (assigned === null) {
        assignedFragments.length = 0;
        break;
      }
      previousAssigned = assigned;
      assignedFragments.push(applyAssignedTime(candidate.message, assigned));
    }
    if (assignedFragments.length !== group.length) {
      occupancy.clear();
      for (const [key, value] of snapshot) occupancy.set(key, value);
      const fallback = group[0]?.fallbackRoot;
      if (fallback) rootsById.set(rootTransmissionId, fallback);
    } else {
      derivedMessages.push(...assignedFragments);
    }
  }

  for (const candidate of echoCandidates.sort((left, right) => (
    left.earliestAt - right.earliestAt || left.rootTransmissionId.localeCompare(right.rootTransmissionId)
  ))) {
    const assigned = assignCandidateTime(candidate, occupancy, capacityLimits);
    if (assigned !== null) derivedMessages.push(applyAssignedTime(candidate.message, assigned));
  }

  const allMessages = markOutOfOrderDeliveries([...rootsById.values(), ...derivedMessages]);
  const messages = allMessages
    .filter((message) => dateKey(new Date(Date.parse(message.receivedAt))) === targetKey)
    .sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt) || left.id.localeCompare(right.id));

  return {
    key: targetKey,
    quiet: targetPlan.quiet,
    burstCount: targetPlan.burstCount,
    messages,
  };
}

export function applyDailyAstropathicMessages(value: ChapterArchiveData, now = new Date()) {
  const archive = JSON.parse(JSON.stringify(value)) as ChapterArchiveData;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  const todayKey = dateKey(today);

  const lastGenerated = dayFromKey(archive.relayLastGeneratedDate);
  const replayStart = now.getTime() >= PHASE_4_DERIVED_EVENT_ACTIVATION_TIME
    ? new Date(today.getTime() - (3 * RELAY_DAY_MS))
    : today;
  const cursorStart = lastGenerated && dateKey(lastGenerated) !== todayKey
    ? new Date(Math.max(lastGenerated.getTime() + RELAY_DAY_MS, today.getTime() - (29 * RELAY_DAY_MS)))
    : today;
  const firstDay = cursorStart < replayStart ? cursorStart : replayStart;
  const knownIds = new Set(archive.relayMessages.map((message) => message.id));
  const knownLineages = new Set(archive.relayMessages.map(lineageKey).filter((key): key is string => Boolean(key)));
  const generated: AstropathicMessage[] = [];

  for (let day = firstDay; day <= today; day = new Date(day.getTime() + RELAY_DAY_MS)) {
    for (const message of astropathicScheduleForDay(day).messages) {
      const scheduledTime = new Date(message.receivedAt).getTime();
      const candidateLineage = lineageKey(message);
      if (
        scheduledTime <= now.getTime() &&
        !knownIds.has(message.id) &&
        (!candidateLineage || !knownLineages.has(candidateLineage))
      ) {
        generated.push(message);
        knownIds.add(message.id);
        if (candidateLineage) knownLineages.add(candidateLineage);
      }
    }
  }

  const dateChanged = archive.relayLastGeneratedDate !== todayKey;
  if (generated.length === 0 && !dateChanged) return { archive, changed: false };

  archive.relayMessages = [...generated.reverse(), ...archive.relayMessages].slice(0, 120);
  archive.relayLastGeneratedDate = todayKey;
  return { archive, changed: true };
}

const legacyCompanyNames = new Set([
  "The Pyre Guard",
  "The Iron Vigil",
  "The Unbroken",
  "The Ash Walkers",
  "The Pale Hunt",
  "The Ember Reserve",
  "The Watchful",
  "The Breach",
  "The Long Sight",
  "The Kindling",
]);

const legacySectorSystemNames = new Set([
  "Lunaris",
  "Selene Prime",
  "Kharon",
  "Vigil IX",
  "Orison",
  "The Vesper Rift",
]);

const legacySectorFactionNames = new Set([
  "Astra Militarum · Argent Vigil Commands",
  "Navis Imperialis · Nachmund Detachments",
  "Adeptus Mechanicus · Attached Cohorts",
  "House Caelorn",
  "Ordo Xenos · Selene Conclave",
  "The Pale Synod",
  "Splinter Fleet Nyx",
]);

const legacySectorWarpLaneNames = new Set([
  "The Moonward Passage",
  "Vigil Run",
  "Pilgrim’s Thread",
  "Kharon Approach",
  "Vesper Drift",
]);

const legacySectorDirectiveText = new Set([
  "Reinforce Vigil IX before the next void-tide.",
  "Recover the missing astropathic vessel Argent Psalm.",
  "Determine why Kharon has begun transmitting a lunar distress cipher.",
]);

const decreeChronicleEntries = [
  "008.M42 — In the eighth year of the Indomitus Crusade, Roboute Guilliman seals the Decree of Reclamation and Vigilance, recognising the Lunar Dragons’ sacrifice and distinguished service.",
  "008.M42 — The Chapter is commissioned to prosecute the Nachmund Reclamation, operationally designated the Argent Vigil.",
  "008.M42 — The Right of Permanent Bastion is granted; the Lunar Dragons remain fleet-based until a worthy sentinel world is lawfully confirmed.",
  "008.M42 — The Gift of Luna enters Chapter keeping, to be set into the foundations of their future fortress-monastery.",
  "056.M42 — The Chapter flagship is entered into the rolls as Lunaris, Bearer of the First Stone and the Argent Spear.",
];

const decreeChronicleMarkers = [
  "Decree of Reclamation and Vigilance",
  "Nachmund Reclamation",
  "Right of Permanent Bastion",
  "The Gift of Luna enters Chapter keeping",
  "Chapter flagship is entered into the rolls as Lunaris",
];

const decreeVoxTransmissions = [
  "Strength exists for duty. Honour without service is vanity, and victory without purpose is merely slaughter.",
  "Reclaim what has been lost. Guard the passage.",
  "Where the light of the Imperium has failed, carry it with you.",
  "You do not serve the Lunar Dragons. You serve the Imperium beside them.",
  "Where the enemies of Mankind would close the road between the divided Imperium, the Lunar Dragons shall stand.",
];

export function applyAuthoritativeLore(value: ChapterArchiveData): ChapterArchiveData {
  const archive = JSON.parse(JSON.stringify(value)) as ChapterArchiveData;
  const defaults = createDefaultArchiveData();
  const existingRelics = archive.relics.filter(
    (relic) => relic.name !== "Relic name unrecorded" && relic.name !== "Ancient chassis unrecorded" && relic.name !== "The Gift of Luna" && relic.name !== "Flagship name unrecorded" && relic.name !== "Lunaris",
  );
  const existingEntries = archive.entries.filter(
    (entry) => !decreeChronicleMarkers.some((marker) => entry.includes(marker)),
  );
  const existingQuotes = archive.voxQuotes.filter((quote) => !decreeVoxTransmissions.includes(quote));
  const officialFactionNames = new Set(defaults.sectorIntel.factions.slice(0, 3).map((faction) => faction.name));
  const existingFactions = archive.sectorIntel.factions.filter((faction) => !officialFactionNames.has(faction.name));
  const officialDirectives = defaults.sectorIntel.directives.slice(0, 5);
  const existingDirectives = archive.sectorIntel.directives.filter((directive) => !officialDirectives.includes(directive));

  archive.identity = {
    ...archive.identity,
    founding: defaults.identity.founding,
    lineage: defaults.identity.lineage,
    domain: defaults.identity.domain,
    fortress: defaults.identity.fortress,
    foundingPrompt: defaults.identity.foundingPrompt,
  };
  archive.milestones = archive.milestones.map((milestone) =>
    milestone.label === "Write a defining campaign" ? { ...milestone, done: true } : milestone,
  );
  archive.relics = [defaults.relics[0], defaults.relics[1], ...existingRelics];
  archive.entries = [...decreeChronicleEntries, ...existingEntries];
  archive.loreEntries = reconcileChronicleEntries(
    archive.entries,
    archive.loreEntries,
  );
  archive.voxQuotes = [...decreeVoxTransmissions, ...existingQuotes];
  archive.sectorIntel = {
    ...archive.sectorIntel,
    sectorName: defaults.sectorIntel.sectorName,
    subsectorName: defaults.sectorIntel.subsectorName,
    currentTheater: defaults.sectorIntel.currentTheater,
    deploymentStatus: defaults.sectorIntel.deploymentStatus,
    astropathicDate: defaults.sectorIntel.astropathicDate,
    summary: defaults.sectorIntel.summary,
    factions: [...defaults.sectorIntel.factions.slice(0, 3), ...existingFactions],
    directives: [...officialDirectives, ...existingDirectives],
    worlds: archive.sectorIntel.worlds,
    survey: defaults.sectorIntel.survey,
  };
  return archive;
}

export function createDefaultArchiveData(): ChapterArchiveData {
  const archive = JSON.parse(
    JSON.stringify(defaultArchive),
  ) as ChapterArchiveData;

  if (!archive.loreEntries.length) {
    archive.loreEntries = migrateLegacyEntriesToLoreEntries(
      archive.entries,
    );
  }

  return archive;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string, max = 4000) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

const transmissionOriginBands = [
  "internal Lunaris",
  "same system",
  "nearby Argent Vigil",
  "northern Nachmund theatre",
  "distant Imperium Nihilus",
  "Imperium Sanctus via Nachmund",
  "unstable Rift crossing",
  "anomalous source",
] as const satisfies readonly TransmissionOriginBand[];

const transmissionRouteClasses = [
  "direct-noospheric",
  "local-system-relay",
  "argent-vigil-relay",
  "nachmund-corridor",
  "sanctioned-choir-chain",
  "contested-relay",
  "rift-crossing",
  "astropathic-echo",
  "unresolved",
] as const satisfies readonly TransmissionRouteClass[];

const transmissionMethods = [
  "noospheric",
  "vox",
  "astropathic",
  "encrypted-astropathic",
  "navigational-choir",
  "mechanicus-burst",
  "warp-echo",
  "unknown",
] as const satisfies readonly TransmissionMethod[];

const transmissionOriginRegions = [
  "IMPERIUM NIHILUS",
  "IMPERIUM SANCTUS",
  "GREAT RIFT",
  "UNRESOLVED",
] as const satisfies readonly TransmissionOriginRegion[];

const transmissionConfidenceStates = [
  "VERIFIED",
  "CONFIRMED",
  "PROBABLE",
  "PARTIAL",
  "INCONCLUSIVE",
  "CONTRADICTORY",
  "UNRECOVERED",
] as const satisfies readonly TransmissionConfidenceState[];

const transmissionWarpExposures = [
  "NEGLIGIBLE",
  "MINOR",
  "MODERATE",
  "ELEVATED",
  "SEVERE",
  "EXTREMIS",
] as const satisfies readonly TransmissionWarpExposure[];

const astropathicEventKinds = [
  "delayed-arrival",
  "out-of-order-arrival",
  "partial-transmission",
  "recovered-fragment",
  "failed-relay-node",
  "duplicate-astropathic-echo",
  "contradictory-timestamp",
  "future-dated",
] as const satisfies readonly AstropathicEventKind[];

function optionalTransmissionText(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, max);
  return normalized || undefined;
}

function validTransmissionEnum<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? value as T
    : undefined;
}

function normalizeTransmissionMetadata(value: unknown): AstropathicTransmissionMetadata | undefined {
  const candidate = record(value);
  const transmission: AstropathicTransmissionMetadata = {};
  const originLocationId = optionalTransmissionText(candidate.originLocationId, 120);
  const originLabel = optionalTransmissionText(candidate.originLabel, 240);
  const originRegion = validTransmissionEnum(candidate.originRegion, transmissionOriginRegions);
  const originBand = validTransmissionEnum(candidate.originBand, transmissionOriginBands);
  const routeClass = validTransmissionEnum(candidate.routeClass, transmissionRouteClasses);
  const transmissionMethod = validTransmissionEnum(candidate.transmissionMethod, transmissionMethods);
  const warpExposure = validTransmissionEnum(candidate.warpExposure, transmissionWarpExposures);
  const identityState = validTransmissionEnum(candidate.identityState, transmissionConfidenceStates);
  const originState = validTransmissionEnum(candidate.originState, transmissionConfidenceStates);
  const timestampState = validTransmissionEnum(candidate.timestampState, transmissionConfidenceStates);

  if (originLocationId) transmission.originLocationId = originLocationId;
  if (originLabel) transmission.originLabel = originLabel;
  if (originRegion) transmission.originRegion = originRegion;
  if (originBand) transmission.originBand = originBand;
  if (routeClass) transmission.routeClass = routeClass;
  if (transmissionMethod) transmission.transmissionMethod = transmissionMethod;
  if (warpExposure) transmission.warpExposure = warpExposure;
  if (identityState) transmission.identityState = identityState;
  if (originState) transmission.originState = originState;
  if (timestampState) transmission.timestampState = timestampState;

  return Object.keys(transmission).length > 0 ? transmission : undefined;
}

function validEventTimestamp(value: unknown) {
  const timestamp = optionalTransmissionText(value, 40);
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? new Date(timestamp).toISOString() : undefined;
}

function normalizeAstropathicEventMetadata(value: unknown, messageId: string): AstropathicEventMetadata | undefined {
  const candidate = record(value);
  if (candidate.version !== 1) return undefined;

  const rootTransmissionId = optionalTransmissionText(candidate.rootTransmissionId, 120);
  const nominalReceivedAt = validEventTimestamp(candidate.nominalReceivedAt);
  const rawKinds = Array.isArray(candidate.kinds) ? candidate.kinds : [];
  if (rawKinds.some((kind) => typeof kind !== "string" || !astropathicEventKinds.includes(kind as AstropathicEventKind))) {
    return undefined;
  }
  const kinds = [...new Set(rawKinds.filter(
    (kind): kind is AstropathicEventKind => typeof kind === "string" && astropathicEventKinds.includes(kind as AstropathicEventKind),
  ))];
  if (!rootTransmissionId || !nominalReceivedAt || kinds.length === 0) return undefined;

  const event: AstropathicEventMetadata = {
    version: 1,
    kinds,
    rootTransmissionId,
    nominalReceivedAt,
  };
  const parentTransmissionId = optionalTransmissionText(candidate.parentTransmissionId, 120);
  const ordinal = typeof candidate.ordinal === "number" && Number.isInteger(candidate.ordinal) && candidate.ordinal >= 0 && candidate.ordinal <= 999
    ? candidate.ordinal
    : undefined;
  const claimedAt = validEventTimestamp(candidate.claimedAt);
  const conflictingClaimedAt = validEventTimestamp(candidate.conflictingClaimedAt);
  const fragmentCandidate = record(candidate.fragment);
  const fragment = fragmentCandidate.algorithmVersion === 1 &&
    typeof fragmentCandidate.index === "number" && Number.isInteger(fragmentCandidate.index) && fragmentCandidate.index >= 1 && fragmentCandidate.index <= 16 &&
    typeof fragmentCandidate.total === "number" && Number.isInteger(fragmentCandidate.total) && fragmentCandidate.total >= fragmentCandidate.index && fragmentCandidate.total <= 16
      ? { index: fragmentCandidate.index, total: fragmentCandidate.total, algorithmVersion: 1 as const }
      : undefined;

  if (parentTransmissionId) event.parentTransmissionId = parentTransmissionId;
  if (ordinal !== undefined) event.ordinal = ordinal;
  if (claimedAt) event.claimedAt = claimedAt;
  if (conflictingClaimedAt) event.conflictingClaimedAt = conflictingClaimedAt;
  if (fragment) event.fragment = fragment;

  // Timestamp anomaly flags fail closed when their supporting claims are bad.
  event.kinds = event.kinds.filter((kind) => {
    if (kind === "future-dated") return Boolean(event.claimedAt);
    if (kind === "contradictory-timestamp") return Boolean(event.claimedAt && event.conflictingClaimedAt);
    return true;
  });
  const hasPartial = event.kinds.includes("partial-transmission");
  const hasRecovered = event.kinds.includes("recovered-fragment");
  const hasEcho = event.kinds.includes("duplicate-astropathic-echo");
  if (
    (Number(hasPartial) + Number(hasRecovered) + Number(hasEcho)) > 1 ||
    ((hasPartial || hasRecovered || hasEcho) && event.kinds.length !== 1)
  ) return undefined;
  if (hasPartial && (
    event.rootTransmissionId !== messageId ||
    event.parentTransmissionId !== undefined ||
    event.ordinal !== undefined ||
    event.fragment?.index !== 1 ||
    event.fragment?.total !== 3
  )) return undefined;
  if (hasRecovered && (
    event.parentTransmissionId !== event.rootTransmissionId ||
    event.ordinal === undefined ||
    event.fragment?.index !== event.ordinal ||
    event.fragment?.total !== 3 ||
    event.ordinal < 2 ||
    event.ordinal > 3 ||
    messageId !== `${event.rootTransmissionId}~fragment~${String(event.ordinal).padStart(2, "0")}`
  )) return undefined;
  if (hasEcho && (
    event.parentTransmissionId !== event.rootTransmissionId ||
    event.ordinal !== 1 ||
    event.fragment !== undefined ||
    messageId !== `${event.rootTransmissionId}~echo~01`
  )) return undefined;
  return event.kinds.length ? event : undefined;
}

export function normalizeArchiveData(value: unknown): ChapterArchiveData {
  const defaults = createDefaultArchiveData();
  const source = record(value);
  const identity = record(source.identity);

  const milestones = Array.isArray(source.milestones)
    ? source.milestones.slice(0, 20).map((item, index) => {
        const candidate = record(item);
        const fallback = defaults.milestones[index] ?? { label: `Milestone ${index + 1}`, done: false };
        return {
          label: text(candidate.label, fallback.label, 160),
          done: typeof candidate.done === "boolean" ? candidate.done : fallback.done,
        };
      })
    : defaults.milestones;

  const relics = Array.isArray(source.relics)
    ? source.relics.slice(0, 100).map((item, index) => {
        const candidate = record(item);
        const fallback = defaults.relics[index] ?? defaults.relics[0];
        return {
          name: text(candidate.name, fallback.name, 200),
          type: text(candidate.type, fallback.type, 160),
          status: text(candidate.status, fallback.status, 160),
        };
      })
    : defaults.relics;
  const normalizedRelics = relics
    .filter((relic) => relic.name !== "Ancient chassis unrecorded")
    .map((relic) => relic.name === "The Gift of Luna" ? { ...defaults.relics[0] } : relic);

  const companies = defaults.companies.map((fallback, index) => {
    const candidate = record(Array.isArray(source.companies) ? source.companies[index] : undefined);
    const candidateName = text(candidate.name, fallback.name, 200);
    return {
      number: fallback.number,
      name: legacyCompanyNames.has(candidateName) ? `${fallback.number} Company` : candidateName,
      role: text(candidate.role, fallback.role, 160),
      strength: Math.max(0, Math.min(1000, Math.round(Number(candidate.strength ?? fallback.strength) || 0))),
    };
  });

  const entries = Array.isArray(source.entries)
    ? source.entries
        .filter((entry): entry is string => typeof entry === "string")
        .slice(0, 500)
        .map((entry) => entry.slice(0, 4000))
    : defaults.entries;

    const loreEntries =
  Array.isArray(source.loreEntries) && source.loreEntries.length > 0
  ? source.loreEntries
      .slice(0, 1000)
      .map((item, index) => {
        const candidate = record(item);

        const category: LoreCategory =
          candidate.category === "campaign" ||
          candidate.category === "event" ||
          candidate.category === "character" ||
          candidate.category === "relic" ||
          candidate.category === "world" ||
          candidate.category === "organization" ||
          candidate.category === "decree" ||
          candidate.category === "other"
            ? candidate.category
            : "other";

        const status: LoreStatus =
          candidate.status === "draft" ||
          candidate.status === "review" ||
          candidate.status === "canon" ||
          candidate.status === "retconned"
            ? candidate.status
            : "draft";

        const content = text(
          candidate.content,
          "",
          MAX_LORE_CONTENT_LENGTH,
        ).trim();

        const createdAt = Math.max(
          0,
          Math.floor(Number(candidate.createdAt) || 0),
        );

        const updatedAt = Math.max(
          createdAt,
          Math.floor(Number(candidate.updatedAt) || createdAt),
        );

        const subtitle = text(
          candidate.subtitle,
          "",
          MAX_LORE_SUBTITLE_LENGTH,
        ).trim();

        return {
          id: text(
            candidate.id,
            `lore-imported-${index + 1}`,
            160,
          ),
          date: text(candidate.date, "", MAX_LORE_DATE_LENGTH),
          title: text(
            candidate.title,
            `Lore Entry ${index + 1}`,
            MAX_LORE_TITLE_LENGTH,
          ),
          ...(subtitle ? { subtitle } : {}),
          category,
          status,
          content,
          createdAt,
          updatedAt,
        } satisfies LoreEntry;
      })
      .filter((entry) => entry.content.length > 0)
      .filter(
        (entry, index, allEntries) =>
          allEntries.findIndex(
            (candidate) => candidate.id === entry.id,
          ) === index,
      )
  : migrateLegacyEntriesToLoreEntries(entries);

  const voxQuotes = Array.isArray(source.voxQuotes)
    ? source.voxQuotes
        .filter((quote): quote is string => typeof quote === "string")
        .map((quote) => quote.trim().slice(0, 1200))
        .filter(Boolean)
        .slice(0, 500)
    : defaults.voxQuotes;

  const relayMessages = Array.isArray(source.relayMessages)
    ? source.relayMessages
        .slice(0, 120)
        .map((item, index) => {
          const candidate = record(item);
          const template = astropathicMessageTemplates.find((message) => message.subject === candidate.subject);
          const transmission = normalizeTransmissionMetadata(candidate.transmission);
          const id = text(candidate.id, `relay-imported-${index}`, 120);
          const event = normalizeAstropathicEventMetadata(candidate.event, id);
          const preview = text(candidate.preview, "No readable message body was recovered.", 1200);
          const priority =
            candidate.priority === "PRIMUS" || candidate.priority === "ACTION" || candidate.priority === "URGENT" ||
            candidate.priority === "SEALED" || candidate.priority === "PETITION" || candidate.priority === "NOTICE"
              ? candidate.priority
              : "NOTICE";
          return {
            id,
            agency: text(candidate.agency, "Imperial agency unverified", 160),
            subject: text(candidate.subject, "Transmission subject obscured", 240),
            preview,
            body: text(candidate.body, template?.body ?? preview, 4000),
            priority,
            received: text(candidate.received, "0.---.056.M42", 40),
            receivedAt: text(candidate.receivedAt, "", 40),
            ...(transmission ? { transmission } : {}),
            ...(event ? { event } : {}),
          } satisfies AstropathicMessage;
        })
        .filter((message, index, messages) => messages.findIndex((candidate) => candidate.id === message.id) === index)
    : defaults.relayMessages;

  const sectorSource = record(source.sectorIntel);
  const worldSource = Array.isArray(sectorSource.worlds) ? sectorSource.worlds : defaults.sectorIntel.worlds;
  const normalizedWorlds = worldSource.slice(0, 24).map((item, index) => {
    const candidate = record(item);
    const fallback = defaults.sectorIntel.worlds[index] ?? {
      name: `Uncharted System ${index + 1}`,
      classification: "Unclassified",
      status: "Unknown",
      x: 50,
      y: 50,
      bodies: [],
    };
    const bodySource = Array.isArray(candidate.bodies) ? candidate.bodies : fallback.bodies;
    const bodies = bodySource.slice(0, 16).map((bodyItem, bodyIndex) => {
      const body = record(bodyItem);
      const bodyFallback = fallback.bodies[bodyIndex] ?? {
        name: `${fallback.name} ${bodyIndex + 1}`,
        type: "Unclassified Planet",
        status: "Unsurveyed",
        orbit: bodyIndex + 1,
        population: "Unknown",
        climate: "Unknown",
        allegiance: "Unclaimed",
        resources: "Unsurveyed",
        summary: "No planetary intelligence has yet been recorded.",
      };
      return {
        name: text(body.name, bodyFallback.name, 120),
        type: text(body.type, bodyFallback.type, 120),
        classificationId: text(body.classificationId, bodyFallback.classificationId ?? "", 100),
        status: text(body.status, bodyFallback.status, 120),
        orbit: Math.max(1, Math.min(12, Math.round(Number(body.orbit ?? bodyFallback.orbit) || 1))),
        population: text(body.population, bodyFallback.population, 120),
        climate: text(body.climate, bodyFallback.climate, 160),
        allegiance: text(body.allegiance, bodyFallback.allegiance, 160),
        resources: text(body.resources, bodyFallback.resources, 200),
        summary: text(body.summary, bodyFallback.summary, 2400),
      };
    });
    return {
      sourceIndex: index,
      name: text(candidate.name, fallback.name, 120),
      classification: text(candidate.classification, fallback.classification, 120),
      status: text(candidate.status, fallback.status, 120),
      x: Math.max(6, Math.min(94, Number(candidate.x ?? fallback.x) || fallback.x)),
      y: Math.max(8, Math.min(92, Number(candidate.y ?? fallback.y) || fallback.y)),
      bodies,
    };
  });

  const characters = Array.isArray(source.characters)
    ? source.characters
        .slice(0, 500)
        .map((item, index) => {
          const candidate = record(item);
          const status: ChapterCharacterStatus =
            candidate.status === "deceased" ||
            candidate.status === "missing" ||
            candidate.status === "interred"
              ? candidate.status
              : "active";
          const createdAt = Math.max(0, Math.floor(Number(candidate.createdAt) || 0));
          const updatedAt = Math.max(
            createdAt,
            Math.floor(Number(candidate.updatedAt) || createdAt),
          );
          const companyNumber = text(candidate.companyNumber, "", 20);
          return {
            id: text(candidate.id, `character-imported-${index + 1}`, 160),
            name: text(candidate.name, `Unidentified warrior ${index + 1}`, 200).trim(),
            rank: text(candidate.rank, "Rank unrecorded", 160),
            honorific: text(candidate.honorific, "", 240),
            role: text(candidate.role, "Role unrecorded", 240),
            companyNumber: defaults.companies.some((company) => company.number === companyNumber)
              ? companyNumber
              : "",
            status,
            introducedAt: text(candidate.introducedAt, "Date unrecorded", 80),
            deathAt: text(candidate.deathAt, "", 80),
            biography: text(candidate.biography, "", 12000),
            heroicDeeds: Array.isArray(candidate.heroicDeeds)
              ? candidate.heroicDeeds
                  .filter((deed): deed is string => typeof deed === "string")
                  .map((deed) => deed.trim().slice(0, 1000))
                  .filter(Boolean)
                  .slice(0, 50)
              : [],
            loreEntryIds: Array.isArray(candidate.loreEntryIds)
              ? candidate.loreEntryIds
                  .filter((id): id is string => typeof id === "string")
                  .map((id) => id.trim().slice(0, 160))
                  .filter(Boolean)
                  .slice(0, 100)
              : [],
            createdAt,
            updatedAt,
          } satisfies ChapterCharacter;
        })
        .filter((character, index, allCharacters) =>
          allCharacters.findIndex((candidate) => candidate.id === character.id) === index)
    : defaults.characters;
  const retainedWorlds = normalizedWorlds.filter((world) => !legacySectorSystemNames.has(world.name));
  const worldIndexMap = new Map(retainedWorlds.map((world, index) => [world.sourceIndex, index]));
  const worlds: SectorWorld[] = retainedWorlds.map(({ sourceIndex: _sourceIndex, ...world }) => world);

  const factionSource = Array.isArray(sectorSource.factions) ? sectorSource.factions : defaults.sectorIntel.factions;
  const factions: SectorFaction[] = factionSource.map((item, index) => {
    const candidate = record(item);
    const fallback = defaults.sectorIntel.factions[index] ?? {
      name: `Unknown Contact ${index + 1}`,
      alignment: "uncertain" as const,
      classification: "Unclassified",
      threat: 1,
      disposition: "No reliable intelligence has been recorded.",
    };
    const alignment: SectorFaction["alignment"] =
      candidate.alignment === "ally" || candidate.alignment === "enemy"
      ? candidate.alignment
      : "uncertain";
    return {
      name: text(candidate.name, fallback.name, 160),
      alignment,
      classification: text(candidate.classification, fallback.classification, 160),
      threat: Math.max(1, Math.min(5, Math.round(Number(candidate.threat ?? fallback.threat) || 1))),
      disposition: text(candidate.disposition, fallback.disposition, 1200),
    };
  }).filter((faction) => !legacySectorFactionNames.has(faction.name));

  const directiveSource = Array.isArray(sectorSource.directives)
    ? sectorSource.directives
    : defaults.sectorIntel.directives;
  const directives = directiveSource
    .filter((directive): directive is string => typeof directive === "string")
    .map((directive) => directive.trim().slice(0, 500))
    .filter((directive) => Boolean(directive) && !legacySectorDirectiveText.has(directive))
    .slice(0, 50);

  const laneSource = Array.isArray(sectorSource.warpLanes)
    ? sectorSource.warpLanes
    : defaults.sectorIntel.warpLanes;
  const warpLanes: WarpLane[] = laneSource
  .slice(0, 80)
  .map((item, index): WarpLane | null => {
      const candidate = record(item);
      const fallback = defaults.sectorIntel.warpLanes[index] ?? {
        name: `Warp Lane ${index + 1}`,
        from: 0,
        to: Math.min(1, Math.max(0, worlds.length - 1)),
        status: "unknown" as const,
      };
      const name = text(candidate.name, fallback.name, 140);
      if (legacySectorWarpLaneNames.has(name)) return null;
      const sourceFrom = Math.round(Number(candidate.from ?? fallback.from) || 0);
      const sourceTo = Math.round(Number(candidate.to ?? fallback.to) || 0);
      const from = worldIndexMap.get(sourceFrom);
      const to = worldIndexMap.get(sourceTo);
      if (from === undefined || to === undefined || from === to) return null;
      const status: WarpLane["status"] =
        candidate.status === "stable" || candidate.status === "unstable" || candidate.status === "blockaded"
          ? candidate.status
          : "unknown";
      return { name, from, to, status };
    })
    .filter((lane): lane is WarpLane => lane !== null);

  const surveySource = record(sectorSource.survey);
  const surveyAuthority = surveySource.authority === "review" || surveySource.authority === "ratified"
    ? surveySource.authority
    : "draft";

  return {
    identity: {
      founding: text(identity.founding, defaults.identity.founding),
      lineage: text(identity.lineage, defaults.identity.lineage),
      domain: text(identity.domain, defaults.identity.domain),
      fortress: text(identity.fortress, defaults.identity.fortress),
      master: text(identity.master, defaults.identity.master),
      flaw: text(identity.flaw, defaults.identity.flaw),
      foundingPrompt: text(identity.foundingPrompt, defaults.identity.foundingPrompt, 12000),
    },
    milestones: milestones.length ? milestones : defaults.milestones,
    relics: normalizedRelics.length ? normalizedRelics : defaults.relics,
    companies,
    characters,
    entries,
    loreEntries,
    voxQuotes: voxQuotes.length ? voxQuotes : defaults.voxQuotes,
    badgeMode: source.badgeMode === "banner" ? "banner" : "badge",
    relayMessages,
    relayLastGeneratedDate: text(source.relayLastGeneratedDate, defaults.relayLastGeneratedDate, 20),
    sectorIntel: {
      sectorName: text(sectorSource.sectorName, defaults.sectorIntel.sectorName, 200),
      subsectorName: text(sectorSource.subsectorName, defaults.sectorIntel.subsectorName, 200),
      currentTheater: text(sectorSource.currentTheater, defaults.sectorIntel.currentTheater, 200),
      deploymentStatus: text(sectorSource.deploymentStatus, defaults.sectorIntel.deploymentStatus, 240),
      astropathicDate: text(sectorSource.astropathicDate, defaults.sectorIntel.astropathicDate, 160),
      summary: text(sectorSource.summary, defaults.sectorIntel.summary, 4000),
      worlds: worlds.length ? worlds : defaults.sectorIntel.worlds,
      factions: factions.length ? factions : defaults.sectorIntel.factions,
      directives: directives.length ? directives : defaults.sectorIntel.directives,
      warpLanes,
      survey: {
        authority: surveyAuthority,
        receivingLocus: text(surveySource.receivingLocus, defaults.sectorIntel.survey.receivingLocus, 160),
        systemDesignation: text(surveySource.systemDesignation, defaults.sectorIntel.survey.systemDesignation, 160),
        probableRegion: text(surveySource.probableRegion, defaults.sectorIntel.survey.probableRegion, 240),
        transitRoute: text(surveySource.transitRoute, defaults.sectorIntel.survey.transitRoute, 300),
        cartographicConfidence: text(surveySource.cartographicConfidence, defaults.sectorIntel.survey.cartographicConfidence, 200),
        communications: text(surveySource.communications, defaults.sectorIntel.survey.communications, 200),
        supportForceStatus: text(surveySource.supportForceStatus, defaults.sectorIntel.survey.supportForceStatus, 300),
        vesselCondition: text(surveySource.vesselCondition, defaults.sectorIntel.survey.vesselCondition, 300),
        isolationStatus: text(surveySource.isolationStatus, defaults.sectorIntel.survey.isolationStatus, 300),
      },
    },
  };
}
