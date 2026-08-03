"use client";

import { createContext, useContext, useState } from "react";
import { ArchiveTerminalFooter } from "./ArchiveTerminalFooter";

type AdminModeContextValue = {
  canAdmin: boolean;
  isAdminMode: boolean;
};

const AdminModeContext = createContext<AdminModeContextValue>({
  canAdmin: false,
  isAdminMode: false,
});

export function useAdminMode() {
  return useContext(AdminModeContext);
}

export function AdminModeProvider({
  canAdmin,
  displayName,
  signOutHref,
  viewerKind,
  children,
}: {
  canAdmin: boolean;
  displayName: string;
  signOutHref: string;
  viewerKind: "chatgpt" | "guest";
  children: React.ReactNode;
}) {
  const [isAdminMode, setIsAdminMode] = useState(false);

  function toggleMode() {
    if (!canAdmin) return;
    setIsAdminMode((active) => !active);
  }

  return (
    <AdminModeContext.Provider value={{ canAdmin, isAdminMode }}>
      <div className={isAdminMode ? "archive-mode admin-active" : "archive-mode view-active"}>
        {children}
      </div>
      <ArchiveTerminalFooter
        canAdmin={canAdmin}
        displayName={displayName}
        isAdminMode={isAdminMode}
        onToggleAdminMode={toggleMode}
        signOutHref={signOutHref}
        viewerKind={viewerKind}
      />
    </AdminModeContext.Provider>
  );
}
