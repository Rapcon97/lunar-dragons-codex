"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ChapterCharacter,
  ChapterCharacterStatus,
  ChapterCompany,
  LoreEntry,
} from "../archive-data";
import type { CharacterExtractionAnswer } from "../character-extractor";
import { applyCharacterDraft, createExtractedCharacterDraft, removeCharacterRecord } from "../character-records";
import { ArchiveTerminalFrame } from "./ArchiveTerminalFrame";
import { CharacterDossier } from "./CharacterDossier";

type CharacterDirectoryProps = {
  canEdit: boolean;
  error: string;
  isLoading: boolean;
  characters: ChapterCharacter[];
  companies: ChapterCompany[];
  loreEntries: LoreEntry[];
  onSave: (characters: ChapterCharacter[]) => Promise<boolean>;
};

const STATUS_LABELS: Record<ChapterCharacterStatus, string> = {
  active: "Active service",
  deceased: "Fallen",
  missing: "Missing",
  interred: "Interred",
};

function emptyCharacter(): ChapterCharacter {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "",
    rank: "",
    honorific: "",
    role: "",
    companyNumber: "",
    status: "active",
    introducedAt: "",
    deathAt: "",
    biography: "",
    heroicDeeds: [],
    loreEntryIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function CharacterDirectory({
  canEdit,
  error,
  isLoading,
  characters,
  companies,
  loreEntries,
  onSave,
}: CharacterDirectoryProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChapterCharacterStatus>("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [editing, setEditing] = useState<ChapterCharacter | null>(null);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [deedsText, setDeedsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [deleting, setDeleting] = useState<ChapterCharacter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);
  const [extractionTargetId, setExtractionTargetId] = useState<string | null>(null);
  const [extractionIds, setExtractionIds] = useState<string[]>([]);
  const [extractionGuidance, setExtractionGuidance] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const [extractionUnresolved, setExtractionUnresolved] = useState<string[]>([]);

  const canonEntries = useMemo(
    () => loreEntries.filter((entry) => entry.status === "canon"),
    [loreEntries],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return characters.filter((character) => {
      const company = companies.find((candidate) => candidate.number === character.companyNumber);
      const matchesQuery = !needle || [
        character.name,
        character.rank,
        character.honorific,
        character.role,
        company?.name ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(needle));
      const matchesStatus = statusFilter === "all" || character.status === statusFilter;
      const matchesCompany = companyFilter === "all" || character.companyNumber === companyFilter;
      return matchesQuery && matchesStatus && matchesCompany;
    });
  }, [characters, companies, companyFilter, query, statusFilter]);
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  useEffect(() => {
    const selectFromLocation = () => {
      const id = new URLSearchParams(window.location.search).get("record");
      setSelectedCharacterId(id && characters.some((character) => character.id === id) ? id : null);
    };
    selectFromLocation();
    window.addEventListener("popstate", selectFromLocation);
    return () => window.removeEventListener("popstate", selectFromLocation);
  }, [characters]);

  if (isLoading || error) {
    return (
      <section className="panel company-loading-state" aria-live="polite">
        <span className="section-kicker">PERSONAE · AUTHORITATIVE ARCHIVE</span>
        <h1>{error ? "Personnel reliquary unavailable" : "Retrieving character records"}</h1>
        <p>{error || "Consulting the Site-managed Chapter archive…"}</p>
      </section>
    );
  }

  function beginEdit(character: ChapterCharacter) {
    setEditing({ ...character, heroicDeeds: [...character.heroicDeeds], loreEntryIds: [...character.loreEntryIds] });
    setEditingTargetId(character.id);
    setDeedsText(character.heroicDeeds.join("\n"));
    setSaveMessage("");
  }

  function beginCreate() {
    const character = emptyCharacter();
    setEditing(character);
    setEditingTargetId(null);
    setDeedsText("");
    setSaveMessage("");
  }

  function beginDelete(character: ChapterCharacter) {
    setDeleting(character);
    setDeleteMessage("");
  }

  function selectCharacter(character: ChapterCharacter) {
    setSelectedCharacterId(character.id);
    const url = new URL(window.location.href);
    url.searchParams.set("record", character.id);
    window.history.pushState({ characterId: character.id }, "", url);
  }

  function clearSelection() {
    setSelectedCharacterId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("record");
    window.history.pushState({}, "", url);
  }

  function openExtractor(character: ChapterCharacter | null = null) {
    setExtractionTargetId(character?.id ?? null);
    setExtractionIds(character?.loreEntryIds.filter((id) => canonEntries.some((entry) => entry.id === id)) ?? []);
    setExtractionGuidance(character ? `Revise the existing personnel record for ${character.name}. Extract that character only.` : "");
    setExtractionMessage("");
    setExtractionUnresolved([]);
    setIsExtractorOpen(true);
  }

  function toggleExtractionSource(id: string, selected: boolean) {
    setExtractionIds((current) => selected
      ? [...current, id]
      : current.filter((candidate) => candidate !== id));
  }

  async function extractCharacter() {
    if (!extractionIds.length) {
      setExtractionMessage("Select at least one established canon record.");
      return;
    }
    setIsExtracting(true);
    setExtractionMessage("");
    setExtractionUnresolved([]);
    try {
      const response = await fetch("/api/admin/character-extractor", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-lunar-admin-mode": "active",
        },
        body: JSON.stringify({
          loreEntryIds: extractionIds,
          instructions: extractionGuidance,
        }),
      });
      const answer = (await response.json()) as CharacterExtractionAnswer & { error?: string };
      if (!response.ok) throw new Error(answer.error || "The character proposal could not be extracted.");
      setExtractionMessage(answer.summary);
      setExtractionUnresolved(answer.unresolved);
      if (!answer.proposal) return;

      const now = Date.now();
      const extractionTarget = extractionTargetId
        ? characters.find((character) => character.id === extractionTargetId)
        : null;
      if (extractionTargetId && !extractionTarget) {
        throw new Error("The character selected for revision no longer exists. Reload the archive before trying again.");
      }
      const proposal = createExtractedCharacterDraft({
        proposal: answer.proposal,
        loreEntryIds: extractionIds,
        existingCharacter: extractionTarget,
        newId: crypto.randomUUID(),
        now,
      });
      setIsExtractorOpen(false);
      setEditing(proposal);
      setEditingTargetId(extractionTarget?.id ?? null);
      setDeedsText(proposal.heroicDeeds.join("\n"));
      setSaveMessage("Review every extracted field before saving. Nothing has been written yet.");
    } catch (error) {
      setExtractionMessage(error instanceof Error ? error.message : "Character extraction is temporarily unavailable.");
    } finally {
      setIsExtracting(false);
    }
  }

  function updateEditing<K extends keyof ChapterCharacter>(key: K, value: ChapterCharacter[K]) {
    setEditing((current) => current ? { ...current, [key]: value } : current);
  }

  async function saveCharacter() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setSaveMessage("A character name is required.");
      return;
    }
    const now = Date.now();
    const nextCharacter: ChapterCharacter = {
      ...editing,
      name: editing.name.trim(),
      rank: editing.rank.trim() || "Rank unrecorded",
      role: editing.role.trim() || "Role unrecorded",
      heroicDeeds: deedsText.split(/\r?\n/u).map((deed) => deed.trim()).filter(Boolean),
      updatedAt: now,
    };
    const applied = applyCharacterDraft(characters, nextCharacter, editingTargetId);
    if (!applied.ok) {
      setSaveMessage(applied.error);
      return;
    }
    setIsSaving(true);
    const saved = await onSave(applied.characters);
    setIsSaving(false);
    if (saved) {
      setEditing(null);
      setEditingTargetId(null);
      setSaveMessage("");
    } else {
      setSaveMessage("The personnel record could not be saved.");
    }
  }

  async function deleteCharacter() {
    if (!deleting) return;
    const removed = removeCharacterRecord(characters, deleting.id);
    if (!removed.ok) {
      setDeleteMessage(removed.error);
      return;
    }

    setIsDeleting(true);
    const saved = await onSave(removed.characters);
    setIsDeleting(false);
    if (!saved) {
      setDeleteMessage("The personnel record could not be deleted.");
      return;
    }

    if (selectedCharacterId === deleting.id) clearSelection();
    setDeleting(null);
    setDeleteMessage("");
  }

  return (
    <>
    <ArchiveTerminalFrame
      labelledBy="character-directory-title"
      className="character-reliquary"
      bodyClassName={`character-workspace panel${selectedCharacter ? " has-selection" : ""}`}
      header={<header className="archive-terminal-frame-header character-reliquary-header">
        <div>
          <p className="section-kicker">Adeptus Astartes · Personnel Reliquary</p>
          <h1 id="character-directory-title">PERSONNEL EXLOAD TERMINAL</h1>
        </div>
        <div className="character-reliquary-summary">
          <span>RELIQUARY LINK ACTIVE · {String(characters.length).padStart(2, "0")} RECORDED PERSONNEL</span>
          {canEdit && <div className="character-reliquary-actions"><button className="seal-button" onClick={() => openExtractor()} type="button">EXTRACT NEW FROM LORE</button><button className="seal-button" onClick={beginCreate} type="button">ADD MANUALLY</button></div>}
        </div>
      </header>}
      index={<aside className="character-workspace-index" aria-label="Character record index">
          <div className="character-directory-tools" aria-label="Character directory filters">
            <label className="character-search-field">
              <span>SEARCH PERSONNEL</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Name, rank, role, or company" type="search" value={query} />
            </label>
            <label>
              <span>SERVICE STATE</span>
              <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
                <option value="all">All states</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>COMPANY</span>
              <select onChange={(event) => setCompanyFilter(event.target.value)} value={companyFilter}>
                <option value="all">All companies</option>
                {companies.map((company) => <option key={company.number} value={company.number}>{company.number} · {company.name}</option>)}
              </select>
            </label>
            <div className="character-filter-count"><span>VISIBLE RECORDS</span><strong>{filtered.length}</strong></div>
          </div>

          <div className="character-workspace-list">
          {filtered.length ? filtered.map((character) => {
            const company = companies.find((candidate) => candidate.number === character.companyNumber);
            const sourceCount = character.loreEntryIds.filter((id) => canonEntries.some((entry) => entry.id === id)).length;
            return (
              <button
                aria-current={selectedCharacterId === character.id ? "true" : undefined}
                className={`character-index-card${selectedCharacterId === character.id ? " is-selected" : ""}`}
                key={character.id}
                onClick={() => selectCharacter(character)}
                type="button"
              >
                <div className="character-index-mark" aria-hidden="true">{character.name.trim().slice(0, 1).toUpperCase() || "?"}</div>
                <div className="character-index-copy">
                  <div className="character-index-status"><span>{STATUS_LABELS[character.status]}</span><i>{sourceCount} CANON SOURCE{sourceCount === 1 ? "" : "S"}</i></div>
                  <h2>{character.name}</h2>
                  {character.honorific && <p className="character-honorific">{character.honorific}</p>}
                  <p className="character-index-assignment">{character.rank} · {company ? `${company.number} · ${company.name}` : "Unassigned"}</p>
                  <p className="character-index-function">{character.role}</p>
                </div>
                <span className="character-index-open">OPEN DOSSIER ›</span>
              </button>
            );
          }) : (
            <div className="character-directory-empty">
              <span aria-hidden="true">◇</span>
              <h2>{characters.length ? "No personnel match this query" : "No character records have been sealed"}</h2>
              <p>{characters.length ? "Adjust the directory filters to recover another record." : "The reliquary is ready. No names or deeds have been invented to fill it."}</p>
              {canEdit && !characters.length && <button className="seal-button" onClick={beginCreate} type="button">ADD FIRST CHARACTER</button>}
            </div>
          )}
          </div>
        </aside>}
      detail={<div className="character-workspace-detail" role="region" aria-label="Selected character dossier">
          <CharacterDossier
            canEdit={canEdit}
            character={selectedCharacter}
            companies={companies}
            loreEntries={loreEntries}
            onClear={clearSelection}
            onDelete={beginDelete}
            onEdit={beginEdit}
            onExtract={openExtractor}
          />
        </div>}
    />

      {editing && (
        <div className="character-editor-backdrop" role="presentation">
          <section aria-labelledby="character-editor-title" aria-modal="true" className="character-editor-dialog" role="dialog">
            <header>
              <div><p className="section-kicker">Administratum personnel editor</p><h2 id="character-editor-title">{editingTargetId ? "Revise Character Record" : "Create Character Record"}</h2></div>
              <button className="seal-button" onClick={() => { setEditing(null); setEditingTargetId(null); }} type="button">CLOSE</button>
            </header>
            <div className="character-editor-scroll">
              <div className="character-editor-grid">
                <label><span>NAME</span><input onChange={(event) => updateEditing("name", event.target.value)} value={editing.name} /></label>
                <label><span>RANK</span><input onChange={(event) => updateEditing("rank", event.target.value)} value={editing.rank} /></label>
                <label className="span-two"><span>HONORIFIC / EPITHET</span><input onChange={(event) => updateEditing("honorific", event.target.value)} value={editing.honorific} /></label>
                <label><span>FUNCTION</span><input onChange={(event) => updateEditing("role", event.target.value)} value={editing.role} /></label>
                <label><span>COMPANY</span><select onChange={(event) => updateEditing("companyNumber", event.target.value)} value={editing.companyNumber}><option value="">Unassigned</option>{companies.map((company) => <option key={company.number} value={company.number}>{company.number} · {company.name}</option>)}</select></label>
                <label><span>SERVICE STATE</span><select onChange={(event) => updateEditing("status", event.target.value as ChapterCharacterStatus)} value={editing.status}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>INTRODUCED / FIRST RECORDED</span><input onChange={(event) => updateEditing("introducedAt", event.target.value)} value={editing.introducedAt} /></label>
                <label><span>DEATH / LOSS DATE</span><input disabled={editing.status === "active" || editing.status === "interred"} onChange={(event) => updateEditing("deathAt", event.target.value)} value={editing.deathAt} /></label>
                <label className="span-two"><span>ARCHIVAL BIOGRAPHY</span><textarea onChange={(event) => updateEditing("biography", event.target.value)} rows={8} value={editing.biography} /></label>
                <label className="span-two"><span>HEROIC DEEDS · ONE PER LINE</span><textarea onChange={(event) => setDeedsText(event.target.value)} rows={6} value={deedsText} /></label>
              </div>
              <fieldset className="character-canon-links">
                <legend>ESTABLISHED CANON REFERENCES</legend>
                <p>Links establish provenance; operational profile fields do not become canon automatically.</p>
                {canonEntries.length ? canonEntries.map((entry) => (
                  <label key={entry.id}>
                    <input
                      checked={editing.loreEntryIds.includes(entry.id)}
                      onChange={(event) => updateEditing("loreEntryIds", event.target.checked ? [...editing.loreEntryIds, entry.id] : editing.loreEntryIds.filter((id) => id !== entry.id))}
                      type="checkbox"
                    />
                    <span>{entry.title}</span><small>{entry.date || "Undated"}</small>
                  </label>
                )) : <em>No canon records are currently available to link.</em>}
              </fieldset>
            </div>
            <footer><p role="status">{saveMessage || "Character records remain operational data unless supported by linked canon."}</p><button className="seal-button" disabled={isSaving} onClick={() => void saveCharacter()} type="button">{isSaving ? "SAVING…" : "SAVE RECORD"}</button></footer>
          </section>
        </div>
      )}

      {isExtractorOpen && (
        <div className="character-editor-backdrop" role="presentation">
          <section aria-labelledby="character-extractor-title" aria-modal="true" className="character-editor-dialog character-extractor-dialog" role="dialog">
            <header>
              <div><p className="section-kicker">Canon-guided personnel extraction</p><h2 id="character-extractor-title">{extractionTargetId ? "Revise Character from Lore" : "Create Character from Lore"}</h2></div>
              <button className="seal-button" onClick={() => setIsExtractorOpen(false)} type="button">CLOSE</button>
            </header>
            <div className="character-editor-scroll">
              <div className="character-extractor-intro panel">
                <strong>SELECT ESTABLISHED SOURCES</strong>
                <p>The Lore Cogitator extracts only what these canon records support. It creates an editable proposal and cannot save or publish a character. Revisions preserve the selected personnel record&apos;s stable identity.</p>
              </div>
              <fieldset className="character-canon-links character-extractor-sources">
                <legend>CANON LORE ARCHIVE</legend>
                {canonEntries.length ? canonEntries.map((entry) => (
                  <label key={entry.id}>
                    <input
                      checked={extractionIds.includes(entry.id)}
                      onChange={(event) => toggleExtractionSource(entry.id, event.target.checked)}
                      type="checkbox"
                    />
                    <span>{entry.title}</span><small>{entry.date || "Undated"} · {entry.category}</small>
                  </label>
                )) : <em>No canon records are currently available for extraction.</em>}
              </fieldset>
              <label className="character-extractor-guidance">
                <span>OPTIONAL EXTRACTION GUIDANCE</span>
                <textarea
                  maxLength={1500}
                  onChange={(event) => setExtractionGuidance(event.target.value)}
                  placeholder="For records containing several people, identify the intended character or specify what to focus on."
                  rows={4}
                  value={extractionGuidance}
                />
              </label>
              {(extractionMessage || extractionUnresolved.length > 0) && (
                <div className="character-extractor-result" role="status">
                  {extractionMessage && <p>{extractionMessage}</p>}
                  {extractionUnresolved.length > 0 && <><strong>UNRESOLVED</strong><ul>{extractionUnresolved.map((item) => <li key={item}>{item}</li>)}</ul></>}
                </div>
              )}
            </div>
            <footer>
              <p>{extractionIds.length} canon source{extractionIds.length === 1 ? "" : "s"} selected · proposal remains unsaved</p>
              <button className="seal-button" disabled={isExtracting || !extractionIds.length} onClick={() => void extractCharacter()} type="button">{isExtracting ? "COGITATING…" : "GENERATE EDITABLE PROPOSAL"}</button>
            </footer>
          </section>
        </div>
      )}

      {deleting && (
        <div className="character-editor-backdrop" role="presentation">
          <section aria-labelledby="character-delete-title" aria-modal="true" className="character-editor-dialog character-delete-dialog" role="dialog">
            <header>
              <div><p className="section-kicker">Administratum personnel deletion</p><h2 id="character-delete-title">Delete Character Record</h2></div>
              <button className="seal-button" disabled={isDeleting} onClick={() => setDeleting(null)} type="button">CLOSE</button>
            </header>
            <div className="character-delete-warning">
              <strong>THIS ACTION CANNOT BE UNDONE</strong>
              <p>Only the selected operational character record will be removed. Linked Chronicle lore is not altered.</p>
              <dl>
                <div><dt>CHARACTER</dt><dd>{deleting.name}</dd></div>
                <div><dt>STABLE IDENT</dt><dd>{deleting.id}</dd></div>
              </dl>
              {deleteMessage && <p className="character-delete-error" role="alert">{deleteMessage}</p>}
            </div>
            <footer>
              <p>Verify the stable ident before confirming deletion.</p>
              <div className="character-delete-actions">
                <button className="seal-button" disabled={isDeleting} onClick={() => setDeleting(null)} type="button">KEEP RECORD</button>
                <button className="seal-button character-delete-button" disabled={isDeleting} onClick={() => void deleteCharacter()} type="button">{isDeleting ? "DELETING…" : "DELETE CHARACTER"}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
