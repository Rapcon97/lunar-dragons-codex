"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminMode } from "./_components/AdminMode";
import { RelayDataStream, type RelayStreamLine } from "./_components/RelayDataStream";
import { SidebarNavigation } from "./_components/SidebarNavigation";
import { useChapterArchive } from "./_hooks/useChapterArchive";
import {
  canonChronicleEntries,
  type AstropathicMessage,
} from "./archive-data";

export default function Home() {
  const { isAdminMode } = useAdminMode();
  const { data, error, isLoading, isSaving, saveSection } = useChapterArchive();
  const chapterName = "THE LUNAR DRAGONS";
  const [note, setNote] = useState("");
  const [selectedRelayMessage, setSelectedRelayMessage] = useState<AstropathicMessage | null>(null);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [badgeStatus, setBadgeStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { badgeMode, companies, entries, relayMessages } = data;
  const visibleChronicleEntries = useMemo(
    () => isAdminMode ? entries : canonChronicleEntries(data),
    [data, entries, isAdminMode],
  );
  const archiveReady = !isLoading && !error;
  const archivePendingText = error ? "ARCHIVE LINK UNAVAILABLE" : "ACCESSING SHARED ARCHIVE…";

  useEffect(() => {
    fetch("/api/chapter-badge", { cache: "no-store" }).then((response) => {
      if (response.ok) setBadgeUrl(`/api/chapter-badge?v=${Date.now()}`);
    });
  }, []);

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
  const commandRelayLines: RelayStreamLine[] = selectedRelayMessage ? [
    { text: ">> ACCESSING DATA RELIQUARIUM 056//COMMAND-LINK", command: true },
    { text: "> Local systems query: SUCCESS" },
    { text: `> Originator identification: ${selectedRelayMessage.agency}` },
    { text: `> Data-stamp: ${selectedRelayMessage.received}` },
    { text: "> Intended recipient: CHAPTER MASTER · LUNARIS" },
    { text: `> Cipher fortitude: ${selectedRelayMessage.priority}` },
    { text: "", gap: true },
    { text: ">> VOX-MISSIVE CONTENT // EXLOAD FOLLOWS", command: true },
    { text: `> Subject ident: ${selectedRelayMessage.subject}` },
    ...(selectedRelayMessage.body.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((line) => ({ text: `> ${line.trim()}`, content: true })),
    { text: "", gap: true },
    { text: "> Archive replication authorised" },
    { text: "> Data corruption query: 0.00%", corruption: true },
    { text: ">> EXLOAD CONCLUDES // MACHINE-SPIRIT SATISFIED", command: true },
  ] : [];

  async function addEntry() {
    const trimmed = note.trim();
    if (!trimmed) return;
    const next = [`M42.??? — ${trimmed}`, ...entries];
    if (await saveSection("entries", next)) setNote("");
  }

  function readImageShape(file: File) {
    return new Promise<"badge" | "banner">((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        resolve(image.width / image.height > 1.45 ? "banner" : "badge");
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        resolve("badge");
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
  }

  function canvasBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
  ) {
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  }

  async function prepareBadgeUpload(file: File) {
    const maxSelectedBytes = 50 * 1024 * 1024;
    const transferTargetBytes = 750 * 1024;

    if (file.size > maxSelectedBytes) {
      throw new Error("Choose an image smaller than 50 MB.");
    }
    if (file.size <= transferTargetBytes) return file;
    if (file.type === "image/gif") {
      throw new Error("Large animated GIFs cannot be optimized. Use PNG, JPG, or WEBP.");
    }

    setBadgeStatus("Optimizing large heraldry…");
    const bitmap = await createImageBitmap(file);
    const maxEdge = 2560;
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the image.");

    let output: Blob | null = null;
    const outputType = file.type === "image/png" ? "image/webp" : "image/jpeg";

    for (let attempt = 0; attempt < 7; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      output = await canvasBlob(canvas, outputType, Math.max(.44, .88 - attempt * .07));
      if (output && output.size <= transferTargetBytes) break;
      scale *= .76;
    }
    bitmap.close();

    if (!output || output.size > transferTargetBytes) {
      throw new Error("The image could not be optimized enough for upload.");
    }

    const extension = outputType === "image/webp" ? "webp" : "jpg";
    return new File([output], `chapter-heraldry.${extension}`, { type: outputType });
  }

  async function uploadBadge(file?: File) {
    if (!file) return;
    setIsUploading(true);
    setBadgeStatus("");

    try {
      const mode = await readImageShape(file);
      const preparedFile = await prepareBadgeUpload(file);
      const form = new FormData();
      form.append("badge", preparedFile);
      const response = await fetch("/api/chapter-badge", { method: "POST", body: form });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : { error: response.ok ? undefined : `The upload service rejected the image (${response.status}).` };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      await saveSection("badgeMode", mode);
      setBadgeUrl(`/api/chapter-badge?v=${Date.now()}`);
      setBadgeStatus(mode === "banner" ? "Chapter banner secured." : "Chapter badge secured.");
    } catch (error) {
      setBadgeStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeBadge() {
    setIsUploading(true);
    const response = await fetch("/api/chapter-badge", { method: "DELETE" });
    if (response.ok) {
      setBadgeUrl(null);
      setBadgeStatus("Heraldry removed.");
    } else {
      setBadgeStatus("The heraldry could not be removed.");
    }
    setIsUploading(false);
  }

  return (
    <main className="app-shell" data-command-theme="lunar-dragons">
      <SidebarNavigation activeHref="/" />

      <section className="workspace">
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

        <div className="content-grid command-grid-redesign">
          <section className="command-hero panel" aria-label="Lunar Dragons command identity">
            <div className={`command-sigil-vault ${badgeUrl ? `has-upload ${badgeMode}-mode` : ""}`}>
              {badgeUrl ? (
                <img src={badgeUrl} alt={`${chapterName} heraldry`} />
              ) : (
                <img src="/lunar-dragons-sigil-depth.png" alt="Lunar Dragons chapter sigil" />
              )}
              <span>CHAPTER SIGIL · VERIFIED</span>
              {isAdminMode && (
                <div className="command-sigil-controls">
                  <label className="upload-button">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => uploadBadge(event.target.files?.[0])}
                      disabled={isUploading}
                    />
                    {isUploading ? "SECURING…" : badgeUrl ? "REPLACE SIGIL" : "UPLOAD SIGIL"}
                  </label>
                  {badgeUrl && <button className="remove-badge" onClick={removeBadge} disabled={isUploading}>REMOVE</button>}
                </div>
              )}
              {badgeStatus && <small className="command-sigil-status" role="status">{badgeStatus}</small>}
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
                <h2 id="relay-title">Vox-Missive Feed</h2>
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
                    <p>&gt; {message.preview}</p>
                  </div>
                </button>
              )) : <p className="relay-empty">The choir listens into the dark between stars…</p>}
            </div>
            <footer className="relay-footer"><span>&gt; DATA CORRUPTION: 0.00%</span><Link href="/relay">&gt;&gt; OPEN FULL RELAY</Link></footer>
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
                    ariaLabel={selectedRelayMessage.subject}
                    className="command-relay-data-stream"
                    lines={commandRelayLines}
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
              <span>◉ LIVE RECORD</span>
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
            {!archiveReady ? <p className="archive-sync-placeholder">&gt;&gt; {archivePendingText}</p> : (
              <div className="timeline">
                {visibleChronicleEntries.slice(0, 3).map((entry, index) => (
                  <div key={`${entry}-${index}`}><i /><p>{entry}</p></div>
                ))}
              </div>
            )}
          </section>
        </div>
        <footer>
          <span>THE LUNAR DRAGONS · THE ARGENT VIGIL · CHAPTER ARCHIVE</span>
          <span>Reclaim what has been lost. Guard the passage.</span>
        </footer>
      </section>
    </main>
  );
}
