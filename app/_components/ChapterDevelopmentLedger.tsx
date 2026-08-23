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
  onArchiveRefresh,
  onSaveMilestones,
}: {
  canAdmin: boolean;
  isAdminMode: boolean;
  entries: LoreEntry[];
  milestones: ChapterMilestone[];
  onArchiveRefresh: () => Promise<void>;
  onSaveMilestones: (value: ChapterMilestone[]) => Promise<boolean>;
}) {
  const [drafts, setDrafts] = useState(milestones);
  const [message, setMessage] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string[]>>({});
  const [assistantSummary, setAssistantSummary] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);

  const topics = useMemo(
    () => developmentTopicSummaries(entries, drafts),
    [entries, drafts],
  );
  const established = topics.filter((topic) => topic.status === "established").length;
  const mappedIds = new Set(entries.flatMap((entry) => entry.developmentTopicIds ?? []));
  const mappedEntries = entries.filter((entry) => entry.developmentTopicIds?.length).length;
  const unmappedEntries = entries.filter((entry) => !entry.developmentTopicIds?.length);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId)
    ?? unmappedEntries[0]
    ?? entries[0]
    ?? null;
  const activeSelectedEntryId = selectedEntry?.id ?? "";
  const draftTopicIds = selectedEntry
    ? (linkDrafts[selectedEntry.id] ?? selectedEntry.developmentTopicIds ?? [])
    : [];

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

  function selectEntry(id: string) {
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) return;
    setSelectedEntryId(entry.id);
    setAssistantSummary("");
    setMessage("");
  }

  function toggleTopic(topicId: string) {
    if (!selectedEntry) return;
    setLinkDrafts((current) => {
      const selected = current[selectedEntry.id] ?? selectedEntry.developmentTopicIds ?? [];
      return {
        ...current,
        [selectedEntry.id]: selected.includes(topicId)
          ? selected.filter((candidate) => candidate !== topicId)
          : [...selected, topicId],
      };
    });
    setMessage("UNSAVED RECORD LINKS");
  }

  async function analyseSelectedEntry() {
    if (!selectedEntry || isAnalysing) return;
    setIsAnalysing(true);
    setMessage("COGITATING DEVELOPMENT LINKS...");
    try {
      const response = await fetch("/api/admin/development/analyse", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-lunar-admin-mode": "active",
        },
        body: JSON.stringify({
          entryId: selectedEntry.id,
          expectedUpdatedAt: selectedEntry.updatedAt,
        }),
      });
      const result = await response.json() as { topicIds?: string[]; summary?: string; error?: string };
      if (!response.ok || !result.topicIds) throw new Error(result.error || "No proposal returned.");
      setLinkDrafts((current) => ({ ...current, [selectedEntry.id]: result.topicIds! }));
      setAssistantSummary(result.summary?.trim() || "The cogitator proposed the selected controlled topics.");
      setMessage("PROPOSAL LOADED // REVIEW BEFORE SEALING");
    } catch (error) {
      setMessage(error instanceof Error ? error.message.toUpperCase() : "DEVELOPMENT CONSULTATION FAILED");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function saveRecordLinks() {
    if (!selectedEntry || isSavingLinks) return;
    setIsSavingLinks(true);
    setMessage("SEALING RECORD LINKS...");
    try {
      const response = await fetch(`/api/admin/development/links/${encodeURIComponent(selectedEntry.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-lunar-admin-mode": "active",
        },
        body: JSON.stringify({
          developmentTopicIds: draftTopicIds,
          expectedUpdatedAt: selectedEntry.updatedAt,
        }),
      });
      const result = await response.json() as { entry?: LoreEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error || "The links could not be saved.");
      await onArchiveRefresh();
      setLinkDrafts((current) => {
        const next = { ...current };
        delete next[selectedEntry.id];
        return next;
      });
      setAssistantSummary("");
      setMessage(`RECORD LINKS SEALED // ${result.entry.title.toUpperCase()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.toUpperCase() : "RECORD LINK UPDATE FAILED");
    } finally {
      setIsSavingLinks(false);
    }
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

      <section className="development-link-console panel" id="development-link-console" aria-labelledby="development-link-console-title">
        <header>
          <div>
            <p className="section-kicker">Native archive bridge</p>
            <h3 id="development-link-console-title">Record Link Console</h3>
            <p>Assign structured lore to controlled development topics. Cogitator proposals remain advisory until you seal them.</p>
          </div>
          <strong>{unmappedEntries.length} UNMAPPED RECORD{unmappedEntries.length === 1 ? "" : "S"}</strong>
        </header>
        <div className="development-link-console-grid">
          <label className="development-link-record">
            ARCHIVE RECORD
            <select value={activeSelectedEntryId} onChange={(event) => selectEntry(event.target.value)}>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.developmentTopicIds?.length ? "LINKED" : "UNMAPPED"} · {entry.status.toUpperCase()} · {entry.title}
                </option>
              ))}
            </select>
            {selectedEntry && <small>{selectedEntry.date || "DATE UNRECORDED"} · {selectedEntry.category.toUpperCase()} · {selectedEntry.id}</small>}
          </label>
          <div className="development-link-buttons">
            <button type="button" disabled={!selectedEntry || isAnalysing} onClick={() => void analyseSelectedEntry()}>
              {isAnalysing ? "COGITATING..." : "COGITATE LINK PROPOSAL"}
            </button>
            <button type="button" disabled={!selectedEntry || isSavingLinks} onClick={() => void saveRecordLinks()}>
              {isSavingLinks ? "SEALING..." : "SEAL RECORD LINKS"}
            </button>
          </div>
        </div>
        {assistantSummary && <p className="development-link-proposal"><strong>COGITATOR ADVISORY //</strong> {assistantSummary}</p>}
        <div className="development-topic-selector" aria-label="Controlled development topics">
          {DEVELOPMENT_DOMAINS.map((domain) => (
            <fieldset key={domain.id}>
              <legend>{domain.label}</legend>
              {DEVELOPMENT_TOPICS.filter((topic) => topic.domain === domain.id).map((topic) => (
                <label className="development-topic-option" key={topic.id}>
                  <input
                    type="checkbox"
                    checked={draftTopicIds.includes(topic.id)}
                    onChange={() => toggleTopic(topic.id)}
                  />
                  <span><strong>{topic.label}</strong><small>{topic.id}</small></span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </section>

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
                        <button
                          className="chapter-development-linked-record"
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            selectEntry(entry.id);
                            document.getElementById("development-link-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          {entry.status.toUpperCase()} · {entry.title}
                        </button>
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
