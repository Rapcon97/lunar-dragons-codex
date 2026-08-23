"use client";

import { useMemo, useState } from "react";
import type { ChapterMilestone, LoreEntry } from "../archive-data";
import {
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_TOPICS,
  developmentTopicSummaries,
  type DevelopmentDomain,
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
  const [activeDomainId, setActiveDomainId] = useState<DevelopmentDomain>("identity");
  const [activeTopicId, setActiveTopicId] = useState("chapter-designation");
  const [linkDomainId, setLinkDomainId] = useState<DevelopmentDomain>("identity");

  const topics = useMemo(
    () => developmentTopicSummaries(entries, drafts),
    [entries, drafts],
  );
  const established = topics.filter((topic) => topic.status === "established").length;
  const activeDevelopment = topics.filter((topic) => topic.status === "in-development").length;
  const awaitingReview = topics.filter((topic) => topic.status === "review").length;
  const undeveloped = topics.filter((topic) => topic.status === "undeveloped").length;
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
  const activeDomain = DEVELOPMENT_DOMAINS.find((domain) => domain.id === activeDomainId)
    ?? DEVELOPMENT_DOMAINS[0];
  const activeDomainTopics = topics.filter((topic) => topic.domain === activeDomain.id);
  const activeDomainEstablished = activeDomainTopics.filter((topic) => topic.status === "established").length;
  const activeTopic = activeDomainTopics.find((topic) => topic.id === activeTopicId)
    ?? activeDomainTopics[0];
  const linkDomain = DEVELOPMENT_DOMAINS.find((domain) => domain.id === linkDomainId)
    ?? DEVELOPMENT_DOMAINS[0];
  const linkDomainTopics = DEVELOPMENT_TOPICS.filter((topic) => topic.domain === linkDomain.id);

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
            Track what is established, what is still being written, and which Chapter questions remain unanswered.
          </p>
        </div>
        <div className="chapter-development-overview">
          <div className="chapter-development-progress">
            <strong>{established}<span>/ {topics.length}</span></strong>
            <small>ESTABLISHED TOPICS</small>
          </div>
          <button type="button" onClick={() => void save()}>SEAL LEDGER</button>
          <span role="status">{message || "DEVELOPMENT METADATA · NON-CANON"}</span>
        </div>
      </header>

      <div className="chapter-development-meter" aria-label={`${established} of ${topics.length} topics established`}>
        <i style={{ width: `${(established / topics.length) * 100}%` }} />
      </div>

      <div className="development-status-strip" aria-label="Development status summary">
        <div><strong>{established}</strong><span>ESTABLISHED</span></div>
        <div><strong>{activeDevelopment}</strong><span>IN DEVELOPMENT</span></div>
        <div><strong>{awaitingReview}</strong><span>AWAITING REVIEW</span></div>
        <div><strong>{undeveloped}</strong><span>OPEN QUESTIONS</span></div>
      </div>

      <details className="development-link-console panel" id="development-link-console">
        <summary>
          <span>
            <small>NATIVE ARCHIVE BRIDGE</small>
            <strong>Link lore records to the development ledger</strong>
          </span>
          <span className="development-link-console-summary">
            {mappedEntries} LINKED · {unmappedEntries.length} UNMAPPED
          </span>
        </summary>
        <div className="development-link-console-body">
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
                {isAnalysing ? "COGITATING..." : "COGITATE PROPOSAL"}
              </button>
              <button type="button" disabled={!selectedEntry || isSavingLinks} onClick={() => void saveRecordLinks()}>
                {isSavingLinks ? "SEALING..." : "SEAL LINKS"}
              </button>
            </div>
          </div>
          {assistantSummary && <p className="development-link-proposal"><strong>COGITATOR ADVISORY //</strong> {assistantSummary}</p>}
          <div className="development-link-domain-tabs" aria-label="Topic domains">
            {DEVELOPMENT_DOMAINS.map((domain) => {
              const selectedCount = DEVELOPMENT_TOPICS.filter(
                (topic) => topic.domain === domain.id && draftTopicIds.includes(topic.id),
              ).length;
              return (
                <button
                  type="button"
                  key={domain.id}
                  className={linkDomainId === domain.id ? "is-active" : ""}
                  onClick={() => setLinkDomainId(domain.id)}
                >
                  {domain.label}<span>{selectedCount || "—"}</span>
                </button>
              );
            })}
          </div>
          <fieldset className="development-topic-selector" aria-label="Controlled development topics">
            <legend>{linkDomain.label} · {draftTopicIds.length} TOTAL TOPICS SELECTED</legend>
            <div>
              {linkDomainTopics.map((topic) => (
                <label className="development-topic-option" key={topic.id}>
                  <input
                    type="checkbox"
                    checked={draftTopicIds.includes(topic.id)}
                    onChange={() => toggleTopic(topic.id)}
                  />
                  <span><strong>{topic.label}</strong><small>{topic.id}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      <div className="chapter-development-workspace">
        <nav className="development-domain-nav panel" aria-label="Development domains">
          <header>
            <small>DEVELOPMENT SPHERES</small>
            <strong>Choose one area to inspect</strong>
          </header>
          <div className="development-domain-buttons">
            {DEVELOPMENT_DOMAINS.map((domain) => {
              const domainTopics = topics.filter((topic) => topic.domain === domain.id);
              const domainEstablished = domainTopics.filter((topic) => topic.status === "established").length;
              return (
                <button
                  type="button"
                  key={domain.id}
                  className={activeDomainId === domain.id ? "is-active" : ""}
                  aria-current={activeDomainId === domain.id ? "page" : undefined}
                  onClick={() => {
                    setActiveDomainId(domain.id);
                    setActiveTopicId(domainTopics[0]?.id ?? "");
                  }}
                >
                  <span>{domain.label}</span>
                  <b>{domainEstablished}/{domainTopics.length}</b>
                </button>
              );
            })}
          </div>
          <div className="development-topic-nav" aria-label={`${activeDomain.label} topics`}>
            <small>{activeDomain.label.toUpperCase()} TOPICS</small>
            {activeDomainTopics.map((topic) => (
              <button
                type="button"
                key={topic.id}
                className={activeTopic?.id === topic.id ? "is-active" : ""}
                aria-current={activeTopic?.id === topic.id ? "true" : undefined}
                data-status={topic.status}
                onClick={() => setActiveTopicId(topic.id)}
              >
                <span><strong>{topic.label}</strong><small>{topic.linkedCount} LINKED RECORD{topic.linkedCount === 1 ? "" : "S"}</small></span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
          <footer>{mappedIds.size} OF {topics.length} TOPICS TOUCHED BY LORE</footer>
        </nav>

        <section className="development-domain-view panel" aria-labelledby="active-development-domain">
          <header>
            <div>
              <p className="section-kicker">Active development sphere</p>
              <h3 id="active-development-domain">{activeDomain.label}</h3>
              <p>{activeDomain.description}</p>
            </div>
            <strong>{activeDomainEstablished}/{activeDomainTopics.length}<small>ESTABLISHED</small></strong>
          </header>
          {activeTopic && (
            <article className="chapter-development-topic" data-status={activeTopic.status} key={activeTopic.id}>
              <header>
                <div><small>{activeTopic.id}</small><h3>{activeTopic.label}</h3></div>
                <b>{statusLabels[activeTopic.status]}</b>
              </header>
              <p className="development-topic-prompt">{activeTopic.prompt}</p>
              <div className="chapter-development-links">
                <span>{activeTopic.linkedCount} LINKED RECORD{activeTopic.linkedCount === 1 ? "" : "S"}</span>
                {activeTopic.linkedEntries.length ? activeTopic.linkedEntries.map((entry) => (
                  <button
                    className="chapter-development-linked-record"
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      selectEntry(entry.id);
                      const consoleElement = document.getElementById("development-link-console") as HTMLDetailsElement | null;
                      if (consoleElement) {
                        consoleElement.open = true;
                        consoleElement.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    <span>{entry.title}</span><small>{entry.status.toUpperCase()} · {entry.date || "DATE UNRECORDED"}</small>
                  </button>
                )) : <em>NO STRUCTURED LORE CURRENTLY LINKED</em>}
              </div>
              <div className="development-topic-editor">
                <label>
                  MANUAL DISPOSITION
                  <select
                    value={drafts.find((item) => item.topicId === activeTopic.id)?.manualStatus ?? ""}
                    onChange={(event) => updateOverride(activeTopic.id, { manualStatus: event.target.value as DevelopmentTopicManualStatus | "" })}
                  >
                    <option value="">DERIVE FROM LINKED LORE</option>
                    <option value="operational-only">OPERATIONAL ONLY</option>
                    <option value="intentionally-unresolved">INTENTIONALLY UNRESOLVED</option>
                  </select>
                </label>
                <label>
                  DEVELOPMENT NOTE
                  <textarea
                    value={drafts.find((item) => item.topicId === activeTopic.id)?.notes ?? ""}
                    onChange={(event) => updateOverride(activeTopic.id, { notes: event.target.value.slice(0, 2000) })}
                    placeholder="Record the next question, decision, or unresolved point..."
                  />
                </label>
              </div>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}
