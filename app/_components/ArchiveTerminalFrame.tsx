import type { ReactNode } from "react";

type ArchiveTerminalFrameProps = {
  surface: "chronicle" | "relay" | "character";
  ariaLabel?: string;
  labelledBy?: string;
  className?: string;
  bodyClassName?: string;
  header: ReactNode;
  bands?: ReactNode;
  index: ReactNode;
  detail: ReactNode;
  after?: ReactNode;
};

/**
 * Shared viewport and overflow frame for full-workspace archive surfaces.
 * Each surface owns its layout ratio, typography, density, and visual voice.
 */
export function ArchiveTerminalFrame({
  surface,
  ariaLabel,
  labelledBy,
  className = "",
  bodyClassName = "",
  header,
  bands,
  index,
  detail,
  after,
}: ArchiveTerminalFrameProps) {
  return (
    <section
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      className={`archive-terminal-frame archive-terminal-frame--${surface} ${className}`.trim()}
    >
      {header}
      {bands}
      <div className={`archive-terminal-split ${bodyClassName}`.trim()}>
        {index}
        {detail}
      </div>
      {after}
    </section>
  );
}
