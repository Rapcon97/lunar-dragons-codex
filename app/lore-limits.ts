export const MAX_LORE_CONTENT_LENGTH = 64_000;
export const MAX_LORE_COLLECTION_BYTES = 512 * 1024;

export const LORE_COLLECTION_CAPACITY_ERROR =
  "The structured lore collection exceeds the 512 KB archive capacity.";

export function loreCollectionSizeBytes(entries: readonly unknown[]) {
  return new TextEncoder().encode(JSON.stringify(entries)).byteLength;
}

export function loreCollectionFitsCapacity(entries: readonly unknown[]) {
  return loreCollectionSizeBytes(entries) <= MAX_LORE_COLLECTION_BYTES;
}
