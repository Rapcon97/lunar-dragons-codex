"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAdminMode } from "./AdminMode";

type SidebarGlyphName =
  | "command"
  | "chapter"
  | "lunaris"
  | "armoury"
  | "companies"
  | "characters"
  | "intel"
  | "relay"
  | "chronicles"
  | "development"
  | "settings";

type SidebarNavigationProps = {
  activeHref: string;
};

type SidebarItem = {
  href: string;
  icon: SidebarGlyphName;
  label: string;
};

const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { href: "/", icon: "command", label: "Command" },
  { href: "/chapter", icon: "chapter", label: "Chapter" },
  { href: "/flagship", icon: "lunaris", label: "Lunaris" },
  { href: "/armoury", icon: "armoury", label: "Armoury" },
  { href: "/companies", icon: "companies", label: "Companies" },
  { href: "/characters", icon: "characters", label: "Characters" },
  { href: "/intel", icon: "intel", label: "Sector Intel" },
  { href: "/relay", icon: "relay", label: "Relay" },
  { href: "/chronicles", icon: "chronicles", label: "Chronicles" },
  { href: "/development", icon: "development", label: "Development" },
  { href: "/settings", icon: "settings", label: "Settings" },
] as const;

const SIDEBAR_GLYPHS: Record<SidebarGlyphName, ReactNode> = {
  command: (
    <>
      <path d="M9 9h6v6H9z" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <path d="M6 3H3v3M18 3h3v3M3 18v3h3M21 18v3h-3" />
    </>
  ),
  chapter: (
    <>
      <path d="M12 2.75 19 5v6.25c0 4.3-2.45 7.55-7 10-4.55-2.45-7-5.7-7-10V5z" />
      <path d="M10 6.5h4V10h3.5v4H14v3.5h-4V14H6.5v-4H10z" />
    </>
  ),
  lunaris: (
    <>
      <path d="M8.5 3.5A9 9 0 1 0 18 18a7 7 0 1 1-9.5-14.5Z" />
      <path d="m11 12 7-5 3 5-3 5zM14 10v4M18 9v6" />
    </>
  ),
  armoury: (
    <>
      <path d="m5 3 4 4-1.5 1.5L3.5 6zM9 9l9.5 9.5M19 21l2-2-2.5-2.5-2 2z" />
      <path d="m19 3-4 4 1.5 1.5 4-2.5zM15 9 5.5 18.5M5 21l-2-2 2.5-2.5 2 2z" />
    </>
  ),
  companies: (
    <>
      <path d="M3 5h5v5H3zM9.5 5h5v5h-5zM16 5h5v5h-5z" />
      <path d="M5.5 10v8M12 10v8M18.5 10v8M3.5 18h17M7.5 21h9" />
    </>
  ),
  characters: (
    <>
      <path d="M12 3.25 17 5v4.5c0 3.3-1.75 5.75-5 7.5-3.25-1.75-5-4.2-5-7.5V5z" />
      <circle cx="12" cy="8.25" r="1.75" />
      <path d="M8.75 14.5c.8-1.55 1.9-2.25 3.25-2.25s2.45.7 3.25 2.25M6 20h12M9 17.5V20M15 17.5V20" />
    </>
  ),
  intel: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="m12 8 .9 2.4 2.6.1-2 1.6.7 2.5-2.2-1.4-2.2 1.4.7-2.5-2-1.6 2.6-.1z" />
    </>
  ),
  relay: (
    <>
      <path d="m13.5 2-7 11h5l-1 9 7-12h-5z" />
      <path d="M4.5 7.5 2 10l2.5 2.5M19.5 7.5 22 10l-2.5 2.5" />
    </>
  ),
  chronicles: (
    <>
      <path d="M5 3h13l1 2v16H5zM8 3v18" />
      <path d="M11 8h5M11 12h5M11 16h5M3 6h2M3 18h2" />
    </>
  ),
  development: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h5M8 16h3" />
      <path d="m15 15 1.5 1.5L20 13" />
    </>
  ),
  settings: (
    <>
      <path d="m9.5 3 .6-1h3.8l.6 1 .5 2 2-.8 1.1.2 1.9 3.3-.6.9-1.6 1.3 1.6 1.3.6.9-1.9 3.3-1.1.2-2-.8-.5 2-.6 1h-3.8l-.6-1-.5-2-2 .8-1.1-.2-1.9-3.3.6-.9 1.6-1.3-1.6-1.3-.6-.9 1.9-3.3 1.1-.2 2 .8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

function SidebarGlyph({ name }: { name: SidebarGlyphName }) {
  return (
    <span className="nav-icon-plate" aria-hidden="true">
      <svg
        className="nav-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        focusable="false"
      >
        {SIDEBAR_GLYPHS[name]}
      </svg>
    </span>
  );
}

function SidebarNavigationItem({ activeHref, item }: { activeHref: string; item: SidebarItem }) {
  const active = activeHref === item.href;

  return (
    <Link
      className={`nav-item${active ? " active" : ""}${item.icon === "settings" ? " settings" : ""}`}
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
    >
      <SidebarGlyph name={item.icon} />
      <small>{item.label}</small>
    </Link>
  );
}

export function SidebarNavigation({ activeHref }: SidebarNavigationProps) {
  const { canAdmin, isAdminMode } = useAdminMode();
  const primaryItems = SIDEBAR_ITEMS
    .slice(0, -1)
    .filter((item) => item.icon !== "development" || (canAdmin && isAdminMode));
  const settingsItem = SIDEBAR_ITEMS[SIDEBAR_ITEMS.length - 1];

  return (
    <aside className="sidebar">
      <Link href="/" className="brand-mark" aria-label="Lunar Dragons chapter icon" title="Lunar Dragons" />
      <nav aria-label="Primary navigation">
        {primaryItems.map((item) => (
          <SidebarNavigationItem activeHref={activeHref} item={item} key={item.href} />
        ))}
      </nav>
      <SidebarNavigationItem activeHref={activeHref} item={settingsItem} />
    </aside>
  );
}
