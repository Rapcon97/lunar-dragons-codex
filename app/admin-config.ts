const ARCHIVE_ADMIN_EMAILS = new Set([
  "guido@dijkhuis.cloud",
  "google@dijkhuis.cloud",
]);

export function isArchiveAdmin(email: string) {
  let normalized = email.trim().toLowerCase();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {}
  normalized = normalized.replace(/^mailto:/, "").replace(/^[<"']+|[>"']+$/g, "");
  return ARCHIVE_ADMIN_EMAILS.has(normalized);
}
