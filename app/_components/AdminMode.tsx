"use client";

import { createContext, useContext, useState } from "react";

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
  children,
}: {
  canAdmin: boolean;
  displayName: string;
  signOutHref: string;
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
      <aside className={isAdminMode ? "admin-mode-dock active" : "admin-mode-dock"} aria-label="Archive mode controls">
        <div>
          <span>{isAdminMode ? "ADMIN MODE" : "VIEW ONLY"}</span>
          <small>{displayName}</small>
        </div>
        {canAdmin && <button onClick={toggleMode}>{isAdminMode ? "EXIT ADMIN" : "ENTER ADMIN"}</button>}
        <a href={signOutHref}>SIGN OUT</a>
      </aside>
    </AdminModeContext.Provider>
  );
}
