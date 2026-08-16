"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { LoreCategory, LoreEntry } from "../archive-data";
import {
  MAX_LORE_CONTENT_LENGTH,
  MAX_LORE_SUBTITLE_LENGTH,
  MAX_LORE_TITLE_LENGTH,
} from "../lore-limits";
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
  subtitle: string;
  category: LoreCategory;
  content: string;
};

function draftForEntry(entry: LoreEntry | null): EditorDraft {
  return entry
    ? {
        date: entry.date,
        title: entry.title,
        subtitle: entry.subtitle ?? "",
        category: entry.category,
        content: entry.content,
      }
    : { date: "", title: "", subtitle: "", category: "event", content: "" };
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
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const initialDraft = useMemo(() => draftForEntry(entry), [entry]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const isCreating = entry === null;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- A newly selected stable entry deliberately resets the isolated editor session. */
    setDraft(initialDraft);
    setMessage("");
    setMessageTone("error");
    setAssistantOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
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

  function replaceContentSelection(
    replacement: string,
    selectionStart: number,
    selectionEnd: number,
  ) {
    const textarea = contentRef.current;
    if (!textarea) return;
    const nextContent =
      textarea.value.slice(0, textarea.selectionStart) +
      replacement +
      textarea.value.slice(textarea.selectionEnd);
    const insertionStart = textarea.selectionStart;
    setDraft((current) => ({ ...current, content: nextContent }));
    requestAnimationFrame(() => {
      contentRef.current?.focus();
      contentRef.current?.setSelectionRange(
        insertionStart + selectionStart,
        insertionStart + selectionEnd,
      );
    });
  }

  function applyInlineFormat(marker: "**" | "*") {
    const textarea = contentRef.current;
    if (!textarea) return;
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    const placeholder = marker === "**" ? "emphasised text" : "italic text";
    const value = selected || placeholder;
    replaceContentSelection(
      `${marker}${value}${marker}`,
      marker.length,
      marker.length + value.length,
    );
  }

  function applyLineFormat(format: "heading" | "bullet" | "numbered" | "quote") {
    const textarea = contentRef.current;
    if (!textarea) return;
    const lineStart = textarea.value.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
    const followingBreak = textarea.value.indexOf("\n", textarea.selectionEnd);
    const lineEnd = followingBreak === -1 ? textarea.value.length : followingBreak;
    textarea.setSelectionRange(lineStart, lineEnd);
    const sourceLines = textarea.value.slice(lineStart, lineEnd).split("\n");
    const replacement = sourceLines.map((line, index) => {
      if (format === "heading") return `## ${line.replace(/^#{1,3}\s+/, "")}`;
      if (format === "bullet") return `- ${line.replace(/^[-*]\s+/, "")}`;
      if (format === "numbered") return `${index + 1}. ${line.replace(/^\d+\.\s+/, "")}`;
      return `> ${line.replace(/^>\s?/, "")}`;
    }).join("\n");
    replaceContentSelection(replacement, 0, replacement.length);
  }

  function insertDivider() {
    const textarea = contentRef.current;
    if (!textarea) return;
    const prefix = textarea.selectionStart > 0 && !textarea.value.slice(0, textarea.selectionStart).endsWith("\n")
      ? "\n\n"
      : "";
    const suffix = textarea.selectionEnd < textarea.value.length && !textarea.value.slice(textarea.selectionEnd).startsWith("\n")
      ? "\n\n"
      : "";
    const replacement = `${prefix}---${suffix}`;
    replaceContentSelection(replacement, replacement.length, replacement.length);
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
                maxLength={MAX_LORE_TITLE_LENGTH}
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter the formal archival title"
              />
            </label>

            <label className="lore-editor-subtitle-field">
              RECORD SUBTITLE <small>OPTIONAL</small>
              <input
                maxLength={MAX_LORE_SUBTITLE_LENGTH}
                value={draft.subtitle}
                onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Add a secondary archival designation"
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

            <div className="lore-editor-content-field">
              <label className="lore-editor-content-label" htmlFor="lore-editor-content">
                COMPLETE ARCHIVAL CONTENT
              </label>
              <div className="lore-format-toolbar" role="toolbar" aria-label="Lore text formatting tools">
                <button type="button" onClick={() => applyLineFormat("heading")} title="Section heading">H2</button>
                <button type="button" onClick={() => applyInlineFormat("**")} title="Bold"><strong>B</strong></button>
                <button type="button" onClick={() => applyInlineFormat("*")} title="Italic"><em>I</em></button>
                <button type="button" onClick={() => applyLineFormat("bullet")} title="Bulleted list">• LIST</button>
                <button type="button" onClick={() => applyLineFormat("numbered")} title="Numbered list">1. LIST</button>
                <button type="button" onClick={() => applyLineFormat("quote")} title="Quotation">QUOTE</button>
                <button type="button" onClick={insertDivider} title="Section divider">RULE</button>
              </div>
              <textarea
                id="lore-editor-content"
                ref={contentRef}
                required
                maxLength={MAX_LORE_CONTENT_LENGTH}
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="Compose the full lore record here…"
              />
              <small>
                {draft.content.length.toLocaleString("en-GB")} / {MAX_LORE_CONTENT_LENGTH.toLocaleString("en-GB")} CHARACTERS
              </small>
            </div>
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
