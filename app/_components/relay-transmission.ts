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

export const TRANSMISSION_TIMING = {
  characterMs: 50,
  minorPunctuationAdditionalMs: 100,
  terminalPunctuationAdditionalMs: 180,
  lineBreakMs: 200,
  retrievalDotMs: 500,
  retrievalDotCount: 4,
  corruptionStepMs: 40,
} as const;

const CORRUPTION_RANGES: Record<TransmissionCorruptionBand, readonly [number, number]> = {
  local: [0, 1],
  "same-system": [0, 3],
  "nearby-inter-system": [2, 8],
  "long-range": [5, 15],
  "warp-anomalous": [12, 30],
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
