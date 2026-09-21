"use client";

import { useEffect } from "react";

/** Keep keyboard navigation in the open window and return to its launching control. */
export function useDialogFocus(selector: string | null) {
  useEffect(() => {
    if (!selector) return;
    const match = document.querySelector<HTMLElement>(selector);
    if (!match) return;
    const dialog = match;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousTabIndex = dialog.getAttribute("tabindex");
    document.body.style.overflow = "hidden";
    dialog.tabIndex = -1;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href],button,input,select,textarea,[tabindex]',
    )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
      !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
    const frame = requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) (dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? focusable()[0] ?? dialog).focus({ preventScroll: true });
    });
    function keepFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0] ?? dialog;
      const last = controls.at(-1) ?? dialog;
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog ||
          (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener("keydown", keepFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keepFocus);
      document.body.style.overflow = previousOverflow;
      if (previousTabIndex === null) dialog.removeAttribute("tabindex");
      else dialog.setAttribute("tabindex", previousTabIndex);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [selector]);
}
