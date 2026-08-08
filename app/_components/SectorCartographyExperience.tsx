"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SectorIntel, SystemBody } from "../archive-data";
import { PlanetThumbnail } from "./PlanetThumbnail";

type SectorCartographyExperienceProps = {
  intel: SectorIntel;
  isPrototype: boolean;
  canEdit: boolean;
  onOpenEditor: () => void;
};

type CartographyView =
  | { kind: "sector" }
  | { kind: "system"; systemIndex: number };

const ORBIT_VERTICAL_COMPRESSION = 0.62;

function bodyTone(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function orbitGeometry(body: SystemBody, index: number, count: number) {
  const radius = 14 + ((index + 1) * 31) / Math.max(1, count);
  const angle = (body.orbit * 71 + index * 137.5 + 18) % 360;
  const radians = (angle * Math.PI) / 180;
  return {
    radius,
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius * ORBIT_VERTICAL_COMPRESSION,
  };
}

export function SectorCartographyExperience({
  intel,
  isPrototype,
  canEdit,
  onOpenEditor,
}: SectorCartographyExperienceProps) {
  const [isBooting, setIsBooting] = useState(true);
  const [view, setView] = useState<CartographyView>({ kind: "sector" });
  const [selectedBodyIndex, setSelectedBodyIndex] = useState<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setIsBooting(false), reducedMotion ? 0 : 1850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedBodyIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedBodyIndex(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedBodyIndex]);

  const activeSystem = view.kind === "system" ? intel.worlds[view.systemIndex] : null;
  const selectedBody = activeSystem && selectedBodyIndex !== null
    ? activeSystem.bodies[selectedBodyIndex] ?? null
    : null;
  const orderedBodies = useMemo(
    () => activeSystem
      ? activeSystem.bodies
          .map((body, sourceIndex) => ({ body, sourceIndex }))
          .sort((a, b) => a.body.orbit - b.body.orbit || a.sourceIndex - b.sourceIndex)
      : [],
    [activeSystem],
  );

  function openSystem(systemIndex: number) {
    if (!intel.worlds[systemIndex]) return;
    setSelectedBodyIndex(null);
    setView({ kind: "system", systemIndex });
  }

  function returnToSector() {
    setSelectedBodyIndex(null);
    setView({ kind: "sector" });
  }

  if (isBooting) {
    return (
      <section className="sector-cogitation-boot" aria-label="Sector cartography cogitation in progress" aria-live="polite">
        <div className="sector-cogitation-core" aria-hidden="true"><i /><i /><i /><b>III</b></div>
        <div className="sector-cogitation-copy">
          <span>TACTICA SIDEREA // CARTOGRAPHIC EXLOAD</span>
          <h1>COGITATING LOCAL SECTOR</h1>
          <div className="sector-cogitation-lines">
            <p>&gt;&gt; AWAKENING NAVIS COGITATOR</p>
            <p>&gt;&gt; RESOLVING SYSTEM ANCHORS</p>
            <p>&gt;&gt; EXLOADING SANCTIONED WARP LANES</p>
            <p>&gt;&gt; CARTOGRAPHIC LINK READY</p>
          </div>
          <div className="sector-cogitation-progress"><i /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="sector-cartography-experience" aria-label="Sector Intel cartographic interface">
      <header className="sector-cartography-header">
        <div>
          <p className="section-kicker">TACTICA SIDEREA · LOCAL CARTOGRAPHIC ARRAY</p>
          <h1>{view.kind === "sector" ? intel.subsectorName : `${activeSystem?.name} SYSTEM`}</h1>
          <p>
            {view.kind === "sector"
              ? `${intel.worlds.length} charted systems · ${intel.warpLanes.length} registered warp lanes`
              : `${activeSystem?.classification} · ${activeSystem?.bodies.length ?? 0} orbital bodies`}
          </p>
        </div>
        <div className="sector-cartography-header-actions">
          {isPrototype && <span>SIMULACRUM · NON-CANON · NOT STORED</span>}
          {view.kind === "system" && <button type="button" onClick={returnToSector}>RETURN TO SECTOR</button>}
          {canEdit && <button type="button" onClick={onOpenEditor}>OPEN ARCHIVE EDITOR</button>}
        </div>
      </header>

      {view.kind === "sector" ? (
        <div className="sector-chart-shell">
          <div className="sector-chart" aria-label={`Local sector chart of ${intel.subsectorName}`}>
            <div className="sector-chart-stars" aria-hidden="true" />
            <div className="sector-chart-grid" aria-hidden="true" />
            <div className="sector-chart-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            <svg className="sector-warp-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Registered warp lane network">
              {intel.warpLanes.map((lane, index) => {
                const from = intel.worlds[lane.from];
                const to = intel.worlds[lane.to];
                if (!from || !to || lane.from === lane.to) return null;
                return (
                  <g className={`sector-warp-route ${lane.status}`} key={`${lane.name}-${index}`}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                    <title>{`${lane.name}: ${from.name} to ${to.name}, ${lane.status}`}</title>
                  </g>
                );
              })}
            </svg>
            {intel.worlds.map((system, index) => (
              <button
                className={`sector-system-anchor ${system.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                key={`${system.name}-${index}`}
                onClick={() => openSystem(index)}
                style={{ left: `${system.x}%`, top: `${system.y}%` }}
                title={`Open ${system.name} system chart`}
                type="button"
              >
                <i aria-hidden="true" />
                <b>{system.name}</b>
                <small>{system.status}</small>
              </button>
            ))}
            <div className="sector-chart-axis spinward">RELATIVE SPINWARD</div>
            <div className="sector-chart-axis trailing">LOCAL TRAILING</div>
          </div>
          <aside className="sector-chart-register">
            <header><span>LOCAL SYSTEM REGISTER</span><b>{String(intel.worlds.length).padStart(2, "0")}</b></header>
            {intel.worlds.map((system, index) => (
              <button type="button" onClick={() => openSystem(index)} key={`${system.name}-register`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><b>{system.name}</b><small>{system.classification}</small></div>
                <em>{system.status}</em>
              </button>
            ))}
          </aside>
        </div>
      ) : activeSystem ? (
        <div className="system-cartography-shell">
          <nav className="system-cartography-breadcrumb" aria-label="Cartography hierarchy">
            <button type="button" onClick={returnToSector}>{intel.subsectorName}</button>
            <span>/</span>
            <b>{activeSystem.name}</b>
          </nav>
          <div className="system-orbital-stage" aria-label={`Orbital chart of ${activeSystem.name}`}>
            <div className="system-orbital-grid" aria-hidden="true" />
            <div className="system-primary-star" aria-label={`${activeSystem.name} primary star`}>
              <i /><b>{activeSystem.name}</b><small>PRIMARY</small>
            </div>
            {orderedBodies.map(({ body }, orderedIndex) => {
              const { radius } = orbitGeometry(body, orderedIndex, orderedBodies.length);
              return (
                <i
                  aria-hidden="true"
                  className="system-orbit-ring"
                  key={`${body.name}-orbit`}
                  style={{
                    "--orbit-width": `${radius * 2}%`,
                    "--orbit-height": `${radius * 2 * ORBIT_VERTICAL_COMPRESSION}%`,
                  } as CSSProperties}
                />
              );
            })}
            {orderedBodies.map(({ body, sourceIndex }, orderedIndex) => {
              const position = orbitGeometry(body, orderedIndex, orderedBodies.length);
              return (
                <button
                  className={`system-orbital-body ${bodyTone(body.type)}`}
                  key={`${body.name}-body`}
                  onClick={() => setSelectedBodyIndex(sourceIndex)}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  title={`Open ${body.name} planetary dossier`}
                  type="button"
                >
                  <i aria-hidden="true" />
                  <b>{body.name}</b>
                  <small>{body.type}</small>
                </button>
              );
            })}
            <span className="system-orbital-scale">ORBITAL DISTANCES COMPRESSED · RELATIVE ORDER PRESERVED</span>
          </div>
          <aside className="system-orbital-register">
            <header><span>ORBITAL REGISTER</span><b>{String(activeSystem.bodies.length).padStart(2, "0")}</b></header>
            {orderedBodies.map(({ body, sourceIndex }) => (
              <button type="button" onClick={() => setSelectedBodyIndex(sourceIndex)} key={`${body.name}-register`}>
                <span>{String(body.orbit).padStart(2, "0")}</span>
                <div><b>{body.name}</b><small>{body.type}</small></div>
                <em>{body.status}</em>
              </button>
            ))}
          </aside>
        </div>
      ) : null}

      {selectedBody && activeSystem && (
        <div className="planet-dossier-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedBodyIndex(null);
        }}>
          <section className="planet-dossier-modal" role="dialog" aria-modal="true" aria-labelledby="planet-dossier-title">
            <header>
              <div><span>TACTICA SIDEREA · ORBITAL DOSSIER</span><h2 id="planet-dossier-title">{selectedBody.name}</h2></div>
              <button type="button" onClick={() => setSelectedBodyIndex(null)} aria-label="Close planetary dossier">CLOSE ×</button>
            </header>
            <div className="planet-dossier-scroll">
              <div className="planet-dossier-identity">
                <PlanetThumbnail planetType={selectedBody.type} className="planet-dossier-globe" alt={`${selectedBody.name}, ${selectedBody.type}`} eager />
                <div>
                  <span>ORBIT {String(selectedBody.orbit).padStart(2, "0")} · {activeSystem.name}</span>
                  <h3>{selectedBody.type}</h3>
                  <strong>{selectedBody.status}</strong>
                  <p>{selectedBody.summary}</p>
                </div>
              </div>
              <dl className="planet-dossier-data">
                <div><dt>POPULATION</dt><dd>{selectedBody.population}</dd></div>
                <div><dt>CLIMATE</dt><dd>{selectedBody.climate}</dd></div>
                <div><dt>ALLEGIANCE</dt><dd>{selectedBody.allegiance}</dd></div>
                <div><dt>RESOURCES</dt><dd>{selectedBody.resources}</dd></div>
              </dl>
              {isPrototype && <p className="planet-dossier-prototype">PRESENTATION RECORD ONLY · THIS DOSSIER DOES NOT ALTER THE AUTHORITATIVE ARCHIVE</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
