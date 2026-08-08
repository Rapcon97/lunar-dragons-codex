"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  appendTransmissionRetrievalDots,
  formatTransmissionTranscript,
  formatCorruptionPercentage,
  prepareTransmissionLine,
  splitTransmissionMetadata,
  TRANSMISSION_TIMING,
  transmissionCharacterDelay,
  type TransmissionSourceMetadata,
  type TransmissionTranscriptLine,
} from "./relay-transmission";
import { buildAstropathicRecordPresentation } from "./astropathic-record";
import { TransmissionSignalAuspex } from "./TransmissionSignalAuspex";

export type RelayStreamLine = TransmissionTranscriptLine;

type RelayDataStreamProps = {
  afterComplete?: ReactNode;
  ariaLabel: string;
  className?: string;
  source: TransmissionSourceMetadata;
  streamKey: string;
};

type RenderPhase = "typing" | "pause" | "retrieval" | "complete";

function isRetrievalCommand(line: TransmissionTranscriptLine, text: string) {
  return line.command || text.trimStart().startsWith(">>");
}

export function RelayDataStream({ afterComplete, ariaLabel, className = "", source, streamKey }: RelayDataStreamProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [phase, setPhase] = useState<RenderPhase>("typing");
  const [completedStreamKey, setCompletedStreamKey] = useState<string | null>(null);
  const [showRawImpression, setShowRawImpression] = useState(false);
  const transcript = useMemo(
    () => formatTransmissionTranscript(source),
    [source.agency, source.body, source.event, source.id, source.preview, source.priority, source.received, source.receivedAt, source.subject, source.transmission],
  );
  const { analysis, lines: presentedLines } = transcript;
  const astropathicRecord = useMemo(
    () => buildAstropathicRecordPresentation(source, analysis),
    [analysis, source],
  );
  const corruptionProfile = analysis.corruption;
  const preparedLines = useMemo(
    () => presentedLines.map((line, lineIndex) => prepareTransmissionLine(line, corruptionProfile, lineIndex)),
    [corruptionProfile, presentedLines],
  );
  const completedLines = useMemo(() => preparedLines.map((text, lineIndex) => (
    isRetrievalCommand(presentedLines[lineIndex], text)
      ? appendTransmissionRetrievalDots(text)
      : text
  )), [preparedLines, presentedLines]);
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
    const finalCursorIndex = presentedLines.findLastIndex((line) => !line.gap);
    setRenderedLines([]);
    setActiveLineIndex(-1);
    setPhase("typing");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || completedStreamKey === streamKey) {
      setRenderedLines(completedLines);
      setActiveLineIndex(finalCursorIndex);
      setPhase("complete");
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

    async function loadStream() {
      for (let lineIndex = 0; lineIndex < presentedLines.length; lineIndex += 1) {
        if (cancelled) return;
        const line = presentedLines[lineIndex];
        const text = preparedLines[lineIndex];
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
      if (!cancelled) {
        setActiveLineIndex(finalCursorIndex);
        setPhase("complete");
      }
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

  useEffect(() => {
    setShowRawImpression(false);
  }, [streamKey]);

  return (
    <div className={`relay-data-stream ${className}`.trim()} role="document" aria-label={ariaLabel}>
      {phase !== "complete" && (
        <button
          className="relay-data-instant"
          onClick={() => setCompletedStreamKey(streamKey)}
          type="button"
        >
          COMPLETE EXLOAD
        </button>
      )}
      <span className="relay-data-accessible">{accessibleTranscript}</span>
      <TransmissionSignalAuspex analysis={analysis} event={source.event} record={astropathicRecord} />
      <div className="relay-data-visual" aria-hidden="true">
        {renderedLines.slice(0, presentedLines.length).map((text, index) => {
          const line = presentedLines[index];
          if (!line) return null;
          return (
            <p
              className={`${line.command ? "stream-command " : ""}${line.section === "content" ? "stream-content " : ""}${line.section === "analysis" ? "stream-analysis " : ""}${line.section === "terminal-footer" ? "stream-terminal-footer " : ""}${line.closing ? "stream-closing " : ""}${line.blessing ? "stream-blessing " : ""}${line.gap ? "stream-gap" : ""}`}
              key={`${streamKey}-typed-${index}`}
            >
              {text}
              {activeLineIndex === index && !line.gap && (
                <span className={`relay-data-cursor ${phase}`} />
              )}
            </p>
          );
        })}
      </div>
      {phase === "complete" && (
        <section className="astropathic-layer-control" aria-label="Astropathic interpretation layers">
          <div>
            <span>SANCTIONED INTERPRETATION // ACTIVE ARCHIVE LAYER</span>
            <small>Choir impressions have been rendered into command-readable language.</small>
          </div>
          <button
            aria-controls={`${streamKey}-raw-impression`}
            aria-expanded={showRawImpression}
            onClick={() => setShowRawImpression((current) => !current)}
            type="button"
          >
            {showRawImpression ? "SEAL RAW IMPRESSION" : "REVEAL RAW IMPRESSION"}
          </button>
          {showRawImpression && (
            <div className="astropathic-raw-impression" id={`${streamKey}-raw-impression`} role="region" aria-label="Raw astropathic impression">
              <header>
                <span>UNSANCTIONED EMPYRIC IMPRESSION</span>
                <b>NOT A LITERAL TRANSCRIPT</b>
              </header>
              <p>
                The receiving choir retained the following pre-verbal residues before sanctioned interpretation.
                Images and sensations are symbolic, incomplete and subject to the receiver&apos;s own mind.
              </p>
              <dl>
                {astropathicRecord.rawImpression.map((fragment, index) => (
                  <div key={`${fragment.kind}-${index}`}>
                    <dt>{fragment.kind}</dt>
                    <dd>{fragment.text}</dd>
                  </div>
                ))}
              </dl>
              <footer>{astropathicRecord.choirStatus}</footer>
            </div>
          )}
        </section>
      )}
      {phase === "complete" && afterComplete && (
        <div className="relay-data-after-complete">{afterComplete}</div>
      )}
    </div>
  );
}
