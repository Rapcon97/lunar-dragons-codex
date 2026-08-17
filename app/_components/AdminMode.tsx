"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { ArchiveTerminalFooter } from "./ArchiveTerminalFooter";

const ADMIN_MODE_SESSION_KEY = "lunar-dragons-admin-mode";
const ADMIN_MODE_CHANGE_EVENT = "lunar-dragons-admin-mode-change";
let adminModeFallback: boolean | null = null;

function readPersistedAdminMode() {
  try {
    const active = window.sessionStorage.getItem(ADMIN_MODE_SESSION_KEY) === "active";
    adminModeFallback = active;
    return active;
  } catch {
    return adminModeFallback ?? false;
  }
}

function persistAdminMode(active: boolean) {
  adminModeFallback = active;

  try {
    if (active) {
      window.sessionStorage.setItem(ADMIN_MODE_SESSION_KEY, "active");
    } else {
      window.sessionStorage.removeItem(ADMIN_MODE_SESSION_KEY);
    }
  } catch {
    // Admin Mode still works when browser storage is unavailable; only refresh persistence is skipped.
  }

  window.dispatchEvent(new Event(ADMIN_MODE_CHANGE_EVENT));
}

function subscribeToAdminMode(onStoreChange: () => void) {
  window.addEventListener(ADMIN_MODE_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(ADMIN_MODE_CHANGE_EVENT, onStoreChange);
}

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
  const persistedAdminMode = useSyncExternalStore(
    subscribeToAdminMode,
    readPersistedAdminMode,
    () => false,
  );
  const isAdminMode = canAdmin && persistedAdminMode;

  useEffect(() => {
    if (!canAdmin) {
      persistAdminMode(false);
    }
  }, [canAdmin]);

  function toggleMode() {
    if (!canAdmin) return;
    persistAdminMode(!isAdminMode);
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
