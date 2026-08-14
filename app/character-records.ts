import type { ChapterCharacter } from "./archive-data";
import type { CharacterExtractionProposal } from "./character-extractor";

type ExtractedCharacterDraftOptions = {
  proposal: CharacterExtractionProposal;
  loreEntryIds: readonly string[];
  existingCharacter?: ChapterCharacter | null;
  newId: string;
  now: number;
};

type ApplyCharacterDraftResult =
  | { ok: true; characters: ChapterCharacter[] }
  | { ok: false; error: string };

export function createExtractedCharacterDraft({
  proposal,
  loreEntryIds,
  existingCharacter,
  newId,
  now,
}: ExtractedCharacterDraftOptions): ChapterCharacter {
  return {
    id: existingCharacter?.id ?? newId,
    ...proposal,
    rank: proposal.rank || "Rank unrecorded",
    role: proposal.role || "Role unrecorded",
    loreEntryIds: [...loreEntryIds],
    createdAt: existingCharacter?.createdAt ?? now,
    updatedAt: now,
  };
}

export function applyCharacterDraft(
  characters: readonly ChapterCharacter[],
  draft: ChapterCharacter,
  targetCharacterId: string | null,
): ApplyCharacterDraftResult {
  if (targetCharacterId) {
    const targetIndex = characters.findIndex((character) => character.id === targetCharacterId);
    if (targetIndex < 0) {
      return {
        ok: false,
        error: "The character being revised no longer exists. Reload the archive before trying again.",
      };
    }

    const target = characters[targetIndex];
    const revised: ChapterCharacter = {
      ...draft,
      id: target.id,
      createdAt: target.createdAt,
    };
    return {
      ok: true,
      characters: characters.map((character, index) => index === targetIndex ? revised : character),
    };
  }

  if (characters.some((character) => character.id === draft.id)) {
    return {
      ok: false,
      error: "The new character identifier already exists. Close the editor and try again.",
    };
  }

  return { ok: true, characters: [...characters, draft] };
}

export function removeCharacterRecord(
  characters: readonly ChapterCharacter[],
  targetCharacterId: string,
): ApplyCharacterDraftResult {
  const matches = characters.filter((character) => character.id === targetCharacterId);
  if (matches.length !== 1) {
    return {
      ok: false,
      error: matches.length === 0
        ? "The character selected for deletion no longer exists. Reload the archive before trying again."
        : "The character identifier is ambiguous. The archive was not changed.",
    };
  }

  return {
    ok: true,
    characters: characters.filter((character) => character.id !== targetCharacterId),
  };
}
