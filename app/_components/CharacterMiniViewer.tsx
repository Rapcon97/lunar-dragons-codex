"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ChapterCharacter, ChapterCharacterStatus, ChapterCompany, LoreEntry } from "../archive-data";
import { LoreFormattedContent } from "./LoreFormattedContent";

const STATUS_LABELS: Record<ChapterCharacterStatus, string> = {
  active: "ACTIVE SERVICE",
  deceased: "FALLEN · HONOUR ROLL",
  missing: "MISSING · FATE UNRESOLVED",
  interred: "INTERRED · CONTINUING SERVICE",
};

type CharacterMiniViewerProps = {
  character: ChapterCharacter;
  companies: ChapterCompany[];
  loreEntries: LoreEntry[];
  onClose: () => void;
  onEdit?: (character: ChapterCharacter) => void;
};

export function CharacterMiniViewer({
  character,
  companies,
  loreEntries,
  onClose,
  onEdit,
}: CharacterMiniViewerProps) {
  const company = companies.find((candidate) => candidate.number === character.companyNumber);
  const companyIndex = company ? companies.indexOf(company) + 1 : 0;
  const canonSources = character.loreEntryIds
    .map((id) => loreEntries.find((entry) => entry.id === id && entry.status === "canon"))
    .filter((entry) => entry !== undefined);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="character-viewer-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <section
        aria-labelledby="character-viewer-title"
        aria-modal="true"
        className="character-viewer-dialog"
        role="dialog"
      >
        <header className="character-viewer-header">
          <div className="character-viewer-mark" aria-hidden="true">
            {character.name.trim().slice(0, 1).toUpperCase() || "?"}
          </div>
          <div className="character-viewer-heading">
            <p className="section-kicker">PERSONAE · {STATUS_LABELS[character.status]}</p>
            <h2 id="character-viewer-title">{character.name}</h2>
            {character.honorific && <p>{character.honorific}</p>}
            <strong>{character.rank} · {character.role}</strong>
          </div>
          <button aria-label="Close character viewer" className="seal-button" onClick={onClose} type="button">
            CLOSE ×
          </button>
        </header>

        <div className="character-viewer-scroll">
          <dl className="character-viewer-vitals">
            <div>
              <dt>Company</dt>
              <dd>{company ? <Link href={`/companies/${companyIndex}`}>{company.number} · {company.name}</Link> : "Unassigned"}</dd>
            </div>
            <div><dt>First recorded</dt><dd>{character.introducedAt || "Unrecorded"}</dd></div>
            <div><dt>Death / loss</dt><dd>{character.deathAt || "Not applicable / unrecorded"}</dd></div>
            <div><dt>Stable ident</dt><dd>{character.id}</dd></div>
          </dl>

          <div className="character-viewer-records">
            <section className="character-viewer-biography">
              <p className="section-kicker">Archival biography</p>
              <h3>Service Record</h3>
              {character.biography
                ? <LoreFormattedContent content={character.biography} />
                : <p className="character-profile-empty">No biographical account has yet been entered.</p>}
            </section>
            <aside className="character-viewer-deeds">
              <p className="section-kicker">Honours & actions</p>
              <h3>Heroic Deeds</h3>
              {character.heroicDeeds.length ? (
                <ol>
                  {character.heroicDeeds.map((deed, index) => (
                    <li key={`${deed}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{deed}</p></li>
                  ))}
                </ol>
              ) : <p className="character-profile-empty">No deeds have yet been sealed to this operational record.</p>}
            </aside>
          </div>

          <section className="character-viewer-sources">
            <header><div><p className="section-kicker">Canon provenance</p><h3>Archive References</h3></div><span>{canonSources.length} VERIFIED</span></header>
            {canonSources.length ? (
              <div>
                {canonSources.map((entry) => (
                  <article key={entry.id}>
                    <div><span>{entry.date || "UNDATED"} · {entry.category.toUpperCase()}</span><h4>{entry.title}</h4></div>
                    <Link className="seal-button" href={`/chronicles?record=${encodeURIComponent(entry.id)}`}>OPEN CHRONICLE</Link>
                  </article>
                ))}
              </div>
            ) : <p className="character-profile-empty">No established canon source is linked to this operational profile.</p>}
          </section>
        </div>

        <footer className="character-viewer-footer">
          <span>PERSONAE DATA-VAULT · OPERATIONAL RECORD</span>
          {onEdit && <button className="seal-button" onClick={() => onEdit(character)} type="button">EDIT RECORD</button>}
        </footer>
      </section>
    </div>
  );
}
