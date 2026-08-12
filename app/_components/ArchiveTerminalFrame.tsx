import type { ReactNode } from "react";

type ArchiveTerminalFrameProps = {
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
 * Shared master-detail frame for full-workspace archive terminals.
 * Chronicle, Relay, and Personnel keep their own content while inheriting
 * identical viewport boundaries, header geometry, pane ratios, and overflow.
 */
export function ArchiveTerminalFrame({
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
      className={`archive-terminal-frame ${className}`.trim()}
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
