"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminMode } from "./_components/AdminMode";
import { RelayDataStream } from "./_components/RelayDataStream";
import { SidebarNavigation } from "./_components/SidebarNavigation";
import { TransmissionEventFlags } from "./_components/TransmissionEventFlags";
import { TransmissionOriginActions } from "./_components/TransmissionOriginActions";
import { useChapterArchive } from "./_hooks/useChapterArchive";
import { type AstropathicMessage } from "./archive-data";

export default function Home() {
  const { isAdminMode } = useAdminMode();
  const { data, error, isLoading, isSaving, saveSection } = useChapterArchive();
  const chapterName = "THE LUNAR DRAGONS";
  const [note, setNote] = useState("");
  const [selectedRelayMessage, setSelectedRelayMessage] = useState<AstropathicMessage | null>(null);
  const { companies, entries, loreEntries, relayMessages } = data;
  const commandChronicleEntries = useMemo(
    () => loreEntries.filter((entry) => entry.status === "canon").slice(0, 3),
    [loreEntries],
  );
  const archiveReady = !isLoading && !error;
  const archivePendingText = error ? "ARCHIVE LINK UNAVAILABLE" : "ACCESSING SHARED ARCHIVE…";

  useEffect(() => {
    if (!selectedRelayMessage) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRelayMessage(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedRelayMessage]);
  const chapterStrength = useMemo(
    () => companies.slice(0, 10).reduce((sum, company) => sum + Number(company.strength || 0), 0),
    [companies],
  );
  async function addEntry() {
    const trimmed = note.trim();
    if (!trimmed) return;
    const next = [`M42.??? — ${trimmed}`, ...entries];
    if (await saveSection("entries", next)) setNote("");
  }

  return (
    <main className="app-shell" data-command-theme="lunar-dragons">
      <SidebarNavigation activeHref="/" />

      <section className="workspace archive-boundary-workspace command-boundary-workspace">
        <header className="topbar command-topbar">
          <div>
            <p className="eyebrow">Chapter LXRD · Argent Vigil · Command Nexus</p>
            <div className="chapter-name fixed-chapter-name">{chapterName}</div>
          </div>
          <div className="top-actions">
            <span className="save-state"><i /> {error ? "Archive unavailable" : isLoading ? "Loading shared records" : isSaving ? "Saving archive" : "Shared archive synced"}</span>
            <Link className="seal-button" href="/chapter">OPEN CHAPTER RECORD</Link>
          </div>
        </header>

        <div className="content-grid command-grid-redesign archive-boundary-content">
          <section className="command-hero panel" aria-label="Lunar Dragons command identity">
            <div className="command-sigil-vault">
              <img src="/lunar-dragons-sigil-depth.png" alt="The Lunar Dragons chapter sigil" />
              <span>CHAPTER SIGIL · VERIFIED</span>
            </div>
            <div className="command-hero-copy">
              <p className="section-kicker">Ultima Founding · The Argent Vigil</p>
              <h1>Where the road closes,<br />the dragon stands.</h1>
              <p>
                Fleet-based guardians of the Nachmund passage, prosecuting the Argent Vigil from the flagship <i>Lunaris</i>, Bearer of the First Stone and the Argent Spear.
              </p>
              <div className="command-oath">RECLAIM WHAT HAS BEEN LOST <i /> GUARD THE PASSAGE</div>
            </div>
            <aside className="command-dossier" aria-label="Current chapter disposition">
              <p>ADEPTUS TERRA WARRANT</p>
              <strong>008.M42/DR-017</strong>
              <dl>
                <div><dt>THEATRE</dt><dd>NACHMUND GAUNTLET</dd></div>
                <div><dt>CRUSADE</dt><dd>THE ARGENT VIGIL</dd></div>
                <div><dt>FLAGSHIP</dt><dd>LUNARIS · ARGENT SPEAR</dd></div>
                <div><dt>BASTION</dt><dd>UNCLAIMED</dd></div>
                <div><dt>ARCHIVE</dt><dd>LINKED</dd></div>
              </dl>
              <Link href="/flagship">OPEN FLAGSHIP DOSSIER</Link>
              <Link href="/chapter">OPEN CHAPTER RECORD</Link>
              <Link href="/lore/decree-of-reclamation-and-vigilance.pdf" target="_blank">READ THE FULL DECREE</Link>
            </aside>
          </section>

          <section className="astropathic-relay panel" aria-labelledby="relay-title">
            <div className="relay-header">
              <div>
                <p className="section-kicker">Data Reliquarium 056//ASTROPATHICA</p>
                <h2 id="relay-title">Astropathic Missive Feed</h2>
              </div>
              <div className="relay-signal"><i /><span>EXLOAD LINK ACTIVE</span><b>{archiveReady ? `${relayMessages.length} MISSIVES COGITATED` : "SYNCING MISSIVE INDEX"}</b></div>
            </div>
            <div className="relay-message-list">
              {!archiveReady ? <p className="archive-sync-placeholder">&gt;&gt; {archivePendingText}</p> : relayMessages.length ? relayMessages.slice(0, 6).map((message, index) => (
                <button
                  aria-label={`Open transmission from ${message.agency}: ${message.subject}`}
                  className={index < 2 ? "relay-message unread" : "relay-message"}
                  key={message.id}
                  onClick={() => setSelectedRelayMessage(message)}
                  type="button"
                >
                  <div className="relay-message-mark"><b>[{String(index + 1).padStart(2, "0")}]</b></div>
                  <div className="relay-message-copy">
                    <div><strong>&gt;&gt; {message.agency} // {message.priority}</strong><time>{message.received}</time></div>
                    <h3>&gt; {message.subject}</h3>
                    <TransmissionEventFlags event={message.event} />
                    <p>&gt; {message.preview}</p>
                  </div>
                </button>
              )) : <p className="relay-empty">The choir listens into the dark between stars…</p>}
            </div>
            <footer className="relay-footer"><span>&gt; EMPYRIC COHERENCE: COGITATING</span><Link href="/relay">&gt;&gt; OPEN FULL RELAY</Link></footer>
          </section>

          {selectedRelayMessage && (
            <div className="relay-dialog-backdrop" onMouseDown={() => setSelectedRelayMessage(null)}>
              <section
                aria-labelledby="relay-dialog-title"
                aria-modal="true"
                className="relay-dialog panel"
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
              >
                <header>
                  <div><p className="section-kicker" id="relay-dialog-title">Exload transcript · clearance granted</p><span>COGITATOR HANDSHAKE CONFIRMED</span></div>
                  <button autoFocus onClick={() => setSelectedRelayMessage(null)} type="button">CLOSE EXLOAD ×</button>
                </header>
                <div className="relay-dialog-body">
                  <RelayDataStream
                    afterComplete={<TransmissionOriginActions intel={data.sectorIntel} source={selectedRelayMessage} />}
                    ariaLabel={selectedRelayMessage.subject}
                    className="command-relay-data-stream"
                    key={selectedRelayMessage.id}
                    source={selectedRelayMessage}
                    streamKey={selectedRelayMessage.id}
                  />
                </div>
              </section>
            </div>
          )}

          <section className="forces-panel panel redesigned-strength">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">The Lunar Host</p>
                <h2>Chapter Strength</h2>
              </div>
              <span className="status-chip">{archiveReady ? "UNDER STRENGTH" : isLoading ? "SYNCING" : "LINK FAILED"}</span>
            </div>
            {!archiveReady ? <p className="archive-sync-placeholder">&gt;&gt; {archivePendingText}</p> : <>
              <div className="strength-summary">
                <div className="big-number">{chapterStrength}<small>/ 1,000</small></div>
                <div><span>{Math.round(chapterStrength / 10)}%</span><p>recorded operational strength</p></div>
              </div>
              <div className="company-grid">
                {companies.slice(0, 10).map((company, index) => (
                  <div key={company.number} title={`${company.name}: ${company.strength} members`}>
                    <span>{index + 1}<sup>{["st","nd","rd"][index] || "th"}</sup></span>
                    <i><b style={{ width: `${Math.min(100, company.strength)}%` }} /></i>
                    <small>{company.strength}</small>
                  </div>
                ))}
              </div>
            </>}
            <Link className="strength-link" href="/companies">OPEN COMPANY MANIFEST</Link>
          </section>

          <section className="chronicle-panel panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Argent Vigil records</p>
                <h2>Chapter Chronicle</h2>
              </div>
              <div className="command-chronicle-actions">
                <span><i /> {loreEntries.filter((entry) => entry.status === "canon").length} CANON RECORDS</span>
                <Link href="/chronicles">OPEN EXLOAD TERMINAL</Link>
              </div>
            </div>
            {isAdminMode && archiveReady && (
              <div className="entry-form">
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addEntry()}
                  placeholder="Record a battle, oath, character, or discovery…"
                  aria-label="New chronicle entry"
                />
                <button onClick={addEntry}>ADD ENTRY</button>
              </div>
            )}
            {!archiveReady ? <p className="archive-sync-placeholder">&gt;&gt; {archivePendingText}</p> : commandChronicleEntries.length ? (
              <div className="command-chronicle-records" aria-label="Established Chronicle records">
                {commandChronicleEntries.map((entry, index) => (
                  <article key={entry.id}>
                    <header>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{entry.date || "DATE UNRECORDED"}</p>
                      <small>{entry.category || "ARCHIVE RECORD"}</small>
                    </header>
                    <h3>{entry.title}</h3>
                    {entry.subtitle ? <p>{entry.subtitle}</p> : null}
                    <footer><span>CANON · SEALED</span><b>{entry.id.startsWith("legacy-") ? "LEGACY INDEX" : "STRUCTURED RECORD"}</b></footer>
                  </article>
                ))}
              </div>
            ) : <p className="command-chronicle-empty">NO CANONICAL RECORDS AVAILABLE</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
