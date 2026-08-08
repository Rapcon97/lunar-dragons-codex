"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminMode } from "../_components/AdminMode";
import { chronicleEntriesForViewer } from "../chronicle-visibility";
import { CartographyTransitionLink } from "../_components/CartographyTransitionLink";
import { LoreDevelopmentDashboard } from "../_components/LoreDevelopmentDashboard";
import { LoreEntryEditor } from "../_components/LoreEntryEditor";
import { LoreFormattedContent } from "../_components/LoreFormattedContent";
import { PlanetClassificationArchive } from "../_components/PlanetClassificationArchive";
import { RelayDataStream } from "../_components/RelayDataStream";
import { SectorCartographyExperience } from "../_components/SectorCartographyExperience";
import { SidebarNavigation } from "../_components/SidebarNavigation";
import { TransmissionEventFlags } from "../_components/TransmissionEventFlags";
import { TransmissionOriginActions } from "../_components/TransmissionOriginActions";
import { resolveTransmissionOrigin } from "../_components/transmission-origin";
import { useChapterArchive } from "../_hooks/useChapterArchive";
import {
  type AstropathicMessage,
  type ChapterCompany,
  type ChapterIdentity,
  type ChapterRelic,
  type LoreEntry,
  type SectorIntel,
} from "../archive-data";

const sectionInfo = {
  chapter: {
    code: "GENEALOGICA",
    kicker: "Origins & identity",
    title: "Chapter Record",
    description: "The sealed identity, Ultima Founding, Argent Vigil mandate, and unfulfilled right of bastion of the Lunar Dragons.",
  },
  flagship: {
    code: "NAVIS PRAETORIA",
    kicker: "Chapter flagship · authenticated strategic dossier",
    title: "Lunaris",
    description: "Bearer of the First Stone · The Argent Spear. Heavy command battle barge and mobile headquarters of the Lunar Dragons.",
  },
  armoury: {
    code: "ARSENALIS",
    kicker: "Relics & wargear",
    title: "Chapter Armoury",
    description: "Catalogue revered weapons, ancient vehicles, and the machines entrusted to the forge.",
  },
  companies: {
    code: "ORDO BELLUM",
    kicker: "Order of battle",
    title: "The Ten Companies",
    description: "Shape the chapter’s fighting strength, specialist roles, and company traditions.",
  },
  chronicles: {
    code: "ANNALIS",
    kicker: "Deeds & campaigns",
    title: "Chapter Chronicle",
    description: "Preserve the Decree of Reclamation and Vigilance, the Argent Vigil, and every deed performed beneath its seal.",
  },
  intel: {
    code: "TACTICA SIDEREA",
    kicker: "Deployment theatre & faction intelligence",
    title: "Sector Intelligence",
    description: "Chart the Lunar Dragons’ pocket of the Imperium, their active war zone, allies, enemies, and unresolved contacts.",
  },
  relay: {
    code: "ASTROPATHICA",
    kicker: "Choir traffic & command correspondence",
    title: "Astropathic Relay",
    description: "Access decoded vox-missives, recovered astropathic traffic, and sealed command signals through the Lunaris data reliquarium.",
  },
  settings: {
    code: "ARCHIVUM",
    kicker: "Archive controls",
    title: "Archive Settings",
    description: "Manage shared chapter records and guest access to the Lunar Dragons archive.",
  },
} as const;

type Section = keyof typeof sectionInfo;

export default function SectionPage() {
  const { canAdmin, isAdminMode } = useAdminMode();
  const { data, error, isLoading, isSaving, load, saveSection, updateSection } = useChapterArchive();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = (pathname.split("/")[1] || "chapter") as Section;
  const info = sectionInfo[section] || sectionInfo.chapter;
  const chapterName = "THE LUNAR DRAGONS";
  const usesArchiveBoundary = ["chapter", "flagship", "armoury", "companies", "intel"].includes(section);

  return (
    <main className="app-shell">
      <SidebarNavigation activeHref={`/${section}`} />

      <section className={`workspace ${section === "relay" ? "relay-workspace" : section === "chronicles" ? "chronicles-workspace" : usesArchiveBoundary ? "archive-boundary-workspace" : ""}`.trim()}>
        <header className="topbar">
          <div>
            <p className="eyebrow">The Lunar Dragons · {info.code}</p>
            <div className="chapter-name fixed-chapter-name">{chapterName}</div>
          </div>
          <div className="top-actions">
            <span className="save-state"><i /> {error ? "Archive unavailable" : isLoading ? "Loading shared records" : isSaving ? "Saving archive" : "Shared archive synced"}</span>
            <Link href="/" className="seal-button">RETURN TO COMMAND</Link>
          </div>
        </header>

        <div className={`subpage ${section === "relay" ? "relay-subpage" : section === "chronicles" ? "chronicles-subpage" : usesArchiveBoundary ? "archive-boundary-subpage" : ""}`}>
          {section !== "relay" && section !== "chronicles" && section !== "intel" && (
            <section className="section-hero">
              <div>
                <p className="section-kicker">{info.kicker}</p>
                <h1>{info.title}</h1>
              </div>
              <p>{info.description}</p>
            </section>
          )}
          {section === "chapter" && (
            <ChapterSection
              canEdit={isAdminMode}
              identity={data.identity}
              onChange={(value) => updateSection("identity", value)}
              onSave={(value) => saveSection("identity", value)}
            />
          )}
          {section === "flagship" && <LunarisSection />}
          {section === "armoury" && <ArmourySection canEdit={isAdminMode} relics={data.relics} onSave={(value) => saveSection("relics", value)} />}
          {section === "companies" && <CompaniesSection canEdit={isAdminMode} roster={data.companies} onSave={(value) => saveSection("companies", value)} />}
          {section === "chronicles" && (
            <ChroniclesSection
              canEdit={canAdmin && isAdminMode}
              entries={chronicleEntriesForViewer(data.loreEntries, canAdmin, isAdminMode)}
              onArchiveRefresh={load}
            />
          )}
          {section === "intel" && <SectorIntelSection canEdit={isAdminMode} intel={data.sectorIntel} onSave={(value) => saveSection("sectorIntel", value)} originLocationId={searchParams.get("origin")} />}
          {section === "relay" && <AstropathicRelaySection intel={data.sectorIntel} messages={data.relayMessages} />}
          {section === "settings" && (
            <SettingsSection
              canAdmin={canAdmin}
              isAdminMode={isAdminMode}
              loreEntries={data.loreEntries}
              onArchiveRefresh={load}
            />
          )}
        </div>
        {section !== "relay" && section !== "chronicles" && !usesArchiveBoundary && (
          <footer><span>THE LUNAR DRAGONS · THE ARGENT VIGIL</span><span>Reclaim what has been lost. Guard the passage.</span></footer>
        )}
      </section>
    </main>
  );
}

