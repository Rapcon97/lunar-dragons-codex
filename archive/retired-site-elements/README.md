# Retired Site Elements

This directory is the Lunar Dragons interface archive vault. It keeps replaced or unused presentation material available for future reference without leaving it in `app/` or `public/`, where it can be scanned, bundled, served, or mistaken for active functionality.

Nothing under this directory is part of the live Site runtime. Restoring an item requires a deliberate review, moving it back into an active source directory, and running the normal application and GPT regression suites.

## Inventory

| Archived item | Former role | Reason retired |
| --- | --- | --- |
| `components/ImperialVoxTicker.tsx.retired` | Animated Vox Moralis ticker and servo-skull display | The Site now uses the Vox-Missive/Astropathic Relay presentation; this component had no imports or mounted view. |
| `assets/decree-of-reclamation-and-vigilance-v2.png` | Earlier Decree facsimile | Superseded by the v3 facsimile and current PDF. |
| `assets/lunar-dragons-favicon.png` | Earlier large favicon candidate | No metadata or page referenced it; the authenticated sigil is the active icon source. |
| `assets/lunar-dragons-mark-static.png` | Earlier static Chapter mark | Replaced by the active depth sigil/mark assets. |
| `assets/og.png` | Generic social preview | Replaced by `public/og-lunar-dragons.png`. |
| `assets/favicon.svg` | Starter favicon | Replaced by the Lunar Dragons icon metadata. |
| `assets/file.svg`, `assets/globe.svg`, `assets/window.svg` | Generic starter illustrations | Never referenced by the Lunar Dragons interface. |
| `starter-examples/d1/` | Generic D1 notes example | Starter reference code; not connected to the Chapter archive or production bindings. |

## Retired stylesheet surfaces

The matching unreachable CSS was removed from `app/globals.css` rather than copied into the build:

- Vox Moralis ticker, traffic crawl, and servo-skull rules;
- the superseded pre-redesign Command hero, crest, banner-upload, milestone, and War Doctrine rules;
- their obsolete responsive and reduced-motion overrides.

The exact pre-retirement stylesheet remains available in Git at parent commit `7abf7fe460d7f591a6e68e0de0c45627a8740748`.

## Deliberately preserved compatibility surfaces

These were not removed:

- `/api/chapter-badge`, the stored R2 object, `badgeMode`, and its database field;
- Vox quote data and the Settings quote manager;
- legacy `/api/gpt/*` routes;
- structured-lore compatibility fields and migrations.

They are shared storage or compatibility surfaces, so retiring them would require a separate reviewed data/API change rather than a presentation cleanup.
