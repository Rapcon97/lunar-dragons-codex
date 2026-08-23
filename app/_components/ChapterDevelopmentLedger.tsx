"use client";

import { useMemo, useState } from "react";
import type { ChapterMilestone, LoreEntry } from "../archive-data";
import {
  DEVELOPMENT_DOMAINS,
  DEVELOPMENT_TOPICS,
  developmentTopicSummaries,
  type DevelopmentDomain,
  type DevelopmentTopicManualStatus,
  type DevelopmentTopicStatus,
} from "../chapter-development";

const statusLabels: Record<DevelopmentTopicStatus, string> = {
  undeveloped: "NOT STARTED",
  "in-development": "IN DEVELOPMENT",
  review: "AWAITING REVIEW",
  established: "ESTABLISHED",
  "previously-covered": "SUPERSEDED SOURCE",
  "operational-only": "OPERATIONAL ONLY",
  "intentionally-unresolved": "INTENTIONALLY UNRESOLVED",
};

const domainGuidance: Record<DevelopmentDomain, { impact: string; questions: [string, string] }> = {
  identity: {
    impact: "Defines the Chapter's public identity and constrains every later record.",
    questions: ["Which facts are formally sealed?", "Which absences are deliberate mysteries rather than omissions?"],
  },
  culture: {
    impact: "Turns a military formation into a distinct brotherhood with beliefs, loyalties, and faults.",
    questions: ["What do the Lunar Dragons do differently?", "Which custom grew from a recorded event rather than generic tradition?"],
  },
  organisation: {
    impact: "Keeps named characters, companies, specialists, and command authority internally consistent.",
    questions: ["Who holds authority in practice?", "Does the current roster support the stated organisation?"],
  },
  warfare: {
    impact: "Connects battlefield doctrine to the Chapter's actual history, losses, and available strength.",
    questions: ["Which proven experience shaped this doctrine?", "What limitation prevents the Chapter from excelling at everything?"],
  },
  institutions: {
    impact: "Tracks the people, places, relics, vessels, and biological systems that let the Chapter endure.",
    questions: ["Who is responsible for this institution?", "Which asset, dependency, or unresolved risk matters most?"],
  },
};

function nextActionFor(status: DevelopmentTopicStatus) {
  switch (status) {
    case "review": return "Resolve the linked review record and decide whether it is ready for canon.";
    case "in-development": return "Continue the linked draft, then return it for review.";
    case "undeveloped": return "Begin with the development question and link the first supporting record.";
    case "intentionally-unresolved": return "Confirm that the uncertainty is useful and record its narrative purpose.";
    case "operational-only": return "Decide whether this should remain roster data or receive a structured lore record.";
    case "previously-covered": return "Reassess the superseded source before restoring or replacing it.";
    default: return "Audit the established answer against newer canon and linked operational records.";
  }
}

