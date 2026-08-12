"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ChapterCharacter,
  ChapterCharacterStatus,
  ChapterCompany,
  LoreEntry,
} from "../archive-data";

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
  const [deedsText, setDeedsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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
    setDeedsText(character.heroicDeeds.join("\n"));
    setSaveMessage("");
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
    const exists = characters.some((character) => character.id === nextCharacter.id);
    const next = exists
      ? characters.map((character) => character.id === nextCharacter.id ? nextCharacter : character)
      : [...characters, nextCharacter];
    setIsSaving(true);
    const saved = await onSave(next);
    setIsSaving(false);
    if (saved) {
      setEditing(null);
      setSaveMessage("");
    } else {
      setSaveMessage("The personnel record could not be saved.");
    }
  }

  return (
    <section className="character-reliquary" aria-labelledby="character-directory-title">
      <header className="character-reliquary-header panel">
        <div>
          <p className="section-kicker">Adeptus Astartes · Personnel Reliquary</p>
          <h1 id="character-directory-title">Chapter Characters</h1>
          <p>Operational profiles, service histories, heroic deeds, and canon-linked references.</p>
        </div>
        <div className="character-reliquary-summary">
          <span>RECORDED PERSONNEL</span>
          <strong>{characters.length}</strong>
          {canEdit && <button className="seal-button" onClick={() => beginEdit(emptyCharacter())} type="button">ADD CHARACTER</button>}
        </div>
      </header>

      <div className="character-directory-tools panel" aria-label="Character directory filters">
        <label>
          <span>SEARCH RECORDS</span>
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
        <div className="character-filter-count"><span>VISIBLE</span><strong>{filtered.length}</strong></div>
      </div>

      {filtered.length ? (
        <div className="character-directory-grid">
          {filtered.map((character) => {
            const company = companies.find((candidate) => candidate.number === character.companyNumber);
            const sourceCount = character.loreEntryIds.filter((id) => canonEntries.some((entry) => entry.id === id)).length;
            return (
              <article className="character-index-card panel" key={character.id}>
                <div className="character-index-mark" aria-hidden="true">{character.name.trim().slice(0, 1).toUpperCase() || "?"}</div>
                <div className="character-index-copy">
                  <div className="character-index-status"><span>{STATUS_LABELS[character.status]}</span><i>{sourceCount} CANON SOURCE{sourceCount === 1 ? "" : "S"}</i></div>
                  <h2>{character.name}</h2>
                  {character.honorific && <p className="character-honorific">{character.honorific}</p>}
                  <dl>
                    <div><dt>Rank</dt><dd>{character.rank}</dd></div>
                    <div><dt>Assignment</dt><dd>{company ? `${company.number} · ${company.name}` : "Unassigned"}</dd></div>
                    <div><dt>Function</dt><dd>{character.role}</dd></div>
                    <div><dt>Introduced</dt><dd>{character.introducedAt || "Unrecorded"}</dd></div>
                  </dl>
                </div>
                <div className="character-index-actions">
                  <Link className="seal-button" href={`/characters/${encodeURIComponent(character.id)}`}>OPEN PROFILE</Link>
                  {canEdit && <button className="seal-button" onClick={() => beginEdit(character)} type="button">EDIT RECORD</button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="character-directory-empty panel">
          <span aria-hidden="true">◇</span>
          <h2>{characters.length ? "No personnel match this query" : "No character records have been sealed"}</h2>
          <p>{characters.length ? "Adjust the practical directory filters to recover another record." : "The reliquary is ready. No names or deeds have been invented to fill it."}</p>
          {canEdit && !characters.length && <button className="seal-button" onClick={() => beginEdit(emptyCharacter())} type="button">ADD FIRST CHARACTER</button>}
        </div>
      )}

      {editing && (
        <div className="character-editor-backdrop" role="presentation">
          <section aria-labelledby="character-editor-title" aria-modal="true" className="character-editor-dialog" role="dialog">
            <header>
              <div><p className="section-kicker">Administratum personnel editor</p><h2 id="character-editor-title">{characters.some((character) => character.id === editing.id) ? "Revise Character Record" : "Create Character Record"}</h2></div>
              <button className="seal-button" onClick={() => setEditing(null)} type="button">CLOSE</button>
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
    </section>
  );
}
