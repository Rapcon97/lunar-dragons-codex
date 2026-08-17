export const romanSectionHeadingPattern =
  /^(?:#{1,3}\s+)?([IVXLCDM]+)(?:\.|:|\)|\s*[—–-])\s+(.+?)\s*$/i;

export const romanSubsectionHeadingPattern =
  /^(?:#{1,3}\s+)?([IVXLCDM]+)-([A-Z])(?:\.|:|\))\s+(.+?)\s*$/i;

export type NextLoreSubsection =
  | {
      ok: true;
      parentNumeral: string;
      suffix: string;
      headingPrefix: string;
    }
  | {
      ok: false;
      reason: "no-parent" | "suffixes-exhausted";
    };

export function deriveNextLoreSubsection(
  content: string,
  selectionStart: number,
): NextLoreSubsection {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const cursor = Math.max(0, Math.min(selectionStart, normalized.length));
  const cursorLineIndex = normalized.slice(0, cursor).split("\n").length - 1;

  let parentNumeral = "";
  for (let index = Math.min(cursorLineIndex, lines.length - 1); index >= 0; index -= 1) {
    const match = lines[index].trim().match(romanSectionHeadingPattern);
    if (!match) continue;
    parentNumeral = match[1].toUpperCase();
    break;
  }

  if (!parentNumeral) return { ok: false, reason: "no-parent" };

  let highestSuffix = 64;
  for (const line of lines) {
    const match = line.trim().match(romanSubsectionHeadingPattern);
    if (!match || match[1].toUpperCase() !== parentNumeral) continue;
    highestSuffix = Math.max(highestSuffix, match[2].toUpperCase().charCodeAt(0));
  }

  if (highestSuffix >= 90) {
    return { ok: false, reason: "suffixes-exhausted" };
  }

  const suffix = String.fromCharCode(highestSuffix + 1);
  return {
    ok: true,
    parentNumeral,
    suffix,
    headingPrefix: `${parentNumeral}-${suffix}.`,
  };
}
