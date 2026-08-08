"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type {
  LoreAssistantAnswer,
  LoreAssistantDraft,
  LoreAssistantSuggestion,
  LoreAssistantTurn,
} from "../lore-assistant";

const quickConsultations = [
  {
    label: "CANON AUDIT",
    prompt:
      "Audit the active record against established Lunar Dragons canon. Identify contradictions, unsupported claims, and facts that should remain unresolved. Do not rewrite it yet.",
  },
  {
    label: "REFINE ARCHIVAL VOICE",
    prompt:
      "Rewrite the active record in a restrained in-universe Imperial archival voice. Preserve established facts and return a complete proposed record for review.",
  },
  {
    label: "DEVELOP DRAFT",
    prompt:
      "Develop the active draft into a complete lore proposal using established canon as the primary authority. Clearly avoid inventing certainty where canon is silent.",
  },
] as const;

type DisplayTurn = LoreAssistantTurn & {
  id: number;
  canonReferences?: string[];
  suggestion?: LoreAssistantSuggestion | null;
  suggestionSummary?: string | null;
};

export function LoreCogitatorPanel({
  draft,
  onApplySuggestion,
}: {
  draft: LoreAssistantDraft;
  onApplySuggestion: (suggestion: LoreAssistantSuggestion) => void;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [error, setError] = useState("");
  const [isConsulting, setIsConsulting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const turnIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, isConsulting]);

  async function consult(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isConsulting) return;

    const history = turns.slice(-8).map(({ role, content }) => ({ role, content }));
    const userTurn: DisplayTurn = {
      id: ++turnIdRef.current,
      role: "user",
      content: trimmed,
    };
    setTurns((current) => [...current, userTurn]);
    setInput("");
    setError("");
    setIsConsulting(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/admin/lore-assistant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lunar-admin-mode": "active",
        },
        body: JSON.stringify({ message: trimmed, history, draft }),
        signal: controller.signal,
      });
      const answer = (await response.json()) as LoreAssistantAnswer & { error?: string };
      if (!response.ok || !answer.reply) {
        throw new Error(answer.error || "The Lore Cogitator did not answer.");
      }
      setTurns((current) => [
        ...current,
        {
          id: ++turnIdRef.current,
          role: "assistant",
          content: answer.reply,
          canonReferences: answer.canonReferences,
          suggestion: answer.suggestion,
          suggestionSummary: answer.suggestionSummary,
        },
      ]);
    } catch (consultationError) {
      if (consultationError instanceof DOMException && consultationError.name === "AbortError") return;
      setError(
        consultationError instanceof Error
          ? consultationError.message
          : "The Lore Cogitator is temporarily unavailable.",
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsConsulting(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void consult(input);
    }
  }

  return (
    <aside className="lore-cogitator" aria-label="Lore Cogitator consultation">
      <header>
        <div>
          <span>NOOSPHERIC LORE ENGINE</span>
          <h3>LORE COGITATOR</h3>
        </div>
        <strong>CANON-LED · ADVISORY ONLY</strong>
      </header>

      <div className="lore-cogitator-quick" aria-label="Quick consultations">
        {quickConsultations.map((consultation) => (
          <button
            key={consultation.label}
            type="button"
            disabled={isConsulting}
            onClick={() => void consult(consultation.prompt)}
          >
            {consultation.label}
          </button>
        ))}
      </div>

      <div className="lore-cogitator-log" ref={logRef} aria-live="polite">
        {turns.length === 0 && (
          <div className="lore-cogitator-empty">
            <b>&gt;&gt; AWAITING CHAPTER MASTER QUERY</b>
            <p>
              Consult established canon, develop this record, or request a complete revision.
              Proposals never save or publish themselves.
            </p>
          </div>
        )}
        {turns.map((turn) => (
          <article className={`lore-cogitator-turn ${turn.role}`} key={turn.id}>
            <span>{turn.role === "user" ? "CHAPTER MASTER" : "COGITATOR RESPONSE"}</span>
            <p>{turn.content}</p>
            {turn.canonReferences && turn.canonReferences.length > 0 && (
              <small>CANON RELIQUARIA · {turn.canonReferences.join(" · ")}</small>
            )}
            {turn.suggestion && (
              <div className="lore-cogitator-proposal">
                <b>COMPLETE EDITOR PROPOSAL READY</b>
                {turn.suggestionSummary && <p>{turn.suggestionSummary}</p>}
                <button type="button" onClick={() => onApplySuggestion(turn.suggestion!)}>
                  APPLY PROPOSAL TO EDITOR
                </button>
                <small>Review the complete record before saving. Status is unchanged.</small>
              </div>
            )}
          </article>
        ))}
        {isConsulting && (
          <div className="lore-cogitator-working" role="status">
            &gt;&gt; CONSULTING CANON RELIQUARIA<span aria-hidden="true">_</span>
          </div>
        )}
      </div>

      {error && <p className="lore-cogitator-error" role="alert">{error}</p>}

      <div className="lore-cogitator-input">
        <label htmlFor="lore-cogitator-query">CHAPTER MASTER INSTRUCTION</label>
        <textarea
          id="lore-cogitator-query"
          maxLength={4_000}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Question canon, develop a passage, or request a complete revision…"
        />
        <div>
          <small>{input.length.toLocaleString("en-GB")} / 4,000 · CTRL+ENTER TO SEND</small>
          <button
            type="button"
            disabled={isConsulting || !input.trim()}
            onClick={() => void consult(input)}
          >
            {isConsulting ? "COGITATING..." : "SUBMIT QUERY"}
          </button>
        </div>
      </div>
    </aside>
  );
}
