"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAdminMode } from "../_components/AdminMode";
import { chronicleEntriesForViewer } from "../chronicle-visibility";
import { CartographyTransitionLink } from "../_components/CartographyTransitionLink";
import { LoreDevelopmentDashboard } from "../_components/LoreDevelopmentDashboard";
import { PlanetClassificationArchive } from "../_components/PlanetClassificationArchive";
import { RelayDataStream } from "../_components/RelayDataStream";
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
          {section !== "relay" && section !== "chronicles" && (
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
              canEdit={isAdminMode}
              entries={chronicleEntriesForViewer(data.loreEntries, canAdmin, isAdminMode)}
              legacyEntries={data.entries}
              onSave={(value) => saveSection("entries", value)}
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
  const armament = [
    ["Prow weapons", "2× heavy bombardment cannon batteries (fixed)", "6–8× macro torpedo tubes", "Boarding torpedo launchers", "Void mine launchers"],
    ["Broadsides", "Multiple heavy macro-cannon batteries · port & starboard", "Lance battery emplacements", "Auxiliary macro batteries"],
    ["Dorsal armament", "2× twin heavy lance turrets", "Multiple bombardment cannon emplacements", "Missile launch bays"],
    ["Defence systems", "Extensive point-defence turrets", "Flak batteries", "Defence laser arrays", "Close-range macro batteries", "Multi-layered void shield projectors"],
  ];
  const launchCapacity = [
    ["Thunderhawk gunships", "20–40"], ["Thunderhawk transports", "10–20"], ["Stormbirds", "4–6"],
    ["Stormtalons / Stormhawks", "12–20"], ["Drop pods", "200+"], ["Boarding torpedoes", "50+"], ["Shuttles & landers", "Numerous"],
  ];
  const vehicleCapacity = [
    ["Main battle tanks", "40–60"], ["Armoured transports", "40–60"], ["Support tanks", "20–30"],
    ["Dreadnoughts · deployed", "10–20"], ["Dreadnought vaults", "~20 stations"], ["Auxiliary vehicles", "Numerous"],
  ];
  const facilities = [
    "Strategium · Crusade Command", "Vox-command spires", "Astartes armouries", "Apothecarion", "Librarius", "Reclusiam",
    "Forge & Mechanicus enclaves", "Vehicle decks", "Dreadnought vaults", "Gene-halls & training areas", "Medicae bays", "Sanctorums & chapels", "Vast cargo holds",
  ];
  const honours = ["Indomitus Crusade Campaigns", "Nachmund Reclamation", "Argent Vigil Operations", "Countless Worlds Saved", "Enemies of Mankind Destroyed", "Imperium Preserved"];

  return (
    <div className="lunaris-dossier">
      <section className="panel lunaris-command-plate">
        <div className="lunaris-vessel-art">
          <img src="/lunaris-flagship.png" alt="The Lunaris, heavy command battle barge and flagship of the Lunar Dragons" />
          <span aria-hidden="true">IDENTIFICATION LOCK · LUNAR DRAGONS NAVIS PRAETORIA</span>
        </div>
        <div className="lunaris-title-block">
          <p className="section-kicker">Serialis Imperialis · 008.M42/DR-017-A</p>
          <h2>Lunaris</h2>
          <strong>Bearer of the First Stone <i /> The Argent Spear</strong>
          <p>Heavy Command Battle Barge and mobile headquarters of the Lunar Dragons. Command vessel of the Nachmund Reclamation and the Argent Vigil Crusade.</p>
        </div>
        <aside><span>AUTHENTICATED</span><b>VERIFIED</b><small>LORD COMMANDER EYES ONLY</small></aside>
      </section>

      <section className="lunaris-profile-grid">
        <article className="panel lunaris-profile">
          <header><p className="section-kicker">Vessel profile</p><span>ASTARTES WARSHIP</span></header>
          <dl>
            <div><dt>VESSEL TYPE</dt><dd>Heavy Command Battle Barge</dd></div>
            <div><dt>ROLE</dt><dd>Fleet Command · Planetary Assault · Strategic Headquarters</dd></div>
            <div><dt>LENGTH</dt><dd>~12.3 kilometres</dd></div>
            <div><dt>BEAM · MAX</dt><dd>~3.8 kilometres</dd></div>
            <div><dt>DRAFT</dt><dd>~1.6 kilometres</dd></div>
            <div><dt>LAUNCHED</dt><dd>008.M42 · Indomitus Crusade</dd></div>
            <div><dt>CONSTRUCTION</dt><dd>Adamantine hull · Astartes modification grade</dd></div>
            <div><dt>CREW</dt><dd>Tens of thousands · serfs, voidsmen, servitors, Adeptus Mechanicus</dd></div>
            <div><dt>VOID SHIELDS</dt><dd>Multiple overlapped generators · pattern classified</dd></div>
            <div><dt>ARMOUR</dt><dd>Ceramite, plasteel and adamantine · reinforced prow and vital decks</dd></div>
          </dl>
        </article>
        <article className="panel lunaris-scale">
          <p className="section-kicker">Dimensions & deployment</p>
          <figure className="lunaris-dimensions-plate">
            <img src="/lunaris-dimensions.png" alt="Cleaned orthographic top and side schematics of the Lunaris" />
            <figcaption>ORTHOGRAPHIC IDENTIFICATION · TOP / SIDE</figcaption>
          </figure>
          <div className="lunaris-measure"><span>PROW</span><i /><strong>12.3 KM</strong><i /><span>STERN</span></div>
          <dl>
            <div><dt>COMFORTABLE CAPACITY</dt><dd>~500–600 Astartes</dd></div>
            <div><dt>EMERGENCY CAPACITY</dt><dd>~800+ Astartes</dd></div>
            <div><dt>STANDARD DEPLOYMENT</dt><dd>Chapter Command plus up to four Companies, support elements, Dreadnoughts, vehicles and ancillaries</dd></div>
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
        <article className="panel lunaris-reliquary"><p className="section-kicker">The Reliquary of the First Shore</p><div aria-hidden="true"><i>◆</i></div><p>Within the heart of <i>Lunaris</i> is kept the fragment of Luna gifted by Roboute Guilliman—a reminder of Mankind’s first shore and the duty of the Lunar Dragons. The stone is encased in a sacred adamantine reliquary under eternal guard.</p></article>
        <article className="panel lunaris-honours"><p className="section-kicker">Roll of honour</p><ul>{honours.map((honour) => <li key={honour}>{honour}</li>)}</ul><blockquote>“Let the stone remind you that no fortress is eternal, and that even the greatest works of Mankind were raised by mortal hands.”<cite>— Roboute Guilliman, Lord Commander of the Imperium</cite></blockquote></article>
      </section>
    </div>
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
        <div className="relay-inbox-list" aria-label="Preserved soul-signals">
          <header><span>VOX-MISSIVE INDEX</span><b>{Math.min(2, messages.length)} NEW SIGNALS</b></header>
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
          ) : <p className="relay-empty">The choir awaits a signal reliquary.</p>}
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

  useEffect(() => {
    if (!isEditing) setDraft(intel);
  }, [intel, isEditing]);

  function updateField(field: keyof Omit<SectorIntel, "worlds" | "factions" | "directives" | "warpLanes">, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
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

  async function saveIntel() {
    if (await onSave(draft)) {
      setIsEditing(false);
      setMessage("Sector intelligence sealed to the shared archive.");
    } else {
      setMessage("The intelligence record could not be saved.");
    }
  }

  const display = isEditing ? draft : intel;
  const plottedOrigin = originLocationId
    ? resolveTransmissionOrigin(display, { originLocationId, originState: "CONFIRMED" })
    : null;

  return (
    <div className={isEditing ? "sector-intel editing" : "sector-intel"}>
      <section className="panel intel-command-strip">
        <div>
          <span>{isEditing ? "TACTICA EDIT ENVIRONMENT ACTIVE" : "ASTROPATHIC CARTOGRAPHY LINK ACTIVE"}</span>
          <p>{display.astropathicDate}</p>
        </div>
        {canEdit && (
          <div className="edit-actions">
            {isEditing ? (
              <>
                <button className="cancel-edit" onClick={() => { setDraft(intel); setIsEditing(false); }}>CANCEL</button>
                <button className="save-edit" onClick={() => void saveIntel()}>SEAL INTELLIGENCE</button>
              </>
            ) : (
              <button className="enter-edit" onClick={() => setIsEditing(true)}>✎ EDIT SECTOR INTEL</button>
            )}
          </div>
        )}
      </section>

      <section className="intel-overview-grid">
        <div className="panel intel-map-panel">
          <header>
            <div>
              <p className="section-kicker">{display.sectorName}</p>
              {isEditing ? (
                <input value={display.subsectorName} onChange={(event) => updateField("subsectorName", event.target.value)} aria-label="Subsector name" />
              ) : <h2>{display.subsectorName}</h2>}
            </div>
            <span>LOCAL CARTOGRAPHY · NOT TO SCALE</span>
          </header>
          <div className="sector-map" aria-label={`Localized map of ${display.subsectorName}`}>
            <div className="sector-map-grid" aria-hidden="true" />
            <div className="sector-rift" aria-hidden="true"><i /><i /><i /></div>
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
            {display.warpLanes.map((lane, index) => {
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
              return (
                <CartographyTransitionLink
                  aria-current={isOriginFocus ? "location" : undefined}
                  aria-label={isOriginFocus ? `Transmission origin focus: ${plottedOrigin.label}; open ${world.name} solar system` : `Open ${world.name} solar system`}
                  className={`sector-world world-${index + 1} ${world.status.toLowerCase().replace(/[^a-z]+/g, "-")}${isOriginFocus ? " transmission-origin-focus" : ""}`}
                  data-origin-focus={isOriginFocus ? plottedOrigin.canonicalId : undefined}
                  key={`${world.name}-${index}`}
                  href={`/intel/system/${index + 1}`}
                  style={{ left: `${world.x}%`, top: `${world.y}%` }}
                  title={`${world.name} · ${world.classification} · ${world.status}`}
                >
                  <i />
                  <b>{world.name}</b>
                  <small>{world.status}</small>
                </CartographyTransitionLink>
              );
            })}
            <span className="map-compass" aria-hidden="true">N<br />✦</span>
            <span className="map-scale">12.4 LIGHT YEARS</span>
          </div>
          <div className="intel-map-legend">
            <span><i className="secure" /> Secure</span>
            <span><i className="contested" /> Contested</span>
            <span><i className="hostile" /> Hostile / unknown</span>
            <span><i className="lane-stable" /> Stable lane</span>
            <span><i className="lane-unstable" /> Unstable / blockaded</span>
          </div>
        </div>

        <aside className="panel deployment-brief">
          <p className="section-kicker">Current deployment</p>
          {isEditing ? (
            <>
              <label>THEATRE<input value={display.currentTheater} onChange={(event) => updateField("currentTheater", event.target.value)} /></label>
              <label>STATUS<input value={display.deploymentStatus} onChange={(event) => updateField("deploymentStatus", event.target.value)} /></label>
              <label>ASTROPATHIC DATE<input value={display.astropathicDate} onChange={(event) => updateField("astropathicDate", event.target.value)} /></label>
              <label>STRATEGIC SUMMARY<textarea value={display.summary} onChange={(event) => updateField("summary", event.target.value)} /></label>
            </>
          ) : (
            <>
              <h2>{display.currentTheater}</h2>
              <strong>{display.deploymentStatus}</strong>
              <p>{display.summary}</p>
            </>
          )}
          <div className="deployment-sigil" aria-hidden="true"><span /></div>
        </aside>
      </section>

      {isEditing && (
        <section className="panel intel-world-editor">
          <div className="panel-heading">
            <div><p className="section-kicker">Cartography controls</p><h2>World registry</h2></div>
            <button
              className="text-button"
              onClick={() => setDraft((current) => ({
                ...current,
                worlds: [...current.worlds, { name: "Uncharted System", classification: "Unclassified", status: "Unknown", x: 50, y: 50, bodies: [] }],
              }))}
            >
              + ADD SYSTEM
            </button>
          </div>
          <div className="intel-world-list">
            {display.worlds.map((world, index) => (
              <div key={index}>
                <input value={world.name} onChange={(event) => updateWorld(index, "name", event.target.value)} aria-label={`System ${index + 1} name`} />
                <input value={world.classification} onChange={(event) => updateWorld(index, "classification", event.target.value)} aria-label={`${world.name} classification`} />
                <input value={world.status} onChange={(event) => updateWorld(index, "status", event.target.value)} aria-label={`${world.name} status`} />
                <label>X<input type="number" min="6" max="94" value={world.x} onChange={(event) => updateWorld(index, "x", event.target.value)} /></label>
                <label>Y<input type="number" min="8" max="92" value={world.y} onChange={(event) => updateWorld(index, "y", event.target.value)} /></label>
                <button onClick={() => setDraft((current) => ({ ...current, worlds: current.worlds.filter((_, i) => i !== index) }))}>REMOVE</button>
              </div>
            ))}
          </div>
          <div className="warp-lane-editor">
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
          </div>
        </section>
      )}

      <PlanetClassificationArchive />

      <section className="intel-section-heading">
        <div><p className="section-kicker">Contact registry</p><h2>Allies, enemies & unresolved actors</h2></div>
        <span>{display.factions.length} FACTIONS UNDER OBSERVATION</span>
      </section>
      <div className="faction-intel-grid">
        {display.factions.map((faction, index) => (
          <article className={`panel faction-card ${faction.alignment}`} key={index}>
            <header>
              {isEditing ? (
                <select value={faction.alignment} onChange={(event) => updateFaction(index, "alignment", event.target.value)}>
                  <option value="ally">ALLY</option>
                  <option value="enemy">ENEMY</option>
                  <option value="uncertain">UNCERTAIN</option>
                </select>
              ) : <span>{faction.alignment === "ally" ? "SANCTIONED ALLY" : faction.alignment === "enemy" ? "HOSTILE CONTACT" : "UNRESOLVED CONTACT"}</span>}
              <b>THREAT {faction.threat}/5</b>
            </header>
            {isEditing ? (
              <>
                <input value={faction.name} onChange={(event) => updateFaction(index, "name", event.target.value)} aria-label={`Faction ${index + 1} name`} />
                <input value={faction.classification} onChange={(event) => updateFaction(index, "classification", event.target.value)} aria-label={`${faction.name} classification`} />
                <label>THREAT LEVEL<input type="range" min="1" max="5" value={faction.threat} onChange={(event) => updateFaction(index, "threat", event.target.value)} /></label>
                <textarea value={faction.disposition} onChange={(event) => updateFaction(index, "disposition", event.target.value)} aria-label={`${faction.name} disposition`} />
                <button className="intel-remove" onClick={() => setDraft((current) => ({ ...current, factions: current.factions.filter((_, i) => i !== index) }))}>REMOVE DOSSIER</button>
              </>
            ) : (
              <>
                <h3>{faction.name}</h3>
                <small>{faction.classification}</small>
                <p>{faction.disposition}</p>
              </>
            )}
            <div className="threat-runes" aria-label={`Threat level ${faction.threat} of 5`}>
              {[1, 2, 3, 4, 5].map((level) => <i className={level <= faction.threat ? "active" : ""} key={level} />)}
            </div>
          </article>
        ))}
        {isEditing && (
          <button
            className="panel add-intel-card"
            onClick={() => setDraft((current) => ({
              ...current,
              factions: [...current.factions, { name: "Unknown Contact", alignment: "uncertain", classification: "Unclassified", threat: 1, disposition: "Intelligence pending." }],
            }))}
          >
            + CREATE FACTION DOSSIER
          </button>
        )}
      </div>

      <section className="panel operational-directives">
        <div className="panel-heading">
          <div><p className="section-kicker">Priority channel</p><h2>Operational directives</h2></div>
          <span>COMMAND AUTHORITY · LUNAR DRAGONS</span>
        </div>
        <ol>
          {display.directives.map((directive, index) => (
            <li key={index}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {isEditing ? (
                <>
                  <input
                    value={directive}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      directives: current.directives.map((item, i) => i === index ? event.target.value : item),
                    }))}
                  />
                  <button onClick={() => setDraft((current) => ({ ...current, directives: current.directives.filter((_, i) => i !== index) }))}>×</button>
                </>
              ) : <span>{directive}</span>}
            </li>
          ))}
        </ol>
        {isEditing && <button className="text-button" onClick={() => setDraft((current) => ({ ...current, directives: [...current.directives, "New operational directive"] }))}>+ ADD DIRECTIVE</button>}
      </section>
      {message && <p className="intel-save-status" role="status">{message}</p>}
    </div>
  );
}

