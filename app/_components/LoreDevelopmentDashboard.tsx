"use client";

import type { LoreEntry, LoreStatus } from "../archive-data";
import { LoreStatusControl } from "./LoreStatusControl";

const loreStatusGroups: Array<{
  status: LoreStatus;
  title: string;
  description: string;
}> = [
  {
    status: "draft",
    title: "Draft",
    description: "Unsealed material still being formed and checked.",
  },
  {
    status: "review",
    title: "Review",
    description: "Records awaiting an explicit judgement of canon.",
  },
  {
    status: "canon",
    title: "Canon",
    description: "Established Chapter history visible in the public Chronicle.",
  },
  {
    status: "retconned",
    title: "Retconned",
    description: "Superseded records retained for archival provenance.",
  },
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recordIdentityKind(id: string) {
  if (id.startsWith("legacy-")) return "LEGACY ID";
  if (uuidPattern.test(id)) return "UUID ID";
  return "STRUCTURED ID";
}

function contentPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= 240
    ? normalized
    : `${normalized.slice(0, 237).trimEnd()}...`;
}

function formatTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "NOT RECORDED / LEGACY IMPORT";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(timestamp))
    .toUpperCase();
}

export function LoreDevelopmentDashboard({
  canAdmin,
  entries,
  isAdminMode,
  onPublished,
}: {
  canAdmin: boolean;
  entries: LoreEntry[];
  isAdminMode: boolean;
  onPublished: () => Promise<void>;
}) {
  if (!canAdmin || !isAdminMode) return null;

  return (
    <section
      className="lore-development-dashboard"
      aria-labelledby="lore-development-title"
    >
      <div className="lore-development-heading">
        <div>
          <p className="section-kicker">Administratum annalis</p>
          <h2 id="lore-development-title">Lore Development</h2>
          <p>
            A sealed view of every structured lore record. Review records may
            be explicitly judged as canon by the Chapter Administrator.
          </p>
        </div>
        <div className="lore-development-total" aria-label={`${entries.length} total lore records`}>
          <strong>{entries.length}</strong>
          <span>TOTAL RECORDS</span>
          <small>ADMINISTRATOR CLEARANCE</small>
        </div>
      </div>

      <div className="lore-development-groups">
        {loreStatusGroups.map((group) => {
          const records = entries
            .filter((entry) => entry.status === group.status)
            .sort(
              (left, right) =>
                right.updatedAt - left.updatedAt ||
                right.createdAt - left.createdAt ||
                left.title.localeCompare(right.title),
            );

          return (
            <section
              className="lore-status-group panel"
              data-status={group.status}
              key={group.status}
              aria-labelledby={`lore-status-${group.status}`}
            >
              <header>
                <div>
                  <span>DEVELOPMENT STATUS</span>
                  <h3 id={`lore-status-${group.status}`}>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <strong aria-label={`${records.length} ${group.title} records`}>
                  {records.length}
                </strong>
              </header>

              {records.length ? (
                <div className="lore-record-list">
                  {records.map((entry) => (
                    <details className="lore-development-record" key={entry.id}>
                      <summary>
                        <span className="lore-record-title-row">
                          <span>
                            <small>{recordIdentityKind(entry.id)}</small>
                            <strong>{entry.title || "UNTITLED ARCHIVAL RECORD"}</strong>
                          </span>
                          <b data-status={entry.status}>{entry.status}</b>
                        </span>

                        <span className="lore-record-fields">
                          <span>
                            <small>DATE</small>
                            <b>{entry.date || "UNRECORDED"}</b>
                          </span>
                          <span>
                            <small>CATEGORY</small>
                            <b>{entry.category}</b>
                          </span>
                          <span className="lore-record-id">
                            <small>RECORD ID</small>
                            <code>{entry.id}</code>
                          </span>
                        </span>

                        <span className="lore-record-preview">
                          <small>CONTENT PREVIEW</small>
                          <span>{contentPreview(entry.content)}</span>
                        </span>

                        <span className="lore-record-timestamps">
                          <span>
                            <small>CREATED</small>
                            <b>{formatTimestamp(entry.createdAt)}</b>
                          </span>
                          <span>
                            <small>UPDATED</small>
                            <b>{formatTimestamp(entry.updatedAt)}</b>
                          </span>
                          <em>EXPAND COMPLETE RECORD</em>
                        </span>
                      </summary>

                      <div className="lore-record-complete">
                        <span>COMPLETE ARCHIVAL CONTENT</span>
                        <p>{entry.content}</p>
                        <LoreStatusControl
                          entry={entry}
                          onChanged={async () => onPublished()}
                        />
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="lore-status-empty">
                  No {group.title.toLowerCase()} records are held in the
                  structured archive.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
