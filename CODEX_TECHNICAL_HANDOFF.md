# Lunar Dragons Codex - Technical Handoff

This document records the completed production cutover and the operating contract for the Lunar Dragons Codex website and its GPT integration. It supersedes pre-cutover notes that described the versioned API as future work.

## 1. Current production baseline

| Item | Production state |
| --- | --- |
| Site | [https://lunardragons.cloud](https://lunardragons.cloud) |
| Active Site release | `159` |
| Active environment revision | `5` |
| GitHub source commit | `113796967d3db80c93655abbd0ee87f5005ea434` |
| Site provenance commit | `1ee2ca5453a25bb74ec09640ec3ae1564a37f664` |
| Authoritative database | Site-managed Cloudflare D1, logical binding `DB` |
| Asset storage | Site-managed R2, logical binding `CHAPTER_ASSETS` |
| GPT API | Live and Bearer-authenticated at `/api/gpt/v1/*` |
| Lore status counts | Mutable production data; query the archive at runtime |
| Application tests | 81/81 passing |
| Rendered-interface tests | 20/20 passing |
| GPT regression suite | 53/53 passing |
| Historical cutover tag | `release-101-gpt-integration` |

Release 159 is the current deployed production baseline. Environment revision 5 contains the active production runtime configuration. The Site-managed D1 database is the single authoritative store for the website, Chronicle administration tools, and production GPT API. Release 101 remains the historical GPT cutover and recovery reference, not the current release.

## 2. Production architecture

```text
Browser and signed-in users
          |
          v
https://lunardragons.cloud
          |
          +--> Site application and authentication
          +--> /api/gpt/v1/* (Bearer GPT_API_KEY)
          |
          +--> DB              -> Site-managed D1 (authoritative records)
          +--> CHAPTER_ASSETS  -> Site-managed R2 (uploaded assets/documents)
```

The website and GPT API execute in the same Site deployment and use the same logical `DB` binding. The production GPT integration does not use the staging Worker database or asset bucket.

### Hosting metadata

`.openai/hosting.json` must continue to contain the existing Site project ID and the logical bindings:

- D1: `DB`
- R2: `CHAPTER_ASSETS`

Do not place physical production or staging D1/R2 identifiers in application code or deployment artifacts. Sites resolves the logical bindings to the correct managed resources.

## 3. Production data and migration state

The additive structured-lore migration is part of release 101 and has already been applied to the production Site-managed D1 database:

```sql
ALTER TABLE `chapter_archive`
ADD `lore_entries` text DEFAULT '[]' NOT NULL;
```

The deployed schema stores structured lore in `chapter_archive.lore_entries`. The application maintains the legacy Chronicle representation in `archive.entries` as a compatibility mirror for established canon.

### Historical cutover snapshot and live lore state

At the release-101 cutover, production contained eight structured lore entries: seven `canon` records migrated from the established Chronicle and one `review` record (`9f1a28fc-44a3-4a4f-960d-da4a8fd91bbc`, *Provenance and Antiquity of the Lunaris*). Those figures describe the historical cutover only.

The Chronicle now supports direct administrative editing and explicit movement among `draft`, `review`, `canon`, and `retconned`. Counts therefore change as lore is developed. Never use this handoff as the authority for current record totals or statuses; query the D1-backed archive through an authorized runtime surface.

The seven original migrated Chronicle records remain the compatibility baseline. Changes to their content or status must be deliberate lore decisions, not incidental effects of a migration, UI redesign, or API adapter change.

## 4. Authentication and authorization

The application has three distinct access mechanisms. Keep them separate.

### Sign in with ChatGPT

The Site uses the hosting-provided ChatGPT identity headers for interactive sign-in. The configured administrator identity must remain authorized for Admin Mode. Do not replace this flow with a client-supplied identity or weaken the administrator allow-list.

### Guest accounts

Guest accounts are stored separately from chapter archive content. Guest sessions use `GUEST_SESSION_SECRET` and remain view-only. GPT routes must never expose guest credentials, password hashes, salts, passphrases, or guest-account administration.

### GPT API

All `/api/gpt/**` routes that expose Lunar Dragons data require:

```http
Authorization: Bearer <GPT_API_KEY>
```

Missing or invalid credentials return `401 Unauthorized`. `GPT_API_KEY` is a server-side production secret. It must never be logged, returned, committed, embedded in client JavaScript, or placed in documentation.

The production environment uses these secret names:

- `GUEST_SESSION_SECRET`
- `GPT_API_KEY`
- `OPENAI_API_KEY`

Only their names belong in source documentation.

`OPENAI_API_KEY` is separate from `GPT_API_KEY`. It is used only by the server-side Lore Cogitator to call the OpenAI Responses API. It must never be sent to browser code, accepted as a client-provided credential, or substituted for GPT API Bearer authentication.

## 5. Established GPT API contract

The versioned API is production functionality, not a future proposal.

### Versioned routes

- `GET /api/gpt/v1/lore`
  - Returns the GPT-facing archive view, including chapter, timeline, relics, sector, structured lore, and persistence metadata.
- `GET /api/gpt/v1/search?q=<query>`
  - Searches the archive and returns query, count, source, and categorized results.
- `GET /api/gpt/v1/entries`
  - Lists structured lore entries.
- `POST /api/gpt/v1/entries`
  - Creates one validated structured lore entry.
- `GET /api/gpt/v1/entries/:id`
  - Returns one structured lore entry by stable ID.
- `PATCH /api/gpt/v1/entries/:id`
  - Updates only the supplied fields of one existing entry.

There are no GPT-facing `DELETE`, reset, bulk replacement, guest-account, authentication-configuration, or unrestricted database endpoints.

### Legacy compatibility routes

The following routes remain supported for older GPT clients:

- `GET /api/gpt/lore`
- `GET /api/gpt/search`
- `POST /api/gpt/chronicle`

They are compatibility surfaces, not permission to weaken the versioned API. Internal model changes should use adapters so both the protected v1 contract and the legacy contract continue to function.

### OpenAPI description

The Custom GPT schema is maintained at:

`openapi/lunar-dragons-gpt.yaml`

Its production server is `https://lunardragons.cloud`. Update the schema deliberately whenever a published contract changes, and keep the runtime tests aligned with it.

## 6. Structured lore rules

Structured entries support these explicit statuses:

- `draft`
- `review`
- `canon`
- `retconned`

The safety rules are:

1. A new structured GPT entry defaults to `draft` when `status` is omitted.
2. An explicitly supplied valid status remains supported.
3. An explicitly invalid or unknown status is a validation error; it must not be silently normalized.
4. The seven established timeline entries migrated during the cutover remain `canon`.
5. The public Chronicles page displays `canon` only.
6. `draft`, `review`, and `retconned` entries must not be presented as established canon.
7. Promoting material to `canon` must be explicit.
8. Unrelated changes must not silently rewrite established lore.
9. Entries may have a title and optional subtitle. Chronicle indexes render the title only; subtitles belong in the opened record and editor.
10. Existing canon is the primary Lunar Dragons lore authority. Operational rosters, generated messages, Sector Intel prototypes, and other rendered worldbuilding do not become canon merely by appearing on the Site.

## 7. GPT write safety

GPT writes are intentionally narrow. They may update only structured lore, the compatibility entries mirror where required, and the archive `updated_at` marker.

Preserve the following behavior:

- Validate request bodies and reject unknown fields.
- Enforce content and field-length limits.
- Reject exact duplicates.
- Search before creating an entry when practical, reducing near-duplicate lore.
- Preserve a structured entry's `id` during every update.
- Preserve immutable creation metadata during updates.
- Apply updates by ID rather than replacing the complete lore collection.
- Preserve optimistic conflict protection so concurrent changes return a conflict instead of overwriting newer data.
- Return `409 Conflict` for duplicates or detected concurrent modification.
- Never expose `resetChapterArchive()` or an equivalent bulk reset through the GPT API.
- Never add a GPT-facing `DELETE` operation.
- Keep the shared 64,000-character per-record content limit and 512 KiB aggregate UTF-8 structured-lore budget unless a separately reviewed storage change replaces them.

The compatibility mirror must be treated carefully: canon entries may be reflected into the established timeline, while draft, review, and retconned entries must not be surfaced there as canon.

## 8. Public and administrative lore behavior

The public Chronicle is a canon-only view. Guests, unauthenticated visitors, and administrators who have not actively entered Admin Mode must not receive non-canon Chronicle content through the public UI.

The authenticated Chronicle administration interface is live. An authorized ChatGPT administrator in active Admin Mode can:

- browse `draft`, `review`, `canon`, and `retconned` groups
- open records by stable structured entry ID
- directly edit date, title, optional subtitle, category, and formatted content for `draft` and `review` records
- explicitly move a record to any supported status
- use optimistic conflict protection so stale edits do not overwrite newer changes

Status changes are real archive writes. Moving an entry into `canon` may add or update its compatibility timeline mirror. Moving it out of `canon` must remove its established-canon presentation while preserving unrelated legacy timeline entries. No admin UI may expose archive reset or deletion as a convenience control.

### On-site Lore Cogitator

The Chronicle editor also contains an advisory Lore Cogitator. It is available only to authenticated ChatGPT administrators in active Admin Mode and uses the server-side OpenAI Responses API with `OPENAI_API_KEY`.

The Cogitator receives relevant existing canon as its primary authority plus the active development record and administrator instruction. Its output is a proposal only: the administrator must explicitly load it into the editor, review it, and save it. The Cogitator does not directly publish, demote, delete, reset, or write archive records, and consultations are not persisted by the application.

## 9. Astropathic Relay and Sector Intel state

The deterministic transmission system currently includes:

- Phase 1B transmission analysis, corruption, and semantic degradation
- Phase 2 explicit metadata for new messages with Phase 1 inference retained for legacy metadata-free records
- Phase 3 controlled Sector Intel origin actions using approved aliases and runtime record lookup
- Phase 4 delayed/out-of-order delivery, relay failures, contradictory or future timestamps, partial transmissions, recovered fragments, intentional echoes, and bounded cross-day delays

The Command Vox-Missive and dedicated Relay views share the same renderer and must remain synchronized. Cadence, due-only scheduling, IDs, analysis, corruption, event plans, and duplicate prevention are deterministic.

Generated Astropathic messages are simulation content, not structured canon. Their metadata, event fields, and archive analysis remain separate from body-only corruption.

The following remain intentionally unresolved:

- the exact receiving star system of the `Lunaris`
- reliable route topology from the receiving locus to explicit origins
- `TRACE RELAY PATH`
- final replacement of Sector Intel prototype/simulacrum data with approved worldbuilding

Do not invent a receiving system, coordinates, relay station, warp lane, or route to close those gaps. Current prototype Sector Intel material is not canon and requires a deliberate lore decision before publication.

## 10. Staging and fallback environment

The Cloudflare Worker at the prior staging location is retained only as a staging/fallback environment. It is not the production authority and must not be used for production writes.

Staging Worker:

`https://lunar-dragons-codex.wandering-mud-e6c1.workers.dev`

Production and staging must remain isolated:

- separate runtime secrets
- separate D1 data
- separate R2 assets
- no staging resource IDs in Site artifacts
- no production secrets in staging source or configuration
- no assumption that local or staging records represent production data

Any recovery or fallback procedure must explicitly identify which environment is being accessed before it performs a write.

## 11. Important repository surfaces

### Hosting and configuration

- `.openai/hosting.json` - existing Site project and logical bindings
- `drizzle.config.ts` - migration generation configuration
- `db/schema.ts` - database schema
- `drizzle/` - tracked additive migrations

### GPT implementation

- `app/gpt-api-auth.ts` - Bearer authentication
- `app/gpt-api-adapter.ts` - GPT-facing translation and persistence behavior
- `app/api/gpt/v1/**` - established versioned routes
- `app/api/gpt/**` - legacy compatibility routes
- `openapi/lunar-dragons-gpt.yaml` - Custom GPT contract

### Chronicle administration and Lore Cogitator

- `app/_components/LoreEntryEditor.tsx` - direct structured-lore editor
- `app/_components/LoreCogitatorPanel.tsx` - advisory assistant interface
- `app/api/admin/lore/**` - same-origin Admin Mode lore writes
- `app/api/admin/lore-assistant/route.ts` - server-side Responses API bridge
- `app/lore-editor.ts` - edit proposals and conflict-safe mutations
- `app/lore-assistant.ts` - canon selection, assistant instructions, and response validation
- `app/lore-limits.ts` - shared field and aggregate limits

### Astropathic and Sector Intel

- `app/archive-data.ts` - transmission model, cadence, event planning, normalization, and persistence compatibility
- `app/_components/astropathic-record.ts` - shared derived transmission record
- `app/_components/RelayDataStream.tsx` - shared Command/Relay transcript renderer
- `app/_components/relay-transmission.ts` - deterministic reveal and corruption helpers
- `app/_components/TransmissionSignalAuspex.tsx` - shared analysis presentation
- `app/_components/transmission-event-presentation.ts` - event-state presentation
- `app/_components/transmission-origin.ts` - controlled origin resolver
- `app/_components/TransmissionOriginActions.tsx` - exact-origin actions
- `app/_components/SectorCartographyExperience.tsx` - Sector Intel cartography interface and admin-only prototype experience

### Shared archive storage

- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`

Changes to shared storage must be evaluated for effects on the website, versioned API, legacy compatibility routes, canon filtering, and optimistic writes.

### Regression coverage

- `tests/gpt-api-contract.test.mjs`
- `tests/gpt-api-runtime.test.mjs`
- `tests/lore-publication.test.mjs`
- `tests/lore-assistant.test.mjs`
- `tests/astropathic-cadence.test.mjs`
- `tests/relay-transmission.test.mjs`
- `tests/rendered-html.test.mjs`

## 12. Validation commands

Use the proportional verifier from the repository root:

```powershell
npm run verify:ui
npm run verify:standard
npm run verify:protected
```

The verifier inspects changed paths and promotes to a stronger lane when protected files are present. Use `verify:ui` for presentation-only work, `verify:standard` for ordinary interaction/application behavior, and `verify:protected` for API, authentication, archive storage, schema, migration, OpenAPI, binding, or Worker changes. Reuse a successful result while the source tree is unchanged.

Focused commands remain available:

```powershell
npm run test:gpt-api
npm test
npm run build
npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml
```

At the current release-159 source baseline, the recorded validation result is:

- application tests: 81/81 passing
- rendered-interface tests: 20/20 passing
- GPT API tests: 53/53 passing
- production build: passing

Changes affecting shared archive storage, GPT authentication, GPT routes, structured lore validation, or the D1 schema are incomplete until `npm run test:gpt-api` reports zero failures.

## 13. Deployment safety

The production Site already exists. Do not create a replacement Site for routine releases.

Before a production deployment:

1. Confirm `.openai/hosting.json` still targets the existing Site project.
2. Confirm only logical bindings `DB` and `CHAPTER_ASSETS` are packaged.
3. Confirm no `.dev.vars`, `.env`, secret values, staging data, or physical staging resource IDs are present.
4. Build and run the GPT regression suite.
5. Inspect every migration and confirm how Sites will apply it.
6. Prefer additive, backward-compatible migrations.
7. Confirm production migration history before replaying any schema change.
8. Preserve Site-managed D1 and R2 data, guest users, access policy, custom domain, Sign in with ChatGPT, and administrator authorization.

Never perform destructive D1, R2, authentication, DNS, secret, or deployment operations without explicit approval and a verified recovery path.

## 14. Current baseline and recovery reference

The current live baseline is:

```text
Source commit:     113796967d3db80c93655abbd0ee87f5005ea434
Site provenance:   1ee2ca5453a25bb74ec09640ec3ae1564a37f664
Site:              https://lunardragons.cloud
Release:           159
Environment:       5
```

The historical GPT cutover reference is:

```text
Tag:    release-101-gpt-integration
Commit: d8f7b1c7abfac5cf35807931dcc64321d64ad1c7
Site:   https://lunardragons.cloud
Release: 101
Environment revision: 5
```

Use release 159 for current-state comparisons. Use the release-101 tag to isolate regressions introduced after the GPT cutover. Do not roll production back, replay migrations, rotate secrets, or replace data merely because current source differs from the historical milestone; first compare the exact deployment, schema, environment revision, and data state.