function nextTopicPriority(status: DevelopmentTopicStatus) {
  return {
    review: 0,
    "in-development": 1,
    undeveloped: 2,
    "intentionally-unresolved": 3,
    "operational-only": 4,
    "previously-covered": 5,
    established: 6,
  }[status];
}

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

  const topics = useMemo(() => developmentTopicSummaries(entries, drafts), [entries, drafts]);
  const established = topics.filter((topic) => topic.status === "established").length;
  const activeDevelopment = topics.filter((topic) => topic.status === "in-development" || topic.status === "review").length;
  const unresolved = topics.filter((topic) => topic.status === "undeveloped" || topic.status === "intentionally-unresolved").length;
  const mappedEntries = entries.filter((entry) => entry.developmentTopicIds?.length).length;
  const unmappedEntries = entries.filter((entry) => !entry.developmentTopicIds?.length);
  const nextTopic = [...topics].sort((left, right) => nextTopicPriority(left.status) - nextTopicPriority(right.status))[0];
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? unmappedEntries[0] ?? entries[0] ?? null;
  const draftTopicIds = selectedEntry ? (linkDrafts[selectedEntry.id] ?? selectedEntry.developmentTopicIds ?? []) : [];
  const activeDomain = DEVELOPMENT_DOMAINS.find((domain) => domain.id === activeDomainId) ?? DEVELOPMENT_DOMAINS[0];
  const activeDomainTopics = topics.filter((topic) => topic.domain === activeDomain.id);
  const activeTopic = activeDomainTopics.find((topic) => topic.id === activeTopicId) ?? activeDomainTopics[0];
  const activeOverride = activeTopic ? drafts.find((item) => item.topicId === activeTopic.id) : undefined;
  const linkDomain = DEVELOPMENT_DOMAINS.find((domain) => domain.id === linkDomainId) ?? DEVELOPMENT_DOMAINS[0];
  const linkDomainTopics = DEVELOPMENT_TOPICS.filter((topic) => topic.domain === linkDomain.id);
  const progress = topics.length ? Math.round((established / topics.length) * 100) : 0;

  if (!canAdmin || !isAdminMode) return null;

  function openTopic(topicId: string, domainId: DevelopmentDomain) {
    setActiveDomainId(domainId);
    setActiveTopicId(topicId);
  }

  function updateOverride(topicId: string, patch: { manualStatus?: DevelopmentTopicManualStatus | ""; notes?: string }) {
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
    setDrafts(nextRecord.manualStatus || nextRecord.notes ? [...withoutTopic, nextRecord] : withoutTopic);
    setMessage("UNSAVED DEVELOPMENT NOTES");
  }

  async function save() {
    setMessage("SAVING DEVELOPMENT NOTES...");
    const saved = await onSaveMilestones(drafts);
    setMessage(saved ? "DEVELOPMENT NOTES SAVED" : "DEVELOPMENT UPDATE FAILED");
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
      return { ...current, [selectedEntry.id]: selected.includes(topicId) ? selected.filter((candidate) => candidate !== topicId) : [...selected, topicId] };
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
        headers: { accept: "application/json", "content-type": "application/json", "x-lunar-admin-mode": "active" },
        body: JSON.stringify({ entryId: selectedEntry.id, expectedUpdatedAt: selectedEntry.updatedAt }),
      });
      const result = await response.json() as { topicIds?: string[]; summary?: string; error?: string };
      if (!response.ok || !result.topicIds) throw new Error(result.error || "No proposal returned.");
      setLinkDrafts((current) => ({ ...current, [selectedEntry.id]: result.topicIds! }));
      setAssistantSummary(result.summary?.trim() || "The cogitator proposed the selected controlled topics.");
      setMessage("PROPOSAL LOADED // REVIEW BEFORE SAVING");
    } catch (error) {
      setMessage(error instanceof Error ? error.message.toUpperCase() : "DEVELOPMENT CONSULTATION FAILED");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function saveRecordLinks() {
    if (!selectedEntry || isSavingLinks) return;
    setIsSavingLinks(true);
    setMessage("SAVING RECORD LINKS...");
    try {
      const response = await fetch(`/api/admin/development/links/${encodeURIComponent(selectedEntry.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { accept: "application/json", "content-type": "application/json", "x-lunar-admin-mode": "active" },
        body: JSON.stringify({ developmentTopicIds: draftTopicIds, expectedUpdatedAt: selectedEntry.updatedAt }),
      });
      const result = await response.json() as { entry?: LoreEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error || "The links could not be saved.");
      await onArchiveRefresh();
      setLinkDrafts((current) => { const next = { ...current }; delete next[selectedEntry.id]; return next; });
      setAssistantSummary("");
      setMessage(`RECORD LINKS SAVED // ${result.entry.title.toUpperCase()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.toUpperCase() : "RECORD LINK UPDATE FAILED");
    } finally {
      setIsSavingLinks(false);
    }
  }

  return (
    <section className="chapter-development-ledger" aria-labelledby="chapter-development-title">
      <header className="development-workbook-header">
        <div>
          <p className="section-kicker">Restricted chapter-building workbook</p>
          <h2 id="chapter-development-title">Chapter Development</h2>
          <p>Build one part of the Lunar Dragons at a time. Canon evidence sets the foundation; unresolved questions remain visible until deliberately answered.</p>
        </div>
        <div className="development-workbook-progress" aria-label={`${progress}% of development topics established`}>
          <strong>{progress}%</strong><span>{established} OF {topics.length} TOPICS ESTABLISHED</span>
          <div aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
          <button type="button" onClick={() => void save()}>SAVE DEVELOPMENT NOTES</button>
          <small role="status">{message || "WORKBOOK READY · NON-CANON METADATA"}</small>
        </div>
      </header>

      <section className="development-next-task" aria-labelledby="development-next-task-title">
        <div><small>NEXT BEST TASK</small><strong id="development-next-task-title">{nextTopic?.label ?? "Development ledger complete"}</strong><p>{nextTopic ? nextActionFor(nextTopic.status) : "All controlled development topics are established."}</p></div>
        <dl>
          <div><dt>ESTABLISHED</dt><dd>{established}</dd></div><div><dt>ACTIVE</dt><dd>{activeDevelopment}</dd></div>
          <div><dt>UNRESOLVED</dt><dd>{unresolved}</dd></div><div><dt>LINKED RECORDS</dt><dd>{mappedEntries}</dd></div>
        </dl>
        {nextTopic && <button type="button" onClick={() => openTopic(nextTopic.id, nextTopic.domain)}>OPEN TASK</button>}
      </section>

      <div className="chapter-development-workbench">
        <aside className="development-workbench-index" aria-label="Chapter development index">
          <header><small>CHAPTER-BUILDING INDEX</small><strong>Choose a development sphere</strong></header>
          <nav className="development-domain-nav" aria-label="Development spheres">
            {DEVELOPMENT_DOMAINS.map((domain) => {
              const domainTopics = topics.filter((topic) => topic.domain === domain.id);
              const domainEstablished = domainTopics.filter((topic) => topic.status === "established").length;
              return <button type="button" key={domain.id} className={activeDomainId === domain.id ? "is-active" : ""} aria-current={activeDomainId === domain.id ? "page" : undefined} onClick={() => { setActiveDomainId(domain.id); setActiveTopicId(domainTopics[0]?.id ?? ""); }}><span>{domain.label}</span><b>{domainEstablished}/{domainTopics.length}</b></button>;
            })}
          </nav>
          <div className="development-topic-nav" aria-label={`${activeDomain.label} topics`}>
            <small>{activeDomain.label.toUpperCase()}</small>
            {activeDomainTopics.map((topic) => (
              <button type="button" key={topic.id} className={activeTopic?.id === topic.id ? "is-active" : ""} aria-current={activeTopic?.id === topic.id ? "true" : undefined} data-status={topic.status} onClick={() => setActiveTopicId(topic.id)}>
                <i aria-hidden="true" /><span><strong>{topic.label}</strong><small>{statusLabels[topic.status]} · {topic.linkedCount} RECORD{topic.linkedCount === 1 ? "" : "S"}</small></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="development-workbench-focus" aria-labelledby="active-development-topic">
          {activeTopic && <>
            <header data-status={activeTopic.status}>
              <div><small>{activeDomain.label} · {statusLabels[activeTopic.status]}</small><h3 id="active-development-topic">{activeTopic.label}</h3><p>{activeDomain.description}</p></div>
              <span>{activeTopic.linkedCount} EVIDENCE RECORD{activeTopic.linkedCount === 1 ? "" : "S"}</span>
            </header>
            <div className="development-workbook-question"><small>DEVELOPMENT QUESTION</small><p>{activeTopic.prompt}</p></div>
            <div className="development-workbook-columns">
              <section className="development-evidence-pane">
                <header><small>CANON & DEVELOPMENT EVIDENCE</small><strong>{activeTopic.linkedCount ? "ARCHIVE LINKED" : "NO EVIDENCE LINKED"}</strong></header>
                <div className="development-evidence-list">
                  {activeTopic.linkedEntries.length ? activeTopic.linkedEntries.map((entry) => (
                    <button className="chapter-development-linked-record" key={entry.id} type="button" onClick={() => { selectEntry(entry.id); const drawer = document.getElementById("development-link-console") as HTMLDetailsElement | null; if (drawer) { drawer.open = true; drawer.scrollIntoView({ behavior: "smooth", block: "start" }); } }}>
                      <span>{entry.title}</span><small>{entry.status.toUpperCase()} · {entry.date || "DATE UNRECORDED"}</small>
                    </button>
                  )) : <p>No structured lore currently answers this question. Start a draft or link an existing record.</p>}
                </div>
                <div className="development-impact-note"><small>WHY THIS MATTERS</small><p>{domainGuidance[activeDomain.id].impact}</p></div>
              </section>
              <section className="development-decision-pane">
                <header><small>WORKING DECISION</small><strong>{nextActionFor(activeTopic.status)}</strong></header>
                <label>SPECIAL DISPOSITION<select value={activeOverride?.manualStatus ?? ""} onChange={(event) => updateOverride(activeTopic.id, { manualStatus: event.target.value as DevelopmentTopicManualStatus | "" })}><option value="">DERIVE FROM LINKED LORE</option><option value="operational-only">OPERATIONAL ONLY</option><option value="intentionally-unresolved">INTENTIONALLY UNRESOLVED</option></select></label>
                <label>DEVELOPMENT NOTE<textarea value={activeOverride?.notes ?? ""} onChange={(event) => updateOverride(activeTopic.id, { notes: event.target.value.slice(0, 2000) })} placeholder="Record the next decision, contradiction, dependency, or open question..." /></label>
                <div className="development-question-prompts"><small>QUESTIONS WORTH ANSWERING</small><ul>{domainGuidance[activeDomain.id].questions.map((question) => <li key={question}>{question}</li>)}</ul></div>
              </section>
            </div>
          </>}
        </section>
      </div>

      <details className="development-link-console" id="development-link-console">
        <summary><span><small>ARCHIVE EVIDENCE BRIDGE</small><strong>Link lore records to development topics</strong></span><span>{mappedEntries} LINKED · {unmappedEntries.length} UNMAPPED</span></summary>
        <div className="development-link-console-body">
          <div className="development-link-console-grid">
            <label className="development-link-record">ARCHIVE RECORD<select value={selectedEntry?.id ?? ""} onChange={(event) => selectEntry(event.target.value)}>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.developmentTopicIds?.length ? "LINKED" : "UNMAPPED"} · {entry.status.toUpperCase()} · {entry.title}</option>)}</select>{selectedEntry && <small>{selectedEntry.date || "DATE UNRECORDED"} · {selectedEntry.category.toUpperCase()} · {selectedEntry.id}</small>}</label>
            <div className="development-link-buttons"><button type="button" disabled={!selectedEntry || isAnalysing} onClick={() => void analyseSelectedEntry()}>{isAnalysing ? "COGITATING..." : "SUGGEST TOPICS"}</button><button type="button" disabled={!selectedEntry || isSavingLinks} onClick={() => void saveRecordLinks()}>{isSavingLinks ? "SAVING..." : "SAVE TOPIC LINKS"}</button></div>
          </div>
          {assistantSummary && <p className="development-link-proposal"><strong>COGITATOR ADVISORY //</strong> {assistantSummary}</p>}
          <div className="development-link-domain-tabs" aria-label="Topic domains">{DEVELOPMENT_DOMAINS.map((domain) => { const selectedCount = DEVELOPMENT_TOPICS.filter((topic) => topic.domain === domain.id && draftTopicIds.includes(topic.id)).length; return <button type="button" key={domain.id} className={linkDomainId === domain.id ? "is-active" : ""} onClick={() => setLinkDomainId(domain.id)}>{domain.label}<span>{selectedCount || "—"}</span></button>; })}</div>
          <fieldset className="development-topic-selector" aria-label="Controlled development topics"><legend>{linkDomain.label} · {draftTopicIds.length} TOTAL TOPICS SELECTED</legend><div>{linkDomainTopics.map((topic) => <label className="development-topic-option" key={topic.id}><input type="checkbox" checked={draftTopicIds.includes(topic.id)} onChange={() => toggleTopic(topic.id)} /><span><strong>{topic.label}</strong><small>{topic.id}</small></span></label>)}</div></fieldset>
        </div>
      </details>
    </section>
  );
}
