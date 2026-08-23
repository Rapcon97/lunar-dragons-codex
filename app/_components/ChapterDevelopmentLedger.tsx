"use client";

import { useMemo, useState } from "react";
import type { ChapterMilestone, LoreEntry } from "../archive-data";
import {
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_TOPICS,
  developmentTopicSummaries,
  type DevelopmentTopicManualStatus,
} from "../chapter-development";

const statusLabels: Record<string, string> = {
  undeveloped: "UNDEVELOPED",
  "in-development": "IN DEVELOPMENT",
  review: "REVIEW",
  established: "ESTABLISHED",
  "previously-covered": "PREVIOUSLY COVERED",
  "operational-only": "OPERATIONAL ONLY",
  "intentionally-unresolved": "INTENTIONALLY UNRESOLVED",
};

export function ChapterDevelopmentLedger({
  canAdmin,
  isAdminMode,
  entries,
  milestones,
  onSaveMilestones,
}: {
  canAdmin: boolean;
  isAdminMode: boolean;
  entries: LoreEntry[];
  milestones: ChapterMilestone[];
  onSaveMilestones: (value: ChapterMilestone[]) => Promise<boolean>;
}) {
  const [drafts, setDrafts] = useState(milestones);
  const [message, setMessage] = useState("");

  const topics = useMemo(
    () => developmentTopicSummaries(entries, drafts),
    [entries, drafts],
  );
  const established = topics.filter((topic) => topic.status === "established").length;
  const mappedIds = new Set(entries.flatMap((entry) => entry.developmentTopicIds ?? []));
  const mappedEntries = entries.filter((entry) => entry.developmentTopicIds?.length).length;

  if (!canAdmin || !isAdminMode) return null;

  function updateOverride(
    topicId: string,
    patch: { manualStatus?: DevelopmentTopicManualStatus | ""; notes?: string },
  ) {
    const existing = drafts.find((item) => item.topicId === topicId);
    const nextRecord: ChapterMilestone = {
      label: DEVELOPMENT_TOPICS.find((topic) => topic.id === topicId)?.label ?? topicId,
      done: false,
      topicId,
      ...(existing?.manualStatus ? { manualStatus: existing.manualStatus } : {}),
      ...(existing?.notes ? { notes: existing.notes } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.manualStatus ? { manualStatus: patch.manualStatus } : {}),
    };
    if (patch.manualStatus === "") delete nextRecord.manualStatus;
    if (!nextRecord.manualStatus) delete nextRecord.manualStatus;
    if (!nextRecord.notes?.trim()) delete nextRecord.notes;
    const withoutTopic = drafts.filter((item) => item.topicId !== topicId);
    setDrafts(
      nextRecord.manualStatus || nextRecord.notes
        ? [...withoutTopic, nextRecord]
        : withoutTopic,
    );
    setMessage("UNSAVED DEVELOPMENT CHANGES");
  }

  async function save() {
    setMessage("SEALING DEVELOPMENT LEDGER...");
    const saved = await onSaveMilestones(drafts);
    setMessage(saved ? "DEVELOPMENT LEDGER SEALED" : "LEDGER UPDATE FAILED");
  }

  return (
    <section className="chapter-development-ledger" aria-labelledby="chapter-development-title">
      <header className="chapter-development-header">
        <div>
          <p className="section-kicker">Administratum progression matrix</p>
          <h2 id="chapter-development-title">Chapter Development Ledger</h2>
          <p>
            Canon-linked progress derived from the Chapter Organisation Template.
            Planning prompts and manual dispositions are development metadata, never canon.
          </p>
        </div>
        <div className="chapter-development-progress">
          <strong>{established}/{topics.length}</strong>
          <span>ESTABLISHED TOPICS</span>
          <small>{mappedEntries} LORE RECORDS LINKED · {mappedIds.size} TOPICS TOUCHED</small>
        </div>
      </header>

      <div className="chapter-development-meter" aria-label={`${established} of ${topics.length} topics established`}>
        <i style={{ width: `${(established / topics.length) * 100}%` }} />
      </div>

      <div className="chapter-development-domains">
        {DEVELOPMENT_DOMAINS.map((domain) => {
          const domainTopics = topics.filter((topic) => topic.domain === domain.id);
          return (
            <details className="chapter-development-domain panel" key={domain.id} open>
              <summary>
                <span><strong>{domain.label}</strong><small>{domain.description}</small></span>
                <b>{domainTopics.filter((topic) => topic.status === "established").length}/{domainTopics.length}</b>
              </summary>
              <div className="chapter-development-topic-grid">
                {domainTopics.map((topic) => (
                  <article className="chapter-development-topic" data-status={topic.status} key={topic.id}>
                    <header>
                      <div><small>{topic.id}</small><h3>{topic.label}</h3></div>
                      <b>{statusLabels[topic.status]}</b>
                    </header>
                    <p>{topic.prompt}</p>
                    <div className="chapter-development-links">
                      <span>{topic.linkedCount} LINKED RECORD{topic.linkedCount === 1 ? "" : "S"}</span>
                      {topic.linkedEntries.map((entry) => (
                        <code key={entry.id}>{entry.status.toUpperCase()} · {entry.title}</code>
                      ))}
                    </div>
                    <label>
                      MANUAL DISPOSITION
                      <select
                        value={drafts.find((item) => item.topicId === topic.id)?.manualStatus ?? ""}
                        onChange={(event) => updateOverride(topic.id, { manualStatus: event.target.value as DevelopmentTopicManualStatus | "" })}
                      >
                        <option value="">DERIVE FROM LINKED LORE</option>
                        <option value="operational-only">OPERATIONAL ONLY</option>
                        <option value="intentionally-unresolved">INTENTIONALLY UNRESOLVED</option>
                      </select>
                    </label>
                    <label>
                      DEVELOPMENT NOTE
                      <textarea
                        value={drafts.find((item) => item.topicId === topic.id)?.notes ?? ""}
                        onChange={(event) => updateOverride(topic.id, { notes: event.target.value.slice(0, 2000) })}
                        placeholder="Record the next question, decision, or unresolved point..."
                      />
                    </label>
                  </article>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <footer className="chapter-development-actions">
        <span role="status">{message || "GPT LINKS USE STABLE LORE IDS · CANON REMAINS AUTHORITATIVE"}</span>
        <button type="button" onClick={() => void save()}>SEAL DEVELOPMENT LEDGER</button>
      </footer>
    </section>
  );
}
