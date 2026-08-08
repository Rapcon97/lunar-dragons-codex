"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { LoreCategory, LoreEntry } from "../archive-data";
import { MAX_LORE_CONTENT_LENGTH } from "../lore-limits";
import { LoreCogitatorPanel } from "./LoreCogitatorPanel";

const categoryOptions: Array<{ value: LoreCategory; label: string }> = [
  { value: "campaign", label: "Campaign" },
  { value: "event", label: "Event" },
  { value: "character", label: "Character" },
  { value: "relic", label: "Relic" },
  { value: "world", label: "World" },
  { value: "organization", label: "Organization" },
  { value: "decree", label: "Decree" },
  { value: "other", label: "Other" },
];

type EditorDraft = {
  date: string;
  title: string;
  category: LoreCategory;
  content: string;
};

function draftForEntry(entry: LoreEntry | null): EditorDraft {
  return entry
    ? {
        date: entry.date,
        title: entry.title,
        category: entry.category,
        content: entry.content,
      }
    : { date: "", title: "", category: "event", content: "" };
}

export function LoreEntryEditor({
  entry,
  onClose,
  onSaved,
}: {
  entry: LoreEntry | null;
  onClose: () => void;
  onSaved: (entry: LoreEntry) => Promise<void>;
}) {
  const [draft, setDraft] = useState<EditorDraft>(() => draftForEntry(entry));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const initialDraft = useMemo(() => draftForEntry(entry), [entry]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const isCreating = entry === null;

  useEffect(() => {
    setDraft(initialDraft);
    setMessage("");
    setMessageTone("error");
    setAssistantOpen(false);
  }, [initialDraft]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!isDirty || window.confirm("Discard the unsaved lore revision?")) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, onClose]);

  function requestClose() {
    if (!isDirty || window.confirm("Discard the unsaved lore revision?")) {
      onClose();
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageTone("error");
    setIsSaving(true);
    try {
      const response = await fetch(
        isCreating
          ? "/api/admin/lore"
          : `/api/admin/lore/${encodeURIComponent(entry.id)}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json",
            "x-lunar-admin-mode": "active",
          },
          body: JSON.stringify(
            isCreating
              ? { ...draft, status: "draft" }
              : { ...draft, expectedUpdatedAt: entry.updatedAt },
          ),
        },
      );
      const result = (await response.json()) as { entry?: LoreEntry; error?: string };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "The lore revision could not be saved.");
      }
      await onSaved(result.entry);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The lore revision could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="lore-editor-backdrop" role="presentation">
      <section
        className={`lore-editor-dialog ${assistantOpen ? "assistant-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lore-editor-title"
      >
        <header>
          <div>
            <span>ADMINISTRATUM ANNALIS · STRUCTURED RECORD</span>
            <h2 id="lore-editor-title">
              {isCreating ? "SEAL NEW LORE DRAFT" : "REVISE ARCHIVE RECORD"}
            </h2>
          </div>
          <div className="lore-editor-header-actions">
            <button
              type="button"
              aria-expanded={assistantOpen}
              aria-controls="lore-cogitator-panel"
              onClick={() => setAssistantOpen((current) => !current)}
            >
              {assistantOpen ? "CLOSE COGITATOR" : "OPEN LORE COGITATOR"}
            </button>
            <button type="button" onClick={requestClose} aria-label="Close lore editor">
              CLOSE ×
            </button>
          </div>
        </header>

        <form onSubmit={save}>
          <div className="lore-editor-signifiers">
            <span>
              RECORD IDENT
              <strong>{entry?.id ?? "ASSIGNED ON SAVE"}</strong>
            </span>
            <span>
              DEVELOPMENT STATUS
              <strong>{entry?.status.toUpperCase() ?? "DRAFT"}</strong>
            </span>
            <span>
              REVISION CONTROL
              <strong>{entry ? "OPTIMISTIC SEAL ACTIVE" : "NEW RECORD"}</strong>
            </span>
          </div>

          <div className="lore-editor-workspace">
            <div className="lore-editor-fields">
            <label className="lore-editor-title-field">
              RECORD TITLE
              <input
                autoFocus
                required
                maxLength={240}
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter the formal archival title"
              />
            </label>

            <label>
              IMPERIAL DATE
              <input
                maxLength={80}
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                placeholder="e.g. 056.M42"
              />
            </label>

            <label>
              RECORD CATEGORY
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value as LoreCategory,
                  }))
                }
              >
                {categoryOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="lore-editor-content-field">
              COMPLETE ARCHIVAL CONTENT
              <textarea
                required
                maxLength={MAX_LORE_CONTENT_LENGTH}
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="Compose the full lore record here…"
              />
              <small>
                {draft.content.length.toLocaleString("en-GB")} / {MAX_LORE_CONTENT_LENGTH.toLocaleString("en-GB")} CHARACTERS
              </small>
            </label>
            </div>

            {assistantOpen && (
              <div id="lore-cogitator-panel">
                <LoreCogitatorPanel
                  draft={{
                    recordId: entry?.id ?? null,
                    status: entry?.status ?? "draft",
                    ...draft,
                  }}
                  onApplySuggestion={(suggestion) => {
                    setDraft(suggestion);
                    setMessageTone("info");
                    setMessage("COGITATOR PROPOSAL LOADED // REVIEW BEFORE SAVING");
                  }}
                />
              </div>
            )}
          </div>

          {message && (
            <p
              className="lore-editor-message"
              data-tone={messageTone}
              role={messageTone === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <footer>
            <p>
              {isCreating
                ? "New records are stored as Draft and remain absent from the public Chronicle."
                : entry?.status === "review"
                  ? "Saving preserves Review status. Publication still requires a separate canon judgement."
                  : `Saving preserves ${entry?.status ?? "the current"} status and the existing record ID.`}
            </p>
            <div>
              <button type="button" onClick={requestClose}>DISCARD / CLOSE</button>
              <button type="submit" disabled={isSaving || !isDirty}>
                {isSaving ? "INSCRIBING..." : isCreating ? "SAVE NEW DRAFT" : "SAVE REVISION"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