function LunarisSection() {
  const [visualPreview, setVisualPreview] = useState<"recognition" | "blueprint" | null>(null);
  const visualPreviewDialog = useRef<HTMLDialogElement>(null);
  const visualPreviewBody = useRef<HTMLDivElement>(null);
  const armament = [
    ["Prow weapons", "Two heavy bombardment cannon batteries", "Eight torpedo tubes", "Conventional torpedoes", "Specialist torpedoes", "Astartes boarding torpedoes"],
    ["Broadsides", "Heavy macro-cannon decks", "Auxiliary macro batteries", "Limited lance emplacements"],
    ["Dorsal systems", "Heavy dorsal lances", "Secondary bombardment systems", "Command and augur arrays"],
    ["Defence systems", "Extensive point defence", "Close-range cannon", "Layered void shields"],
  ];
  const launchCapacity = [
    ["Thunderhawk gunships", "24–36"], ["Thunderhawk transporters", "8–16"], ["Heavy landing craft", "4–8"],
    ["Interceptors & support craft", "12–24"], ["Standard Drop Pods", "~100–120"], ["Specialist & Dreadnought pods", "20–30"],
    ["Boarding torpedoes", "40–60"], ["Assault rams", "12–20"], ["Shuttles, cutters & utility craft", "Numerous"],
  ];
  const vehicleCapacity = [
    ["Heavy armour vehicles", "40–60"], ["Armoured transports", "60–80"], ["Artillery & support vehicles", "20–30"],
    ["Dreadnought cradles", "~20"], ["Super-heavy stations", "Limited"],
  ];
  const facilities = [
    "Primary strategium", "Command spires", "Chapter sanctums & chapels", "Reliquary of the First Stone", "Apothecarion", "Librarius", "Reclusiam",
    "Forge & Mechanicus enclaves", "Vehicle decks", "Dreadnought vaults", "Gene-vaults", "Training spaces", "Medical bays", "Cargo holds", "Astropathic chambers", "Navigator sanctums",
  ];
  const serviceRecord = [
    "Late M30–early M31 · authenticated ancient structure enters expeditionary service",
    "Ultima Founding · allocated, renamed Lunaris and consecrated to the Lunar Dragons",
    "008.M42 · command vessel of the Nachmund Reclamation and the Argent Vigil",
    "056.M42 · current Chapter roll verified: Bearer of the First Stone · The Argent Spear",
  ];

  const visualArchive = visualPreview === "recognition"
    ? {
        title: "Imperial Navy Recognition Plate",
        code: "NAVIS/RECOG/056.M42/LUNARIS",
        src: "/lunaris-recognition-plate.png",
        alt: "Complete Imperial recognition datasheet for the Lunaris",
      }
    : {
        title: "Mechanicus Structural Blueprint",
        code: "PAL-17/Θ · LD-MK.XII-77A",
        src: "/lunaris-dimensions.png",
        alt: "Complete Mechanicus technical blueprint of the Lunaris",
      };

  useEffect(() => {
    const dialog = visualPreviewDialog.current;
    if (!dialog) return;

    if (visualPreview && !dialog.open) {
      if (visualPreviewBody.current) visualPreviewBody.current.scrollTop = 0;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
    if (!visualPreview && dialog.open) dialog.close();
  }, [visualPreview]);

  return (
    <>
    <div className="lunaris-dossier">
      <section className="panel lunaris-command-plate">
        <div className="lunaris-vessel-art">
          <img src="/lunaris-flagship.png" alt="The Lunaris, heavy command battle barge and flagship of the Lunar Dragons" />
          <span aria-hidden="true">IDENTIFICATION LOCK · NAVIS PRAETORIA</span>
        </div>
        <div className="lunaris-title-block">
          <p className="section-kicker">Serialis Imperialis · 008.M42/DR-017-A</p>
          <h2>Lunaris</h2>
          <strong>Bearer of the First Stone <i /> The Argent Spear</strong>
          <p>Heavy Command Battle Barge and mobile headquarters of the Lunar Dragons. Command vessel of the Nachmund Reclamation and the Argent Vigil Crusade.</p>
        </div>
        <aside><span>AUTHENTICATED</span><b>VERIFIED</b><small>LORD COMMANDER EYES ONLY</small></aside>
        <div className="lunaris-hero-metrics" aria-label="Lunaris primary dimensions">
          <span><small>LENGTH</small><b>12.3 KM</b></span>
          <span><small>MAXIMUM BEAM</small><b>3.8 KM</b></span>
          <span><small>VERTICAL DRAFT</small><b>1.6 KM</b></span>
        </div>
      </section>

      <section className="panel lunaris-recognition-plate">
        <header>
          <div><p className="section-kicker">Imperial Navy recognition datasheet</p><h3>Authenticated exterior and strategic profile</h3></div>
          <span>056.M42 · CURRENT CHAPTER ROLL</span>
        </header>
        <div className="lunaris-recognition-layout">
          <button className="lunaris-recognition-viewport" type="button" onClick={() => setVisualPreview("recognition")}>
            <img src="/lunaris-recognition-plate.png" alt="Cropped Imperial recognition view of the Lunaris" />
            <span>OPEN COMPLETE RECOGNITION PLATE</span>
          </button>
          <div className="lunaris-recognition-extract">
            <p className="section-kicker">Recognition extract · authenticated</p>
            <p>The vessel is identified by its monumental armoured prow, elongated structural spine and fortress-like command citadel. The approved Lunar Dragons heraldry remains the sole authoritative ship badge.</p>
            <dl>
              <div><dt>SERVICE DESIGNATION</dt><dd>Heavy Command Battle Barge</dd></div>
              <div><dt>PROVENANCE</dt><dd>Authenticated ancient structure · layered reconstruction</dd></div>
              <div><dt>CHAPTER CUSTODY</dt><dd>Since the Ultima Founding</dd></div>
              <div><dt>AUTHORITY</dt><dd>Current recognition plate · 056.M42</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="lunaris-profile-grid">
        <article className="panel lunaris-profile">
          <header><p className="section-kicker">Vessel profile</p><span>ASTARTES WARSHIP</span></header>
          <dl>
            <div><dt>VESSEL TYPE</dt><dd>Heavy Command Battle Barge</dd></div>
            <div><dt>ORIGINAL HULL</dt><dd>Unknown · expeditionary heavy assault carrier family considered probable</dd></div>
            <div><dt>ROLE</dt><dd>Planetary assault · orbital bombardment · mass Astartes deployment · boarding · fleet command</dd></div>
            <div><dt>LENGTH</dt><dd>~12.3 kilometres</dd></div>
            <div><dt>BEAM · MAX</dt><dd>~3.8 kilometres</dd></div>
            <div><dt>DRAFT</dt><dd>~1.6 kilometres</dd></div>
            <div><dt>ANCIENT CORE</dt><dd>Late Great Crusade or early Horus Heresy</dd></div>
            <div><dt>CHAPTER CUSTODY</dt><dd>Since the Ultima Founding</dd></div>
            <div><dt>CURRENT ROLL</dt><dd>056.M42</dd></div>
            <div><dt>CONSTRUCTION</dt><dd>Layered Mechanicus reconstruction around an authenticated ancient keel, spine, command sanctum and root machine-spirit architecture</dd></div>
            <div><dt>VOID SHIELDS</dt><dd>Layered generators · precise pattern sealed</dd></div>
          </dl>
        </article>
        <article className="panel lunaris-scale">
          <p className="section-kicker">Mechanicus structural blueprint</p>
          <figure className="lunaris-dimensions-plate">
            <button type="button" onClick={() => setVisualPreview("blueprint")} aria-label="Open the complete Mechanicus structural blueprint">
              <img src="/lunaris-dimensions.png" alt="Cropped Mechanicus blueprint showing the principal profiles of the Lunaris" />
              <span className="lunaris-blueprint-axis" aria-hidden="true"><i /><b>STRUCTURAL SPINE · AUTHENTICATED</b><i /></span>
              <span className="lunaris-blueprint-open">OPEN COMPLETE SCHEMA</span>
            </button>
            <figcaption>PAL-17/Θ · LD-MK.XII-77A · STRUCTURAL EXTRACT</figcaption>
          </figure>
          <div className="lunaris-measure"><span>PROW</span><i /><strong>12.3 KM</strong><i /><span>STERN</span></div>
          <dl>
            <div><dt>PERMANENT CADRE</dt><dd>~120–180 Astartes</dd></div>
            <div><dt>SUSTAINED CAMPAIGN</dt><dd>~500–600 Astartes</dd></div>
            <div><dt>STANDARD DEPLOYMENT</dt><dd>Chapter Command plus up to four Companies, support elements, Dreadnoughts, vehicles and ancillaries</dd></div>
            <div><dt>MAXIMUM EMBARKATION</dt><dd>Most or all of the Chapter under austere, short-duration conditions</dd></div>
          </dl>
        </article>
      </section>

      <section className="panel lunaris-armament">
        <header><p className="section-kicker">Armament register</p><span>OFFENSIVE & DEFENSIVE SYSTEMS</span></header>
        <div>{armament.map(([heading, ...items]) => <article key={heading}><h3>{heading}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </section>

      <section className="lunaris-logistics-grid">
        <article className="panel lunaris-capacity"><p className="section-kicker">Launch capacity</p><dl>{launchCapacity.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></article>
        <article className="panel lunaris-capacity"><p className="section-kicker">Vehicle capacity</p><dl>{vehicleCapacity.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></article>
        <article className="panel lunaris-facilities"><p className="section-kicker">Key facilities</p><ul>{facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul></article>
      </section>

      <section className="lunaris-legacy-grid">
        <article className="panel lunaris-reliquary"><p className="section-kicker">The Reliquary of the First Stone</p><div aria-hidden="true"><i>◆</i></div><p>The Gift of Luna entered Chapter keeping during the Ultima Founding and was installed aboard <i>Lunaris</i> at the vessel’s consecration. Guilliman’s decree of 008.M42 reaffirmed that trust. Its physical form remains absent from the accessible canon and is not represented here.</p></article>
        <article className="panel lunaris-honours"><p className="section-kicker">Authenticated service record</p><ul>{serviceRecord.map((record) => <li key={record}>{record}</li>)}</ul><p className="lunaris-symbolism">The Argent Spear · The First Home · Bearer of the First Stone · The Unfinished Foundation</p></article>
      </section>
    </div>

    <dialog
      ref={visualPreviewDialog}
      className="lunaris-media-dialog"
      aria-labelledby="lunaris-media-title"
      onCancel={() => setVisualPreview(null)}
      onClose={() => setVisualPreview(null)}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) setVisualPreview(null);
      }}
    >
      <section className="archive-previewer facsimile lunaris-media-previewer">
        <header>
          <div>
            <p className="section-kicker">Navis Praetoria · authenticated visual archive</p>
            <h2 id="lunaris-media-title">{visualArchive.title}</h2>
          </div>
          <div className="archive-previewer-controls">
            <span>{visualArchive.code}</span>
            <button type="button" onClick={() => setVisualPreview(null)} aria-label="Close visual archive">CLOSE ×</button>
          </div>
        </header>
        <div ref={visualPreviewBody} className="archive-previewer-body">
          <img src={visualArchive.src} alt={visualArchive.alt} />
        </div>
        <footer><span>ESC TO CLOSE</span><span>ARCHIVAL IMAGE · UNALTERED SOURCE PLATE</span></footer>
      </section>
    </dialog>
    </>
  );
}

function AstropathicRelaySection({ intel, messages }: { intel: SectorIntel; messages: AstropathicMessage[] }) {
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!messages.length) return;
    if (!messages.some((message) => message.id === selectedId)) setSelectedId(messages[0].id);
  }, [messages, selectedId]);

  const selected = messages.find((message) => message.id === selectedId) ?? messages[0];
  return (
    <section className="relay-inbox" aria-label="Astropathic Relay sanctum">
      <div className="relay-inbox-grid panel">
        <header className="relay-terminal-rack">
          <div className="relay-terminal-ident" aria-hidden="true">&gt;&gt;</div>
          <div className="relay-terminal-rack-title">
            <span>DATA RELIQUARIUM 056//ASTROPATHICA</span>
            <strong>ASTROPATHIC EXLOAD TERMINAL</strong>
          </div>
          <div className="relay-inbox-status"><i /><span>EXLOAD LINK ACTIVE</span><b>{messages.length} MISSIVES COGITATED</b></div>
        </header>
        <div className="relay-inbox-list" aria-label="Preserved astropathic missives">
          <header><span>ASTROPATHIC MISSIVE INDEX</span><b>{Math.min(2, messages.length)} NEW TRANSMISSIONS</b></header>
          {messages.length ? messages.map((message, index) => (
            <button
              aria-pressed={message.id === selected?.id}
              className={`${message.id === selected?.id ? "selected " : ""}${index < 2 ? "unread " : ""}relay-inbox-item`}
              key={message.id}
              onClick={() => setSelectedId(message.id)}
            >
              <span className="relay-inbox-glyph" aria-hidden="true">[{String(index + 1).padStart(2, "0")}]</span>
              <span className="relay-inbox-item-copy">
                <span><strong>{message.agency}</strong><time>{message.received}</time></span>
                <b>{message.subject}</b>
                <TransmissionEventFlags event={message.event} />
                <small>&gt; {message.preview}</small>
              </span>
              <em className={`relay-priority ${message.priority.toLowerCase()}`}>{message.priority}</em>
            </button>
          )) : <p className="relay-empty">The choir listens into the dark between stars…</p>}
        </div>
        <article className="relay-inbox-reader" aria-live="polite">
          {selected ? (
            <>
              <header>
                <div><p className="section-kicker">Exload transcript · clearance granted</p><small>&gt;&gt; COGITATOR HANDSHAKE CONFIRMED</small></div>
                <span className={`relay-priority ${selected.priority.toLowerCase()}`}>{selected.priority}</span>
              </header>
              <div
                className="relay-inbox-body"
                role="region"
                aria-label="Active astropathic transmission"
                tabIndex={0}
              >
                <RelayDataStream
                  afterComplete={<TransmissionOriginActions intel={intel} source={selected} />}
                  ariaLabel={selected.subject}
                  key={selected.id}
                  source={selected}
                  streamKey={selected.id}
                />
              </div>
            </>
          ) : <p className="relay-empty">The choir awaits an empyric impression.</p>}
        </article>
      </div>
    </section>
  );
}

const identityFields = ["founding", "lineage", "domain", "fortress", "master", "flaw"] as const;

