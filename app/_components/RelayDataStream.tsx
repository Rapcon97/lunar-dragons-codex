"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  appendTransmissionRetrievalDots,
  formatTransmissionTranscript,
  formatCorruptionPercentage,
  planTransmissionPlayback,
  prepareTransmissionLine,
  splitTransmissionMetadata,
  TRANSMISSION_TIMING,
  transmissionCharacterDelay,
  type TransmissionSourceMetadata,
  type TransmissionTranscriptLine,
} from "./relay-transmission";

export type RelayStreamLine = TransmissionTranscriptLine;

type RelayDataStreamProps = {
  afterComplete?: ReactNode;
  ariaLabel: string;
  className?: string;
  source: TransmissionSourceMetadata;
  streamKey: string;
};

type RenderPhase = "typing" | "pause" | "retrieval" | "complete";
type DisplayStage = "analysis" | "cogitation" | "message" | "complete";

function isRetrievalCommand(line: TransmissionTranscriptLine, text: string) {
  return line.command || text.trimStart().startsWith(">>");
}

export function RelayDataStream({ afterComplete, ariaLabel, className = "", source, streamKey }: RelayDataStreamProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [phase, setPhase] = useState<RenderPhase>("typing");
  const [displayStage, setDisplayStage] = useState<DisplayStage>("analysis");
  const [cogitationDots, setCogitationDots] = useState(0);
  const [completedStreamKey, setCompletedStreamKey] = useState<string | null>(null);
  const transcript = useMemo(
    () => formatTransmissionTranscript(source),
    [source.agency, source.body, source.event, source.id, source.preview, source.priority, source.received, source.receivedAt, source.subject, source.transmission],
  );
  const { analysis, lines: presentedLines } = transcript;
  const corruptionProfile = analysis.corruption;
  const preparedLines = useMemo(
    () => presentedLines.map((line, lineIndex) => prepareTransmissionLine(line, corruptionProfile, lineIndex)),
    [corruptionProfile, presentedLines],
  );
  const playbackPlan = useMemo(() => planTransmissionPlayback(presentedLines), [presentedLines]);
  const analysisLines = useMemo(
    () => presentedLines.slice(0, playbackPlan.analysisEndIndex),
    [playbackPlan.analysisEndIndex, presentedLines],
  );
  const analysisPreparedLines = useMemo(
    () => preparedLines.slice(0, playbackPlan.analysisEndIndex),
    [playbackPlan.analysisEndIndex, preparedLines],
  );
  const messageLines = useMemo(
    () => presentedLines.slice(playbackPlan.messageStartIndex),
    [playbackPlan.messageStartIndex, presentedLines],
  );
  const messagePreparedLines = useMemo(
    () => preparedLines.slice(playbackPlan.messageStartIndex),
    [playbackPlan.messageStartIndex, preparedLines],
  );
  const completedMessageLines = useMemo(() => messagePreparedLines.map((text, lineIndex) => (
    isRetrievalCommand(messageLines[lineIndex], text)
      ? appendTransmissionRetrievalDots(text)
      : text
  )), [messageLines, messagePreparedLines]);
  const accessibleTranscript = useMemo(
    () => presentedLines.map((line) => {
      if (line.corruption) {
        return `> Data corruption query: ${formatCorruptionPercentage(corruptionProfile.percentage)}`;
      }
      return line.gap ? "" : line.text;
    }).join("\n"),
    [corruptionProfile.percentage, presentedLines],
  );

  useEffect(() => {
    let cancelled = false;
    const pendingWaits = new Map<number, (completed: boolean) => void>();
    const finalMessageCursorIndex = messageLines.findLastIndex((line) => !line.gap);
    setRenderedLines([]);
    setActiveLineIndex(-1);
    setPhase("typing");
    setDisplayStage("analysis");
    setCogitationDots(0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || completedStreamKey === streamKey) {
      setRenderedLines(completedMessageLines);
      setActiveLineIndex(finalMessageCursorIndex);
      setPhase("complete");
      setDisplayStage("complete");
      return () => { cancelled = true; };
    }

    const wait = (milliseconds: number) => new Promise<boolean>((resolve) => {
      if (cancelled) {
        resolve(false);
        return;
      }
      const timer = window.setTimeout(() => {
        pendingWaits.delete(timer);
        resolve(!cancelled);
      }, milliseconds);
      pendingWaits.set(timer, resolve);
    });

    const replaceLine = (lineIndex: number, text: string) => {
      setRenderedLines((current) => current.map((value, index) => index === lineIndex ? text : value));
    };

    async function typeSegment(
      lineIndex: number,
      prefix: string,
      segment: string,
      delayForCharacter: (character: string) => number,
    ) {
      for (let characterIndex = 1; characterIndex <= segment.length; characterIndex += 1) {
        if (cancelled) return false;
        replaceLine(lineIndex, `${prefix}${segment.slice(0, characterIndex)}`);
        if (!(await wait(delayForCharacter(segment[characterIndex - 1])))) return false;
      }
      return true;
    }

    async function typePreparedLine(lineIndex: number, line: RelayStreamLine, text: string) {
      const metadata = line.section !== "content" && !isRetrievalCommand(line, text)
        ? splitTransmissionMetadata(text)
        : null;

      if (!metadata) {
        return typeSegment(lineIndex, "", text, transmissionCharacterDelay);
      }

      if (!(await typeSegment(
        lineIndex,
        "",
        metadata.label,
        () => TRANSMISSION_TIMING.metadataLabelMs,
      ))) return false;

      setPhase("pause");
      if (!(await wait(TRANSMISSION_TIMING.metadataValuePauseMs))) return false;
      setPhase("typing");

      if (line.corruption) {
        const steps = Math.max(8, Math.min(24, Math.ceil(corruptionProfile.percentage)));
        for (let step = 0; step <= steps; step += 1) {
          if (cancelled) return false;
          const currentPercentage = corruptionProfile.percentage * (step / steps);
          replaceLine(lineIndex, `${metadata.label} ${formatCorruptionPercentage(currentPercentage)}`);
          if (!(await wait(TRANSMISSION_TIMING.corruptionStepMs))) return false;
        }
        return true;
      }

      return typeSegment(lineIndex, metadata.label, metadata.value, transmissionCharacterDelay);
    }

    async function loadLineSequence(lines: RelayStreamLine[], prepared: string[]) {
      setRenderedLines([]);
      setActiveLineIndex(-1);
      setPhase("typing");

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (cancelled) return;
        const line = lines[lineIndex];
        const text = prepared[lineIndex];
        setRenderedLines((current) => [...current, ""]);
        setActiveLineIndex(lineIndex);
        setPhase("typing");

        if (line.gap) {
          replaceLine(lineIndex, text);
          if (!(await wait(TRANSMISSION_TIMING.lineBreakMs))) return;
          continue;
        }

        if (!(await typePreparedLine(lineIndex, line, text))) return;

        if (isRetrievalCommand(line, text)) {
          setPhase("retrieval");
          for (let dotCount = 1; dotCount <= TRANSMISSION_TIMING.retrievalDotCount; dotCount += 1) {
            if (!(await wait(TRANSMISSION_TIMING.retrievalDotMs))) return;
            replaceLine(lineIndex, appendTransmissionRetrievalDots(text, dotCount));
          }
        } else {
          setPhase("pause");
        }

        if (!(await wait(TRANSMISSION_TIMING.lineBreakMs))) return;
      }
      return !cancelled;
    }

    async function loadStream() {
      if (analysisLines.length) {
        setDisplayStage("analysis");
        if (!(await loadLineSequence(analysisLines, analysisPreparedLines))) return;

        setPhase("retrieval");
        setCogitationDots(0);
        for (let dotCount = 1; dotCount <= TRANSMISSION_TIMING.retrievalDotCount; dotCount += 1) {
          if (!(await wait(TRANSMISSION_TIMING.retrievalDotMs))) return;
          setCogitationDots(dotCount);
        }
      }

      setDisplayStage("cogitation");
      setRenderedLines([]);
      setActiveLineIndex(-1);
      setPhase("pause");
      if (!(await wait(TRANSMISSION_TIMING.cogitationCompleteMs))) return;

      setDisplayStage("message");
      if (!(await loadLineSequence(messageLines, messagePreparedLines))) return;

      setActiveLineIndex(finalMessageCursorIndex);
      setPhase("complete");
      setDisplayStage("complete");
    }

    void loadStream();
    return () => {
      cancelled = true;
      for (const [timer, resolve] of pendingWaits) {
        window.clearTimeout(timer);
        resolve(false);
      }
      pendingWaits.clear();
    };
  }, [completedStreamKey, streamKey]);

  const visibleLines = displayStage === "analysis" ? analysisLines : messageLines;

  return (
    <div className={`relay-data-stream ${className}`.trim()} role="document" aria-label={ariaLabel}>
      {displayStage !== "complete" && (
        <button
          className="relay-data-instant"
          onClick={() => setCompletedStreamKey(streamKey)}
          type="button"
        >
          COMPLETE EXLOAD
        </button>
      )}
      <span className="relay-data-accessible">{accessibleTranscript}</span>
      <span className="relay-data-accessible" aria-live="polite">
        {displayStage === "cogitation" ? "Cogitation complete. Unsealing transmission." : ""}
      </span>
      <div className="relay-data-visual" aria-hidden="true">
        {displayStage === "cogitation" ? (
          <div className="relay-cogitation-complete">
            <span>+++ COGITATION COMPLETE +++</span>
            <b>MACHINE-SPIRIT INDEX VERIFIED</b>
            <small>UNSEALING SANCTIONED VOX-MISSIVE</small>
          </div>
        ) : (
          <>
            {renderedLines.map((text, index) => {
              const line = visibleLines[index];
              return (
                <p
                  className={`${line.command ? "stream-command " : ""}${line.section === "content" ? "stream-content " : ""}${line.section === "analysis" ? "stream-analysis " : ""}${line.section === "terminal-footer" ? "stream-terminal-footer " : ""}${line.closing ? "stream-closing " : ""}${line.blessing ? "stream-blessing " : ""}${line.gap ? "stream-gap" : ""}`}
                  key={`${streamKey}-${displayStage}-typed-${index}`}
                >
                  {text}
                  {activeLineIndex === index && !line.gap && !(displayStage === "analysis" && phase === "retrieval") && (
                    <span className={`relay-data-cursor ${phase}`} />
                  )}
                </p>
              );
            })}
            {displayStage === "analysis" && phase === "retrieval" && (
              <p className="stream-command relay-cogitation-pending">
                {`>> COGITATING SECURED EXLOAD${".".repeat(cogitationDots)}`}
                <span className="relay-data-cursor retrieval" />
              </p>
            )}
          </>
        )}
      </div>
      {displayStage === "complete" && afterComplete && (
        <div className="relay-data-after-complete">{afterComplete}</div>
      )}
    </div>
  );
}
