# Lunar Dragons Codex — Repository Instructions

This repository contains the Lunar Dragons Codex web application and an external GPT API integration.

The Codex website may continue to evolve, but the GPT API must be treated as a stable external integration.

---

# 1. GPT API Stability

The GPT API is an external contract.

Changes to the website, archive structure, database schema, UI, storage implementation, or internal TypeScript models must not silently break the GPT API.

Current protected GPT endpoints:

- `GET /api/gpt/lore`
- `GET /api/gpt/search`
- `POST /api/gpt/chronicle`

Current protected GPT-related files:

- `app/gpt-api-auth.ts`
- `app/api/gpt/**`

Shared backend files used by the GPT API include:

- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`

These shared files may be changed when necessary, but GPT compatibility must be preserved.

---

# 2. External API Contract

When modifying internal archive structures, maintain compatibility with the existing GPT API.

The website/database model may change.

The external GPT API response contract should change only deliberately.

If internal fields are renamed, moved, replaced, or restructured, introduce translation or adapter logic instead of silently breaking the API.

Do not remove an existing GPT API field simply because the internal database representation has changed.

---

# 3. Authentication Requirements

All `/api/gpt/**` endpoints containing Lunar Dragons data must require Bearer authentication.

Authentication is implemented using:

`Authorization: Bearer <GPT_API_KEY>`

Never:

- hard-code `GPT_API_KEY`
- return the API key in an API response
- log the API key
- expose it to client-side JavaScript
- commit `.dev.vars`
- commit production secrets
- disable authentication as part of unrelated work

Unauthenticated or incorrectly authenticated GPT API requests must return:

`401 Unauthorized`

The local development secret is stored in:

`.dev.vars`

The production secret must be provided through the hosting environment.

---

# 4. Secret Files

The following files must remain excluded from source control:

- `.dev.vars`
- `.dev.vars.*`
- `.env`
- `.env.*`

Do not copy secrets into source files, examples, documentation, tests, screenshots, or generated output.

---

# 5. GPT Permissions

GPT-facing routes must use least privilege.

The GPT integration may eventually be allowed to:

- read Chapter lore
- search Chapter lore
- create draft lore
- update specific lore records
- promote explicitly approved records to canon

The GPT integration must not receive unrestricted database access.

Do not expose GPT operations that can:

- reset the Chapter archive
- wipe the database
- delete the complete archive
- replace the entire archive without validation
- access guest account credentials
- access password hashes or password salts
- modify authentication configuration
- access unrelated administrative data

Do not expose `resetChapterArchive()` through the GPT API.

---

# 6. Existing GPT API Behaviour

## GET `/api/gpt/lore`

Must require Bearer authentication.

The response currently exposes the GPT-facing representation of:

- `chapter`
- `timeline`
- `relics`
- `sector`

Additional metadata such as `source` and `persisted` may also be returned.

Internal archive restructuring must not silently remove these GPT-facing concepts.

---

## GET `/api/gpt/search?q=<query>`

Must require Bearer authentication.

Must reject requests without a search query.

The response must contain:

- `query`
- `count`
- `source`
- `results`

Search results currently use:

- `category`
- `title`
- `content`

Internal search implementation may change while preserving this external behaviour.

---

## POST `/api/gpt/chronicle`

Must require Bearer authentication.

This endpoint may add one chronicle entry.

It must:

- validate the request body
- reject empty entries
- reject excessively large entries
- reject exact duplicates
- update only the intended chronicle data
- return `201 Created` when successful
- return `409 Conflict` for an existing identical entry

It must not permit the caller to replace the complete Chapter archive.

---

# 7. Codex Archive Changes

When modifying any of the following:

- `ChapterArchiveData`
- `archive.entries`
- `archive.identity`
- `archive.relics`
- `archive.sectorIntel`
- `chapter_archive`
- `storage/chapter-records.ts`
- `app/archive-data.ts`

first determine whether the GPT API depends on the affected structure.

If it does:

1. update the internal model
2. update the GPT adapter/API implementation
3. preserve the external API contract where practical
4. update regression tests
5. verify authenticated and unauthenticated behaviour

Do not assume that a website feature is isolated from the GPT API.

---

# 8. Future API Versioning

The GPT API should move toward explicit versioning.

Preferred future structure:

- `/api/gpt/v1/lore`
- `/api/gpt/v1/search`
- `/api/gpt/v1/entries`

Once versioned endpoints are established, avoid breaking a published API version.

If an incompatible API redesign becomes necessary, introduce a new version such as:

`/api/gpt/v2/...`

rather than silently changing `v1`.

---

# 9. Lore Integrity

The Lunar Dragons Codex is the source of truth for established Chapter lore.

Do not automatically treat generated or speculative material as canonical.

Future structured lore should support states such as:

- `draft`
- `review`
- `canon`
- `retconned`

New AI-generated lore should default to `draft` unless the user explicitly approves it as canon.

Do not silently rewrite established canon while implementing unrelated application features.

---

# 10. Database Safety

The application currently uses Cloudflare D1.

Development and production databases must be treated separately.

Do not:

- reset production data for testing
- run destructive migrations without explicit need
- delete archive records as part of unrelated changes
- assume the local D1 database contains production data

Prefer additive migrations and backward-compatible transformations.

When migrating existing lore, preserve the existing data until the new representation has been verified.

---

# 11. Development Expectations

Before completing changes that affect the archive or GPT API:

1. ensure the application builds
2. ensure the GPT API still requires authentication
3. verify the relevant GPT endpoints
4. run GPT API regression tests when available
5. fix compatibility issues before considering the work complete

If a requested change conflicts with these requirements, preserve the user's requested functionality while maintaining the GPT API through an adapter or compatibility layer.

---

# 12. Do Not Modify GPT API Incidentally

When performing unrelated work such as:

- UI redesigns
- adding Codex pages
- adding characters
- adding planets
- changing navigation
- changing visual styling
- adding archive categories
- adding sector features

do not rewrite, relocate, remove, or weaken the GPT API unless the change genuinely requires it.

If a GPT API change is necessary, explicitly account for backward compatibility and tests.

---

# 13. Required GPT API Regression Test

After any change affecting:

- `app/api/gpt/**`
- `app/gpt-api-auth.ts`
- `app/archive-data.ts`
- `storage/chapter-records.ts`
- `db/schema.ts`
- archive storage or database structure

run:

`npm run test:gpt-api`

The work is not complete until this command reports zero failures.

If the test fails because an internal model was intentionally changed, preserve the external GPT API contract through adapter or compatibility logic rather than weakening or removing the test.