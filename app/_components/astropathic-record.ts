import type { TransmissionWarpExposure } from "../archive-data";
import {
  hashTransmissionValue,
  renderSanctionedInterpretation,
  type TransmissionAnalysis,
  type TransmissionSourceMetadata,
} from "./relay-transmission.ts";

export type RawImpressionFragment = {
  kind: "VISION" | "SENSATION" | "EMOTION" | "CONCEPT" | "THOUGHT-FORM" | "MNEMONIC KEY" | "ANOMALY";
  text: string;
};

export type AstropathicRecordPresentation = {
  sanctionedInterpretation: string;
  rawImpression: RawImpressionFragment[];
  thoughtmarkAuthority: string;
  choirSignature: string;
  choirStatus: string;
  archiveDisposition: string;
};

const SUBJECT_IMPRESSIONS: Record<string, readonly RawImpressionFragment[]> = {
  "veil anchor 7 telemetry": [
    { kind: "VISION", text: "A brass halo shuddering above a wound in the dark." },
    { kind: "SENSATION", text: "Teeth vibrating beneath the tongue; iron made afraid." },
    { kind: "CONCEPT", text: "Containment failing by increments too small for mortal sight." },
    { kind: "MNEMONIC KEY", text: "SEVENTH ANCHOR // NINETEEN WARNINGS // THE LATTICE OPENS" },
  ],
  "vigil ix relief appeal": [
    { kind: "VISION", text: "A fortress wall under a sky of falling embers." },
    { kind: "SENSATION", text: "Empty magazines; heat trapped inside sealed armour." },
    { kind: "EMOTION", text: "Discipline holding fear at bay by a single measured breath." },
    { kind: "MNEMONIC KEY", text: "WESTERN CURTAIN // SHELLS DIMINISH // ONE ASSAULT REMAINS" },
  ],
  "kharon cipher inquiry": [
    { kind: "VISION", text: "A black seal pressed across a mouth beneath an unfamiliar moon." },
    { kind: "SENSATION", text: "Cold ink spreading through the choir's joined hands." },
    { kind: "CONCEPT", text: "A question older than the record permitted to contain it." },
    { kind: "MNEMONIC KEY", text: "KHARON // BEFORE THE FOUNDING // DISCLOSE NOTHING TWICE" },
  ],
  "argent psalm signal echo": [
    { kind: "VISION", text: "A silver vessel singing beyond a curtain of violet fire." },
    { kind: "SENSATION", text: "A remembered voice heard through another person's grief." },
    { kind: "EMOTION", text: "Recognition without certainty. Hope made dangerous." },
    { kind: "THOUGHT-FORM", text: "RETURN. REMEMBER. HOME. [concepts overlap]" },
    { kind: "MNEMONIC KEY", text: "THE MOON REMEMBERS." },
    { kind: "ANOMALY", text: "A final presence is perceived after the originating thought-form has ended." },
  ],
  "munitions allocation dispute": [
    { kind: "VISION", text: "Two mailed hands closing around the same iron coffer." },
    { kind: "SENSATION", text: "The dry weight of unfired shells and distant guns waiting." },
    { kind: "CONCEPT", text: "One warrant must yield before both armies are denied." },
    { kind: "MNEMONIC KEY", text: "CASTOR // MACCABAEUS // ONE DUTY DIVIDED" },
  ],
};

const GENERIC_VISIONS = [
  "A distant choir kneeling beneath a sky without stars.",
  "A sealed lantern crossing a black and depthless sea.",
  "A mailed hand extended through smoke, its heraldry indistinct.",
  "Lines of pale fire converging upon a single watchful eye.",
] as const;

const PRIORITY_IMPRESSIONS: Record<string, RawImpressionFragment> = {
  PRIMUS: { kind: "SENSATION", text: "A command-seal impressed against the soul with inescapable weight." },
  ACTION: { kind: "EMOTION", text: "Controlled urgency; a decision awaited beneath gathering pressure." },
  URGENT: { kind: "SENSATION", text: "The choir's pulse accelerating as the impression forces passage." },
  SEALED: { kind: "CONCEPT", text: "Knowledge enclosed within a door that remembers every witness." },
  PETITION: { kind: "EMOTION", text: "Hope held carefully between supplicant hands." },
  NOTICE: { kind: "CONCEPT", text: "A burden entered into record so that silence cannot erase it." },
};

function deterministicChoice<T>(source: TransmissionSourceMetadata, salt: string, values: readonly T[]) {
  return values[hashTransmissionValue(`astropathic-record:v1|${source.id}|${salt}`) % values.length];
}

