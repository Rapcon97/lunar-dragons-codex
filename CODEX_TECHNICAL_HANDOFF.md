Lunar Dragons — Codex Technical Handoff

Purpose: This document is a technical handoff for Codex. Read it before making changes to the Lunar Dragons project.

Primary objective: converge the currently split deployments into one authoritative production site at https://lunardragons.cloud while preserving all existing guest accounts, Sign in with ChatGPT administrator access, and the existing Site database, then make the Lunar Dragons GPT read/write the same Codex through the new /api/gpt/v1/* API.

1. Project identity

Repository path used during development:

C:\Users\lampj\Documents\Lunar Dragons

Framework:

Vinext / Vite

Vinext build observed: Vite 8.0.13

Current production/custom-domain site:

https://lunardragons.cloud

Temporary/staging Cloudflare Worker created during GPT API development:

https://lunar-dragons-codex.wandering-mud-e6c1.workers.dev

Existing ChatGPT Sites hosting configuration:

.openai/hosting.json

project_id: appgprj_6a660d8a524c819197f01dfe1c5e498e

D1 binding name: DB

R2 binding name: CHAPTER_ASSETS

Important production principle

lunardragons.cloud must remain the final authoritative site.

Do not replace it with the raw Workers deployment if doing so would break ChatGPT authentication headers, guest users, or the existing Site database.

The raw Worker deployment is currently useful as a proven staging/reference deployment, but it is not the final desired production architecture.

2. User intent and non-negotiable requirements

The user wants one production Lunar Dragons application where:

https://lunardragons.cloud remains the real site.

Existing guest usernames/passphrases continue to work.

Sign in with ChatGPT continues to work.

The user's ChatGPT account continues to be recognized as Administrator.

The website and the custom Lunar Dragons GPT read/write the same authoritative D1 Codex.

GPT writes must become visible in the real website.

Existing canon must not be accidentally deleted or reset.

The GPT API must remain bearer-token protected.

No GPT-facing DELETE/reset capability should be exposed.

Lore development should support draft, review, canon, and retconned.

3. Current deployment split — root cause of the visible-lore problem

There are currently two separate live environments.

A. Real site — lunardragons.cloud

Current observed behavior:

Existing guest credentials work.

Sign in with ChatGPT works.

User can enter admin mode through ChatGPT authentication.

The real site's Chronicles page shows the existing seven canon timeline/lore entries.

GET https://lunardragons.cloud/api/gpt/v1/lore

returns 404 Not Found

Same request with the valid GPT bearer token also returns 404.

Conclusion: the real Site is still running an older deployed version of the code and does not yet contain the new GPT v1 API routes.

B. Temporary raw Worker — lunar-dragons-codex.wandering-mud-e6c1.workers.dev

Current observed behavior:

New GPT API is deployed and works.

Production GPT bearer authentication works.

New D1 is persistent.

GPT Actions can read/search/create/update lore successfully.

Existing guest credentials do not work there.

ChatGPT Site authentication headers are not guaranteed/provided there in the same way as the ChatGPT Site runtime.

The Worker has a different/new D1 from the real Site.

Conclusion: the GPT currently writes to the staging Worker D1, while the website reads from the old Site D1. That is why new GPT lore is not visible at lunardragons.cloud.

4. Target architecture

The desired final architecture is:

https://lunardragons.cloud
        |
        |-- Sign in with ChatGPT
        |      -> authenticated OpenAI headers
        |      -> admin email check
        |      -> Administrator
        |
        |-- Guest login
        |      -> guest_users in Site D1
        |      -> view-only access
        |
        |-- Website UI
        |      -> chapter_archive in Site D1
        |
        `-- /api/gpt/v1/*
               -> Bearer GPT_API_KEY
               -> same Site D1
               -> same chapter_archive / loreEntries

Then the custom GPT must point to:

https://lunardragons.cloud/api/gpt/v1/...

not the staging workers.dev hostname.

5. Authentication architecture

5.1 Sign in with ChatGPT / administrator

File:

app/chatgpt-auth.ts

The app reads OpenAI-provided request headers:

oai-authenticated-user-email

oai-authenticated-user-full-name

oai-authenticated-user-full-name-encoding

Key functions:

getChatGPTUser()

requireChatGPTUser()

chatGPTSignInPath()

chatGPTSignOutPath()

Reserved auth paths:

/signin-with-chatgpt

/signout-with-chatgpt

/callback

5.2 Admin authorization

Files:

app/admin-config.ts

app/archive-auth.ts

Behavior:

ChatGPT user is read through getChatGPTUser().

Admin status is derived through isArchiveAdmin(chatGPTUser.email).

Admin email list is defined in app/admin-config.ts.

Do not change the admin allow-list unless explicitly requested.

Admin-controlled routes include archive writes, asset writes, guest-user management, etc.

5.3 Guest authentication

File:

storage/guest-accounts.ts

D1 table:

guest_users

Schema:

CREATE TABLE IF NOT EXISTS guest_users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
)

Password hashing:

PBKDF2

SHA-256

100,000 iterations

per-user random salt

passwords are not stored in plaintext

Lockout:

5 failed attempts

15-minute lockout

Guest sessions:

HMAC-SHA256 signed token

30-day lifetime

signing secret:

GUEST_SESSION_SECRET

secret must be at least 32 characters

Important:

Existing guest users live in the real Site D1.

The preferred migration path is therefore to update the existing Site deployment and preserve its D1 rather than recreating accounts.

Do not request or expose guest plaintext passwords.

6. Chapter archive data model

File:

app/archive-data.ts

Structured lore was added.

Lore status

export type LoreStatus =
  | "draft"
  | "review"
  | "canon"
  | "retconned";

Lore category

export type LoreCategory =
  | "campaign"
  | "event"
  | "character"
  | "relic"
  | "world"
  | "organization"
  | "decree"
  | "other";

Structured lore entry

export type LoreEntry = {
  id: string;
  date: string;
  title: string;
  category: LoreCategory;
  status: LoreStatus;
  content: string;
  createdAt: number;
  updatedAt: number;
};

Archive compatibility

ChapterArchiveData contains both:

entries: string[];
loreEntries: LoreEntry[];

Intent:

loreEntries = canonical structured representation

entries = backward-compatible timeline/string mirror used by existing UI/legacy interfaces

Legacy migration

createDefaultArchiveData() migrates legacy timeline strings into loreEntries if needed.

Existing migrated IDs may look like:

legacy-88b3c84d-5

New structured records created through the GPT API use UUIDs.

Therefore:

Never assume every lore ID is a UUID. Treat id as a stable opaque identifier.

7. D1 chapter archive schema

File:

db/schema.ts

runtime storage logic: storage/chapter-records.ts

D1 table:

chapter_archive

Confirmed fields include:

id

identity

milestones

relics

companies

entries

lore_entries

vox_quotes

badge_mode

updated_at

sector_intel

lore_revision

relay_messages

relay_last_generated_date

lore_entries is:

TEXT NOT NULL DEFAULT '[]'

Fresh database seeding

This behavior was added:

if (!row) {
  return writeChapterArchive(createDefaultArchiveData());
}

Meaning:

fresh D1
-> chapter_archive table exists
-> no archive row
-> createDefaultArchiveData()
-> persist archive
-> future reads return database/persisted=true

There is now a contract test protecting this behavior.

Legacy lore migration

When a row contains legacy entries but no structured lore, storage/normalization migrates the legacy entries into loreEntries and persists them.

8. GPT API implementation

Auth helper

File:

app/gpt-api-auth.ts

Authentication:

Authorization: Bearer <GPT_API_KEY>

Missing or invalid key:

401 Unauthorized
WWW-Authenticate: Bearer

Adapter

File:

app/gpt-api-adapter.ts

Key capabilities include:

load archive

broad lore read

search

structured list

exact lookup by ID

structured create

structured update

legacy chronicle compatibility

duplicate detection

legacy entries mirroring

Current v1 routes

GET   /api/gpt/v1/lore
GET   /api/gpt/v1/search?q=...
GET   /api/gpt/v1/entries
POST  /api/gpt/v1/entries
GET   /api/gpt/v1/entries/:id
PATCH /api/gpt/v1/entries/:id

Legacy routes remain for compatibility:

/api/gpt/lore
/api/gpt/search
/api/gpt/chronicle

Legacy routes delegate to v1.

Intentionally NOT exposed

No GPT-facing:

DELETE
archive reset

This is deliberate and protected by tests.

9. Structured GPT write behavior

Create

POST /api/gpt/v1/entries

Input:

{
  "date": "...",
  "title": "...",
  "category": "campaign|event|character|relic|world|organization|decree|other",
  "status": "draft|review|canon|retconned",
  "content": "..."
}

Backend defaults exist, but the GPT schema requires an explicit status to reduce accidental canonization.

Duplicate behavior:

409 Conflict

Update

PATCH /api/gpt/v1/entries/:id

Partial updates only.

Behavior verified:

same ID preserved

createdAt preserved

supplied fields changed

unsupplied fields preserved

updatedAt refreshed

duplicate updates rejected

missing ID returns 404

Legacy mirror

Structured creates/updates also maintain the old timeline representation in entries.

10. UTF-8 / encoding work

An earlier PowerShell display issue rendered the em dash as mojibake.

The D1 data was verified to contain the correct Unicode code point:

U+2014 EM DASH

API success responses were changed to explicitly return:

Content-Type: application/json; charset=utf-8
Cache-Control: no-store

The API/data was proven correct.

There is an old recovery separator in archive-data.ts containing a mojibake variant. It exists as a compatibility parser for previously corrupted input. Do not remove it casually without checking migration behavior.

11. GPT API contract tests

File:

tests/gpt-api-contract.test.mjs

Current verified result:

tests 28
pass 28
fail 0

Coverage includes:

protected files exist

bearer authentication

v1 lore contract

search contract

chronicle auth/duplicates

structured entries auth

structured list

structured POST

input validation

duplicate rejection

legacy timeline mirror

GET exact entry by ID

exact lookup adapter

PATCH

PATCH validation

PATCH 404/duplicate behavior

ID/createdAt preservation

fresh D1 automatic seeding

no DELETE

no archive reset

legacy route delegation

Required regression command after API/storage/schema changes:

npm run test:gpt-api

Also run:

npm run build

AGENTS.md contains additional repository-level constraints. Respect it.

12. OpenAPI / custom GPT integration

File:

openapi/lunar-dragons-gpt.yaml

OpenAPI:

3.1.0

Redocly validation currently passes with no warnings.

Command:

npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml

GPT Action parser compatibility decisions

The ChatGPT GPT Actions editor imposed some stricter requirements than Redocly:

operation descriptions kept below ~300 characters

{id} path parameter was inlined rather than referenced through a shared $ref

All six actions are detected:

getLoreArchive

searchLoreArchive

listLoreEntries

createLoreEntry

getLoreEntryById

updateLoreEntryById

GPT Action authentication

GPT Action authentication:

API Key
Bearer

Secret value is not stored in the YAML.

Important schema wording

Path IDs must be described as a:

stable identifier

not necessarily a UUID, because legacy records use legacy-* IDs.

13. Custom GPT behavior/instructions

A custom GPT named:

Lunar Dragons GPT

was configured.

Description:

Lore architect and canon keeper for the Lunar Dragons, a custom Warhammer 40,000 Space Marine Chapter. Develops lore, checks continuity, searches the Codex, and maintains approved canon.

The GPT was instructed to:

treat the Codex API as authoritative for stored Chapter canon

search before writing when relevant

brainstorm without automatically storing ideas

write only when the user clearly asks to persist/save/commit/approve lore

use review when persistence is requested but canon status is unclear

use canon only when explicitly intended

retrieve an existing record before PATCH

preserve unspecified fields

never invent IDs

surface canon conflicts instead of silently rewriting

keep Lunar Dragons lore plausible within Warhammer 40,000

allow exceptional/dramatic 40k-compatible material

avoid repeatedly asking whether every brainstorming statement should be saved

14. GPT Actions — live test results

All six operations were successfully tested end-to-end against the staging Worker D1.

Read

getLoreArchive

Success.

Returned persisted archive data.

Search

searchLoreArchive

Success.

Example broad search returned multiple relevant archive results.

List

listLoreEntries

Success.

Returned seven persisted canon entries in the fresh staging production archive before the new review entry was added.

Exact record lookup

getLoreEntryById

Success with actual legacy ID:

legacy-88b3c84d-5

This record is the existing Lunaris timeline entry.

Create

A useful real review entry was created:

ID:
1141e128-122c-4643-974b-5af88d176192

Date:
Pre-008.M42

Title:
Provenance and Antiquity of the Lunaris

Category:
relic

Status:
review

Content:

The true age of the Lunaris remains uncertain. Surviving evidence suggests that substantial portions of the vessel may predate the Ultima Founding by many millennia, with some Chapter savants proposing a provenance reaching as far back as the Great Crusade. Whether the Lunaris has survived continuously since that era or incorporates the rebuilt hull and systems of an older warship remains unresolved. Its earliest verified service history is fragmentary, and further investigation is required before such claims may be accepted as Chapter canon.

This currently exists in the staging/raw Worker D1, not the real Site D1.

Update

The same review record was PATCHed successfully.

Verified:

ID unchanged

createdAt unchanged

only title changed

date/category/status/content unchanged

status remained review

updatedAt changed

Do not promote this record to canon automatically.

Once the real Site API is live, recreate or migrate this one review record into the real Site D1.

15. Raw Cloudflare Worker infrastructure

This infrastructure was created and proven.

Worker

Name:

lunar-dragons-codex

URL:

https://lunar-dragons-codex.wandering-mud-e6c1.workers.dev

D1

Database:

lunar-dragons-codex

Database ID:

bc3a4740-405c-4d7f-9fc2-2ba4cced6a9a

Binding:

DB

R2

Bucket:

lunar-dragons-assets

Binding:

CHAPTER_ASSETS

Worker secrets

Configured:

GPT_API_KEY

The actual secret value must never be committed or written into this handoff.

GUEST_SESSION_SECRET was not yet verified/configured on this raw Worker. This is another reason not to make it the final site.

Wrangler

Root:

wrangler.jsonc

Production D1 and R2 bindings use the real resources.

Compatibility date was pinned to:

2026-05-22

because the installed local Miniflare runtime rejected 2026-08-02.

vite.config.ts uses a static import of:

import { cloudflare } from "@cloudflare/vite-plugin";

so Vinext Cloudflare deployment detection works.

16. Local development

Local dev command:

npm run dev

Local URL:

http://localhost:3000

Local GPT API key comes from:

.dev.vars

Never commit or publish .dev.vars.

Suggested ignored files include:

.dev.vars
.dev.vars.*
.env
.env.*

Local Miniflare/D1 data survived the Cloudflare config work.

Development DB previously contained test entries such as TEST/TEST2/TEST3. Those test records must not be treated as production canon.

17. Existing Site vs staging Worker — what Codex must do next

PRIMARY TASK

Update the existing ChatGPT Site behind lunardragons.cloud with the current repository code so the Site gains the new /api/gpt/v1/* API while preserving its existing auth and database.

DO NOT

Do not point lunardragons.cloud directly at the raw Worker as a shortcut.

Do not destroy or replace the existing Site D1.

Do not reset chapter_archive.

Do not delete guest_users.

Do not recreate every guest account unless there is no safe alternative.

Do not remove Sign in with ChatGPT.

Do not remove the admin allow-list.

Do not expose the GPT API without Bearer authentication.

Do not expose GPT DELETE/reset routes.

Do not migrate local TEST/TEST2/TEST3 entries to production.

PRESERVE

existing custom domain

existing Site D1

existing guest_users

existing guest password hashes/salts

GUEST_SESSION_SECRET used by the Site

Sign in with ChatGPT

administrator status based on app/admin-config.ts

existing Chapter archive/canon

existing R2/site assets

ADD/DEPLOY

The current code containing:

structured loreEntries

D1 schema migration

automatic fresh-D1 seeding

GPT auth helper

GPT adapter

v1 GPT endpoints

exact lookup

PATCH

UTF-8 response headers

OpenAPI definition

privacy page

REQUIRED SITE SECRET

The Site runtime must receive:

GPT_API_KEY

Do not put its value into source code, YAML, or committed config.

The existing Site should already have the secret(s) required for guest/session operation because guest login currently works. Preserve those.

18. Acceptance criteria for the Site update

Before declaring the cutover complete, all of these must be true.

Website/auth

On:

https://lunardragons.cloud

Existing guest username/passphrase accounts can log in.

Guest accounts remain view-only.

Sign in with ChatGPT works.

The user's allowed ChatGPT account is recognized as Administrator.

Admin Mode still works.

Existing archive content is present.

GPT API

Without bearer token:

GET https://lunardragons.cloud/api/gpt/v1/lore

must return:

401

With wrong bearer token:

401

With valid production GPT_API_KEY:

{
  "source": "database",
  "persisted": true
}

Data

GET /api/gpt/v1/entries must return the real Site's structured lore.

Existing legacy timeline records should migrate to structured loreEntries without destroying the timeline.

All guest users must remain present.

UI consistency

A lore entry written through:

https://lunardragons.cloud/api/gpt/v1/entries

must be visible to the real site's relevant UI according to the intended status/display rules.

If Chronicles intentionally shows canon-only records, then review records may require an admin/review UI rather than being shown in the public Chronicle. Do not assume missing review entries are a persistence failure until checking the API and UI filter behavior.

19. After Site API cutover

Once the real Site passes all acceptance checks:

19.1 Move the review Lunaris record

Recreate/migrate this staging review record into the Site D1:

Provenance and Antiquity of the Lunaris
status: review
category: relic
date: Pre-008.M42

Do not automatically mark it canon.

19.2 Update OpenAPI

Change:

servers:
  - url: https://lunar-dragons-codex.wandering-mud-e6c1.workers.dev

to:

servers:
  - url: https://lunardragons.cloud

Then:

npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml

19.3 Update GPT Action

Replace the GPT Action schema with the updated production URL.

Keep authentication:

API Key / Bearer

19.4 Update privacy policy URL

The intended final privacy URL is:

https://lunardragons.cloud/privacy

A privacy page already exists in current source:

app/privacy/page.tsx

19.5 Re-test all six GPT actions against the real domain

getLoreArchive

searchLoreArchive

listLoreEntries

getLoreEntryById

createLoreEntry

updateLoreEntryById

Do not create junk production records. Use real review lore when testing writes.

20. Important files

Hosting/deployment

.openai/hosting.json

vite.config.ts

wrangler.jsonc

worker/index.ts

Authentication

app/chatgpt-auth.ts

app/archive-auth.ts

app/admin-config.ts

storage/guest-accounts.ts

app/api/guest-auth/session/route.ts

app/api/guest-users/route.ts

Archive/data

app/archive-data.ts

db/schema.ts

storage/chapter-records.ts

GPT API

app/gpt-api-auth.ts

app/gpt-api-adapter.ts

app/api/gpt/v1/lore/route.ts

app/api/gpt/v1/search/route.ts

app/api/gpt/v1/entries/route.ts

app/api/gpt/v1/entries/[id]/route.ts

app/api/gpt/v1/chronicle/route.ts

legacy GPT route files

GPT integration

openapi/lunar-dragons-gpt.yaml

Tests

tests/gpt-api-contract.test.mjs

AGENTS.md

Privacy

app/privacy/page.tsx

21. Useful verification commands

Contract tests

npm run test:gpt-api

Expected currently:

28 passed
0 failed

Build

npm run build

Validate OpenAPI

npx @redocly/cli lint openapi/lunar-dragons-gpt.yaml

Real Site API presence

curl.exe -i https://lunardragons.cloud/api/gpt/v1/lore

Before the Site update this currently returns:

404 Not Found

After deployment it should return:

401 Unauthorized

without the key.

Authenticated API verification

Invoke-RestMethod `
  -Uri "https://lunardragons.cloud/api/gpt/v1/lore" `
  -Headers @{ Authorization = "Bearer $prodKey" }

Expected:

source    : database
persisted : True

22. Security invariants

Codex must preserve these unless the user explicitly directs otherwise:

GPT_API_KEY is a secret, never source-controlled.

GUEST_SESSION_SECRET is a secret, never source-controlled.

Guest passwords remain hashed/salted; never expose them.

GPT endpoints require bearer auth.

No GPT DELETE route.

No GPT archive-reset route.

Same-origin checks remain on browser/admin mutation routes.

ChatGPT-admin authorization continues to use the established OpenAI headers plus the explicit admin email allow-list.

Existing Site data must be migrated/preserved, not silently replaced with defaults.

Always run GPT contract tests after relevant API/storage/auth changes.

23. Current status summary

Completed

Structured lore model

Legacy migration

D1 persistence

Fresh database seeding

Bearer-authenticated GPT API

Search

Structured create

Exact read

Structured PATCH

Duplicate protection

UTF-8 correctness

No DELETE/reset

28 passing contract tests

OpenAPI 3.1 definition

Custom GPT configured

All six GPT Actions proven against staging Worker

Privacy page added

Cloudflare Worker/D1/R2 staging deployment proven

Current blocker

The real Site (lunardragons.cloud) is still on older code and has no /api/gpt/v1/* routes, while the staging Worker has the new API but does not share the Site's guest/auth/database state.

Next move

Deploy the current code to the existing ChatGPT Site behind lunardragons.cloud, preserving its D1/auth state, configure GPT_API_KEY in that Site runtime, verify all accounts and API behavior, then repoint the custom GPT to lunardragons.cloud.

24. Codex instruction

Before editing deployment/auth/storage code:

Read this document.

Read AGENTS.md.

Inspect .openai/hosting.json, vite.config.ts, relevant auth/storage files, and the existing Site deployment workflow.

Prefer updating the existing Site over creating/replacing infrastructure.

Preserve existing data.

Explain any migration or destructive operation before performing it.

Verify with tests and live checks.

Do not claim the cutover is complete until both guest login and ChatGPT admin login work on lunardragons.cloud and the GPT API reads/writes the same Site D1.