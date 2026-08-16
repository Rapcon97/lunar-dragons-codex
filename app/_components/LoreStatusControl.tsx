"use client";

import { useEffect, useState } from "react";
import type { LoreEntry, LoreStatus } from "../archive-data";

const statuses: Array<{ value: LoreStatus; label: string }> = [
  { value: "draft", label: "DRAFT" },
  { value: "review", label: "REVIEW" },
  { value: "canon", label: "CANON" },
  { value: "retconned", label: "RETCONNED" },
];

function confirmationText(entry: LoreEntry, targetStatus: LoreStatus) {
  const title = entry.title || "Untitled archival record";
  if (targetStatus === "canon") {
    return `Set "${title}" to Canon?\n\nThis record will become visible in the public Chronicles.`;
  }
  if (entry.status === "canon") {
    return `Set "${title}" to ${targetStatus}?\n\nThis record will be removed from the public Chronicles.`;
  }
  return `Change "${title}" from ${entry.status} to ${targetStatus}?`;
}

export function LoreStatusControl({
  entry,
  onChanged,
}: {
  entry: LoreEntry;
  onChanged: (entry: LoreEntry) => Promise<void>;
}) {
  const [targetStatus, setTargetStatus] = useState<LoreStatus>(entry.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Server-confirmed entry updates reset the pending status control. */
    setTargetStatus(entry.status);
    setMessage("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [entry.id, entry.status, entry.updatedAt]);

  async function applyStatus() {
    if (targetStatus === entry.status || isUpdating) return;
    if (!window.confirm(confirmationText(entry, targetStatus))) return;

    setIsUpdating(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/lore/${encodeURIComponent(entry.id)}/status`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-lunar-admin-mode": "active",
          },
          body: JSON.stringify({
            targetStatus,
            expectedUpdatedAt: entry.updatedAt,
          }),
        },
      );
      const result = await response.json() as { entry?: LoreEntry; error?: string };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "The lore status could not be changed.");
      }
      await onChanged(result.entry);
      setMessage(`STATUS SEALED // ${result.entry.status.toUpperCase()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The lore status could not be changed.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="lore-status-control" data-current-status={entry.status}>
      <div>
        <span>MANUAL DEVELOPMENT STATUS</span>
        <strong>Move this record to any archive category.</strong>
      </div>
      <label>
        <span>DESTINATION</span>
        <select
          aria-label={`Status for ${entry.title || "untitled lore record"}`}
          disabled={isUpdating}
          value={targetStatus}
          onChange={(event) => setTargetStatus(event.target.value as LoreStatus)}
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={isUpdating || targetStatus === entry.status}
        onClick={() => void applyStatus()}
      >
        {isUpdating ? "UPDATING STATUS..." : "APPLY STATUS"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
