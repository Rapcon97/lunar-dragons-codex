"use client";

import { useMemo, useState } from "react";
import { usePlanetTypes } from "../_hooks/usePlanetTypes";
import { planetTypeFamily, type PlanetTypeRecord } from "../planet-types";
import { PlanetThumbnail } from "./PlanetThumbnail";

const families = ["ALL", "Imperial", "General", "Chaos", "Xenos"];

export function PlanetClassificationArchive() {
  const { records, error, isLoading } = usePlanetTypes();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [limit, setLimit] = useState(18);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFamily = family === "ALL" || planetTypeFamily(record).toLowerCase().startsWith(family.toLowerCase());
      const haystack = `${record.name} ${record.aliases} ${record.classification_group} ${record.faction} ${record.formal_class_code} ${record.description}`.toLowerCase();
      return matchesFamily && (!term || haystack.includes(term));
    });
  }, [family, query, records]);

  const selected = records.find((record) => record.id === selectedId) ?? filtered[0];

  function chooseFamily(value: string) {
    setFamily(value);
    setLimit(18);
    setSelectedId("");
  }

  return (
    <section className="panel planet-classification-archive">
      <header className="planet-archive-heading">
        <div>
          <p className="section-kicker">Administratum taxonomy import</p>
          <h2>Planetary Classification Archive</h2>
          <p>{records.length || "—"} recognised world designations available to planetary dossiers.</p>
        </div>
        <div className="planet-archive-count">
          <b>{String(filtered.length).padStart(3, "0")}</b>
          <span>MATCHING RECORDS</span>
        </div>
      </header>

      <div className="planet-archive-controls">
        <label>
          <span>SEARCH THE INDEX</span>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setLimit(18); setSelectedId(""); }}
            placeholder="Hive, fortress, Necron, ocean…"
            type="search"
          />
        </label>
        <div aria-label="Classification family filters">
          {families.map((item) => (
            <button className={family === item ? "active" : ""} key={item} onClick={() => chooseFamily(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="planet-archive-loading">ACCESSING CLASSIFICATION DATA-SHARD…</p>}
      {error && <p className="planet-archive-loading">{error}</p>}

      {!isLoading && !error && (
        <div className="planet-archive-layout">
          <div className="planet-type-grid">
            {filtered.slice(0, limit).map((record) => (
              <button
                className={selected?.id === record.id ? "planet-type-card active" : "planet-type-card"}
                key={record.id}
                onClick={() => setSelectedId(record.id)}
              >
                <PlanetThumbnail planetType={record} />
                <span>
                  <small>{record.formal_class_code || planetTypeFamily(record)}</small>
                  <b>{record.name}</b>
                  <em>{record.faction}</em>
                </span>
              </button>
            ))}
            {!filtered.length && <p className="empty-record">No classification matches the current index query.</p>}
            {filtered.length > limit && (
              <button className="planet-archive-more" onClick={() => setLimit((current) => current + 18)}>
                REVEAL {Math.min(18, filtered.length - limit)} MORE RECORDS
              </button>
            )}
          </div>

          {selected && <PlanetTypeDossier record={selected} />}
        </div>
      )}
    </section>
  );
}

function PlanetTypeDossier({ record }: { record: PlanetTypeRecord }) {
  return (
    <aside className="planet-type-dossier">
      <PlanetThumbnail planetType={record} className="dossier-planet" alt={`${record.name} archive archetype`} eager />
      <p className="section-kicker">Selected designation</p>
      <h3>{record.name}</h3>
      <strong>{record.formal_class_code || "NO FORMAL CLASS CODE"}</strong>
      <p>{record.description}</p>
      <dl>
        <div><dt>GROUP</dt><dd>{record.classification_group}</dd></div>
        <div><dt>AUTHORITY</dt><dd>{record.faction}</dd></div>
        <div><dt>OBJECT</dt><dd>{record.object_type}</dd></div>
        <div><dt>STATUS</dt><dd>{record.technical_status}</dd></div>
        {record.aliases && <div><dt>ALIASES</dt><dd>{record.aliases}</dd></div>}
      </dl>
      {record.notes && <p className="planet-type-notes">{record.notes}</p>}
      {record.source_url && <a className="planet-type-source" href={record.source_url} target="_blank" rel="noreferrer">OPEN SOURCE INDEX ↗</a>}
    </aside>
  );
}
