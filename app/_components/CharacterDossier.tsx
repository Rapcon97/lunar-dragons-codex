"use client";

import Link from "next/link";
import type {
  ChapterCharacter,
  ChapterCharacterStatus,
  ChapterCompany,
  LoreEntry,
} from "../archive-data";
import { LoreFormattedContent } from "./LoreFormattedContent";

const STATUS_LABELS: Record<ChapterCharacterStatus, string> = {
  active: "ACTIVE SERVICE",
  deceased: "FALLEN · HONOUR ROLL",
  missing: "MISSING · FATE UNRESOLVED",
  interred: "INTERRED · CONTINUING SERVICE",
};

type CharacterDossierProps = {
  character: ChapterCharacter | null;
  companies: ChapterCompany[];
  loreEntries: LoreEntry[];
  canEdit: boolean;
  onClear: () => void;
  onEdit: (character: ChapterCharacter) => void;
};

export function CharacterDossier({
  character,
  companies,
  loreEntries,
  canEdit,
  onClear,
  onEdit,
}: CharacterDossierProps) {
  if (!character) {
    return (
      <section className="character-workspace-empty" aria-live="polite">
        <div className="character-workspace-empty-mark" aria-hidden="true">III</div>
        <p className="section-kicker">PERSONAE DATA-VAULT · STANDING BY</p>
        <h2>Select Personnel Record</h2>
        <p>Choose a character from the index to retrieve their complete service dossier, recorded deeds, and established Chronicle provenance.</p>
      </section>
    );
  }

  const company = companies.find((candidate) => candidate.number === character.companyNumber);
  const companyIndex = company ? companies.indexOf(company) + 1 : 0;
  const canonSources = character.loreEntryIds
    .map((id) => loreEntries.find((entry) => entry.id === id && entry.status === "canon"))
    .filter((entry) => entry !== undefined);

  return (
    <article className="character-dossier" aria-labelledby="active-character-title">
      <header className="character-dossier-header">
        <button className="character-dossier-back seal-button" onClick={onClear} type="button">RETURN TO INDEX</button>
        <div className="character-dossier-mark" aria-hidden="true">
          {character.name.trim().slice(0, 1).toUpperCase() || "?"}
        </div>
        <div className="character-dossier-heading">
          <p className="section-kicker">PERSONAE · {STATUS_LABELS[character.status]}</p>
          <h2 id="active-character-title">{character.name}</h2>
          {character.honorific && <p>{character.honorific}</p>}
          <strong>{character.rank} · {character.role}</strong>
        </div>
        {canEdit && <button className="seal-button" onClick={() => onEdit(character)} type="button">EDIT RECORD</button>}
      </header>

      <div className="character-dossier-scroll">
        <dl className="character-dossier-vitals">
          <div>
            <dt>Company</dt>
            <dd>{company ? <Link href={`/companies/${companyIndex}`}>{company.number} · {company.name}</Link> : "Unassigned"}</dd>
          </div>
          <div><dt>First recorded</dt><dd>{character.introducedAt || "Unrecorded"}</dd></div>
          <div><dt>Death / loss</dt><dd>{character.deathAt || "Not applicable / unrecorded"}</dd></div>
          <div><dt>Stable ident</dt><dd>{character.id}</dd></div>
        </dl>

        <section className="character-dossier-section character-dossier-biography">
          <p className="section-kicker">Authenticated service record</p>
          <h3>Archival Biography</h3>
          {character.biography
            ? <LoreFormattedContent content={character.biography} />
            : <p className="character-profile-empty">No biographical account has yet been entered.</p>}
        </section>

        <section className="character-dossier-section character-dossier-deeds">
          <div className="character-dossier-section-heading">
            <div><p className="section-kicker">Honours & actions</p><h3>Heroic Deeds</h3></div>
            <span>{String(character.heroicDeeds.length).padStart(2, "0")} SEALED</span>
          </div>
          {character.heroicDeeds.length ? (
            <ol>
              {character.heroicDeeds.map((deed, index) => (
                <li key={`${deed}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{deed}</p></li>
              ))}
            </ol>
          ) : <p className="character-profile-empty">No deeds have yet been sealed to this operational record.</p>}
        </section>

        <section className="character-dossier-section character-dossier-sources">
          <div className="character-dossier-section-heading">
            <div><p className="section-kicker">Canon provenance</p><h3>Chronicle References</h3></div>
            <span>{String(canonSources.length).padStart(2, "0")} VERIFIED</span>
          </div>
          {canonSources.length ? (
            <div className="character-dossier-source-list">
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

      <footer className="character-dossier-footer">
        <span>PERSONAE DATA-VAULT · OPERATIONAL RECORD</span>
        <span>{STATUS_LABELS[character.status]}</span>
      </footer>
    </article>
  );
}
