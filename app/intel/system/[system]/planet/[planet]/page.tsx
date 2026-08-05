"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminMode } from "../../../../../_components/AdminMode";
import { PlanetThumbnail } from "../../../../../_components/PlanetThumbnail";
import { SidebarNavigation } from "../../../../../_components/SidebarNavigation";
import { useChapterArchive } from "../../../../../_hooks/useChapterArchive";
import { usePlanetTypes } from "../../../../../_hooks/usePlanetTypes";

export default function PlanetaryIntelPage() {
  const params = useParams<{ system: string; planet: string }>();
  const { isAdminMode } = useAdminMode();
  const { data, error, isLoading, isSaving, saveSection } = useChapterArchive();
  const { records: planetTypes } = usePlanetTypes();
  const systemIndex = Math.max(0, Number.parseInt(params.system || "1", 10) - 1);
  const planetIndex = Math.max(0, Number.parseInt(params.planet || "1", 10) - 1);
  const system = data.sectorIntel.worlds[systemIndex] ?? data.sectorIntel.worlds[0];
  const body = system.bodies[planetIndex] ?? system.bodies[0] ?? {
    name: "Uncharted Body", type: "Unclassified Planet", classificationId: "", status: "Unsurveyed", orbit: 1,
    population: "Unknown", climate: "Unknown", allegiance: "Unclaimed", resources: "Unsurveyed",
    summary: "No planetary intelligence has yet been recorded.",
  };
  const classification = planetTypes.find((record) =>
    record.id === body.classificationId || record.name.toLowerCase() === body.type.toLowerCase(),
  );
  const bodyTone = body.type.toLowerCase().replace(/[^a-z]+/g, "-");

  async function assignPlanetType(classificationId: string) {
    const selected = planetTypes.find((record) => record.id === classificationId);
    const nextIntel = {
      ...data.sectorIntel,
      worlds: data.sectorIntel.worlds.map((world, worldIndex) =>
        worldIndex === systemIndex
          ? {
              ...world,
              bodies: world.bodies.map((entry, bodyIndex) =>
                bodyIndex === planetIndex
                  ? { ...entry, classificationId, type: selected?.name ?? entry.type }
                  : entry,
              ),
            }
          : world,
      ),
    };
    await saveSection("sectorIntel", nextIntel);
  }

  return (
    <main className="app-shell">
      <SidebarNavigation activeHref="/intel" />
      <section className="workspace archive-boundary-workspace">
        <header className="topbar">
          <div><p className="eyebrow">The Lunar Dragons · PLANETARIA INTELLIGENCE</p><div className="chapter-name fixed-chapter-name">THE LUNAR DRAGONS</div></div>
          <div className="top-actions"><span className="save-state"><i /> {error ? "Archive unavailable" : isLoading ? "Loading planetary record" : "Planetary record synced"}</span><Link className="seal-button" href={`/intel/system/${systemIndex + 1}`}>BACK TO SYSTEM</Link></div>
        </header>
        <div className="subpage archive-boundary-subpage planetary-intel-page">
          <nav className="intel-breadcrumbs" aria-label="Cartography hierarchy"><Link href="/intel">{data.sectorIntel.subsectorName}</Link><span>›</span><Link href={`/intel/system/${systemIndex + 1}`}>{system.name}</Link><span>›</span><strong>{body.name}</strong></nav>
          <section className="planetary-hero panel">
            <PlanetThumbnail planetType={classification ?? body.type} className={`planetary-globe-archive ${bodyTone}`} alt={`${body.name}, ${body.type}`} eager />
            <div className="planetary-title">
              <p className="section-kicker">Orbital position {body.orbit} · {body.type}</p>
              <h1>{body.name}</h1>
              <strong>{body.status}</strong>
              <p>{body.summary}</p>
              {isAdminMode && (
                <label className="planet-classification-picker">
                  <span>ADMINISTRATUM WORLD DESIGNATION</span>
                  <select value={classification?.id ?? ""} onChange={(event) => void assignPlanetType(event.target.value)} disabled={isSaving}>
                    <option value="">UNCLASSIFIED / LEGACY DESIGNATION</option>
                    {planetTypes.map((record) => (
                      <option value={record.id} key={record.id}>{record.name} · {record.formal_class_code || record.classification_group}</option>
                    ))}
                  </select>
                </label>
              )}
              {classification && (
                <div className="planet-classification-summary">
                  <span>{classification.formal_class_code || classification.technical_status}</span>
                  <p>{classification.description}</p>
                </div>
              )}
            </div>
            <div className="planetary-clearance"><span>RECORD AUTHORITY</span><b>TACTICA SIDEREA</b><small>LOCAL INTELLIGENCE · M42</small></div>
          </section>
          <section className="planetary-data-grid">
            {[
              ["Population", body.population, "Census reliability variable"],
              ["Climate", body.climate, "Environmental classification"],
              ["Allegiance", body.allegiance, "Current controlling authority"],
              ["Resources", body.resources, "Strategic assets & tithes"],
            ].map(([label,value,note]) => <article className="panel planetary-data-card" key={label}><span>{label}</span><h2>{value}</h2><p>{note}</p></article>)}
          </section>
          <section className="planetary-lower-grid">
            <article className="panel planetary-assessment"><p className="section-kicker">Lunar Dragons assessment</p><h2>Operational significance</h2><p>{body.summary}</p><div><span>THREAT MONITORING</span><i><b style={{width: body.status.toLowerCase().match(/hostile|besieged|contested|failing/) ? "82%" : "34%"}} /></i></div></article>
            <aside className="panel orbital-siblings"><p className="section-kicker">Other system records</p><h2>{system.name} orbital bodies</h2>{system.bodies.map((sibling,index) => <Link className={index === planetIndex ? "active" : ""} href={`/intel/system/${systemIndex + 1}/planet/${index + 1}`} key={`${sibling.name}-${index}`}><span>{String(sibling.orbit).padStart(2,"0")}</span><b>{sibling.name}</b><small>{sibling.type}</small></Link>)}</aside>
          </section>
        </div>
        <footer><span>TACTICA SIDEREA · PLANETARY DOSSIER</span><span>The archive descends from stars to soil.</span></footer>
      </section>
    </main>
  );
}
