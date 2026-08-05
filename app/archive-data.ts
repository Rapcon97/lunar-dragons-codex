import { MAX_LORE_CONTENT_LENGTH } from "./lore-limits.ts";
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
};

export type ChapterArchiveData = {
  identity: ChapterIdentity;
  milestones: ChapterMilestone[];
  relics: ChapterRelic[];
  companies: ChapterCompany[];
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
    { name: "The Gift of Luna", type: "Fragment of Luna · Founding stone", status: "In Chapter keeping · awaiting a permanent bastion" },
    { name: "Ancient chassis unrecorded", type: "Dreadnought", status: "Awaiting record" },
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
    sectorName: "Nachmund Gauntlet · Contested Reaches",
    subsectorName: "Nachmund Reclamation Commission",
    currentTheater: "The Argent Vigil",
    deploymentStatus: "CRUSADE ACTIVE · RECLAMATION & STRATEGIC VIGILANCE",
    astropathicDate: "056.M42 · ADEPTUS TERRA WARRANT 008.M42/DR-017",
    summary:
      "By decree of the Lord Commander, the Lunar Dragons prosecute the Argent Vigil across the contested reaches surrounding the Nachmund Gauntlet. Their charge is to find isolated systems, restore lawful Imperial authority where it may endure, destroy what lies beyond redemption, secure the roads between the stars, and prevent the passage between the divided Imperium from being closed.",
    worlds: [
      {
        name: "Lunaris", classification: "Provisional Fleet Anchorage", status: "Secure · No sovereign claim", x: 48, y: 48,
        bodies: [
          { name: "Lunaris", type: "Provisional Anchorage Moon", status: "Chapter-protected", orbit: 2, population: "4.2 billion", climate: "Airless · Subsurface habitation", allegiance: "Imperium of Man", resources: "Gene-vaults · Moon-gates", summary: "The Chapter’s principal operational anchorage during the Argent Vigil. It is neither a sovereign Chapter world nor the permanent bastion authorised by the Decree of Reclamation and Vigilance." },
          { name: "Draconis Gate", type: "Orbital Fortress", status: "Operational", orbit: 1, population: "83,000", climate: "Void installation", allegiance: "Lunar Dragons", resources: "Fleet docks · Astropathic choir", summary: "A ring-shaped void fortress controlling a stable translation corridor through the Argent Vigil operational reach." },
          { name: "Umbra", type: "Dead Moon", status: "Restricted", orbit: 3, population: "None recorded", climate: "Cryogenic wastes", allegiance: "Sealed by chapter decree", resources: "Unknown", summary: "An unlit moon whose catacombs predate Imperial settlement. The 11th Company maintains the interdiction." },
        ],
      },
      {
        name: "Selene Prime", classification: "Hive-Moon", status: "Contested", x: 67, y: 31,
        bodies: [
          { name: "Selene Prime", type: "Hive World", status: "Contested", orbit: 2, population: "19.7 billion", climate: "Temperate hive belts", allegiance: "Imperium of Man", resources: "Munitions · Promethium", summary: "The industrial heart of the subsector. Genestealer spoor has been confirmed beneath Hive Enoch." },
          { name: "Helicon", type: "Gas Giant", status: "Blockaded", orbit: 4, population: "1.1 million", climate: "Hydrogen storms", allegiance: "Imperium of Man", resources: "Fuel skimmers · Void gas", summary: "Its refinery platforms supply much of the Selene fleet and are now under intermittent xenos attack." },
          { name: "Chapel’s Tear", type: "Pilgrim Moon", status: "Evacuating", orbit: 3, population: "640 million", climate: "Cold oceanic", allegiance: "Adeptus Ministorum", resources: "Shrines · Reliquaries", summary: "A tidal moon of floating basilicas, presently serving as a refugee staging point." },
        ],
      },
      {
        name: "Kharon", classification: "Dead System", status: "No Signal", x: 82, y: 67,
        bodies: [
          { name: "Kharon I", type: "Dead World", status: "Signal source", orbit: 1, population: "Unknown", climate: "Ash-choked", allegiance: "Unclaimed", resources: "Xeno ruins", summary: "Source of a repeating Lunar Dragons distress cipher transmitted centuries before the chapter’s recorded founding." },
          { name: "The Pale Crown", type: "Shattered Moon", status: "Hostile", orbit: 2, population: "Warband presence", climate: "Debris field", allegiance: "The Pale Synod", resources: "Fortified wreckage", summary: "A broken moon converted into an ambush fortress by the Pale Synod." },
        ],
      },
      {
        name: "Vigil IX", classification: "Imperial Bastion", status: "Besieged", x: 28, y: 30,
        bodies: [
          { name: "Vigil IX", type: "Fortress World", status: "Besieged", orbit: 3, population: "2.8 billion", climate: "Arid highlands", allegiance: "Imperium of Man", resources: "Bastions · Macro-cannon foundries", summary: "The western shield of the subsector, enduring a prolonged void siege by the Pale Synod." },
          { name: "Sentinel Secundus", type: "Defense Moon", status: "Damaged", orbit: 2, population: "12 million", climate: "Airless", allegiance: "Astra Militarum", resources: "Orbital batteries", summary: "One of three defense moons; the other two have fallen silent." },
        ],
      },
      {
        name: "Orison", classification: "Shrine World", status: "Secure", x: 19, y: 68,
        bodies: [
          { name: "Orison", type: "Shrine World", status: "Secure", orbit: 2, population: "7.4 billion", climate: "Mediterranean", allegiance: "Adeptus Ministorum", resources: "Pilgrim tithes · Scholastica", summary: "A world of moonlit cathedrals whose clergy regard the Lunar Dragons as protectors foretold in local scripture." },
          { name: "The Penitent", type: "Monastery Moon", status: "Quarantined", orbit: 3, population: "91,000", climate: "Frozen", allegiance: "Ecclesiarchy", resources: "Restricted archives", summary: "Quarantined after its monks reported dreams of a black moon rising over Kharon." },
        ],
      },
      {
        name: "The Vesper Rift", classification: "Warp Anomaly", status: "Expanding", x: 56, y: 79,
        bodies: [
          { name: "Veil Anchor 7", type: "Mechanicus Station", status: "Failing", orbit: 1, population: "18,400", climate: "Void installation", allegiance: "Adeptus Mechanicus", resources: "Gellar pylons · Rift telemetry", summary: "The last functioning monitor station on the rift’s edge. Its machine spirit predicts accelerating expansion." },
          { name: "Noctis", type: "Unclassified Object", status: "Approaching", orbit: 4, population: "Unknown", climate: "Sensor-occluded", allegiance: "Unknown", resources: "Unknown", summary: "A planet-mass shadow moving against local gravity. No reliable augur return has been obtained." },
        ],
      },
    ],
    factions: [
      {
        name: "Astra Militarum · Argent Vigil Commands",
        alignment: "ally",
        classification: "Imperial Cooperation Order",
        threat: 1,
        disposition: "Ordered to fight beside the Lunar Dragons while retaining their lawful chains of command; the Astartes break the foe and the armies of the Imperium hold what is won.",
      },
      {
        name: "Navis Imperialis · Nachmund Detachments",
        alignment: "ally",
        classification: "Imperial Cooperation Order",
        threat: 1,
        disposition: "Charged to preserve the road between the stars and support the prosecution of the Argent Vigil.",
      },
      {
        name: "Adeptus Mechanicus · Attached Cohorts",
        alignment: "ally",
        classification: "Imperial Cooperation Order",
        threat: 1,
        disposition: "Charged to restore, sustain and judge the works of Mankind committed to the crusade; they serve the Imperium beside the Chapter, not beneath it.",
      },
      {
        name: "House Caelorn",
        alignment: "ally",
        classification: "Imperial Knight House",
        threat: 1,
        disposition: "Oath-bound to defend the Selene pilgrim lanes beside the Lunar Dragons.",
      },
      {
        name: "Ordo Xenos · Selene Conclave",
        alignment: "uncertain",
        classification: "Inquisitorial Authority",
        threat: 3,
        disposition: "Shares intelligence selectively. Their sealed interest in Kharon remains unexplained.",
      },
      {
        name: "The Pale Synod",
        alignment: "enemy",
        classification: "Heretic Astartes Warband",
        threat: 5,
        disposition: "Primary hostile force. Conducting raids around Vigil IX and harvesting astropathic choirs.",
      },
      {
        name: "Splinter Fleet Nyx",
        alignment: "enemy",
        classification: "Tyranid Vanguard Organisms",
        threat: 4,
        disposition: "Genestealer spoor confirmed on Selene Prime. Fleet mass remains beyond augur range.",
      },
    ],
    directives: [
      "Seek systems isolated by the Great Rift and determine the fate of worlds from which the Emperor’s light has been obscured.",
      "Relieve those who hold faith with Terra, restore lawful Imperial authority, and reclaim what may be reclaimed.",
      "Destroy what has fallen beyond redemption through corruption, treason, xenos dominion, or the touch of the Archenemy.",
      "Secure anchorages, supply routes, passages, and systems through the contested reaches.",
      "Stand vigil against every power that would close the Nachmund passage and deepen the sundering of the Imperium.",
      "Reinforce Vigil IX before the next void-tide.",
      "Recover the missing astropathic vessel Argent Psalm.",
      "Determine why Kharon has begun transmitting a lunar distress cipher.",
    ],
    warpLanes: [
      { name: "The Moonward Passage", from: 0, to: 1, status: "stable" },
      { name: "Vigil Run", from: 0, to: 3, status: "stable" },
      { name: "Pilgrim’s Thread", from: 0, to: 4, status: "stable" },
      { name: "Kharon Approach", from: 1, to: 2, status: "blockaded" },
      { name: "Vesper Drift", from: 0, to: 5, status: "unstable" },
    ],
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

const astropathicMessageTemplates = ([
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

const PHASE_4_EVENT_ACTIVATION_TIME = Date.parse(PHASE_4_EVENT_ACTIVATION_EPOCH);
const PHASE_4_DERIVED_EVENT_ACTIVATION_TIME = Date.parse(PHASE_4_DERIVED_EVENT_ACTIVATION_EPOCH);
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
export function planAstropathicTransmissionEvents(messages: readonly AstropathicMessage[]) {
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
        kinds: [...message.event.kinds, "out-of-order-arrival"],
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

  const templateOrder = astropathicMessageTemplates
    .map((_, index) => ({ index, rank: hashText(`${key}:template:${index}`) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ index }) => index);
  let normalTemplateIndex = 0;

  const baseMessages = scheduledMinutes.slice(0, count).map((minute, index): AstropathicMessage => {
    const isNotableTransmission = notable && index === 0;
    const template = isNotableTransmission
      ? notableAstropathicMessageTemplates[hashText(`${key}:notable-template`) % notableAstropathicMessageTemplates.length]
      : astropathicMessageTemplates[templateOrder[normalTemplateIndex++ % templateOrder.length]];
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

function markOutOfOrderDeliveries(messages: AstropathicMessage[]) {
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
      event: { ...message.event, kinds: [...message.event.kinds, "out-of-order-arrival"] },
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
    (relic) => relic.name !== "Relic name unrecorded" && relic.name !== "The Gift of Luna" && relic.name !== "Flagship name unrecorded" && relic.name !== "Lunaris",
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
  archive.relics = [defaults.relics[0], defaults.relics[2], ...existingRelics];
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
    worlds: archive.sectorIntel.worlds.map((world) => world.name === "Lunaris" ? defaults.sectorIntel.worlds[0] : world),
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

        return {
          id: text(
            candidate.id,
            `lore-imported-${index + 1}`,
            160,
          ),
          date: text(candidate.date, "", 80),
          title: text(
            candidate.title,
            `Lore Entry ${index + 1}`,
            240,
          ),
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
  const worlds = worldSource.slice(0, 24).map((item, index) => {
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
      name: text(candidate.name, fallback.name, 120),
      classification: text(candidate.classification, fallback.classification, 120),
      status: text(candidate.status, fallback.status, 120),
      x: Math.max(6, Math.min(94, Number(candidate.x ?? fallback.x) || fallback.x)),
      y: Math.max(8, Math.min(92, Number(candidate.y ?? fallback.y) || fallback.y)),
      bodies,
    };
  });

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
  });

  const directiveSource = Array.isArray(sectorSource.directives)
    ? sectorSource.directives
    : defaults.sectorIntel.directives;
  const directives = directiveSource
    .filter((directive): directive is string => typeof directive === "string")
    .map((directive) => directive.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 50);

  const laneSource = Array.isArray(sectorSource.warpLanes)
    ? sectorSource.warpLanes
    : defaults.sectorIntel.warpLanes;
  const warpLanes: WarpLane[] = laneSource
  .slice(0, 80)
  .map((item, index): WarpLane => {
      const candidate = record(item);
      const fallback = defaults.sectorIntel.warpLanes[index] ?? {
        name: `Warp Lane ${index + 1}`,
        from: 0,
        to: Math.min(1, Math.max(0, worlds.length - 1)),
        status: "unknown" as const,
      };
      const from = Math.max(0, Math.min(worlds.length - 1, Math.round(Number(candidate.from ?? fallback.from) || 0)));
      const to = Math.max(0, Math.min(worlds.length - 1, Math.round(Number(candidate.to ?? fallback.to) || 0)));
      const status: WarpLane["status"] =
        candidate.status === "stable" || candidate.status === "unstable" || candidate.status === "blockaded"
          ? candidate.status
          : "unknown";
      return { name: text(candidate.name, fallback.name, 140), from, to, status };
    })
    .filter((lane) => worlds.length > 1 && lane.from !== lane.to);

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
    relics: relics.length ? relics : defaults.relics,
    companies,
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
    },
  };
}
