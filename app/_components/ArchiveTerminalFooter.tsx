"use client";

import { ImperialChronometer } from "./ImperialChronometer";

export function ArchiveTerminalFooter({
  canAdmin,
  displayName,
  isAdminMode,
  onToggleAdminMode,
  signOutHref,
  viewerKind,
}: {
  canAdmin: boolean;
  displayName: string;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  signOutHref: string;
  viewerKind: "chatgpt" | "guest";
}) {
  const authenticationLabel =
    viewerKind === "guest" ? "GUEST CREDENTIAL" : "CHATGPT IDENTITY";
  const terminalMessage = isAdminMode
    ? "ADMINISTRATUM CHANNEL SECURE //"
    : "NOOSPHERIC LINK STABLE //";

  return (
    <footer
      className={
        isAdminMode
          ? "archive-terminal-footer admin-active"
          : "archive-terminal-footer"
      }
      aria-label="Archive terminal status"
    >
      <div className="archive-terminal-prompt" aria-hidden="true">
        <div>
          <span>adeptus@lunaris:</span>
          <b>/chapter-archive</b>
          <span>#</span>
          <strong>&gt;&gt; {terminalMessage}</strong>
        </div>
        <small>
          DATA-VAULT 1.830 <i /> LINK: SECURE <i /> COLL: 008
        </small>
      </div>

      <section className="archive-terminal-identity" aria-label="Viewer and access state">
        <span className="archive-terminal-auth">
          <i aria-hidden="true" /> {authenticationLabel} / VERIFIED
        </span>
        <div className="archive-terminal-readout">
          <span>
            <small>USER</small>
            <strong>{displayName}</strong>
          </span>
          <span>
            <small>ACCESS</small>
            <strong>{canAdmin ? "ADMINISTRATOR" : "VIEW ONLY"}</strong>
          </span>
          {canAdmin && (
            <span>
              <small>MODE</small>
              <strong>{isAdminMode ? "ADMIN MODE" : "VIEW ONLY"}</strong>
            </span>
          )}
        </div>
        <div className="archive-terminal-controls">
          {canAdmin && (
            <button type="button" onClick={onToggleAdminMode}>
              {isAdminMode ? "EXIT ADMIN" : "ENTER ADMIN"}
            </button>
          )}
          <a href={signOutHref}>SIGN OUT</a>
        </div>
      </section>

      <ImperialChronometer />
    </footer>
  );
}
