/** Bring the selected record into view in the gallery-based appearance. */
export function revealGlassRecord(selector: string) {
  if (document.documentElement.dataset.archiveAppearance !== "modern") return;
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: "auto" });
    target.focus({ preventScroll: true });
  });
}
