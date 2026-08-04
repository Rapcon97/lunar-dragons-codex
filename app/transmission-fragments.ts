const FRAGMENT_SEED_VERSION = "relay-event:v2";

function hashFragmentValue(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededBoundary(rootTransmissionId: string, boundary: number, wordCount: number, total: number) {
  const ideal = Math.floor((wordCount * boundary) / total);
  const jitterRange = Math.max(1, Math.floor(wordCount / 18));
  const jitterHash = hashFragmentValue(
    `${FRAGMENT_SEED_VERSION}|${rootTransmissionId}|fragment-boundary-${boundary}`,
  );
  return ideal + ((jitterHash % ((jitterRange * 2) + 1)) - jitterRange);
}

/**
 * Deterministically partitions a transmission at word boundaries. Fragments
 * never overlap, and joining them in ordinal order reconstructs the source.
 */
export function transmissionBodyFragments(
  body: string,
  rootTransmissionId: string,
  total = 3,
) {
  const normalized = body.trim();
  if (!normalized) return Array.from({ length: total }, () => "");

  const words = normalized.match(/\S+(?:\s+|$)/gu) ?? [normalized];
  if (total <= 1 || words.length < total) return [normalized];

  const boundaries = [0];
  for (let boundary = 1; boundary < total; boundary += 1) {
    const minimum = boundaries[boundaries.length - 1] + 1;
    const maximum = words.length - (total - boundary);
    boundaries.push(Math.max(minimum, Math.min(maximum,
      seededBoundary(rootTransmissionId, boundary, words.length, total),
    )));
  }
  boundaries.push(words.length);

  return boundaries.slice(0, -1).map((start, index) => (
    words.slice(start, boundaries[index + 1]).join("").trim()
  ));
}

export function transmissionBodyFragment(
  body: string,
  rootTransmissionId: string,
  index: number,
  total = 3,
) {
  return transmissionBodyFragments(body, rootTransmissionId, total)[index - 1] ?? "";
}
