# Lunar Dragons Codex - Technical Handoff

This document records the completed production cutover and the operating contract for the Lunar Dragons Codex website and its GPT integration. It supersedes pre-cutover notes that described the versioned API as future work.

## 1. Current production baseline

| Item | Production state |
| --- | --- |
| Site | [https://lunardragons.cloud](https://lunardragons.cloud) |
| Active Site release | `101` |
| Active environment revision | `5` |
| Authoritative database | Site-managed Cloudflare D1, logical binding `DB` |
| Asset storage | Site-managed R2, logical binding `CHAPTER_ASSETS` |
| GPT API | Live and Bearer-authenticated at `/api/gpt/v1/*` |
| Structured lore | 8 entries: 7 `canon`, 1 `review` |
| Established Chronicle timeline | 7 entries, preserved as canon |
| GPT regression suite | 41/41 passing |
| Known-good Git tag | `release-101-gpt-integration` |
| Known-good commit | `d8f7b1c7abfac5cf35807931dcc64321d64ad1c7` |

Release 101 is the deployed production milestone. Environment revision 5 contains the active production runtime configuration. The Site-managed D1 database is the single authoritative store for the website and the production GPT API.

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

### Current lore baseline

- Structured lore entries: 8 total
- Canon entries: 7
- Review entries: 1
- Draft entries: 0 at the recorded milestone
- Retconned entries: 0 at the recorded milestone
- Original established Chronicle entries: 7, still intact

The one non-canon review entry is:

| Field | Value |
| --- | --- |
| ID | `9f1a28fc-44a3-4a4f-960d-da4a8fd91bbc` |
| Title | `Provenance and Antiquity of the Lunaris` |
| Date | `Pre-008.M42` |
| Category | `relic` |
| Status | `review` |

This entry is deliberately not established canon and must not appear in the public Chronicle while it remains in `review`.

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

Only their names belong in source documentation.

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

The compatibility mirror must be treated carefully: canon entries may be reflected into the established timeline, while draft, review, and retconned entries must not be surfaced there as canon.

## 8. Public and administrative lore behavior

The public Chronicle is a canon-only view. Structured non-canon material remains available through authorized tooling and can be handled by a separate administrative review interface without changing public canon behavior.

If a future admin draft/review queue is added, it is a separate UI capability. It must not block or alter the protected API contract, and it must preserve IDs, statuses, and conflict protection.

## 9. Staging and fallback environment

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

## 10. Important repository surfaces

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

### Shared archive storage

- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`

Changes to shared storage must be evaluated for effects on the website, versioned API, legacy compatibility routes, canon filtering, and optimistic writes.

### Regression coverage

- `tests/gpt-api-contract.test.mjs`
- `tests/gpt-api-runtime.test.mjs`

## 11. Validation commands

Run the following from the repository root after relevant changes:

```powershell
npm run test:gpt-api
npm run build
npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml
```

At the known-good release, the GPT regression suite passes 41 of 41 tests.

Changes affecting shared archive storage, GPT authentication, GPT routes, structured lore validation, or the D1 schema are incomplete until `npm run test:gpt-api` reports zero failures.

## 12. Deployment safety

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

## 13. Known-good recovery reference

The verified production milestone is:

```text
Tag:    release-101-gpt-integration
Commit: d8f7b1c7abfac5cf35807931dcc64321d64ad1c7
Site:   https://lunardragons.cloud
Release: 101
Environment revision: 5
```

Use this milestone as the comparison point when diagnosing regressions. Do not roll production back, replay migrations, rotate secrets, or replace data merely because current source differs from the milestone; first compare the exact deployment, schema, environment revision, and data state.