function DecreeRecord() {
  const [preview, setPreview] = useState<"facsimile" | "transcript" | null>(null);

  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview]);

  return (
    <>
      <section className="decree-record panel" aria-labelledby="decree-record-title">
        <button className="decree-document-preview" type="button" onClick={() => setPreview("facsimile")} aria-label="Preview the decree facsimile">
          <img src="/lore/decree-of-reclamation-and-vigilance-v3.png" alt="Facsimile of the eighth-year Decree of Reclamation and Vigilance" />
          <span>VIEW FACSIMILE</span>
        </button>
        <div className="decree-copy">
          <p className="section-kicker">Adeptus Terra · Instrumentum Imperialis</p>
          <h2 id="decree-record-title">Decree of Reclamation and Vigilance</h2>
          <p>
            Sealed by Roboute Guilliman in the eighth year of the Indomitus Crusade, this warrant recognises the Chapter’s sacrifice, commissions the
            <strong> Nachmund Reclamation</strong> and gives its enduring operational designation: <strong>The Argent Vigil</strong>.
          </p>
          <div className="decree-articles">
            <span><b>I</b> Preamble and recognition of service</span>
            <span><b>II</b> The Argent Vigil</span>
            <span><b>III</b> The Nachmund Charge</span>
            <span><b>IV</b> Imperial cooperation order</span>
            <span><b>V</b> Right of permanent bastion</span>
            <span><b>VI</b> The Gift of Luna</span>
          </div>
        </div>
        <div className="decree-actions">
          <small>AT/IND/008.M42/NACH-DRACO</small>
          <button type="button" onClick={() => setPreview("transcript")}>READ ARCHIVAL TRANSCRIPT</button>
        </div>
      </section>

      {preview && (
        <div
          className="archive-previewer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPreview(null);
          }}
        >
          <section
            className={`archive-previewer ${preview === "facsimile" ? "facsimile" : "transcript"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-previewer-title"
          >
            <header>
              <div>
                <p className="section-kicker">Adeptus Terra · authenticated record</p>
                <h2 id="archive-previewer-title">
                  {preview === "facsimile" ? "Decree Facsimile" : "Archival Transcript"}
                </h2>
              </div>
              <div className="archive-previewer-controls">
                <span>AT/IND/008.M42/NACH-DRACO</span>
                <button type="button" autoFocus onClick={() => setPreview(null)} aria-label="Close document preview">CLOSE ×</button>
              </div>
            </header>
            <div className="archive-previewer-body">
              {preview === "facsimile" ? (
                <img src="/lore/decree-of-reclamation-and-vigilance-v3.png" alt="Full facsimile of the Decree of Reclamation and Vigilance" />
              ) : (
                <iframe
                  src="/lore/decree-of-reclamation-and-vigilance.pdf#view=FitH&toolbar=1&navpanes=0"
                  title="Archival transcript of the Decree of Reclamation and Vigilance"
                />
              )}
            </div>
            <footer>
              <span>ESC TO CLOSE</span>
              <span>RECORD SEALED · CLEARANCE VERIFIED</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function ChapterSection({
  canEdit,
  identity,
  onChange,
  onSave,
}: {
  canEdit: boolean;
  identity: ChapterIdentity;
  onChange: (value: ChapterIdentity) => void;
  onSave: (value: ChapterIdentity) => Promise<boolean>;
}) {
  function update(field: keyof ChapterIdentity, value: string) {
    const next = { ...identity, [field]: value };
    onChange(next);
  }
  return (
    <>
      <DecreeRecord />
      <div className="record-grid">
      {identityFields.map((field, index) => (
        <label className="field-card panel" key={field}>
          <span>0{index + 1} · {field}</span>
          <input
            value={identity[field]}
            readOnly={!canEdit}
            onChange={(event) => canEdit && update(field, event.target.value)}
            onBlur={() => canEdit && void onSave(identity)}
          />
        </label>
      ))}
      <section className="panel wide-record">
        <p className="section-kicker">Founding charge</p>
        <h2>What has been entrusted to the Chapter?</h2>
        <textarea
          readOnly={!canEdit}
          value={identity.foundingPrompt}
          onChange={(event) => canEdit && update("foundingPrompt", event.target.value)}
          onBlur={() => canEdit && void onSave(identity)}
        />
      </section>
      </div>
    </>
  );
}

function ArmourySection({
  canEdit,
  relics,
  onSave,
}: {
  canEdit: boolean;
  relics: ChapterRelic[];
  onSave: (value: ChapterRelic[]) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  async function addRelic() {
    if (!name.trim()) return;
    const next = [...relics, { name: name.trim(), type: "Unclassified relic", status: "Awaiting record" }];
    if (await onSave(next)) setName("");
  }
  return (
    <>
      {canEdit && (
        <div className="quick-entry panel">
          <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addRelic()} placeholder="Name a relic, vehicle, or vessel…" />
          <button onClick={addRelic}>INSCRIBE ASSET</button>
        </div>
      )}
      <div className="relic-grid">
        {relics.map((relic, index) => (
          <article className="relic-card panel" key={`${relic.name}-${index}`}>
            <span className="relic-index">RELIC · 0{index + 1}</span>
            <div className="relic-glyph">✦</div>
            <h2>{relic.name}</h2><p>{relic.type}</p><b>{relic.status}</b>
          </article>
        ))}
      </div>
    </>
  );
}

function CompanyHeraldryPreview({
  companyNumber,
  companyName,
  kind,
}: {
  companyNumber: number;
  companyName: string;
  kind: "sigil" | "pauldron";
}) {
  const [state, setState] = useState<"loading" | "loaded" | "missing">("loading");
  const label = kind === "sigil" ? "Sigil" : "Pauldron";
  const endpoint = kind === "sigil" ? "/api/company-sigil" : "/api/company-pauldron";

  return (
    <div
      className={state === "loaded" ? `company-heraldry-thumb ${kind} loaded` : `company-heraldry-thumb ${kind}`}
      aria-label={`${companyName} ${label.toLowerCase()}: ${state === "loaded" ? "uploaded" : state === "missing" ? "not recorded" : "loading"}`}
    >
      <img
        alt=""
        className={state === "loaded" ? "visible" : ""}
        onError={() => setState("missing")}
        onLoad={() => setState("loaded")}
        src={`${endpoint}?company=${companyNumber}`}
      />
      {state !== "loaded" && <b aria-hidden="true">{state === "loading" ? "···" : "—"}</b>}
      <small>{label}</small>
    </div>
  );
}

function CompaniesSection({
  canEdit,
  roster,
  onSave,
}: {
  canEdit: boolean;
  roster: ChapterCompany[];
  onSave: (value: ChapterCompany[]) => Promise<boolean>;
}) {
  const router = useRouter();
  const [draftRoster, setDraftRoster] = useState<ChapterCompany[]>(roster);
  const [isEditing, setIsEditing] = useState(false);
  const [eleventhUnlocked, setEleventhUnlocked] = useState(false);
  const [clearanceOpen, setClearanceOpen] = useState(false);
  const [clearanceCode, setClearanceCode] = useState("");
  const [clearanceError, setClearanceError] = useState("");
  useEffect(() => {
    if (!canEdit) {
      setDraftRoster(roster.map((company) => ({ ...company })));
      setIsEditing(false);
    }
  }, [canEdit, roster]);
  useEffect(() => {
    setEleventhUnlocked(
      window.sessionStorage.getItem("lunar-dragons-eleventh-clearance") === "granted",
    );
  }, []);
  const displayedRoster = isEditing ? draftRoster : roster;
  const publicRoster = displayedRoster.slice(0, 10);
  const secretCompany = displayedRoster[10] ?? {
    number: "11th",
    name: "The Veiled Claw",
    role: "Classified Operations",
    strength: 100,
  };
  const total = useMemo(
    () => displayedRoster.slice(0, 10).reduce((sum, company) => sum + company.strength, 0),
    [displayedRoster],
  );

  function updateCompany(index: number, field: "name" | "strength", value: string) {
    const next = draftRoster.map((company, companyIndex) => {
      if (companyIndex !== index) return company;
      if (field === "strength") {
        const strength = Math.max(0, Math.min(1000, Number.parseInt(value || "0", 10)));
        return { ...company, strength };
      }
      return { ...company, name: value };
    });
    setDraftRoster(next);
  }

  function enterEditMode() {
    setDraftRoster(roster.map((company) => ({ ...company })));
    setIsEditing(true);
  }

  async function saveRoster() {
    if (await onSave(draftRoster)) setIsEditing(false);
  }

  function cancelEditing() {
    setDraftRoster(roster.map((company) => ({ ...company })));
    setIsEditing(false);
  }

  function openEleventhClearance() {
    setClearanceCode("");
    setClearanceError("");
    setClearanceOpen(true);
  }

  function verifyEleventhClearance() {
    if (clearanceCode.trim().toLocaleLowerCase() !== "the emperor protects") {
      setClearanceError("CLEARANCE PHRASE REJECTED");
      return;
    }
    window.sessionStorage.setItem("lunar-dragons-eleventh-clearance", "granted");
    setEleventhUnlocked(true);
    setClearanceOpen(false);
    setClearanceCode("");
    setClearanceError("");
  }

  function renderCompanyRow(company: ChapterCompany, index: number, isSecret = false) {
    return (
      <article
        className={`${isEditing ? "company-row panel" : "company-row panel clickable-company"}${isSecret ? " secret-company-row" : ""}`}
        key={company.number}
        role={isEditing ? undefined : "link"}
        tabIndex={isEditing ? undefined : 0}
        onClick={() => !isEditing && router.push(`/companies/${index + 1}`)}
        onKeyDown={(event) => {
          if (!isEditing && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            router.push(`/companies/${index + 1}`);
          }
        }}
        aria-label={isEditing ? undefined : `Open ${company.name} member overview`}
      >
        <span className="company-number">{company.number}</span>
        <div>
          {isEditing ? (
            <input
              className="company-name-input"
              value={company.name}
              onChange={(event) => updateCompany(index, "name", event.target.value)}
              aria-label={`${company.number} company name`}
            />
          ) : <h2>{company.name}</h2>}
          <p>{company.role}</p>
        </div>
        <div className="company-heraldry-preview">
          <CompanyHeraldryPreview
            companyName={company.name}
            companyNumber={index + 1}
            kind="sigil"
          />
          <CompanyHeraldryPreview
            companyName={company.name}
            companyNumber={index + 1}
            kind="pauldron"
          />
        </div>
        <div className="roster-strength">
          {isEditing ? (
            <input
              className="company-strength-input"
              type="number"
              min="0"
              max="1000"
              value={company.strength}
              onChange={(event) => updateCompany(index, "strength", event.target.value)}
              aria-label={`${company.number} company members`}
            />
          ) : <b className="company-strength-value">{company.strength}</b>}
          <i><span style={{ width: `${Math.min(100, company.strength)}%` }} /></i>
          {!isEditing && <span className="company-open-mark" aria-hidden="true">›</span>}
        </div>
      </article>
    );
  }

  return (
    <div className={isEditing ? "company-roster editing-roster" : "company-roster"}>
      <div className="edit-mode-bar panel">
        <div>
          <span>{isEditing ? "EDIT ENVIRONMENT ACTIVE" : canEdit ? "ADMIN MODE · ROSTER READY" : "VIEW-ONLY ROSTER"}</span>
          <p>{isEditing ? "Changes remain drafts until you save them." : canEdit ? "Open the edit environment to change company records." : "Enter Admin Mode to change company names or member counts."}</p>
        </div>
        <div className="edit-actions">
          {isEditing ? (
            <>
              <button className="cancel-edit" onClick={cancelEditing}>CANCEL</button>
              <button className="save-edit" onClick={saveRoster}>SAVE CHANGES</button>
            </>
          ) : canEdit ? (
            <button className="enter-edit" onClick={enterEditMode}>✎ EDIT COMPANIES</button>
          ) : null}
        </div>
      </div>
      <div className="roster-summary panel"><strong>{total}</strong><span>Recorded battle-brothers</span><i>Nominal strength: 1,000</i></div>
      {publicRoster.map((company, index) => renderCompanyRow(company, index))}
      <div className="eleventh-company-divider" aria-hidden="true">
        <span />
        <b>XI · SEALED RECORD</b>
        <span />
      </div>
      {eleventhUnlocked ? renderCompanyRow(secretCompany, 10, true) : (
        <article
          className="company-row panel clickable-company redacted-company-row"
          role="button"
          tabIndex={0}
          onClick={openEleventhClearance}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openEleventhClearance();
            }
          }}
          aria-label="Request clearance for the redacted eleventh company record"
        >
          <span className="company-number">XI</span>
          <div>
            <h2>██████ REDACTED ██████</h2>
            <p>Clearance level obscurus required</p>
          </div>
          <div className="company-heraldry-preview redacted-heraldry" aria-hidden="true">
            <span>▓▓▓</span>
            <span>▓▓▓</span>
          </div>
          <div className="roster-strength">
            <b className="company-strength-value">██</b>
            <i><span style={{ width: "11%" }} /></i>
            <span className="company-open-mark" aria-hidden="true">›</span>
          </div>
        </article>
      )}
      {clearanceOpen && (
        <div
          className="eleventh-clearance-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setClearanceOpen(false)}
        >
          <section
            aria-labelledby="eleventh-clearance-title"
            aria-modal="true"
            className="eleventh-clearance-dialog"
            role="dialog"
          >
            <button
              aria-label="Close clearance prompt"
              className="eleventh-clearance-close"
              onClick={() => setClearanceOpen(false)}
              type="button"
            >
              ×
            </button>
            <span className="section-kicker">ORDO OBSCURUS · IDENTITY CHALLENGE</span>
            <h2 id="eleventh-clearance-title">XI COMPANY RECORD SEALED</h2>
            <p>This formation does not exist. Enter the sanctioned clearance phrase to continue.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                verifyEleventhClearance();
              }}
            >
              <label htmlFor="eleventh-clearance-code">CLEARANCE PHRASE</label>
              <input
                autoComplete="off"
                autoFocus
                id="eleventh-clearance-code"
                onChange={(event) => {
                  setClearanceCode(event.target.value);
                  setClearanceError("");
                }}
                spellCheck={false}
                type="password"
                value={clearanceCode}
              />
              <button type="submit">UNSEAL RECORD</button>
            </form>
            {clearanceError && <strong className="eleventh-clearance-error" role="status">{clearanceError}</strong>}
          </section>
        </div>
      )}
    </div>
  );
}

const preliminarySurveyContacts = [
  {
    id: "AUGUR-PRIMUS",
    label: "PRIMARY STAR",
    classification: "LOW-BURNING YELLOW-ORANGE",
    detail: "Magnetically violent corona; periodic long-range augur blindness.",
    kind: "star",
    x: 43,
    y: 43,
  },
  {
    id: "RETURN-I",
    label: "INNER BODY",
    classification: "SCORCHED · AIRLESS",
    detail: "Broken iron and vitrified stone; no present habitation detected.",
    kind: "scorched",
    x: 31,
    y: 34,
  },
  {
    id: "RETURN-II",
    label: "INDUSTRIAL RETURN",
    classification: "POISONED · WORKED",
    detail: "Excavated surface, ruined orbital structures, and no stable power response.",
    kind: "industrial",
    x: 34,
    y: 63,
  },
  {
    id: "RETURN-III",
    label: "INHABITED WORLD",
    classification: "HABITABLE · SIGNAL DEGRADED",
    detail: "Human-scale ruins, agriculture, artificial light, and archaic low-power vox traffic.",
    kind: "inhabited",
    x: 61,
    y: 32,
  },
  {
    id: "RETURN-IV",
    label: "OUTER GIANT",
    classification: "STORM-BANDED · MULTIPLE MOONS",
    detail: "Massive outer-system giant surrounded by moons and a broad debris field.",
    kind: "giant",
    x: 73,
    y: 66,
  },
  {
    id: "RETURN-IV-A",
    label: "MOON COMPLEX",
    classification: "ARTIFICIAL STRUCTURES · FAINT POWER",
    detail: "Possible anchorage and salvage refuge; active defences cannot be excluded.",
    kind: "moon",
    x: 78,
    y: 56,
  },
] as const;

const initialSurveyConditions = [
  "Translation occurred deep within the local gravity well.",
  "No reliable Astronomican fix or recognised Imperial beacon answers.",
  "No confirmed transponder from the missing crusade force is detected.",
  "No hostile capital vessel is presently within weapons range.",
] as const;

const initialSurveyPriorities = [
  "Restore dependable short-range augurs and stabilise the Lunaris.",
  "Search for crusade vessels elsewhere within the system.",
  "Resolve the moon complex before committing to approach.",
  "Decode the northern-hemisphere planetary transmission.",
  "Locate fuel, repair material, concealment, and defensible anchorage.",
] as const;

const completedSectorSimulacrum: SectorIntel = {
  sectorName: "NOOSPHERIC SANDBOX",
  subsectorName: "COMPLETED SECTOR CHART SIMULACRUM",
  currentTheater: "ADMINISTRATOR PRESENTATION TEST",
  deploymentStatus: "NON-CANON CARTOGRAPHIC SIMULATION",
  astropathicDate: "SIMULATION CLOCK // NO ARCHIVE STAMP",
  summary: "A presentation-only model of a finished Sector Intel chart. Every system, body, faction, and route in this view is temporary test data and is never written to the chapter archive.",
  survey: {
    authority: "draft",
    receivingLocus: "SIMULATED OBSERVATION NODE",
    systemDesignation: "TEST DATASET",
    probableRegion: "CARTOGRAPHIC SANDBOX // NO GALACTIC FIX",
    transitRoute: "NOOSPHERIC SIMULACRUM ACTIVE // LIVE INTELLIGENCE ISOLATED",
    cartographicConfidence: "MODEL COMPLETE",
    communications: "TEST CHANNELS RESPONSIVE",
    supportForceStatus: "SIMULATED FORMATION",
    vesselCondition: "NOT APPLICABLE",
    isolationStatus: "ARCHIVE WRITE PATH DISABLED",
  },
  worlds: [
    {
      name: "SIMULACRUM ALPHA", classification: "BINARY ANCHOR SYSTEM", status: "Secure", x: 24, y: 30,
      bodies: [
        { name: "ALPHA-I", type: "Barren World", status: "Surveyed", orbit: 1, population: "None", climate: "Irradiated", allegiance: "Unclaimed", resources: "Trace metals", summary: "Inner-system cartographic test body." },
        { name: "ALPHA-II", type: "Hive World", status: "Compliant", orbit: 2, population: "TEST VALUE", climate: "Industrial", allegiance: "Simulated Imperial", resources: "Manufactoria", summary: "Populated-world dossier presentation sample." },
        { name: "ALPHA-III", type: "Gas Giant", status: "Surveyed", orbit: 3, population: "None", climate: "Storm bands", allegiance: "Unclaimed", resources: "Volatiles", summary: "Outer giant and orbital-scale marker sample." },
      ],
    },
    {
      name: "SIMULACRUM BETA", classification: "FORTIFIED SINGLE-STAR SYSTEM", status: "Contested", x: 47, y: 22,
      bodies: [
        { name: "BETA-I", type: "Forge World", status: "Operational", orbit: 1, population: "TEST VALUE", climate: "Mechanised", allegiance: "Simulated Mechanicus", resources: "Adamantine analogue", summary: "Industrial dossier layout sample." },
        { name: "BETA-II", type: "Dead World", status: "Quarantined", orbit: 2, population: "None", climate: "Ash waste", allegiance: "Unresolved", resources: "Sealed", summary: "Restricted-world dossier layout sample." },
      ],
    },
    {
      name: "SIMULACRUM GAMMA", classification: "OUTER REACH SYSTEM", status: "No Signal", x: 73, y: 42,
      bodies: [
        { name: "GAMMA-I", type: "Ocean World", status: "Unverified", orbit: 1, population: "Unknown", climate: "Pelagic", allegiance: "Unknown", resources: "Biological", summary: "Unresolved planetary record sample." },
        { name: "GAMMA-II", type: "Ice World", status: "Unverified", orbit: 2, population: "Unknown", climate: "Cryogenic", allegiance: "Unknown", resources: "Promethium analogue", summary: "Outer-orbit dossier sample." },
        { name: "GAMMA-II-A", type: "Moon", status: "Signal Detected", orbit: 3, population: "Unknown", climate: "Airless", allegiance: "Unknown", resources: "Unresolved", summary: "Planetary satellite dossier sample." },
      ],
    },
    {
      name: "SIMULACRUM DELTA", classification: "WARP-SHADOWED SYSTEM", status: "Unknown", x: 60, y: 72,
      bodies: [
        { name: "DELTA-I", type: "Agri World", status: "Degraded Contact", orbit: 1, population: "TEST VALUE", climate: "Temperate", allegiance: "Unresolved", resources: "Agricultural", summary: "Civilian-world dossier presentation sample." },
        { name: "DELTA-II", type: "Death World", status: "Hostile Biosphere", orbit: 2, population: "Sparse", climate: "Toxic", allegiance: "Unclaimed", resources: "Biological", summary: "Hazard-world dossier presentation sample." },
      ],
    },
  ],
  warpLanes: [
    { name: "TEST ROUTE A-1", from: 0, to: 1, status: "stable" },
    { name: "TEST ROUTE B-2", from: 1, to: 2, status: "unstable" },
    { name: "TEST ROUTE C-3", from: 2, to: 3, status: "blockaded" },
    { name: "TEST ROUTE D-4", from: 3, to: 0, status: "unknown" },
  ],
  factions: [
    { name: "SIMULATED IMPERIAL HOLDING", alignment: "ally", classification: "PRESENTATION CONTACT", threat: 1, disposition: "Example ally dossier. This polity does not exist in the authoritative archive." },
    { name: "SIMULATED HOSTILE CONTACT", alignment: "enemy", classification: "PRESENTATION CONTACT", threat: 4, disposition: "Example hostile dossier. This threat does not exist in the authoritative archive." },
    { name: "SIMULATED UNKNOWN POLITY", alignment: "uncertain", classification: "PRESENTATION CONTACT", threat: 2, disposition: "Example unresolved dossier. This polity does not exist in the authoritative archive." },
  ],
  directives: [
    "Demonstrate a populated sector chart without altering the live survey.",
    "Exercise system selection, route rendering, body summaries, and contact dossiers.",
    "Return to live intelligence before entering or sealing operational data.",
  ],
};

function SectorIntelSection({
  canEdit,
  intel,
  onSave,
  originLocationId,
}: {
  canEdit: boolean;
  intel: SectorIntel;
  onSave: (value: SectorIntel) => Promise<boolean>;
  originLocationId: string | null;
}) {
  const [draft, setDraft] = useState<SectorIntel>(intel);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedWorldIndex, setSelectedWorldIndex] = useState<number | null>(null);
  const [activeRegister, setActiveRegister] = useState<"systems" | "contacts" | "mandate" | "taxonomy">("systems");
  const [showWarpLanes, setShowWarpLanes] = useState(true);
  const [showEmpyricInterference, setShowEmpyricInterference] = useState(true);
  const [showTestChart, setShowTestChart] = useState(false);

  useEffect(() => {
    if (!isEditing) setDraft(intel);
  }, [intel, isEditing]);

  useEffect(() => {
    if (!canEdit) setShowTestChart(false);
  }, [canEdit]);

  function updateField(field: keyof Omit<SectorIntel, "worlds" | "factions" | "directives" | "warpLanes" | "survey">, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateSurvey(field: keyof SectorIntel["survey"], value: string) {
    setDraft((current) => ({
      ...current,
      survey: { ...current.survey, [field]: value },
    }));
  }

  function updateWorld(index: number, field: keyof SectorIntel["worlds"][number], value: string) {
    setDraft((current) => ({
      ...current,
      worlds: current.worlds.map((world, worldIndex) =>
        worldIndex === index
          ? {
              ...world,
              [field]: field === "x" || field === "y"
                ? Math.max(6, Math.min(field === "x" ? 94 : 92, Number(value) || 0))
                : value,
            }
          : world,
      ),
    }));
  }

  function updateFaction(index: number, field: keyof SectorIntel["factions"][number], value: string) {
    setDraft((current) => ({
      ...current,
      factions: current.factions.map((faction, factionIndex) =>
        factionIndex === index
          ? { ...faction, [field]: field === "threat" ? Math.max(1, Math.min(5, Number(value) || 1)) : value }
          : faction,
      ),
    }));
  }

  function updateWarpLane(index: number, field: keyof SectorIntel["warpLanes"][number], value: string) {
    setDraft((current) => ({
      ...current,
      warpLanes: current.warpLanes.map((lane, laneIndex) =>
        laneIndex === index
          ? { ...lane, [field]: field === "from" || field === "to" ? Number(value) : value }
          : lane,
      ),
    }));
  }

  function removeWorld(index: number) {
    setDraft((current) => ({
      ...current,
      worlds: current.worlds.filter((_, worldIndex) => worldIndex !== index),
      warpLanes: current.warpLanes
        .filter((lane) => lane.from !== index && lane.to !== index)
        .map((lane) => ({
          ...lane,
          from: lane.from > index ? lane.from - 1 : lane.from,
          to: lane.to > index ? lane.to - 1 : lane.to,
        })),
    }));
    setSelectedWorldIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  async function saveIntel() {
    if (await onSave(draft)) {
      setIsEditing(false);
      setMessage("Sector intelligence sealed to the shared archive.");
    } else {
      setMessage("The intelligence record could not be saved.");
    }
  }

  const isTestChartActive = canEdit && showTestChart;
  const display = isTestChartActive ? completedSectorSimulacrum : isEditing ? draft : intel;
  const plottedOrigin = !isTestChartActive && originLocationId
    ? resolveTransmissionOrigin(display, { originLocationId, originState: "CONFIRMED" })
    : null;
  const selectedWorld = selectedWorldIndex === null ? null : display.worlds[selectedWorldIndex] ?? null;
  const showPreliminarySurvey = display.worlds.length === 0;
  const surveyAuthority = display.survey.authority === "ratified"
    ? "RATIFIED OPERATIONAL INTELLIGENCE"
    : display.survey.authority === "review"
      ? "INTELLIGENCE UNDER REVIEW"
      : "DRAFT OPERATIONAL PREMISE";

  useEffect(() => {
    if (plottedOrigin?.kind === "exact") setSelectedWorldIndex(plottedOrigin.parentSystemIndex);
  }, [plottedOrigin?.kind, plottedOrigin?.kind === "exact" ? plottedOrigin.parentSystemIndex : -1]);

  useEffect(() => {
    if (selectedWorldIndex !== null && selectedWorldIndex >= display.worlds.length) setSelectedWorldIndex(null);
  }, [display.worlds.length, selectedWorldIndex]);

  function toggleTestChart() {
    setShowTestChart((current) => !current);
    setIsEditing(false);
    setDraft(intel);
    setSelectedWorldIndex(null);
    setActiveRegister("systems");
    setMessage("");
  }

  if (!isEditing) {
    const usePrototype = isTestChartActive || intel.worlds.length === 0;
    return (
      <SectorCartographyExperience
        canEdit={canEdit}
        intel={usePrototype ? completedSectorSimulacrum : intel}
        isPrototype={usePrototype}
        onOpenEditor={() => {
          setShowTestChart(false);
          setDraft(intel);
          setIsEditing(true);
          setSelectedWorldIndex(null);
          setMessage("");
        }}
      />
    );
  }

  return (
    <div className={`${isEditing ? "sector-intel editing" : "sector-intel"}${isTestChartActive ? " simulacrum-active" : ""}`}>
      <section className="panel intel-theatre-header">
        <div className="intel-theatre-seal" aria-hidden="true"><span>III</span></div>
        <div className="intel-theatre-title">
          <p className="section-kicker">Adeptus Astartes · Tactica Siderea</p>
          <h1>Argent Vigil Intelligence</h1>
          <p>{display.sectorName} · local cartographic reconstruction</p>
        </div>
        <div className={`intel-authority-badge ${display.survey.authority}`}>
          <span>RECORD AUTHORITY</span>
          <b>{surveyAuthority}</b>
          <small>NOT ESTABLISHED CHRONICLE CANON</small>
        </div>
      </section>

      <section className="intel-status-matrix" aria-label="Current operational state">
        <article><span>RECEIVING LOCUS</span><b>{display.survey.receivingLocus}</b><small>VESSEL FIX · LOCAL ORIGIN UNKNOWN</small></article>
        <article><span>LOCAL SYSTEM</span><b>{display.survey.systemDesignation}</b><small>NO SANCTIONED CARTOGRAPHIC NAME</small></article>
        <article><span>NAVIGATIONAL FIX</span><b>{display.survey.cartographicConfidence}</b><small>{display.survey.probableRegion}</small></article>
        <article><span>COMMUNION STATUS</span><b>{display.survey.communications}</b><small>{display.astropathicDate}</small></article>
      </section>

      <section className="panel intel-command-strip">
        <div>
          <span>{isTestChartActive ? "ADMINISTRATOR CARTOGRAPHIC SIMULACRUM" : isEditing ? "TACTICA EDIT ENVIRONMENT ACTIVE" : "ASTROPATHIC CARTOGRAPHY LINK ACTIVE"}</span>
          <p>{display.survey.transitRoute}</p>
        </div>
        {canEdit && (
          <div className="edit-actions">
            <button className={`intel-simulacrum-toggle${isTestChartActive ? " active" : ""}`} onClick={toggleTestChart} type="button">
              {isTestChartActive ? "RETURN TO LIVE INTEL" : "VIEW COMPLETED CHART TEST"}
            </button>
            {!isTestChartActive && (isEditing ? (
              <>
                <button className="cancel-edit" onClick={() => { setDraft(intel); setIsEditing(false); }}>CANCEL</button>
                <button className="save-edit" onClick={() => void saveIntel()}>SEAL INTELLIGENCE</button>
              </>
            ) : (
              <button className="enter-edit" onClick={() => setIsEditing(true)}>✎ EDIT SECTOR INTEL</button>
            ))}
          </div>
        )}
      </section>

      {isTestChartActive && (
        <aside className="intel-simulacrum-warning" role="status">
          <strong>NOOSPHERIC SANDBOX // NON-CANON // NOT STORED</strong>
          <span>This completed chart is an administrator-only presentation model. It cannot be edited, saved, or opened as a live Sector Intel record.</span>
        </aside>
      )}

      <section className="intel-console-grid">
        <div className="panel intel-map-panel">
          <header>
            <div>
              <p className="section-kicker">Degraded local survey</p>
              {isEditing ? (
                <input value={display.subsectorName} onChange={(event) => updateField("subsectorName", event.target.value)} aria-label="Subsector name" />
              ) : <h2>{display.subsectorName}</h2>}
            </div>
            <div className="intel-layer-controls" aria-label="Cartographic layers">
              <button className={showWarpLanes ? "active" : ""} onClick={() => setShowWarpLanes((current) => !current)} type="button">WARP ROUTES</button>
              <button className={showEmpyricInterference ? "active" : ""} onClick={() => setShowEmpyricInterference((current) => !current)} type="button">EMPYRIC VEIL</button>
            </div>
          </header>
          <div className={`sector-map intel-survey-map${showEmpyricInterference ? " empyric-active" : ""}`} aria-label={`Localized map of ${display.subsectorName}`}>
            <div className="intel-chart-depth" aria-hidden="true" />
            <div className="sector-map-grid" aria-hidden="true" />
            <div className="intel-chart-boundaries" aria-hidden="true"><i /><i /><i /></div>
            <div className="intel-chart-frame" aria-hidden="true">
              <span className="spinward">RELATIVE SPINWARD</span>
              <span className="trailing">LOCAL TRAILING</span>
              <i className="corner-nw" /><i className="corner-ne" /><i className="corner-sw" /><i className="corner-se" />
            </div>
            {showPreliminarySurvey && (
              <>
                <div className="preliminary-debris-belt" aria-hidden="true"><i /><i /><i /></div>
                {preliminarySurveyContacts.map((contact) => (
                  <div
                    aria-label={`${contact.label}; ${contact.classification}; provisional unverified augur return`}
                    className={`preliminary-survey-contact ${contact.kind}`}
                    key={contact.id}
                    role="img"
                    style={{ left: `${contact.x}%`, top: `${contact.y}%` }}
                  >
                    <i /><b>{contact.id}</b><small>{contact.label}</small>
                  </div>
                ))}
              </>
            )}
            {showEmpyricInterference && <div className="sector-rift" aria-hidden="true"><i /><i /><i /></div>}
            {plottedOrigin?.kind === "exact" && (
              <div className="sector-origin-fix" role="status">
                <span>TRANSMISSION ORIGIN FIX</span>
                <b>{plottedOrigin.label}</b>
                <small>
                  {plottedOrigin.bodyIndex === undefined
                    ? `SYSTEM RECORD · ${plottedOrigin.parentSystemLabel}`
                    : `EXACT BODY · PARENT SYSTEM ${plottedOrigin.parentSystemLabel}`}
                </small>
              </div>
            )}
            {showWarpLanes && display.warpLanes.map((lane, index) => {
              const from = display.worlds[lane.from];
              const to = display.worlds[lane.to];
              if (!from || !to || lane.from === lane.to) return null;
              const left = Math.min(from.x, to.x);
              const top = Math.min(from.y, to.y);
              const width = Math.max(.7, Math.abs(to.x - from.x));
              const height = Math.max(.7, Math.abs(to.y - from.y));
              const reverse = (to.x - from.x) * (to.y - from.y) < 0;
              return (
                <div
                  aria-label={`${lane.name}: ${from.name} to ${to.name}, ${lane.status}`}
                  className={`warp-lane ${lane.status}${reverse ? " reverse" : ""}`}
                  key={`${lane.name}-${index}`}
                  role="img"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  title={`${lane.name} · ${from.name} ↔ ${to.name} · ${lane.status}`}
                >
                  <i /><span>{lane.name}</span>
                </div>
              );
            })}
            {display.worlds.map((world, index) => {
              const isOriginFocus = plottedOrigin?.kind === "exact" && plottedOrigin.parentSystemIndex === index;
              const isSelected = selectedWorldIndex === index;
              return (
                <button
                  aria-current={isOriginFocus ? "location" : undefined}
                  aria-label={isOriginFocus ? `Transmission origin focus: ${plottedOrigin.label}; inspect ${world.name}` : `Inspect ${world.name}`}
                  aria-pressed={isSelected}
                  className={`sector-world world-${index + 1} ${world.status.toLowerCase().replace(/[^a-z]+/g, "-")}${isOriginFocus ? " transmission-origin-focus" : ""}${isSelected ? " selected" : ""}`}
                  data-origin-focus={isOriginFocus ? plottedOrigin.canonicalId : undefined}
                  key={`${world.name}-${index}`}
                  onClick={() => setSelectedWorldIndex(index)}
                  style={{ left: `${world.x}%`, top: `${world.y}%` }}
                  title={`${world.name} · ${world.classification} · ${world.status}`}
                  type="button"
                >
                  <i />
                  <b>{world.name}</b>
                  <small>{world.status}</small>
                </button>
              );
            })}
            <div className="lunaris-locus-marker" aria-label={isTestChartActive ? "Simulated observation node; presentation only" : "Lunaris receiving locus; heavily damaged but capable of self-defence"}>
              <i /><b>{isTestChartActive ? "OBSERVATION NODE" : "LUNARIS"}</b><small>{isTestChartActive ? "SIMULATION LOCUS · NOT STORED" : "BARELY OPERATIONAL · BATTERIES STANDING"}</small>
            </div>
            {!display.worlds.length && (
              <div className="survey-void-state">
                <span>INITIAL AUSPEX PICTURE · DRAFT ONLY</span>
                <b>{display.survey.systemDesignation}</b>
                <p>Six provisional returns and an outer debris belt are visible. Names, orbital solutions, allegiance, and navigable routes remain unverified.</p>
              </div>
            )}
            <span className="map-compass" aria-hidden="true">N<br />✦</span>
            <span className="map-scale">LOCAL SCALE UNAVAILABLE</span>
          </div>
          <div className="intel-map-legend">
            <span><i className="secure" /> Confirmed contact</span>
            <span><i className="contested" /> Uncertain contact</span>
            <span><i className="hostile" /> Hostile / unresolved</span>
            <span><i className="lane-stable" /> Stable lane</span>
            <span><i className="lane-unstable" /> Unstable / blockaded</span>
          </div>
        </div>

        <aside className="panel intel-target-dossier">
          <div className="galactic-fix" aria-label="Approximate northeastern Nachmund location; exact coordinates unknown">
            <div className="galactic-fix-disk"><i /><span /></div>
            <p><span>PROBABLE GALACTIC FIX</span><b>{display.survey.probableRegion}</b><small>UNCERTAINTY ENVELOPE · NOT TO SCALE</small></p>
          </div>
          {selectedWorld ? (
            <div className="intel-selected-record">
              <p className="section-kicker">Selected cartographic object</p>
              <h2>{selectedWorld.name}</h2>
              <strong>{selectedWorld.classification} · {selectedWorld.status}</strong>
              <dl>
                <div><dt>CHARTED BODIES</dt><dd>{selectedWorld.bodies.length}</dd></div>
                <div><dt>MAP POSITION</dt><dd>{selectedWorld.x.toFixed(1)} / {selectedWorld.y.toFixed(1)}</dd></div>
                <div><dt>AUTHORITY</dt><dd>{isTestChartActive ? "NON-CANON SIMULATION" : "OPERATIONAL INTELLIGENCE"}</dd></div>
              </dl>
              {isTestChartActive ? (
                <div className="intel-simulacrum-bodies" aria-label={`Simulated bodies in ${selectedWorld.name}`}>
                  <span>SIMULATED ORBITAL REGISTER</span>
                  {selectedWorld.bodies.map((body) => (
                    <p key={body.name}><b>{body.name}</b><small>{body.type} // {body.status}</small></p>
                  ))}
                  <em>NO LIVE ARCHIVE ROUTE</em>
                </div>
              ) : (
                <CartographyTransitionLink className="seal-button" href={`/intel/system/${selectedWorldIndex! + 1}`}>OPEN SYSTEM RECORD</CartographyTransitionLink>
              )}
            </div>
          ) : (
            <div className="intel-selected-record unresolved">
              <p className="section-kicker">Receiving vessel condition</p>
              <h2>{display.survey.receivingLocus}</h2>
              <strong>{display.deploymentStatus}</strong>
              <p>{display.summary}</p>
              <dl>
                <div><dt>SUPPORTING FORCE</dt><dd>{display.survey.supportForceStatus}</dd></div>
                <div><dt>FLAGSHIP</dt><dd>{display.survey.vesselCondition}</dd></div>
                <div><dt>LOCAL ISOLATION</dt><dd>{display.survey.isolationStatus}</dd></div>
              </dl>
            </div>
          )}
        </aside>
      </section>

      {isEditing && (
        <section className="panel intel-survey-editor">
          <div className="panel-heading">
            <div><p className="section-kicker">Operational premise controls</p><h2>Survey authority & condition</h2></div>
          </div>
          <div className="intel-survey-fields">
            <label>AUTHORITY<select value={display.survey.authority} onChange={(event) => updateSurvey("authority", event.target.value)}><option value="draft">DRAFT</option><option value="review">REVIEW</option><option value="ratified">RATIFIED INTELLIGENCE</option></select></label>
            <label>THEATRE<input value={display.currentTheater} onChange={(event) => updateField("currentTheater", event.target.value)} /></label>
            <label>STATUS<input value={display.deploymentStatus} onChange={(event) => updateField("deploymentStatus", event.target.value)} /></label>
            <label>ASTROPATHIC DATE<input value={display.astropathicDate} onChange={(event) => updateField("astropathicDate", event.target.value)} /></label>
            <label>RECEIVING LOCUS<input value={display.survey.receivingLocus} onChange={(event) => updateSurvey("receivingLocus", event.target.value)} /></label>
            <label>SYSTEM DESIGNATION<input value={display.survey.systemDesignation} onChange={(event) => updateSurvey("systemDesignation", event.target.value)} /></label>
            <label>PROBABLE REGION<input value={display.survey.probableRegion} onChange={(event) => updateSurvey("probableRegion", event.target.value)} /></label>
            <label>TRANSIT ROUTE<input value={display.survey.transitRoute} onChange={(event) => updateSurvey("transitRoute", event.target.value)} /></label>
            <label>NAVIGATIONAL CONFIDENCE<input value={display.survey.cartographicConfidence} onChange={(event) => updateSurvey("cartographicConfidence", event.target.value)} /></label>
            <label>COMMUNION STATUS<input value={display.survey.communications} onChange={(event) => updateSurvey("communications", event.target.value)} /></label>
            <label>SUPPORTING FORCE<input value={display.survey.supportForceStatus} onChange={(event) => updateSurvey("supportForceStatus", event.target.value)} /></label>
            <label>VESSEL CONDITION<input value={display.survey.vesselCondition} onChange={(event) => updateSurvey("vesselCondition", event.target.value)} /></label>
            <label>ISOLATION STATUS<input value={display.survey.isolationStatus} onChange={(event) => updateSurvey("isolationStatus", event.target.value)} /></label>
            <label className="wide">STRATEGIC SUMMARY<textarea value={display.summary} onChange={(event) => updateField("summary", event.target.value)} /></label>
          </div>
        </section>
      )}

      <nav className="intel-register-tabs" aria-label="Intelligence registers">
        <button className={activeRegister === "systems" ? "active" : ""} onClick={() => setActiveRegister("systems")}><span>01</span>SYSTEM SURVEY <b>{display.worlds.length}V · {showPreliminarySurvey ? preliminarySurveyContacts.length : 0}R</b></button>
        <button className={activeRegister === "contacts" ? "active" : ""} onClick={() => setActiveRegister("contacts")}><span>02</span>CONTACTS <b>{display.factions.length}</b></button>
        <button className={activeRegister === "mandate" ? "active" : ""} onClick={() => setActiveRegister("mandate")}><span>03</span>CRUSADE MANDATE <b>{display.directives.length}</b></button>
        <button className={activeRegister === "taxonomy" ? "active" : ""} onClick={() => setActiveRegister("taxonomy")}><span>04</span>CLASSIFICATION INDEX <b>113</b></button>
      </nav>

      {activeRegister === "systems" && (
        <section className="panel intel-world-editor intel-register-panel">
          <div className="panel-heading">
            <div><p className="section-kicker">Local survey register</p><h2>Confirmed system records</h2></div>
            {isEditing && <button
              className="text-button"
              onClick={() => setDraft((current) => ({
                ...current,
                worlds: [...current.worlds, { name: "Uncharted System", classification: "Unclassified", status: "Unknown", x: 50, y: 50, bodies: [] }],
              }))}
            >
              + ADD SYSTEM
            </button>}
          </div>
          {isEditing ? (
            <div className="intel-world-list">
              {display.worlds.map((world, index) => (
                <div key={index}>
                  <input value={world.name} onChange={(event) => updateWorld(index, "name", event.target.value)} aria-label={`System ${index + 1} name`} />
                  <input value={world.classification} onChange={(event) => updateWorld(index, "classification", event.target.value)} aria-label={`${world.name} classification`} />
                  <input value={world.status} onChange={(event) => updateWorld(index, "status", event.target.value)} aria-label={`${world.name} status`} />
                  <label>X<input type="number" min="6" max="94" value={world.x} onChange={(event) => updateWorld(index, "x", event.target.value)} /></label>
                  <label>Y<input type="number" min="8" max="92" value={world.y} onChange={(event) => updateWorld(index, "y", event.target.value)} /></label>
                  <button onClick={() => removeWorld(index)}>REMOVE</button>
                </div>
              ))}
              {!display.worlds.length && <p className="empty-record">No system has survived cartographic verification. Add the first record only when the local fix is supported.</p>}
            </div>
          ) : (
            <div className="intel-system-register">
              {display.worlds.map((world, index) => (
                <button key={`${world.name}-${index}`} onClick={() => setSelectedWorldIndex(index)}>
                  <span>{String(index + 1).padStart(2, "0")}</span><div><b>{world.name}</b><small>{world.classification}</small></div><em>{world.status}</em><i>›</i>
                </button>
              ))}
              {!display.worlds.length && (
                <div className="preliminary-survey-register">
                  <header>
                    <div><span>DRAFT DEVELOPMENT RECORD</span><h3>Initial auspex picture</h3></div>
                    <strong>NO VERIFIED SYSTEM RECORDS</strong>
                    <p>The Lunaris appears to have arrived alone within an unidentified system. These returns are schematic sensor classifications, not named or sanctioned cartographic objects.</p>
                  </header>
                  <div className="preliminary-contact-grid">
                    {preliminarySurveyContacts.map((contact) => (
                      <article key={contact.id}>
                        <span>{contact.id}</span><b>{contact.label}</b><small>{contact.classification}</small><p>{contact.detail}</p>
                      </article>
                    ))}
                  </div>
                  <div className="preliminary-survey-briefs">
                    <section><h4>FIRST SURVEY CONDITIONS</h4><ul>{initialSurveyConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>
                    <section><h4>IMMEDIATE COMMAND PRIORITIES</h4><ol>{initialSurveyPriorities.map((priority) => <li key={priority}>{priority}</li>)}</ol></section>
                  </div>
                  <footer>SYSTEM NAME · BODY NAMES · POPULATION · ALLEGIANCE · CHRONOLOGY · THREAT IDENTITIES // UNRESOLVED</footer>
                </div>
              )}
            </div>
          )}
          {isEditing && <div className="warp-lane-editor">
            <div className="panel-heading">
              <div><p className="section-kicker">Navigator routes</p><h2>Warp lane registry</h2></div>
              <button
                className="text-button"
                disabled={display.worlds.length < 2}
                onClick={() => setDraft((current) => ({
                  ...current,
                  warpLanes: [...current.warpLanes, { name: "New Warp Lane", from: 0, to: 1, status: "unknown" }],
                }))}
              >
                + CREATE WARP LANE
              </button>
            </div>
            <div className="warp-lane-list">
              {display.warpLanes.map((lane, index) => (
                <div key={index}>
                  <input value={lane.name} onChange={(event) => updateWarpLane(index, "name", event.target.value)} aria-label={`Warp lane ${index + 1} name`} />
                  <select value={lane.from} onChange={(event) => updateWarpLane(index, "from", event.target.value)} aria-label={`${lane.name} origin system`}>
                    {display.worlds.map((world, worldIndex) => <option value={worldIndex} key={worldIndex}>{world.name}</option>)}
                  </select>
                  <span aria-hidden="true">↔</span>
                  <select value={lane.to} onChange={(event) => updateWarpLane(index, "to", event.target.value)} aria-label={`${lane.name} destination system`}>
                    {display.worlds.map((world, worldIndex) => <option value={worldIndex} key={worldIndex}>{world.name}</option>)}
                  </select>
                  <select value={lane.status} onChange={(event) => updateWarpLane(index, "status", event.target.value)} aria-label={`${lane.name} status`}>
                    <option value="stable">STABLE</option>
                    <option value="unstable">UNSTABLE</option>
                    <option value="blockaded">BLOCKADED</option>
                    <option value="unknown">UNKNOWN</option>
                  </select>
                  <button onClick={() => setDraft((current) => ({ ...current, warpLanes: current.warpLanes.filter((_, i) => i !== index) }))}>REMOVE</button>
                </div>
              ))}
              {!display.warpLanes.length && <p className="empty-record">No sanctioned warp lanes have been charted.</p>}
            </div>
          </div>}
        </section>
      )}

      {activeRegister === "contacts" && <div className="faction-intel-grid intel-register-panel">
          {display.factions.map((faction, index) => (
            <article className={`panel faction-card ${faction.alignment}`} key={index}>
              <header>
                {isEditing ? <select value={faction.alignment} onChange={(event) => updateFaction(index, "alignment", event.target.value)}><option value="ally">ALLY</option><option value="enemy">ENEMY</option><option value="uncertain">UNCERTAIN</option></select> : <span>{faction.alignment === "ally" ? "SANCTIONED ALLY" : faction.alignment === "enemy" ? "HOSTILE CONTACT" : "UNRESOLVED CONTACT"}</span>}
                <b>THREAT {faction.threat}/5</b>
              </header>
              {isEditing ? <><input value={faction.name} onChange={(event) => updateFaction(index, "name", event.target.value)} aria-label={`Faction ${index + 1} name`} /><input value={faction.classification} onChange={(event) => updateFaction(index, "classification", event.target.value)} aria-label={`${faction.name} classification`} /><label>THREAT LEVEL<input type="range" min="1" max="5" value={faction.threat} onChange={(event) => updateFaction(index, "threat", event.target.value)} /></label><textarea value={faction.disposition} onChange={(event) => updateFaction(index, "disposition", event.target.value)} aria-label={`${faction.name} disposition`} /><button className="intel-remove" onClick={() => setDraft((current) => ({ ...current, factions: current.factions.filter((_, i) => i !== index) }))}>REMOVE DOSSIER</button></> : <><h3>{faction.name}</h3><small>{faction.classification}</small><p>{faction.disposition}</p></>}
              <div className="threat-runes" aria-label={`Threat level ${faction.threat} of 5`}>{[1, 2, 3, 4, 5].map((level) => <i className={level <= faction.threat ? "active" : ""} key={level} />)}</div>
            </article>
          ))}
          {!display.factions.length && <div className="panel intel-empty-register full"><b>NO IDENTIFIED LOCAL FACTIONS</b><p>No ally, enemy, or unresolved polity has survived verification within the unidentified system.</p></div>}
          {isEditing && <button className="panel add-intel-card" onClick={() => setDraft((current) => ({ ...current, factions: [...current.factions, { name: "Unknown Contact", alignment: "uncertain", classification: "Unclassified", threat: 1, disposition: "Intelligence pending." }] }))}>+ CREATE FACTION DOSSIER</button>}
        </div>}

      {activeRegister === "mandate" && <section className="panel operational-directives intel-register-panel">
          <div className="panel-heading"><div><p className="section-kicker">Decree authority</p><h2>Crusade mandate</h2></div><span>ADEPTUS TERRA · ARGENT VIGIL</span></div>
          <ol>{display.directives.map((directive, index) => <li key={index}><b>{String(index + 1).padStart(2, "0")}</b>{isEditing ? <><input value={directive} onChange={(event) => setDraft((current) => ({ ...current, directives: current.directives.map((item, i) => i === index ? event.target.value : item) }))} /><button onClick={() => setDraft((current) => ({ ...current, directives: current.directives.filter((_, i) => i !== index) }))}>×</button></> : <span>{directive}</span>}</li>)}</ol>
          {isEditing && <button className="text-button" onClick={() => setDraft((current) => ({ ...current, directives: [...current.directives, "New operational directive"] }))}>+ ADD DIRECTIVE</button>}
        </section>}

      {activeRegister === "taxonomy" && <div className="intel-register-panel"><PlanetClassificationArchive /></div>}
      {message && <p className="intel-save-status" role="status">{message}</p>}
    </div>
  );
}

function ChroniclesSection({
  canEdit,
  entries,
  onArchiveRefresh,
}: {
  canEdit: boolean;
  entries: LoreEntry[];
  onArchiveRefresh: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(() => entries[0]?.id ?? "");
  const [editorEntry, setEditorEntry] = useState<LoreEntry | null | undefined>(undefined);
  const [activeStatus, setActiveStatus] = useState<"all" | LoreEntry["status"]>("all");
  const [transitioningId, setTransitioningId] = useState("");
  const [publicationStatus, setPublicationStatus] = useState("");
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const statusCounts = entries.reduce(
    (counts, entry) => ({ ...counts, [entry.status]: counts[entry.status] + 1 }),
    { draft: 0, review: 0, canon: 0, retconned: 0 } as Record<LoreEntry["status"], number>,
  );
  const visibleEntries = canEdit && activeStatus !== "all"
    ? entries.filter((entry) => entry.status === activeStatus)
    : entries;

  function statusReadout(entry: LoreEntry) {
    if (entry.status === "canon") return "CANON · SEALED";
    if (entry.status === "review") return "REVIEW · AWAITING JUDGMENT";
    if (entry.status === "retconned") return "RETCONNED · SUPERSEDED";
    return "DRAFT · UNSEALED";
  }

  useEffect(() => {
    if (!selectedId || (selectedId !== "decree" && !entries.some((entry) => entry.id === selectedId))) {
      setSelectedId(entries[0]?.id ?? "decree");
    }
  }, [entries, selectedId]);

  useEffect(() => {
    if (!canEdit && activeStatus !== "all") setActiveStatus("all");
  }, [activeStatus, canEdit]);

  function selectStatus(status: "all" | LoreEntry["status"]) {
    setActiveStatus(status);
    const firstRecord = status === "all"
      ? entries[0]
      : entries.find((entry) => entry.status === status);
    setSelectedId(firstRecord?.id ?? "decree");
    setPublicationStatus("");
  }

  async function transitionEntry(entry: LoreEntry, target: "canon" | "draft") {
    const publishing = target === "canon";
    const confirmed = window.confirm(
      publishing
        ? `Publish "${entry.title || "Untitled archival record"}" as established canon?\n\nThis record will become visible in the public Chronicles.`
        : `Return "${entry.title || "Untitled archival record"}" to draft?\n\nThis record will be removed from the public Chronicles.`,
    );
    if (!confirmed) return;

    setTransitioningId(entry.id);
    setPublicationStatus("");
    try {
      const response = await fetch(
        `/api/admin/lore/${encodeURIComponent(entry.id)}/${publishing ? "publish" : "draft"}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-lunar-admin-mode": "active",
          },
          body: JSON.stringify({ expectedUpdatedAt: entry.updatedAt }),
        },
      );
      const result = (await response.json()) as { entry?: LoreEntry; error?: string };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "The lore status could not be changed.");
      }

      setActiveStatus(target);
      await onArchiveRefresh();
      setSelectedId(result.entry.id);
      setPublicationStatus(
        publishing
          ? `CANON SEALED // ${result.entry.title}`
          : `DRAFT RESTORED // ${result.entry.title}`,
      );
    } catch (error) {
      setPublicationStatus(
        error instanceof Error ? error.message : "The lore status could not be changed.",
      );
    } finally {
      setTransitioningId("");
    }
  }

  function archiveTimestamp(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "ARCHIVE STAMP UNRECORDED";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(value)).toUpperCase();
  }

  return (
    <section className="chronicle-exload-terminal" aria-labelledby="chronicle-exload-title">
      <header className="chronicle-exload-header">
        <div className="chronicle-exload-mark" aria-hidden="true"><i /><b>III</b></div>
        <div className="chronicle-exload-heading">
          <span>ADEPTUS ASTARTES · ANNALIS SANCTUM</span>
          <h1 id="chronicle-exload-title">CHRONICLE EXLOAD TERMINAL</h1>
        </div>
        <div className="chronicle-exload-status" aria-label={canEdit ? `${entries.length} development records across all lore statuses, archive link active` : `${entries.length} canon records, archive link active`}>
          <span><i /> ARCHIVE LINK ACTIVE</span>
          <strong>
            {canEdit
              ? `D${String(statusCounts.draft).padStart(2, "0")} · R${String(statusCounts.review).padStart(2, "0")} · C${String(statusCounts.canon).padStart(2, "0")} · X${String(statusCounts.retconned).padStart(2, "0")}`
              : `${String(entries.length).padStart(2, "0")} CANON RECORDS`}
          </strong>
        </div>
      </header>

      {canEdit && (
        <nav className="chronicle-status-tabs" aria-label="Lore development status categories">
          {([
            ["all", "ALL RECORDS", entries.length],
            ["draft", "DRAFT", statusCounts.draft],
            ["review", "REVIEW", statusCounts.review],
            ["canon", "CANON", statusCounts.canon],
            ["retconned", "RETCONNED", statusCounts.retconned],
          ] as const).map(([status, label, count]) => (
            <button
              type="button"
              key={status}
              data-status={status}
              aria-pressed={activeStatus === status}
              onClick={() => selectStatus(status)}
            >
              <span>{label}</span>
              <strong>{String(count).padStart(2, "0")}</strong>
            </button>
          ))}
        </nav>
      )}

      {publicationStatus && (
        <p className="chronicle-publication-status" role="status">
          {publicationStatus}
        </p>
      )}

      <div className="chronicle-exload-grid">
        <aside className="chronicle-exload-index" aria-label={canEdit ? "Structured lore development record index" : "Canonical Chronicle record index"}>
          <header>
            <span>{canEdit ? "LORE DEVELOPMENT INDEX" : "SEALED RECORD INDEX"}</span>
            <small>{entries.length + 1} RETRIEVABLE OBJECTS</small>
          </header>
          <div className="chronicle-index-scroll">
            <button
              type="button"
              className={`chronicle-index-entry decree ${selectedId === "decree" ? "selected" : ""}`}
              aria-pressed={selectedId === "decree"}
              onClick={() => setSelectedId("decree")}
            >
              <span className="chronicle-index-number">I</span>
              <span className="chronicle-index-copy">
                <small>008.M42 · IMPERIAL DECREE</small>
                <strong>Decree of Reclamation and Vigilance</strong>
                <em>SEALED INSTRUMENT · AUTH: REGENTIS</em>
              </span>
            </button>

            {visibleEntries.length ? visibleEntries.map((entry, index) => (
              <button
                type="button"
                className={`chronicle-index-entry ${selectedId === entry.id ? "selected" : ""}`}
                aria-pressed={selectedId === entry.id}
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
              >
                <span className="chronicle-index-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="chronicle-index-copy">
                  <small>{entry.date || "DATE UNRECORDED"} · {entry.category}</small>
                  <strong>{entry.title || "Untitled archive record"}</strong>
                  <em className={`chronicle-index-status status-${entry.status}`}>{entry.status.toUpperCase()} · {entry.id.startsWith("legacy-") ? "LEGACY INDEX" : "STRUCTURED RECORD"}</em>
                </span>
              </button>
            )) : (
              <p className="chronicle-index-empty">
                {canEdit && activeStatus !== "all"
                  ? `NO ${activeStatus.toUpperCase()} RECORDS ARE HELD IN THE ARCHIVE.`
                  : canEdit
                    ? "NO STRUCTURED LORE RECORDS ARE AVAILABLE."
                    : "NO CANONICAL DEEDS HAVE YET BEEN ENTERED UNDER SEAL."}
              </p>
            )}
          </div>
        </aside>

        <article className="chronicle-exload-reader" aria-live="polite">
          <header className={selectedEntry ? "record-active" : undefined}>
            <div className="chronicle-reader-heading">
              <span>ACTIVE EXLOAD</span>
              <strong>{selectedId === "decree" ? "INSTRUMENTUM IMPERIALIS" : canEdit ? "STRUCTURED LORE RECORD" : "CANONICAL CHRONICLE RECORD"}</strong>
            </div>
            {selectedEntry && (
              <div className="chronicle-reader-record-meta">
                <p className="chronicle-record-path">ANNALIS / {selectedEntry.category.toUpperCase()} / {selectedEntry.date || "DATE-NULL"}</p>
                <div className="chronicle-record-signifiers">
                  <span>DATE <strong>{selectedEntry.date || "UNRECORDED"}</strong></span>
                  <span>CLASS <strong>{selectedEntry.category.toUpperCase()}</strong></span>
                  <span>STATUS <strong className={`status-${selectedEntry.status}`}>{statusReadout(selectedEntry)}</strong></span>
                </div>
              </div>
            )}
            <div className="chronicle-reader-actions">
              <small>{canEdit ? "ADMIN AUTHORITY · DEVELOPMENT VIEW" : "READ AUTHORITY · ARCHIVE VIEW"}</small>
              {canEdit && selectedEntry && (selectedEntry.status === "draft" || selectedEntry.status === "review") && (
                <button
                  type="button"
                  className="chronicle-reader-edit-button"
                  onClick={() => setEditorEntry(selectedEntry)}
                >
                  EDIT RECORD
                </button>
              )}
            </div>
          </header>
          <div className="chronicle-reader-scroll" key={selectedId} tabIndex={0}>
            {selectedId === "decree" ? (
              <DecreeRecord />
            ) : selectedEntry ? (
              <section className="chronicle-record-sheet" aria-labelledby={`chronicle-record-${selectedEntry.id}`}>
                <h2 id={`chronicle-record-${selectedEntry.id}`}>{selectedEntry.title || "Untitled archive record"}</h2>
                {selectedEntry.subtitle && (
                  <p className="chronicle-record-subtitle">{selectedEntry.subtitle}</p>
                )}
                <div className="chronicle-record-rule"><i /><b>+</b><i /></div>
                <LoreFormattedContent content={selectedEntry.content} />
                {canEdit && (selectedEntry.status === "review" || selectedEntry.status === "canon") && (
                  <div
                    className="chronicle-record-publication"
                    data-action={selectedEntry.status === "review" ? "publish" : "draft"}
                  >
                    <div>
                      <span>{selectedEntry.status === "review" ? "CANON PROMOTION" : "CANON WITHDRAWAL"}</span>
                      <strong>
                        {selectedEntry.status === "review"
                          ? "Publish this reviewed record to the public Chronicle."
                          : "Return this record to Draft and remove it from the public Chronicle."}
                      </strong>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(transitioningId)}
                      onClick={() => void transitionEntry(
                        selectedEntry,
                        selectedEntry.status === "review" ? "canon" : "draft",
                      )}
                    >
                      {transitioningId === selectedEntry.id
                        ? selectedEntry.status === "review"
                          ? "SEALING RECORD..."
                          : "UNSEALING RECORD..."
                        : selectedEntry.status === "review"
                          ? "PUBLISH TO CANON"
                          : "RETURN TO DRAFT"}
                    </button>
                  </div>
                )}
                <footer className="chronicle-record-footer">
                  <div><span>RECORD IDENT</span><strong>{selectedEntry.id}</strong></div>
                  <div><span>ENTERED</span><strong>{archiveTimestamp(selectedEntry.createdAt)}</strong></div>
                  <div><span>LAST VERIFIED</span><strong>{archiveTimestamp(selectedEntry.updatedAt)}</strong></div>
                </footer>
              </section>
            ) : (
              <p className="chronicle-reader-empty">SELECT A SEALED RECORD FOR EXLOAD.</p>
            )}
          </div>
        </article>
      </div>
      {canEdit && editorEntry !== undefined && (
        <LoreEntryEditor
          entry={editorEntry}
          onClose={() => setEditorEntry(undefined)}
          onSaved={async (savedEntry) => {
            await onArchiveRefresh();
            setSelectedId(savedEntry.id);
            setActiveStatus(savedEntry.status);
            setPublicationStatus(
              editorEntry
                ? `REVISION SEALED // ${savedEntry.title}`
                : `DRAFT CREATED // ${savedEntry.title}`,
            );
            setEditorEntry(undefined);
          }}
        />
      )}
    </section>
  );
}

