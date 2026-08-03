export type TransmissionSourceMetadata = {
  id: string;
  agency: string;
  subject: string;
  preview?: string;
  priority?: string;
  received?: string;
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

const CORRUPTION_RANGES: Record<TransmissionCorruptionBand, readonly [number, number]> = {
  local: [0, 1],
  "same-system": [0, 3],
  "nearby-inter-system": [2, 8],
  "long-range": [5, 15],
  "warp-anomalous": [12, 30],
};

const CORRUPTION_GLYPHS = ["█", "▒", "?", "/", "\\"] as const;

export function hashTransmissionValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function classifyTransmissionSource(source: TransmissionSourceMetadata): TransmissionCorruptionBand {
  const metadata = `${source.agency} ${source.subject} ${source.preview ?? ""}`.toLowerCase();

  if (/warp|rift|anomal|impossible|soul-binding|signal echo|navigator|kharon|black channel|vesper drift/.test(metadata)) {
    return "warp-anomalous";
  }
  if (/lunar dragons|lunaris|chapter command|internal|data reliquarium|archive command/.test(metadata)) {
    return "local";
  }
  if (/selene|vigil ix|veil anchor|orison|draconis gate/.test(metadata)) {
    return "same-system";
  }
  if (/nachmund|moonward|convoy|task group|passage|reclamation corridor/.test(metadata)) {
    return "nearby-inter-system";
  }
  return "long-range";
}

export function transmissionCorruptionProfile(source: TransmissionSourceMetadata): TransmissionCorruptionProfile {
  const band = classifyTransmissionSource(source);
  const seed = hashTransmissionValue([
    source.id,
    source.agency,
    source.subject,
    source.priority ?? "",
    source.received ?? "",
  ].join("|"));
  const [minimum, maximum] = CORRUPTION_RANGES[band];
  const spanInHundredths = ((maximum - minimum) * 100) + 1;
  const percentage = minimum + ((seed % spanInHundredths) / 100);

  return { band, percentage, seed };
}

export function formatCorruptionPercentage(value: number) {
  return `${value.toFixed(2)}%`;
}

export function corruptTransmissionText(text: string, profile: TransmissionCorruptionProfile, lineIndex: number) {
  if (profile.percentage <= 0) return text;

  const threshold = Math.round(profile.percentage * 100);
  return Array.from(text, (character, characterIndex) => {
    if (!/[A-Za-z0-9]/.test(character)) return character;

    const positionHash = hashTransmissionValue(`${profile.seed}:${lineIndex}:${characterIndex}`);
    if (positionHash % 10000 >= threshold) return character;

    const glyphHash = hashTransmissionValue(`${profile.seed}:${lineIndex}:${characterIndex}:glyph`);
    return CORRUPTION_GLYPHS[glyphHash % CORRUPTION_GLYPHS.length];
  }).join("");
}

export function transmissionRetrievalPause(seed: number, lineIndex: number) {
  return 400 + (hashTransmissionValue(`${seed}:${lineIndex}:pause`) % 501);
}
