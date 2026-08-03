"use client";

import { useEffect, useMemo, useState } from "react";
import {
  appendTransmissionRetrievalDots,
  corruptTransmissionMetadataValue,
  corruptTransmissionText,
  formatCorruptionPercentage,
  splitTransmissionMetadata,
  TERMINAL_MACHINE_BLESSING,
  TRANSMISSION_TIMING,
  transmissionCharacterDelay,
  transmissionClosing,
  transmissionCorruptionProfile,
  transmissionMetadataValueCanCorrupt,
  type TransmissionSourceMetadata,
} from "./relay-transmission";

export type RelayStreamLine = {
  text: string;
  command?: boolean;
  content?: boolean;
  corruption?: boolean;
  gap?: boolean;
  closing?: boolean;
  blessing?: boolean;
};

type RelayDataStreamProps = {
  ariaLabel: string;
  className?: string;
  lines: RelayStreamLine[];
  source: TransmissionSourceMetadata;
  streamKey: string;
};

type RenderPhase = "typing" | "pause" | "retrieval" | "complete";

function isRetrievalCommand(line: RelayStreamLine, text: string) {
  return line.command || text.trimStart().startsWith(">>");
}

function withTransmissionPresentation(
  lines: RelayStreamLine[],
  source: TransmissionSourceMetadata,
) {
  const presented = lines.map((line) => ({ ...line }));
  const senderContent = presented.filter((line) => line.content).map((line) => line.text).join("\n");
  const closing = transmissionClosing(source, senderContent);
  const lastContentIndex = presented.findLastIndex((line) => line.content);

  if (closing && lastContentIndex >= 0) {
    presented.splice(lastContentIndex + 1, 0, {
      text: `> ${closing}`,
      content: true,
      closing: true,
    });
  }

  if (!presented.some((line) => line.text === TERMINAL_MACHINE_BLESSING)) {
    if (!presented.at(-1)?.gap) presented.push({ text: "", gap: true });
    presented.push({ text: TERMINAL_MACHINE_BLESSING, blessing: true });
  }

  return presented;
}

export function RelayDataStream({ ariaLabel, className = "", lines, source, streamKey }: RelayDataStreamProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [phase, setPhase] = useState<RenderPhase>("typing");
  const corruptionProfile = useMemo(
    () => transmissionCorruptionProfile(source),
    [source.agency, source.id, source.preview, source.priority, source.received, source.subject],
  );
  const presentedLines = useMemo(
    () => withTransmissionPresentation(lines, source),
    [lines, source],
  );
  const preparedLines = useMemo(() => presentedLines.map((line, lineIndex) => {
    if (line.corruption) {
      return `> Data corruption query: ${formatCorruptionPercentage(corruptionProfile.percentage)}`;
    }
    if (line.gap) return "\u00a0";
    if (line.closing || line.blessing) return line.text;
    const metadata = !line.content ? splitTransmissionMetadata(line.text) : null;
    if (metadata) {
      return transmissionMetadataValueCanCorrupt(metadata.label)
        ? corruptTransmissionMetadataValue(line.text, corruptionProfile, lineIndex)
        : line.text;
    }
    if (line.content) {
      return corruptTransmissionText(line.text, corruptionProfile, lineIndex);
    }
    return line.text;
  }), [corruptionProfile, presentedLines]);
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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
      const metadata = !line.content && !isRetrievalCommand(line, text)
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
  }, [streamKey]);

  return (
    <div className={`relay-data-stream ${className}`.trim()} role="document" aria-label={ariaLabel}>
      <span className="relay-data-accessible">{accessibleTranscript}</span>
      <div className="relay-data-visual" aria-hidden="true">
        {renderedLines.map((text, index) => {
          const line = presentedLines[index];
          return (
            <p
              className={`${line.command ? "stream-command " : ""}${line.content ? "stream-content " : ""}${line.closing ? "stream-closing " : ""}${line.blessing ? "stream-blessing " : ""}${line.gap ? "stream-gap" : ""}`}
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
    </div>
  );
}
