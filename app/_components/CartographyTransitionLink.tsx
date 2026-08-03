"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type CartographyTransitionLinkProps = ComponentProps<typeof Link>;

export function CartographyTransitionLink({
  href,
  onClick,
  ...props
}: CartographyTransitionLinkProps) {
  const router = useRouter();

  function descend(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    const destination = typeof href === "string" ? href : href.pathname ?? "/";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    if (reducedMotion) {
      router.push(destination);
      return;
    }

    if (root.classList.contains("cartography-transitioning")) return;
    const duration = Math.round(3000 + Math.random() * 2000);
    const overlay = document.querySelector<HTMLElement>(".cartography-transition-overlay");
    const eta = overlay?.querySelector<HTMLElement>("[data-cartography-eta]");
    const archiveKey = overlay?.querySelector<HTMLElement>("[data-cartography-key]");

    root.style.setProperty("--cartography-duration", `${duration}ms`);
    root.style.setProperty("--cartography-progress-duration", `${duration - 450}ms`);
    if (eta) eta.textContent = `LINK WINDOW: ${(duration / 1000).toFixed(2)}S`;
    if (archiveKey) {
      archiveKey.textContent = Math.random().toString(16).slice(2, 10).toUpperCase();
    }

    // Force a fresh animation timeline even after client-side route changes.
    root.classList.remove("cartography-transitioning");
    void overlay?.offsetWidth;
    root.classList.add("cartography-transitioning");
    window.setTimeout(() => router.push(destination), Math.max(1800, duration * .57));
    window.setTimeout(() => root.classList.remove("cartography-transitioning"), duration + 80);
  }

  return <Link href={href} onClick={descend} {...props} />;
}
