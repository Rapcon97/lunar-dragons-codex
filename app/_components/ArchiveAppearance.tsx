"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "lunar-dragons-appearance";
const CHANGE = "lunar-dragons-appearance-change";
let fallback = false;
let storageBlocked = false;

function readModern() {
  if (storageBlocked) return fallback;
  try {
    fallback = window.localStorage.getItem(KEY) === "modern";
  } catch { storageBlocked = true; }
  return fallback;
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", notify);
  };
}

export function useArchiveAppearance(canAdmin: boolean) {
  const preference = useSyncExternalStore(subscribe, readModern, () => false);
  const modern = canAdmin && preference;

  useEffect(() => {
    document.documentElement.dataset.archiveAppearance = modern ? "modern" : "classic";
    return () => { delete document.documentElement.dataset.archiveAppearance; };
  }, [modern]);

  function toggleAppearance() {
    if (!canAdmin) return;
    fallback = !modern;
    try {
      window.localStorage.setItem(KEY, fallback ? "modern" : "classic");
    } catch { storageBlocked = true; }
    window.dispatchEvent(new Event(CHANGE));
  }

  return { modern, toggleAppearance };
}
