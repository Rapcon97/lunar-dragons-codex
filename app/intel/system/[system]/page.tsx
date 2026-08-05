"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CartographyTransitionLink } from "../../../_components/CartographyTransitionLink";
import { PlanetThumbnail } from "../../../_components/PlanetThumbnail";
import { SidebarNavigation } from "../../../_components/SidebarNavigation";
import { useChapterArchive } from "../../../_hooks/useChapterArchive";

export default function SolarSystemIntelPage() {
  const params = useParams<{ system: string }>();
  const { data, error, isLoading } = useChapterArchive();
  const systemIndex = Math.max(0, Number.parseInt(params.system || "1", 10) - 1);
  const system = data.sectorIntel.worlds[systemIndex] ?? data.sectorIntel.worlds[0];

  return (
    <main className="app-shell">
      <SidebarNavigation activeHref="/intel" />
      <section className="workspace archive-boundary-workspace">
        <header className="topbar">
          <div><p className="eyebrow">The Lunar Dragons · SYSTEMA CARTOGRAPHICA</p><div className="chapter-name fixed-chapter-name">THE LUNAR DRAGONS</div></div>
          <div className="top-actions">
            <span className="save-state"><i /> {error ? "Archive unavailable" : isLoading ? "Loading system telemetry" : "System telemetry synced"}</span>
            <Link className="seal-button" href="/intel">BACK TO SUBSECTOR</Link>
          </div>
        </header>
        <div className="subpage archive-boundary-subpage system-intel-page">
          <nav className="intel-breadcrumbs" aria-label="Cartography hierarchy">
            <Link href="/intel">{data.sectorIntel.subsectorName}</Link><span>›</span><strong>{system.name}</strong>
          </nav>
          <section className="section-hero">
            <div><p className="section-kicker">Solar system record · {system.classification}</p><h1>{system.name} System</h1></div>
            <p>{system.status} · {system.bodies.length} charted orbital bodies. Select a planet, moon, or installation to open its planetary dossier.</p>
          </section>
          <section className="system-view-grid">
            <div className="panel orbital-map-panel">
              <div className="orbital-map" aria-label={`Orbital map of the ${system.name} system`}>
                <div className="system-star"><i /><span>{system.name.toUpperCase()} PRIMARY</span></div>
                {[1, 2, 3, 4, 5].map((orbit) => <i className={`orbit-ring ring-${orbit}`} key={orbit} />)}
                {system.bodies.map((body, index) => {
                  const orbitRadius = Math.min(250, 70 + body.orbit * 42);
                  const angle = (index * 117 + body.orbit * 29) % 360;
                  return (
                    <CartographyTransitionLink
                      className={`orbital-body body-${index + 1}`}
                      href={`/intel/system/${systemIndex + 1}/planet/${index + 1}`}
                      key={`${body.name}-${index}`}
                      style={{ "--orbit-radius": `${orbitRadius}px`, "--orbit-angle": `${angle}deg` } as CSSProperties}
                      title={`Open planetary dossier: ${body.name}`}
                    >
                      <i /><b>{body.name}</b><small>{body.type}</small>
                    </CartographyTransitionLink>
                  );
                })}
                <span className="orbital-map-scale">ORBITAL PROJECTION · AU SCALE COMPRESSED</span>
              </div>
            </div>
            <aside className="panel system-register">
              <p className="section-kicker">Orbital registry</p>
              <h2>{system.bodies.length} charted bodies</h2>
              <div>
                {system.bodies.map((body, index) => (
                  <CartographyTransitionLink href={`/intel/system/${systemIndex + 1}/planet/${index + 1}`} key={`${body.name}-${index}`}>
                    <PlanetThumbnail planetType={body.type} className="system-body-thumbnail" />
                    <span>{String(body.orbit).padStart(2, "0")}</span>
                    <div><b>{body.name}</b><small>{body.type}</small></div>
                    <em>{body.status}</em><i>›</i>
                  </CartographyTransitionLink>
                ))}
              </div>
              {!system.bodies.length && <p className="empty-record">No orbital bodies have been charted.</p>}
            </aside>
          </section>
          <section className="panel system-signal-brief">
            <div><p className="section-kicker">Strategic context</p><h2>{system.status}</h2></div>
            <p>This system record inherits its authority from the {data.sectorIntel.subsectorName} archive. Planetary dossiers contain the next level of territorial, population, climate, allegiance, and resource intelligence.</p>
          </section>
        </div>
        <footer><span>TACTICA SIDEREA · SYSTEM RECORD</span><span>Select an orbital body to descend.</span></footer>
      </section>
    </main>
  );
}