function ChroniclesSection({
  canEdit,
  entries,
  legacyEntries,
  onSave,
}: {
  canEdit: boolean;
  entries: LoreEntry[];
  legacyEntries: string[];
  onSave: (value: string[]) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const [selectedId, setSelectedId] = useState("decree");
  const [isComposing, setIsComposing] = useState(false);
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const statusCounts = entries.reduce(
    (counts, entry) => ({ ...counts, [entry.status]: counts[entry.status] + 1 }),
    { draft: 0, review: 0, canon: 0, retconned: 0 } as Record<LoreEntry["status"], number>,
  );

  function statusReadout(entry: LoreEntry) {
    if (entry.status === "canon") return "CANON · SEALED";
    if (entry.status === "review") return "REVIEW · AWAITING JUDGMENT";
    if (entry.status === "retconned") return "RETCONNED · SUPERSEDED";
    return "DRAFT · UNSEALED";
  }

  useEffect(() => {
    if (selectedId !== "decree" && !entries.some((entry) => entry.id === selectedId)) {
      setSelectedId("decree");
    }
  }, [entries, selectedId]);

  async function addEntry() {
    if (!note.trim()) return;
    const next = [`M42.??? — ${note.trim()}`, ...legacyEntries];
    if (await onSave(next)) {
      setNote("");
      setIsComposing(false);
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
          {canEdit && <button type="button" onClick={() => setIsComposing((current) => !current)}>{isComposing ? "CLOSE SEALING RITE" : "SEAL NEW RECORD"}</button>}
        </div>
      </header>

      {canEdit && isComposing && (
        <div className="chronicle-exload-compose">
          <label htmlFor="chronicle-new-record">NEW CANONICAL ENTRY · ADMIN AUTHORITY</label>
          <input
            id="chronicle-new-record"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addEntry()}
            placeholder="Record a battle, oath, loss, or discovery…"
          />
          <button type="button" onClick={addEntry}>SEAL ENTRY</button>
        </div>
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

            {entries.length ? entries.map((entry, index) => (
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
              <p className="chronicle-index-empty">{canEdit ? "NO STRUCTURED LORE RECORDS ARE AVAILABLE." : "NO CANONICAL DEEDS HAVE YET BEEN ENTERED UNDER SEAL."}</p>
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
            <small>{canEdit ? "ADMIN AUTHORITY · DEVELOPMENT VIEW" : "READ AUTHORITY · ARCHIVE VIEW"}</small>
          </header>
          <div className="chronicle-reader-scroll" tabIndex={0}>
            {selectedId === "decree" ? (
              <DecreeRecord />
            ) : selectedEntry ? (
              <section className="chronicle-record-sheet" aria-labelledby={`chronicle-record-${selectedEntry.id}`}>
                <h2 id={`chronicle-record-${selectedEntry.id}`}>{selectedEntry.title || "Untitled archive record"}</h2>
                <div className="chronicle-record-rule"><i /><b>+</b><i /></div>
                <p className="chronicle-record-content">{selectedEntry.content}</p>
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
