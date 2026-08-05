"use client";

import { useState } from "react";
import type { LoreEntry, LoreStatus } from "../archive-data";

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
  const [transitioningId, setTransitioningId] = useState("");
  const [publicationStatus, setPublicationStatus] = useState("");

  if (!canAdmin || !isAdminMode) return null;

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
      const result = (await response.json()) as {
        entry?: LoreEntry;
        error?: string;
      };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "Publication failed.");
      }

      await onPublished();
      setPublicationStatus(
        publishing
          ? `CANON SEALED // ${result.entry.title}`
          : `DRAFT RESTORED // ${result.entry.title}`,
      );
    } catch (error) {
      setPublicationStatus(
        error instanceof Error ? error.message : "The lore record could not be published.",
      );
    } finally {
      setTransitioningId("");
    }
  }

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

      {publicationStatus && (
        <p className="lore-publication-status" role="status">
          {publicationStatus}
        </p>
      )}

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
                        {(entry.status === "review" || entry.status === "canon") && (
                          <div
                            className="lore-record-publication"
                            data-action={entry.status === "review" ? "publish" : "draft"}
                          >
                            <span>
                              {entry.status === "review"
                                ? "CANON PROMOTION REQUIRES EXPLICIT ADMINISTRATOR JUDGEMENT"
                                : "RETURNING THIS RECORD TO DRAFT REMOVES IT FROM PUBLIC CHRONICLES"}
                            </span>
                            <button
                              type="button"
                              disabled={Boolean(transitioningId)}
                              onClick={() =>
                                void transitionEntry(
                                  entry,
                                  entry.status === "review" ? "canon" : "draft",
                                )
                              }
                            >
                              {transitioningId === entry.id
                                ? entry.status === "review"
                                  ? "SEALING RECORD..."
                                  : "UNSEALING RECORD..."
                                : entry.status === "review"
                                  ? "PUBLISH TO CANON"
                                  : "RETURN TO DRAFT"}
                            </button>
                          </div>
                        )}
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
