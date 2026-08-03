"use client";

import { useEffect, useState } from "react";

export type RelayStreamLine = {
  text: string;
  command?: boolean;
  content?: boolean;
  gap?: boolean;
};

type RelayDataStreamProps = {
  ariaLabel: string;
  className?: string;
  lines: RelayStreamLine[];
  streamKey: string;
};

export function RelayDataStream({ ariaLabel, className = "", lines, streamKey }: RelayDataStreamProps) {
  const [renderedLines, setRenderedLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRenderedLines([]);
    setIsComplete(false);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRenderedLines(lines.map((line) => line.gap ? "\u00a0" : line.text));
      setIsComplete(true);
      return () => { cancelled = true; };
    }

    const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    async function loadStream() {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (cancelled) return;
        const line = lines[lineIndex];
        const text = line.gap ? "\u00a0" : line.text;
        setRenderedLines((current) => [...current, ""]);

        if (line.gap) {
          setRenderedLines((current) => current.map((value, index) => index === lineIndex ? text : value));
          await wait(85);
          continue;
        }

        for (let characterIndex = 1; characterIndex <= text.length; characterIndex += 1) {
          if (cancelled) return;
          setRenderedLines((current) => current.map((value, index) => index === lineIndex ? text.slice(0, characterIndex) : value));
          await wait(line.command ? 8 : 10);
        }
        await wait(line.command ? 115 : 65);
      }
      if (!cancelled) setIsComplete(true);
    }

    void loadStream();
    return () => { cancelled = true; };
  }, [streamKey]);

  return (
    <div className={`relay-data-stream ${className}`.trim()} role="document" aria-label={ariaLabel}>
      {renderedLines.map((text, index) => {
        const line = lines[index];
        return (
          <p
            className={`${line.command ? "stream-command " : ""}${line.content ? "stream-content " : ""}${line.gap ? "stream-gap" : ""}`}
            key={`${streamKey}-typed-${index}`}
          >{text}</p>
        );
      })}
      <span className={isComplete ? "relay-data-cursor complete" : "relay-data-cursor loading"} aria-hidden="true">&gt; _</span>
    </div>
  );
}