function VoxSection({
  canEdit,
  quotes,
  onSave,
}: {
  canEdit: boolean;
  quotes: string[];
  onSave: (value: string[]) => Promise<boolean>;
}) {
  const [drafts, setDrafts] = useState(quotes);
  const [newQuote, setNewQuote] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isDirty) setDrafts(quotes);
  }, [quotes, isDirty]);

  function editQuote(index: number, value: string) {
    setDrafts((current) => current.map((quote, quoteIndex) => quoteIndex === index ? value : quote));
    setIsDirty(true);
    setMessage("Unsaved quote edits.");
  }

  async function saveQuotes(next: string[], successMessage: string) {
    const cleaned = next.map((quote) => quote.trim()).filter(Boolean);
    if (!cleaned.length) {
      setMessage("The Vox Moralis must retain at least one transmission.");
      return false;
    }
    setDrafts(cleaned);
    if (await onSave(cleaned)) {
      setIsDirty(false);
      setMessage(successMessage);
      return true;
    }
    setMessage("The transmissions could not be saved.");
    return false;
  }

  async function addQuote() {
    const quote = newQuote.trim();
    if (!quote) return;
    if (await saveQuotes([...drafts, quote], "New transmission added to the rotation.")) {
      setNewQuote("");
    }
  }

  async function removeQuote(index: number) {
    await saveQuotes(
      drafts.filter((_, quoteIndex) => quoteIndex !== index),
      "Transmission removed from the rotation.",
    );
  }

  async function importQuotes(file?: File) {
    if (!file) return;
    const imported = (await file.text())
      .split(/\r?\n/)
      .map((quote) => quote.trim())
      .filter(Boolean);
    if (!imported.length) {
      setMessage("No transmissions were found in that text file.");
      return;
    }
    const seen = new Set(drafts.map((quote) => quote.toLocaleLowerCase()));
    const additions = imported.filter((quote) => {
      const key = quote.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!additions.length) {
      setMessage("Every imported transmission is already recorded.");
      return;
    }
    await saveQuotes([...drafts, ...additions], `${additions.length} transmission${additions.length === 1 ? "" : "s"} imported.`);
  }

  return (
    <div className={canEdit ? "vox-manager editing" : "vox-manager"}>
      {canEdit && (
        <section className="panel vox-compose">
          <div>
            <p className="section-kicker">New transmission</p>
            <h2>Inscribe an exhortation</h2>
            <p>Enter one quote below, or import a plain-text file with one quote per line.</p>
          </div>
          <textarea
            value={newQuote}
            onChange={(event) => setNewQuote(event.target.value)}
            placeholder="Enter a new Imperial motivational transmission…"
            aria-label="New Vox Moralis quote"
          />
          <div className="vox-compose-actions">
            <button onClick={addQuote}>ADD TRANSMISSION</button>
            <label className="vox-import-button">
              IMPORT .TXT
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={(event) => {
                  const input = event.currentTarget;
                  void importQuotes(input.files?.[0]).finally(() => { input.value = ""; });
                }}
              />
            </label>
          </div>
        </section>
      )}

      <div className="vox-registry-heading">
        <div><p className="section-kicker">Active registry</p><h2>{drafts.length} transmissions in rotation</h2></div>
        {canEdit && (
          <button
            className="vox-save-all"
            onClick={() => void saveQuotes(drafts, "All Vox Moralis edits saved.")}
            disabled={!isDirty}
          >
            SAVE ALL EDITS
          </button>
        )}
      </div>

      <div className="vox-quote-list">
        {drafts.map((quote, index) => (
          <article className="panel vox-quote-card" key={index}>
            <span className="vox-quote-number">TRANSMISSION {String(index + 1).padStart(2, "0")}</span>
            {canEdit ? (
              <textarea
                value={quote}
                onChange={(event) => editQuote(index, event.target.value)}
                aria-label={`Transmission ${index + 1}`}
              />
            ) : (
              <p>{quote}</p>
            )}
            <div className="vox-quote-meta">
              <span>{quote.length} characters</span>
              {canEdit && <button onClick={() => void removeQuote(index)} disabled={drafts.length === 1}>REMOVE</button>}
            </div>
          </article>
        ))}
      </div>
      {message && <p className="vox-manager-status" role="status">{message}</p>}
    </div>
  );
}

