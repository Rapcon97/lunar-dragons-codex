"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SidebarNavigation } from "../../_components/SidebarNavigation";
import { LoreFormattedContent } from "../../_components/LoreFormattedContent";
import { useChapterArchive } from "../../_hooks/useChapterArchive";
import type { ChapterCharacterStatus } from "../../archive-data";

const STATUS_LABELS: Record<ChapterCharacterStatus, string> = {
  active: "ACTIVE SERVICE",
  deceased: "FALLEN · HONOUR ROLL",
  missing: "MISSING · FATE UNRESOLVED",
  interred: "INTERRED · CONTINUING SERVICE",
};

export default function CharacterProfilePage() {
  const params = useParams<{ character: string }>();
  const { data, error, isLoading } = useChapterArchive();
  const character = data.characters.find((candidate) => candidate.id === params.character);

  if (isLoading || error) {
    return (
      <main className="app-shell">
        <SidebarNavigation activeHref="/characters" />
        <section className="workspace archive-boundary-workspace">
          <div className="subpage archive-boundary-subpage character-profile-loading">
            <section className="panel company-loading-state"><p className="section-kicker">PERSONAE · ARCHIVE LINK</p><h1>{error ? "Personnel record unavailable" : "Retrieving personnel record"}</h1><p>{error || "Consulting the authoritative Chapter archive…"}</p></section>
          </div>
        </section>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="app-shell">
        <SidebarNavigation activeHref="/characters" />
        <section className="workspace archive-boundary-workspace">
          <header className="topbar"><div><p className="eyebrow">The Lunar Dragons · PERSONAE/NULL</p><div className="chapter-name detail-chapter-name">THE LUNAR DRAGONS</div></div><Link className="seal-button" href="/characters">BACK TO CHARACTERS</Link></header>
          <div className="subpage archive-boundary-subpage character-profile-loading"><section className="panel character-directory-empty"><span aria-hidden="true">◇</span><h1>Personnel record not found</h1><p>No stable character record matches this identifier.</p><Link className="seal-button" href="/characters">OPEN PERSONNEL RELIQUARY</Link></section></div>
        </section>
      </main>
    );
  }

  const company = data.companies.find((candidate) => candidate.number === character.companyNumber);
  const canonSources = character.loreEntryIds
    .map((id) => data.loreEntries.find((entry) => entry.id === id && entry.status === "canon"))
    .filter((entry) => entry !== undefined);

  return (
    <main className="app-shell">
      <SidebarNavigation activeHref="/characters" />
      <section className="workspace archive-boundary-workspace">
        <header className="topbar">
          <div><p className="eyebrow">The Lunar Dragons · PERSONAE/{character.id.slice(0, 8).toUpperCase()}</p><div className="chapter-name detail-chapter-name">THE LUNAR DRAGONS</div></div>
          <div className="top-actions"><span className="save-state"><i /> AUTHORITATIVE PERSONNEL RECORD</span><Link className="seal-button" href="/characters">BACK TO CHARACTERS</Link></div>
        </header>
        <div className="subpage archive-boundary-subpage character-profile-page">
          <section className="character-profile-hero panel">
            <div className="character-profile-mark" aria-hidden="true">{character.name.slice(0, 1).toUpperCase()}</div>
            <div className="character-profile-title"><p className="section-kicker">Adeptus Astartes · {STATUS_LABELS[character.status]}</p><h1>{character.name}</h1>{character.honorific && <p>{character.honorific}</p>}<strong>{character.rank} · {character.role}</strong></div>
            <dl className="character-profile-vitals">
              <div><dt>Company</dt><dd>{company ? <Link href={`/companies/${data.companies.indexOf(company) + 1}`}>{company.number} · {company.name}</Link> : "Unassigned"}</dd></div>
              <div><dt>First recorded</dt><dd>{character.introducedAt || "Unrecorded"}</dd></div>
              <div><dt>Death / loss</dt><dd>{character.deathAt || "Not applicable / unrecorded"}</dd></div>
              <div><dt>Stable ident</dt><dd>{character.id}</dd></div>
            </dl>
          </section>

          <div className="character-profile-grid">
            <section className="panel character-profile-narrative"><p className="section-kicker">Archival biography</p><h2>Service Record</h2>{character.biography ? <LoreFormattedContent content={character.biography} /> : <p className="character-profile-empty">No biographical account has yet been entered.</p>}</section>
            <aside className="panel character-profile-deeds"><p className="section-kicker">Honours & actions</p><h2>Heroic Deeds</h2>{character.heroicDeeds.length ? <ol>{character.heroicDeeds.map((deed, index) => <li key={`${deed}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{deed}</p></li>)}</ol> : <p className="character-profile-empty">No deeds have yet been sealed to this operational record.</p>}</aside>
          </div>

          <section className="panel character-canon-provenance"><header><div><p className="section-kicker">Canon provenance</p><h2>Established Archive References</h2></div><span>{canonSources.length} VERIFIED SOURCE{canonSources.length === 1 ? "" : "S"}</span></header>{canonSources.length ? <div>{canonSources.map((entry) => <article key={entry.id}><span>{entry.date || "UNDATED"} · {entry.category.toUpperCase()}</span><h3>{entry.title}</h3>{entry.subtitle && <p>{entry.subtitle}</p>}<Link className="seal-button" href={`/chronicles?record=${encodeURIComponent(entry.id)}`}>OPEN CHRONICLE</Link></article>)}</div> : <p className="character-profile-empty">This operational profile has no linked canon source. Its presence in the personnel reliquary does not establish its details as canon.</p>}</section>
        </div>
        <footer><span>PERSONAE DATA-VAULT · OPERATIONAL RECORD</span><span>Every name is a weapon against oblivion.</span></footer>
      </section>
    </main>
  );
}