function subjectConcept(source: TransmissionSourceMetadata, readableBody: string): RawImpressionFragment {
  const text = `${source.subject} ${readableBody}`.toLowerCase();
  if (/convoy|passage|translation|route|escort/.test(text)) {
    return { kind: "CONCEPT", text: "A procession of burdened lights crossing a road that narrows behind them." };
  }
  if (/shell|munition|ammunition|battery|fortress|bastion/.test(text)) {
    return { kind: "CONCEPT", text: "Iron counted against the certainty of another assault." };
  }
  if (/rift|warp|gellar|echo|impossible|anomal/.test(text)) {
    return { kind: "CONCEPT", text: "Distance folding around a truth that refuses a stable shape." };
  }
  if (/relic|gene-seed|vault|founding|archive|record/.test(text)) {
    return { kind: "CONCEPT", text: "Names and oaths suspended within an archive of cold stone." };
  }
  if (/pilgrim|faith|benediction|shrine|ministorum/.test(text)) {
    return { kind: "CONCEPT", text: "Faith moving through darkness in vessels too fragile for its weight." };
  }
  return { kind: "CONCEPT", text: "A distant will submitting meaning through pressure, symbol and remembered pain." };
}

function mnemonicKey(source: TransmissionSourceMetadata) {
  const words = source.subject
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 4);
  const suffix = String(hashTransmissionValue(`astropathic-mnemonic:v1|${source.id}`) % 1000).padStart(3, "0");
  return `${words.join(" // ") || "THOUGHT-FORM UNRESOLVED"} // ${suffix}`;
}

function choirSignature(source: TransmissionSourceMetadata, analysis: TransmissionAnalysis) {
  const signatures: Record<TransmissionAnalysis["transmissionMethod"], string> = {
    astropathic: "SOUL-BOUND CHOIR IMPRESSION",
    "encrypted-astropathic": "SEALED ASTROPATHIC THOUGHTMARK",
    noospheric: "SHIPBOARD NOOSPHERIC THOUGHTMARK",
    "mechanicus-burst": "BINHARIC-PSYCHIC CANT",
    "navigational-choir": "NAVIGATORIAL CHOIR IMPRESSION",
    "warp-echo": "UNBOUND EMPYRIC ECHO",
  };
  return `${signatures[analysis.transmissionMethod]} // ${source.priority}`;
}

function choirStatus(exposure: TransmissionWarpExposure) {
  if (exposure === "NEGLIGIBLE" || exposure === "MINOR") return "RECEPTION STABLE // CASUALTY RETURN UNRECORDED";
  if (exposure === "MODERATE" || exposure === "ELEVATED") return "CHOIR STRAIN RECORDED // MEDICAE RETURN PENDING";
  return "CHOIR TRAUMA PROBABLE // SURVIVOR STATUS UNCONFIRMED";
}

function archiveDisposition(source: TransmissionSourceMetadata) {
  if (source.priority === "PRIMUS" || source.priority === "SEALED") return "SEALED FOR CHAPTER MASTER // NO SECONDARY CIRCULATION";
  if (source.priority === "ACTION" || source.priority === "URGENT") return "SUBMITTED FOR COMMAND JUDGEMENT";
  if (source.priority === "PETITION") return "PETITION AWAITING COMMAND DISPOSITION";
  return "ARCHIVED // COMMAND REVIEW OPTIONAL";
}

export function buildAstropathicRecordPresentation(
  source: TransmissionSourceMetadata,
  analysis: TransmissionAnalysis,
): AstropathicRecordPresentation {
  const sanctionedInterpretation = renderSanctionedInterpretation(source, analysis.degradation);
  const explicit = SUBJECT_IMPRESSIONS[source.subject.trim().toLowerCase()];
  const rawImpression = explicit
    ? explicit.map((fragment) => ({ ...fragment }))
    : [
        { kind: "VISION" as const, text: deterministicChoice(source, "vision", GENERIC_VISIONS) },
        PRIORITY_IMPRESSIONS[source.priority ?? "NOTICE"] ?? PRIORITY_IMPRESSIONS.NOTICE,
        subjectConcept(source, sanctionedInterpretation),
        { kind: "MNEMONIC KEY" as const, text: mnemonicKey(source) },
      ];

  return {
    sanctionedInterpretation,
    rawImpression,
    thoughtmarkAuthority: `${source.agency.toUpperCase()} // ${analysis.identityState}`,
    choirSignature: choirSignature(source, analysis),
    choirStatus: choirStatus(analysis.warpExposureState),
    archiveDisposition: archiveDisposition(source),
  };
}
