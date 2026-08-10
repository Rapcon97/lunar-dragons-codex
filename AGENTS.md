# Lunar Dragons Codex - Repository Instructions

This repository contains the Lunar Dragons Codex website and its production GPT API integration. The website may evolve, but the GPT API is an established external contract and must remain stable.

## 1. Production authority

The production Site is [https://lunardragons.cloud](https://lunardragons.cloud).

- The Site-managed D1 database bound as `DB` is the authoritative data store.
- The Site-managed R2 bucket bound as `CHAPTER_ASSETS` is the authoritative asset store.
- The staging Worker and its resources are fallback/staging only.
- Production and staging secrets, D1 data, R2 assets, identifiers, and deployment configuration must remain isolated.
- Never use staging D1/R2 identifiers in the Site build or production deployment artifact.

### Current operational baseline

As of 2026-08-10, the current deployed baseline is:

- Production Site release: `159`
- Production environment revision: `5`
- GitHub source commit: `113796967d3db80c93655abbd0ee87f5005ea434`
- Site provenance commit: `1ee2ca5453a25bb74ec09640ec3ae1564a37f664`
- Application tests: 81/81 passing
- Rendered-interface tests: 20/20 passing
- GPT API tests: 53/53 passing

Live structured-lore totals and status counts are mutable production data. Read them from the authoritative D1-backed archive or the authenticated Chronicle administration view; do not treat a count recorded in documentation as current authority.

## 2. Established GPT API contract

The current `/api/gpt/v1/*` API is live production functionality, not future work.

Protected versioned routes include:

- `GET /api/gpt/v1/lore`
- `GET /api/gpt/v1/search`
- `GET /api/gpt/v1/entries`
- `POST /api/gpt/v1/entries`
- `GET /api/gpt/v1/entries/:id`
- `PATCH /api/gpt/v1/entries/:id`
- `POST /api/gpt/v1/chronicle` as a compatibility write surface

Legacy compatibility routes must also remain available:

- `GET /api/gpt/lore`
- `GET /api/gpt/search`
- `POST /api/gpt/chronicle`

Do not silently break, remove, relocate, or weaken these routes. If internal fields or storage structures change, preserve the published behavior through translation or adapter logic.

The primary GPT-related files are:

- `app/gpt-api-auth.ts`
- `app/gpt-api-adapter.ts`
- `app/api/gpt/v1/**`
- `app/api/gpt/**`
- `openapi/lunar-dragons-gpt.yaml`

Shared backend files used by the GPT API include:

- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`

## 3. Authentication requirements

All `/api/gpt/**` endpoints containing Lunar Dragons data require Bearer authentication:

```http
Authorization: Bearer <GPT_API_KEY>
```

Unauthenticated or incorrectly authenticated requests must return `401 Unauthorized`.

Never:

- hard-code `GPT_API_KEY`
- return an API key in a response
- log an API key
- expose it to client-side JavaScript
- commit `.dev.vars` or `.env` files
- place secret values in examples, documentation, tests, screenshots, or generated output
- disable authentication as part of unrelated work

The local development secret belongs in `.dev.vars`. Production secrets are supplied only through the Site environment.

## 4. Secret files

The following must remain excluded from source control:

- `.dev.vars`
- `.dev.vars.*`
- `.env`
- `.env.*`

Documentation may name `GUEST_SESSION_SECRET`, `GPT_API_KEY`, and `OPENAI_API_KEY`, but must never contain their values.

## 5. External response compatibility

The website/database model may change. The external GPT response contract should change only deliberately.

### Lore response

`GET /api/gpt/v1/lore` and its legacy compatibility route must continue to expose the GPT-facing concepts:

- `chapter`
- `timeline`
- `relics`
- `sector`

Structured lore and metadata such as `source` and `persisted` may also be returned. Do not remove an existing external field merely because the internal representation changed.

### Search response

`GET /api/gpt/v1/search?q=<query>` and its legacy compatibility route must:

- require a non-empty query
- return `query`, `count`, `source`, and `results`
- retain result fields `category`, `title`, and `content`

The internal search implementation may change while this behavior remains stable.

### Structured entry response

Structured entry endpoints must retain stable entry IDs and expose validated lore records without leaking unrelated archive or authentication data.

## 6. Structured lore integrity

Structured lore supports these statuses:

- `draft`
- `review`
- `canon`
- `retconned`

Apply these rules explicitly:

1. New structured GPT lore defaults to `draft` when `status` is omitted.
2. Explicit valid statuses remain supported.
3. Explicit invalid or unknown statuses return a validation error and must not be silently normalized.
4. Established timeline lore migrated during the structured-lore cutover remains `canon`.
5. The public Chronicles page displays `canon` only.
6. `draft`, `review`, and `retconned` material must not be exposed as established canon.
7. Canon promotion must be explicit.
8. Generated or speculative material must not silently rewrite established lore.
9. Structured lore may have a title and an optional subtitle. Chronicle indexes remain title-only; the subtitle belongs in the opened record and editing surfaces.

## 7. Structured entry creation and updates

### Create

`POST /api/gpt/v1/entries` may add one validated lore entry. It must:

- accept only known fields
- require non-empty content
- enforce field and content limits
- use `draft` when status is omitted
- reject invalid explicit statuses
- reject exact duplicates
- return `201 Created` on success
- return `409 Conflict` for a duplicate or optimistic-write conflict

Search-before-create behavior should be retained and encouraged so GPT clients reduce duplicate or near-duplicate lore.

### Update

`PATCH /api/gpt/v1/entries/:id` may update only the supplied fields of one existing entry. It must:

- address the record by its existing structured entry ID
- preserve that ID during the update
- preserve immutable creation metadata
- validate all supplied fields
- reject empty or unknown updates
- retain optimistic write protection
- return a conflict rather than overwrite a newer concurrent change
- update only structured lore, the compatibility mirror when appropriate, and archive update metadata

Do not implement entry updates by replacing the complete archive or regenerating IDs.

### Administrative editing and status control

Authenticated ChatGPT administrators who have actively entered Admin Mode may edit structured lore through the Chronicle interface. Preserve these rules:

- Direct editing must address the stable structured entry ID.
- Manual status changes may move a record among `draft`, `review`, `canon`, and `retconned`, but every transition must be explicit.
- Status changes and record edits must retain optimistic conflict protection.
- Moving a record into `canon` may update the compatibility timeline mirror; moving it out of `canon` must remove its established-canon presentation without disturbing unrelated legacy entries.
- Public and guest views remain canon-only even while administrators can inspect all four status groups.
- Current per-record lore content is limited to 64,000 characters, with a 512 KiB UTF-8 budget for the complete structured-lore collection.

### Legacy chronicle append

`POST /api/gpt/v1/chronicle` and `POST /api/gpt/chronicle` remain compatibility routes. They may append one validated Chronicle entry but must not accept complete-archive replacement.

## 8. GPT least privilege

GPT-facing routes may read/search lore and perform the narrowly validated lore writes described above.

The GPT API must not expose:

- `DELETE` operations
- database or archive reset operations
- complete-archive replacement
- `resetChapterArchive()`
- unrestricted D1 access
- guest account credentials
- password hashes or salts
- authentication configuration
- secret management
- unrelated administrative data

Do not add a reset or deletion route for convenience in development.

### On-site Lore Cogitator

The Chronicle editor includes a separate server-side Lore Cogitator for authenticated ChatGPT administrators in active Admin Mode. It uses `OPENAI_API_KEY` with the OpenAI Responses API and must remain advisory:

- Existing `canon` entries are the primary Lunar Dragons authority supplied to the assistant.
- Draft, review, retconned, operational, simulation, and Sector Intel material must not silently outrank canon.
- Suggestions must be explicitly loaded into the editor, reviewed, and saved by the administrator.
- The Cogitator must not directly publish, demote, delete, reset, or replace archive records.
- Consultations are not production lore and are not persisted by the application.
- `OPENAI_API_KEY` is server-only and must never be exposed to browser code.

## 9. Canon compatibility mirror

The legacy `archive.entries` timeline remains a compatibility representation of established lore.

- Existing migrated timeline entries remain canon.
- Canon structured entries may be mirrored into the timeline as required by compatibility behavior.
- Draft, review, and retconned entries must not appear in the public timeline as canon.
- Internal restructuring must preserve the original seven established Chronicle entries unless a deliberate, approved lore change says otherwise.

## 10. Database safety

The application uses Cloudflare D1. Development, staging, and production databases must be treated as separate resources.

Do not:

- reset production data for testing
- run destructive migrations without explicit approval
- delete archive records during unrelated changes
- assume local or staging D1 contains production data
- replay a migration without checking the production migration ledger and schema
- replace `chapter_archive` as part of a compatibility change

Prefer additive migrations and backward-compatible transformations. Preserve existing data until the new representation has been verified. A migration file must not be assumed to execute merely because it exists; confirm the Sites migration lifecycle before production deployment.

## 11. Archive change procedure

Before modifying any of the following:

- `ChapterArchiveData`
- `archive.entries`
- `archive.identity`
- `archive.relics`
- `archive.sectorIntel`
- `chapter_archive`
- `chapter_archive.lore_entries`
- `storage/chapter-records.ts`
- `app/archive-data.ts`

determine whether the versioned or legacy GPT API depends on it.

If it does:

1. update the internal model
2. update the GPT adapter/API implementation
3. preserve external response and write behavior where practical
4. preserve canon filtering, stable IDs, and optimistic writes
5. update regression tests
6. verify authenticated and unauthenticated behavior

Do not assume that a website-only feature is isolated from the shared archive.

### Transmission and Sector Intel state

The Astropathic transmission work currently includes:

- Phase 1B: deterministic transmission analysis and semantic degradation.
- Phase 2: explicit transmission metadata for new messages, with Phase 1 inference retained for metadata-free legacy messages.
- Phase 3: controlled Sector Intel origin actions for exact approved IDs, resolved through current Sector Intel records rather than hard-coded route indexes.
- Phase 4: deterministic anomalous delivery events, including bounded delays, out-of-order arrivals, relay failures, contradictory/future timestamps, partial transmissions, recovered fragments, and intentional echoes.

Preserve these boundaries:

- Astropathic messages are generated simulation content, not structured canon unless deliberately archived through the lore workflow.
- Cadence, due-only delivery, IDs, duplicate prevention, corruption, analysis, and Command/Relay parity must remain deterministic.
- The exact receiving star system of the `Lunaris` is not established and must not be invented.
- `TRACE RELAY PATH` remains deferred until real route topology and a receiving location are established.
- Sector Intel prototype/simulacrum data is not canon and must not be promoted merely because it is rendered by the interface.

## 12. API versioning

Avoid breaking the published v1 API. If an incompatible redesign becomes necessary, introduce a new version such as `/api/gpt/v2/*` and retain v1 compatibility for existing clients.

Legacy `/api/gpt/*` routes remain compatibility routes until they are deliberately retired through an approved migration plan.

## 13. Required validation

### Proportional validation lanes

Use the smallest safe validation lane and allow the verifier to escalate based on the changed paths:

```powershell
npm run verify:ui
npm run verify:standard
npm run verify:protected
```

- `verify:ui` is for presentation-only TSX/CSS, copy, icons and public assets. It runs one build plus rendered-interface tests.
- `verify:standard` is for navigation, interaction and ordinary application behavior. It runs the complete application suite.
- `verify:protected` is mandatory for API, authentication, archive storage, schema, migration, OpenAPI, binding or Worker changes. It runs both the application and GPT API suites.
- The verifier automatically promotes a requested lane when protected or non-UI paths changed. Do not bypass that promotion.
- Reuse a successful validation result while the source tree is unchanged. Do not rerun identical suites merely because commit, provenance, packaging and deployment are separate steps.

After changes affecting any of the following:

- `app/api/gpt/**`
- `app/gpt-api-auth.ts`
- `app/gpt-api-adapter.ts`
- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`
- archive storage or database structure
- GPT OpenAPI behavior

run:

```powershell
npm run test:gpt-api
```

The work is not complete until it reports zero failures. Also ensure the application builds when runtime or shared storage code changes. If an intentional internal change breaks a regression test, preserve the external contract with adapter or compatibility logic rather than weakening or removing the test.

## 14. Unrelated website work

UI redesigns, navigation changes, new pages, characters, planets, styling, sector features, and other site work must not incidentally rewrite or weaken the GPT API.

If an unrelated change genuinely requires a GPT API adjustment, account explicitly for authentication, compatibility, lore status safety, stable IDs, optimistic writes, tests, and production/staging isolation.

## 15. Current and historical milestones

The current live baseline is release `159` at source commit `113796967d3db80c93655abbd0ee87f5005ea434`, Site provenance commit `1ee2ca5453a25bb74ec09640ec3ae1564a37f664`, and environment revision `5`.

The original production GPT cutover remains a historical recovery reference:

- Tag: `release-101-gpt-integration`
- Commit: `d8f7b1c7abfac5cf35807931dcc64321d64ad1c7`
- Production release at cutover: `101`
- Production environment revision: `5`

Use release 159 for current-state comparisons and release 101 when isolating regressions introduced after the GPT cutover. Do not commit, deploy, migrate, rotate secrets, or change production resources unless the user has explicitly authorized that action.