function SettingsSection({
  canAdmin,
  isAdminMode,
  loreEntries,
  onArchiveRefresh,
}: {
  canAdmin: boolean;
  isAdminMode: boolean;
  loreEntries: LoreEntry[];
  onArchiveRefresh: () => Promise<void>;
}) {
  const canEdit = isAdminMode;
  return (
    <div className="settings-page">
      <div className="settings-grid">
        <section className="panel settings-card"><p className="section-kicker">Storage</p><h2>Shared chapter records</h2><p>Names, lore, milestones, companies, relics, chronicles, and sector intelligence are stored with the hosted archive and remain consistent across signed-in devices.</p></section>
      </div>
      <LoreDevelopmentDashboard
        canAdmin={canAdmin}
        entries={loreEntries}
        isAdminMode={isAdminMode}
        onPublished={onArchiveRefresh}
      />
      <GuestAccountManager canEdit={canEdit} />
    </div>
  );
}

type GuestUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number | null;
};

function GuestAccountManager({ canEdit }: { canEdit: boolean }) {
  const [users, setUsers] = useState<GuestUser[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    void fetch("/api/guest-users", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { users?: GuestUser[]; error?: string };
        if (!response.ok || !result.users) throw new Error(result.error || "Guest accounts unavailable.");
        if (!cancelled) setUsers(result.users);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Guest accounts unavailable.");
        }
      });
    return () => { cancelled = true; };
  }, [canEdit]);

  function generatePassphrase() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setPassphrase(Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""));
    setMessage("New passphrase generated. Copy it before leaving this page.");
  }

  async function createUser() {
    if (isBusy) return;
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
      setMessage("Use 3–32 lowercase letters, numbers, dots, dashes, or underscores.");
      return;
    }
    if (!normalizedDisplayName) {
      setMessage("Enter a display name for this guest.");
      return;
    }
    if (passphrase.length < 12) {
      setMessage("Generate or enter a passphrase of at least 12 characters.");
      return;
    }

    setIsBusy(true);
    setMessage("Registering guest identity…");
    try {
      const response = await fetch("/api/guest-users", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-lunar-archive-action": "guest-registry",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          displayName: normalizedDisplayName,
          passphrase,
        }),
      });
      const result = await response
        .json()
        .catch(() => ({ error: `The registry returned an unreadable response (${response.status}).` })) as {
          user?: GuestUser;
          error?: string;
        };
      if (!response.ok || !result.user) throw new Error(result.error || "Account creation failed.");
      setUsers((current) => [result.user!, ...current]);
      setUsername("");
      setDisplayName("");
      setMessage("Guest account created. Share the visible passphrase securely; it cannot be recovered later.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account creation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function removeUser(user: GuestUser) {
    setIsBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/guest-users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Account removal failed.");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(`${user.displayName} can no longer access the archive.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account removal failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="settings-users-section" aria-labelledby="guest-users-title">
      <div className="settings-section-heading">
        <div>
          <p className="section-kicker">Access registry</p>
          <h2 id="guest-users-title">Guest accounts</h2>
        </div>
        <p>Create view-only archive users who do not need a ChatGPT account. Removing a user invalidates their saved session.</p>
      </div>

      {canEdit ? (
        <>
          <form className="panel guest-user-form" onSubmit={(event) => { event.preventDefault(); void createUser(); }}>
            <label><span>USERNAME</span><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" placeholder="battle-brother" required /></label>
            <label><span>DISPLAY NAME</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="Brother Arcturus" required /></label>
            <label className="guest-passphrase-field"><span>GUEST PASSPHRASE</span><input value={passphrase} onChange={(event) => setPassphrase(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <button className="generate-passphrase" onClick={generatePassphrase} type="button">GENERATE</button>
            <button className="create-guest-user" disabled={isBusy} type="submit">{isBusy ? "REGISTERING…" : "CREATE GUEST USER"}</button>
          </form>
          <div className="guest-user-list">
            {users.map((user) => (
              <article className="panel guest-user-card" key={user.id}>
                <div><span>{user.username}</span><h3>{user.displayName}</h3></div>
                <p>{user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleDateString()}` : "Never logged in"}</p>
                <button onClick={() => void removeUser(user)} disabled={isBusy}>REVOKE</button>
              </article>
            ))}
            {!users.length && <p className="empty-record">No guest accounts have been created.</p>}
          </div>
        </>
      ) : (
        <div className="panel guest-users-locked">Enter Admin Mode to create or revoke guest accounts.</div>
      )}
      {message && <p className="guest-user-status" role="status">{message}</p>}
    </section>
  );
}
