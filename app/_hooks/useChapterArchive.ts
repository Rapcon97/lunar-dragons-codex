"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAdminMode } from "../_components/AdminMode";
import {
  type ArchiveSection,
  type ChapterArchiveData,
  createDefaultArchiveData,
  normalizeArchiveData,
} from "../archive-data";

const legacyKeys = [
  "chapter-archive",
  "chapter-identity",
  "chapter-relics",
  "chapter-companies",
  "chapter-badge-mode",
];

function readLegacyArchive() {
  const archive = createDefaultArchiveData();

  try {
    const saved = JSON.parse(localStorage.getItem("chapter-archive") || "{}");
    if (Array.isArray(saved.milestones)) archive.milestones = saved.milestones;
    if (Array.isArray(saved.entries)) archive.entries = saved.entries;
  } catch {}

  try {
    const identity = JSON.parse(localStorage.getItem("chapter-identity") || "null");
    if (identity) archive.identity = { ...archive.identity, ...identity };
  } catch {}

  try {
    const relics = JSON.parse(localStorage.getItem("chapter-relics") || "null");
    if (Array.isArray(relics)) archive.relics = relics;
  } catch {}

  try {
    const companies = JSON.parse(localStorage.getItem("chapter-companies") || "null");
    if (Array.isArray(companies)) archive.companies = companies;
  } catch {}

  const badgeMode = localStorage.getItem("chapter-badge-mode");
  if (badgeMode === "banner" || badgeMode === "badge") archive.badgeMode = badgeMode;

  return normalizeArchiveData(archive);
}

function useChapterArchiveState() {
  const { canAdmin } = useAdminMode();
  const [data, setData] = useState<ChapterArchiveData>(() => createDefaultArchiveData());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/archive", { cache: "no-store" });
      const result = (await response.json()) as {
        data?: ChapterArchiveData;
        persisted?: boolean;
        error?: string;
      };
      if (!response.ok || !result.data) throw new Error(result.error || "Archive unavailable.");

      if (!result.persisted && canAdmin) {
        const migrated = readLegacyArchive();
        const migrationResponse = await fetch("/api/archive", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: migrated }),
        });
        const migrationResult = (await migrationResponse.json()) as {
          data?: ChapterArchiveData;
          error?: string;
        };
        if (!migrationResponse.ok || !migrationResult.data) {
          throw new Error(migrationResult.error || "Archive migration failed.");
        }
        setData(normalizeArchiveData(migrationResult.data));
        legacyKeys.forEach((key) => localStorage.removeItem(key));
      } else {
        setData(normalizeArchiveData(result.data));
      }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Archive unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [canAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial archive hydration synchronizes this hook with the remote archive.
    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  function updateSection<K extends ArchiveSection>(section: K, value: ChapterArchiveData[K]) {
    setData((current) => normalizeArchiveData({ ...current, [section]: value }));
  }

  async function saveSection<K extends ArchiveSection>(section: K, value: ChapterArchiveData[K]) {
    const previous = data;
    updateSection(section, value);
    setIsSaving(true);
    try {
      const response = await fetch("/api/archive", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section, value }),
      });
      const result = (await response.json()) as { data?: ChapterArchiveData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Save failed.");
      setData(normalizeArchiveData(result.data));
      setError("");
      return true;
    } catch (reason) {
      setData(previous);
      setError(reason instanceof Error ? reason.message : "Save failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function resetArchive() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/archive", { method: "DELETE" });
      const result = (await response.json()) as { data?: ChapterArchiveData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Reset failed.");
      setData(normalizeArchiveData(result.data));
      setError("");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reset failed.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { data, error, isLoading, isSaving, load, resetArchive, saveSection, updateSection };
}

type ChapterArchiveContextValue = ReturnType<typeof useChapterArchiveState>;

const ChapterArchiveContext = createContext<ChapterArchiveContextValue | null>(null);

export function ChapterArchiveProvider({ children }: { children: ReactNode }) {
  const archive = useChapterArchiveState();
  return createElement(ChapterArchiveContext.Provider, { value: archive }, children);
}

export function useChapterArchive() {
  const archive = useContext(ChapterArchiveContext);
  if (!archive) throw new Error("useChapterArchive must be used within ChapterArchiveProvider.");
  return archive;
}
