import type { LoreEntry } from "./archive-data";

export function chronicleEntriesForViewer(
  entries: LoreEntry[],
  canAdmin: boolean,
  isAdminMode: boolean,
) {
  return canAdmin && isAdminMode
    ? entries
    : entries.filter((entry) => entry.status === "canon");
}
