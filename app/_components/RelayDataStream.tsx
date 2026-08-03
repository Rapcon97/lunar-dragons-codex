"use client";

import { useEffect, useMemo, useState } from "react";
import {
  corruptTransmissionText,
  formatCorruptionPercentage,
  transmissionCorruptionProfile,
  transmissionRetrievalPause,
  type TransmissionSourceMetadata,
} from "./relay-transmission";

export type RelayStreamLine = {
  text: string;
  command?: boolean;
  content?: boolean;
  corruption?: boolean;
  gap?: boolean;
};

type RelayDataStreamProps = {
  ariaLabel: string;
  className?: string;
  lines: RelayStreamLine[];
  source: TransmissionSourceMetadata;
  streamKey: string;
};

type RenderPhase = "typing" | "pause" | "complete";

export function RelayDataStream({ ariaLabel, className = "", lines, source, streamKey }: RelayDataStreamProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [phase, setPhase] = useState<RenderPhase>("typing");
  const corruptionProfile = useMemo(
    () => transmissionCorruptionProfile(source),
    [source.agency, source.id, source.preview, source.priority, source.received, source.subject],
  );
  const preparedLines = useMemo(() => lines.map((line, lineIndex) => {
    if (line.corruption) {
      return `> Data corruption query: ${formatCorruptionPercentage(corruptionProfile.percentage)}`;
    }
    if (line.content) {
      return corruptTransmissionText(line.text, corruptionProfile, lineIndex);
    }
    return line.gap ? "\u00a0" : line.text;
  }), [corruptionProfile, lines]);
  const accessibleTranscript = useMemo(
    () => lines.map((line) => {
      if (line.corruption) {
        return `> Data corruption query: ${formatCorruptionPercentage(corruptionProfile.percentage)}`;
      }
      return line.gap ? "" : line.text;
    }).join("\n"),
    [corruptionProfile.percentage, lines],
  );

  useEffect(() => {
    let cancelled = false;
    setRenderedLines([]);
    setActiveLineIndex(-1);
    setPhase("typing");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRenderedLines(preparedLines);
      setPhase("complete");
      return () => { cancelled = true; };
    }

    const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    async function loadStream() {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (cancelled) return;
        const line = lines[lineIndex];
        const text = preparedLines[lineIndex];
        setRenderedLines((current) => [...current, ""]);
        setActiveLineIndex(lineIndex);
        setPhase("typing");

        if (line.gap) {
          setRenderedLines((current) => current.map((value, index) => index === lineIndex ? text : value));
          await wait(65);
          continue;
        }

        const corruptionLabel = "> Data corruption query: ";
        const typedText = line.corruption ? corruptionLabel : text;
        for (let characterIndex = 1; characterIndex <= typedText.length; characterIndex += 1) {
          if (cancelled) return;
          setRenderedLines((current) => current.map((value, index) => index === lineIndex ? typedText.slice(0, characterIndex) : value));
          await wait(line.content ? 4 : 6);
        }

        if (line.corruption) {
          const steps = Math.max(8, Math.min(24, Math.ceil(corruptionProfile.percentage)));
          for (let step = 0; step <= steps; step += 1) {
            if (cancelled) return;
            const currentPercentage = corruptionProfile.percentage * (step / steps);
            setRenderedLines((current) => current.map((value, index) => (
              index === lineIndex ? `${corruptionLabel}${formatCorruptionPercentage(currentPercentage)}` : value
            )));
            await wait(28);
          }
        }

        setPhase("pause");
        await wait(line.command ? transmissionRetrievalPause(corruptionProfile.seed, lineIndex) : 55);
      }
      if (!cancelled) {
        setActiveLineIndex(-1);
        setPhase("complete");
      }
    }

    void loadStream();
    return () => { cancelled = true; };
  }, [streamKey]);

  return (
    <div className={`relay-data-stream ${className}`.trim()} role="document" aria-label={ariaLabel}>
      <span className="relay-data-accessible">{accessibleTranscript}</span>
      <div className="relay-data-visual" aria-hidden="true">
        {renderedLines.map((text, index) => {
          const line = lines[index];
          return (
            <p
              className={`${line.command ? "stream-command " : ""}${line.content ? "stream-content " : ""}${line.gap ? "stream-gap" : ""}`}
              key={`${streamKey}-typed-${index}`}
            >
              {text}
              {activeLineIndex === index && phase !== "complete" && !line.gap && (
                <span className={`relay-data-cursor ${phase}`} />
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
