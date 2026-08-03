# Lunar Dragons Codex

The Lunar Dragons Codex is a persistent, in-universe archive for the homebrew Warhammer 40,000 Chapter known as the Lunar Dragons. It combines the public Chapter record, companies, characters, relics, chronicles, cartography, the flagship dossier, and the Astropathic Relay with authenticated administrative editing and a protected GPT lore API.

Production: [https://lunardragons.cloud](https://lunardragons.cloud)

## Project purpose

The application provides one authoritative place to develop and present Lunar Dragons lore while keeping speculative material separate from established canon.

It supports:

- public, read-only Chapter records
- Sign in with ChatGPT for the Chapter administrator
- view-only guest accounts
- persistent D1-backed Chapter data
- R2-backed images and documents
- structured lore with `draft`, `review`, `canon`, and `retconned` states
- a Bearer-authenticated API used by the Lunar Dragons Custom GPT

## Production architecture

The project is a vinext application hosted as an OpenAI Site on Cloudflare infrastructure.

```text
lunardragons.cloud
  -> existing OpenAI Site project
     -> application pages and authentication
     -> /api/gpt/v1/*
     -> DB              (Site-managed Cloudflare D1)
     -> CHAPTER_ASSETS  (Site-managed Cloudflare R2)
```

The Site-managed D1 database is authoritative for both the website and production GPT API. The older Cloudflare Worker is retained only as an isolated staging/fallback environment.

### Logical bindings

`.openai/hosting.json` declares the logical resource names used by the application:

- `DB` - Site-managed D1 database
- `CHAPTER_ASSETS` - Site-managed R2 bucket

Keep these logical names stable. Do not place physical staging D1 or R2 identifiers in the Site build.

## Requirements

- Node.js `>=22.13.0`
- npm

## Local development

Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

Create a local `.dev.vars` file for required development secrets. Never commit that file.

Useful commands:

```powershell
npm run dev          # Start local development
npm run build        # Create the production-compatible build
npm run start        # Serve a built application
npm run lint         # Run ESLint
npm run db:generate  # Generate a Drizzle migration after an approved schema change
```

## Build and tests

Run the focused GPT API regression suite:

```powershell
npm run test:gpt-api
```

Run the application build and rendered HTML tests:

```powershell
npm test
```

Run the build independently:

```powershell
npm run build
```

Lint the Custom GPT OpenAPI document when its contract changes:

```powershell
npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml
```

At the known-good production milestone, the GPT regression suite passes 41 of 41 tests.

## Runtime secrets

The application uses these server-side secret names:

- `GUEST_SESSION_SECRET`
- `GPT_API_KEY`

No secret values belong in source control, documentation, screenshots, client-side code, or logs. Local values belong in `.dev.vars`; production values are managed through the existing Site environment.

## GPT API

The production GPT API is available under `/api/gpt/v1/*` and requires:

```http
Authorization: Bearer <GPT_API_KEY>
```

Primary routes:

- `GET /api/gpt/v1/lore` - read the GPT-facing archive
- `GET /api/gpt/v1/search?q=<query>` - search Chapter lore
- `GET /api/gpt/v1/entries` - list structured lore
- `POST /api/gpt/v1/entries` - create one structured lore entry
- `GET /api/gpt/v1/entries/:id` - retrieve one entry
- `PATCH /api/gpt/v1/entries/:id` - update one entry while preserving its ID

Legacy `/api/gpt/*` compatibility routes remain supported for existing clients.

The API is deliberately least-privilege. It does not expose delete, reset, complete-archive replacement, guest credential, or unrestricted database operations.

### Lore safety

- Omitted status on a new structured GPT entry defaults to `draft`.
- Explicit valid statuses are accepted; invalid statuses are rejected.
- The public Chronicles page displays canon entries only.
- Draft, review, and retconned entries are not established canon.
- Structured entry IDs and optimistic conflict protection must be preserved during updates.
- Search-before-create should be used to reduce duplicates.

## OpenAPI

The Custom GPT contract is defined in:

[`openapi/lunar-dragons-gpt.yaml`](openapi/lunar-dragons-gpt.yaml)

Its production server is `https://lunardragons.cloud`. Treat the published v1 schema as an external contract and use a new API version for incompatible future changes.

## Deployment safety

The production Site and its managed resources already exist. Routine work must reuse them.

Before saving or deploying a Site version:

1. Run `npm run test:gpt-api` and `npm run build`.
2. Confirm `.openai/hosting.json` still targets the existing Site project and logical `DB` / `CHAPTER_ASSETS` bindings.
3. Confirm the artifact contains no `.dev.vars`, `.env`, plaintext secrets, staging data, or staging resource IDs.
4. Inspect additive D1 migrations and verify how Sites will apply them.
5. Preserve production D1/R2 data, guest users, Sign in with ChatGPT, administrator authorization, access policy, custom domain, and existing secrets.
6. Keep production and staging resources isolated.

Do not perform database, secret, DNS, authentication, access-policy, or deployment changes without explicit authorization.

## Known-good production milestone

- Site release: `101`
- Environment revision: `5`
- Git tag: `release-101-gpt-integration`
- Commit: `d8f7b1c7abfac5cf35807931dcc64321d64ad1c7`
- GPT regression result: 41/41 passing

For the full production state, API rules, and recovery reference, see [`CODEX_TECHNICAL_HANDOFF.md`](CODEX_TECHNICAL_HANDOFF.md).
